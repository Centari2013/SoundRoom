// Vercel Serverless Function for Signed R2 GET URL
import { getEnv } from '@vercel/functions';
import { AwsClient } from "aws4fetch";

export async function GET(request) {
  // Secure credentials using Vercel env vars
  const { R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_ACCOUNT_ID } = getEnv();

  const client = new AwsClient({
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  });

  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (!key) {
    return new Response("Missing 'key' query param", { 
      status: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Credentials": "true",
      },
    });
  }

  // Build R2 object URL
  const url = new URL(`https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`);

  // Set expiration (in seconds)
  url.searchParams.set("X-Amz-Expires", "120"); // 2 minutes

  const signed = await client.sign(
    new Request(url, { method: "GET" }),
    { aws: { signQuery: true } }
  );

  return Response.json({ signedUrl: signed.url });
}
