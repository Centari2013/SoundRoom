import { getEnv } from "@vercel/functions";
import { randomBytes, randomUUID } from "node:crypto";
import { AwsClient } from "aws4fetch";
import { authenticateRequest, resolveUserAccessContext } from './_utils/auth.js'
import { HttpError } from './_utils/errors.js'

function createRandomId() {
  if (typeof randomUUID === "function") {
    return randomUUID().replace(/-/g, "");
  }

  if (typeof randomBytes === "function") {
    return randomBytes(12).toString("hex");
  }

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

function sanitizeSegment(value) {
  if (!value) return ''
  return value
    .toString()
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '')
}

function getR2Config() {
  let env = {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucketName: process.env.R2_BUCKET_NAME,
    accountId: process.env.R2_ACCOUNT_ID,
  };

  const needsFallback = Object.values(env).some((value) => !value);
  if (needsFallback) {
    try {
      const vercelEnv = getEnv?.();
      if (vercelEnv) {
        env = {
          accessKeyId: env.accessKeyId || vercelEnv.R2_ACCESS_KEY_ID,
          secretAccessKey: env.secretAccessKey || vercelEnv.R2_SECRET_ACCESS_KEY,
          bucketName: env.bucketName || vercelEnv.R2_BUCKET_NAME,
          accountId: env.accountId || vercelEnv.R2_ACCOUNT_ID,
        };
      }
    } catch {
      // getEnv is only available within the Vercel serverless runtime.
    }
  }

  return env;
}

const ALLOWED_ORIGIN =
  process.env.NODE_ENV === "production" ? "https://soundroom.live" : "*";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Credentials": "true",
};

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(request) {
  try {
    const { user } = await authenticateRequest(request)
    const userAccess = await resolveUserAccessContext(user.id)
    if (!userAccess.entitlements?.canUpload) {
      throw new HttpError(403, 'Uploads are unavailable on your plan')
    }

    const { accessKeyId, secretAccessKey, bucketName, accountId } = getR2Config();

    if (!accessKeyId || !secretAccessKey || !bucketName || !accountId) {
      return new Response(
        JSON.stringify({
          error: "Missing R2 configuration",
          message:
            "R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, and R2_ACCOUNT_ID must be configured.",
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const client = new AwsClient({
      accessKeyId,
      secretAccessKey,
    });

    const { searchParams } = new URL(request.url);
    const providedKey = sanitizeSegment(searchParams.get("key"));

    const objectKey = providedKey || `${createRandomId()}.bin`;
    const url = new URL(
      `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${objectKey}`
    );
    url.searchParams.set("X-Amz-Expires", "120");

    const signed = await client.sign(new Request(url, { method: "PUT" }), {
      aws: { signQuery: true },
    });

    return new Response(
      JSON.stringify({
        signedUrl: signed.url,
        key: objectKey,
        displayName: objectKey,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    if (error instanceof HttpError) {
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: error.status,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      )
    }

    console.error("💥 SIGNING ERROR:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error", message: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
}
