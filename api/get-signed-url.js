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

function parseStorageKey(key) {
  const sanitized = key.replace(/^\/+|\/+$/g, '')
  const segments = sanitized.split('/')

  if (segments.length < 3) {
    throw new HttpError(400, 'Invalid storage key')
  }

  const [base, bucket, ...rest] = segments
  const objectPath = rest.join('/')

  if (!base || !bucket || !objectPath) {
    throw new HttpError(400, 'Invalid storage key')
  }

  if (base.includes('..') || bucket.includes('..') || objectPath.includes('..')) {
    throw new HttpError(400, 'Invalid storage key')
  }

  return { base, bucket, objectPath }
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
    const key = searchParams.get('key')

    if (!key) {
      throw new HttpError(400, "Missing 'key' query param")
    }

    const { user } = await authenticateRequest(request)
    const userAccess = await resolveUserAccessContext(user.id)

    const { base, bucket, objectPath } = parseStorageKey(key)

    if (!supabaseAdmin) {
      throw new HttpError(500, 'Supabase admin client is not configured')
    }

    const { data: soundFile, error: soundFileError } = await supabaseAdmin
      .from('sound_files')
      .select('id, owner_id, plan_tier, base, bucket, path')
      .eq('bucket', bucket)
      .eq('path', objectPath)
      .maybeSingle()

    if (soundFileError) {
      console.error('Failed to validate storage key', soundFileError)
      throw new HttpError(500, 'Unable to validate storage key')
    }

    if (!soundFile) {
      throw new HttpError(404, 'Sound file not found')
    }

    const isOwner = !!soundFile.owner_id && soundFile.owner_id === user.id

    if (soundFile.owner_id && !isOwner) {
      throw new HttpError(403, 'You do not have access to this file')
    }

    if (!isOwner) {
      const requiredPlan = resolveRequiredPlan(soundFile, base)

      if (!hasPlanAccess(userAccess.plan, requiredPlan)) {
        throw new HttpError(403, 'Your plan does not permit access to this file')
      }
    }

    if (soundFile.bucket && soundFile.bucket !== bucket) {
      throw new HttpError(403, 'Storage bucket mismatch')
    }

    if (soundFile.base && soundFile.base !== base) {
      throw new HttpError(403, 'Storage base mismatch')
    }

    const client = new AwsClient({
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    })

    const url = new URL(`https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`)
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
