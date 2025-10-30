import { AwsClient } from 'aws4fetch'
import { authenticateRequest, resolveUserAccessContext } from './_utils/auth.js'
import { HttpError } from './_utils/errors.js'

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
    const { user } = await authenticateRequest(request)
    const userAccess = await resolveUserAccessContext(user.id)

    if (!userAccess.entitlements.canUpload) {
      throw new HttpError(403, 'Uploads are not available for your plan')
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

    const { searchParams } = new URL(request.url)
    const userIdParam = searchParams.get('userId')
    const filename = searchParams.get('filename')?.trim()

    if (!userIdParam || !filename) {
      throw new HttpError(400, "Missing 'userId' or 'filename' query param")
    }

    if (userIdParam !== user.id) {
      throw new HttpError(403, 'You can only upload files to your own library')
    }

    if (filename.includes('..') || filename.includes('/')) {
      throw new HttpError(400, 'Invalid filename')
    }

    const client = new AwsClient({
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    })

    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const generatedKey = `${uniqueSuffix}-${filename}`;
    const url = new URL(`https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/users/${userId}/${generatedKey}`);
    url.searchParams.set('X-Amz-Expires', '120');

    const signed = await client.sign(new Request(url, { method: 'PUT' }), {
      aws: { signQuery: true },
    })

    return new Response(
      JSON.stringify({ signedUrl: signed.url, key: generatedKey, displayName: filename }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err) {
    console.error('💥 SIGNING ERROR:', err);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', message: err.message }),
      {
        status: 500,
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
