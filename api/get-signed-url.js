import { AwsClient } from 'aws4fetch'
import { supabaseAdmin } from './_utils/serverClients.js'
import { authenticateRequest, resolveUserAccessContext } from './_utils/auth.js'
import { HttpError } from './_utils/errors.js'
import { hasPlanAccess, resolveRequiredPlan } from './_utils/entitlements.js'

const ALLOWED_ORIGIN =
  process.env.NODE_ENV === 'production' ? 'https://soundroom.live' : '*'

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  })
}

export async function GET(request) {
  try {
    const {
      R2_ACCESS_KEY_ID,
      R2_SECRET_ACCESS_KEY,
      R2_BUCKET_NAME,
      R2_ACCOUNT_ID,
    } = process.env

    if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_ACCOUNT_ID) {
      throw new HttpError(500, 'R2 storage is not configured')
    }

    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')?.trim()

    if (!key) {
      throw new HttpError(400, "Missing 'key' query param")
    }

    const objectKey = key.replace(/^\/+|\/+$/g, '')
    if (objectKey.includes('..')) {
      throw new HttpError(400, 'Invalid storage key')
    }

    const authHeader =
      request.headers.get('authorization') || request.headers.get('Authorization') || ''
    const hasBearerToken = /^Bearer\s+\S+/.test(authHeader)

    let user = null
    let userAccess = { plan: 'free' }

    if (hasBearerToken) {
      const authResult = await authenticateRequest(request)
      user = authResult.user
      userAccess = await resolveUserAccessContext(user.id)
    }

    if (!supabaseAdmin) {
      throw new HttpError(500, 'Supabase admin client is not configured')
    }

    const { data: soundFile, error: soundFileError } = await supabaseAdmin
      .from('sound_files')
      .select('id, owner_id, plan_tier, bucket, path')
      .eq('path', objectKey)
      .maybeSingle()

    if (soundFileError) {
      console.error('Failed to validate storage key', soundFileError)
      throw new HttpError(500, 'Unable to validate storage key')
    }

    if (!soundFile) {
      throw new HttpError(404, 'Sound file not found')
    }

    const userId = user?.id ?? null
    const isOwner = !!soundFile.owner_id && soundFile.owner_id === userId

    if (soundFile.owner_id && !isOwner) {
      throw new HttpError(403, 'You do not have access to this file')
    }

    if (!isOwner) {
      const requiredPlan = resolveRequiredPlan(soundFile, soundFile.plan_tier)

      if (!hasPlanAccess(userAccess.plan, requiredPlan)) {
        throw new HttpError(403, 'Your plan does not permit access to this file')
      }
    }

    const client = new AwsClient({
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    })

    const url = new URL(`https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${objectKey}`)
    url.searchParams.set('X-Amz-Expires', '120')

    const signed = await client.sign(new Request(url, { method: 'GET' }), {
      aws: { signQuery: true },
    })

    return new Response(JSON.stringify({ signedUrl: signed.url }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    if (error instanceof HttpError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      })
    }

    console.error('💥 SIGNING ERROR:', error)
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    })
  }
}
