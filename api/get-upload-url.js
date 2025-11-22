import { getEnv } from "@vercel/functions";
import { randomBytes, randomUUID } from "node:crypto";
import { AwsClient } from "aws4fetch";

const FALLBACK_FILENAME = "file";

function coerceFilename(value) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return FALLBACK_FILENAME;
}

function sanitizeFilename(filename = FALLBACK_FILENAME) {
  const coerced = coerceFilename(filename);
  const lastDot = coerced.lastIndexOf(".");
  const base = lastDot > 0 ? coerced.slice(0, lastDot) : coerced;
  const extension = lastDot > 0 ? coerced.slice(lastDot + 1) : "";

  let normalizedBase = base;
  try {
    normalizedBase = normalizedBase.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  } catch {
    // If the runtime does not support Intl normalization we simply fall back
    // to the raw base name.
  }

  const safeBase = normalizedBase
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");

  const finalBase = (safeBase || FALLBACK_FILENAME).slice(0, 80).toLowerCase();
  const safeExtension = extension
    .replace(/[^a-zA-Z0-9]+/g, "")
    .slice(0, 16)
    .toLowerCase();

  return safeExtension ? `${finalBase}.${safeExtension}` : finalBase;
}

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

function generateObjectKey(filename) {
  const timestamp = Date.now().toString(36);
  const randomId = createRandomId().slice(0, 16);
  const safeFilename = sanitizeFilename(filename);
  return `${timestamp}-${randomId}-${safeFilename}`;
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
    const filename = searchParams.get("filename");
    const providedKey = searchParams.get("key");

    if (!filename && !providedKey) {
      return new Response(
        JSON.stringify({ error: "Missing 'filename' or 'key' query param" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const sanitizedKey = providedKey
      ? sanitizeFilename(providedKey.replace(/\//g, ""))
      : generateObjectKey(filename);

    const url = new URL(
      `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${sanitizedKey}`
    );
    url.searchParams.set("X-Amz-Expires", "120");

    const signed = await client.sign(new Request(url, { method: "PUT" }), {
      aws: { signQuery: true },
    });

    return new Response(
      JSON.stringify({
        signedUrl: signed.url,
        key: sanitizedKey,
        displayName: filename || sanitizedKey,
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
