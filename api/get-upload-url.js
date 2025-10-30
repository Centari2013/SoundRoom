import { AwsClient } from "aws4fetch";

function sanitizeFilename(filename = "") {
  const trimmed = filename.trim() || "file";
  const normalized = trimmed.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  const lastDot = normalized.lastIndexOf(".");
  const base = lastDot > 0 ? normalized.slice(0, lastDot) : normalized;
  const extension = lastDot > 0 ? normalized.slice(lastDot) : "";
  const safeBase = base
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
  const finalBase = (safeBase.length > 0 ? safeBase.slice(0, 80) : "file").toLowerCase();
  const safeExtension = extension
    .replace(/[^.a-zA-Z0-9_-]+/g, "")
    .slice(0, 16)
    .toLowerCase();
  return `${finalBase}${safeExtension}`;
}

function createRandomId() {
  const cryptoObj = globalThis.crypto;

  if (cryptoObj?.randomUUID) {
    return cryptoObj.randomUUID().replace(/-/g, "");
  }

  if (cryptoObj?.getRandomValues) {
    const bytes = new Uint32Array(3);
    cryptoObj.getRandomValues(bytes);
    return Array.from(bytes, (value) => value.toString(36)).join("");
  }

  return Math.random().toString(36).slice(2);
}

function generateObjectKey(filename) {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "");
  const randomId = createRandomId().slice(0, 12);
  const safeFilename = sanitizeFilename(filename);
  return `${timestamp}-${randomId}-${safeFilename}`;
}

/**
 * API endpoint that signs a temporary upload URL for the R2 bucket.
 *
 * @param {Request} request - incoming HTTP request
 * @returns {Promise<Response>} signed upload URL response
 */
export async function GET(request) {
  const ALLOWED_ORIGIN =
    process.env.NODE_ENV === 'production'
      ? 'https://soundroom.live'
      : '*';

  const {
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME,
    R2_ACCOUNT_ID
  } = process.env;

  const corsHeaders = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const client = new AwsClient({
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    });

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const filename = searchParams.get('filename');

    if (!userId || !filename) {
      return new Response(
        JSON.stringify({ error: "Missing 'userId' or 'filename' query param" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const generatedKey = generateObjectKey(filename);
    const url = new URL(`https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/users/${userId}/${generatedKey}`);
    url.searchParams.set('X-Amz-Expires', '120');

    const signed = await client.sign(
      new Request(url, { method: 'PUT' }),
      { aws: { signQuery: true } }
    );

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
      }
    );
  }
}
