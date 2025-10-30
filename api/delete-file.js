import { AwsClient } from 'aws4fetch'
import { supabaseAdmin } from './_utils/serverClients.js'
import { authenticateRequest, resolveUserAccessContext } from './_utils/auth.js'
import { HttpError } from './_utils/errors.js'

const ALLOWED_ORIGIN =
  process.env.NODE_ENV === 'production' ? 'https://soundroom.live' : '*'

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  })
}

export async function DELETE(request) {
  try {
    const { user } = await authenticateRequest(request)
    const userAccess = await resolveUserAccessContext(user.id)

    if (!userAccess.entitlements.canUpload) {
      throw new HttpError(403, 'You are not allowed to delete files')
    }

    if (!supabaseAdmin) {
      throw new HttpError(500, 'Supabase admin client is not configured')
    }

    const { searchParams } = new URL(request.url)
    const requestedBucket = searchParams.get('bucket')
    const requestedBase = searchParams.get('base')
    const pathParam = searchParams.get('path')?.trim()

    if (!pathParam) {
      throw new HttpError(400, "Missing 'path' query param")
    }

    const { data: soundFile, error: soundFileError } = await supabaseAdmin
      .from('sound_files')
      .select('id, owner_id, base, bucket, path')
      .eq('owner_id', user.id)
      .eq('path', pathParam)
      .eq('bucket', user.id)
      .maybeSingle()

    if (soundFileError) {
      console.error('Failed to resolve sound file for deletion', soundFileError)
      throw new HttpError(500, 'Unable to validate delete request')
    }

    if (!soundFile) {
      throw new HttpError(404, 'Sound file not found')
    }

    const storageBase = soundFile.base || 'users'
    const storageBucket = soundFile.bucket || user.id

    if (storageBucket !== user.id) {
      throw new HttpError(403, 'You can only delete files from your own bucket')
    }

    if (storageBase !== 'users') {
      throw new HttpError(403, 'Invalid storage base for deletion')
    }

    if (requestedBucket && requestedBucket !== storageBucket) {
      throw new HttpError(403, 'Bucket mismatch')
    }

    if (requestedBase && requestedBase !== storageBase) {
      throw new HttpError(403, 'Base mismatch')
    }

    const {
      R2_ACCESS_KEY_ID,
      R2_SECRET_ACCESS_KEY,
      R2_BUCKET_NAME,
      R2_ACCOUNT_ID,
    } = process.env

    if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_ACCOUNT_ID) {
      throw new HttpError(500, 'R2 storage is not configured')
    }

    const client = new AwsClient({
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    })

    const url = `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${storageBase}/${storageBucket}/${soundFile.path}`
    const signed = await client.sign(new Request(url, { method: 'DELETE' }), {
      aws: { signQuery: true },
    })

    const res = await fetch(signed)

    if (!res.ok) {
      console.error('R2 deletion failed', await res.text())
      throw new HttpError(res.status, 'Failed to delete file')
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    if (error instanceof HttpError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.error('💥 DELETE ERROR:', error)
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}
