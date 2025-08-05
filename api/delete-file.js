import { AwsClient } from "aws4fetch";

export async function DELETE(request) {
  const ALLOWED_ORIGIN =
    process.env.NODE_ENV === 'production'
      ? 'https://soundroom.live'
      : '*';

  const {
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME,
    R2_ACCOUNT_ID,
  } = process.env;

  const corsHeaders = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
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
    const { searchParams } = new URL(request.url);
    const bucket = searchParams.get('bucket');
    const path = searchParams.get('path');
    const base = searchParams.get('base');

    if (!bucket || !path) {
      return new Response(
        JSON.stringify({ error: "Missing 'bucket' or 'path' query param" }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const client = new AwsClient({
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    });

    const url = `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${base}/${bucket}/${path}`;
    const signed = await client.sign(
      new Request(url, { method: 'DELETE' }),
      { aws: { signQuery: true } }
    );

    const res = await fetch(signed);
    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to delete file' }),
        { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('💥 DELETE ERROR:', err);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', message: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}
