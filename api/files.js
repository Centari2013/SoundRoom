/**
 * Consolidated file-operations endpoint.
 *
 * Dispatches by `?action=<name>` and HTTP method to one of three
 * internal handlers, each ported verbatim from its previous
 * standalone file:
 *
 *   GET    ?action=upload-url   ← was api/get-upload-url.js
 *   GET    ?action=signed-url   ← was api/get-signed-url.js
 *   DELETE ?action=delete       ← was api/delete-file.js
 *
 * All three sign R2 URLs (PUT / GET / DELETE) on behalf of the
 * authenticated user. Auth model preserved per-handler:
 *   - upload-url requires Bearer + canUpload entitlement
 *   - signed-url accepts anonymous (tier-gated) OR Bearer reads
 *   - delete requires Bearer + canUpload + owner_id match
 *
 * The expensive `generate-preview` function (ffmpeg/ffprobe deps)
 * stays in its own file.
 */

import { getEnv } from '@vercel/functions'
import { randomBytes, randomUUID } from 'node:crypto'
import { AwsClient } from 'aws4fetch'
import { authenticateRequest, resolveUserAccessContext } from './_utils/auth.js'
import { HttpError } from './_utils/errors.js'
import { buildCorsHeaders } from './_utils/http.js'
import { supabaseAdmin } from './_utils/serverClients.js'
import { hasPlanAccess, resolveRequiredPlan } from './_utils/entitlements.js'

const ALL_METHODS = 'GET, DELETE, OPTIONS'
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 * 1024 // 10GB

// ─── Dispatch ─────────────────────────────────────────────────────

export function OPTIONS(request) {
  return new Response(null, {
    status: 204,
    headers: buildCorsHeaders(request, ALL_METHODS),
  })
}

export function GET(request) {
  const action = readAction(request)
  if (action === 'upload-url') return handleUploadUrl(request)
  if (action === 'signed-url') return handleSignedUrl(request)
  return notFound(request, action)
}

export function DELETE(request) {
  const action = readAction(request)
  if (action === 'delete') return handleDelete(request)
  return notFound(request, action)
}

function readAction(request) {
  return (new URL(request.url).searchParams.get('action') || '').trim()
}

function notFound(request, action) {
  return jsonError(request, new HttpError(404, `Unknown files action: ${action || '(missing)'}`))
}

function jsonOk(request, body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      ...buildCorsHeaders(request, ALL_METHODS),
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })
}

function jsonError(request, error) {
  if (error instanceof HttpError) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.status,
      headers: {
        ...buildCorsHeaders(request, ALL_METHODS),
        'Content-Type': 'application/json',
      },
    })
  }
  console.error('[files] unexpected error', error)
  return new Response(JSON.stringify({ error: 'Internal server error' }), {
    status: 500,
    headers: {
      ...buildCorsHeaders(request, ALL_METHODS),
      'Content-Type': 'application/json',
    },
  })
}

// ─── Shared R2 config readers ─────────────────────────────────────

function getR2Config() {
  // Preserves the @vercel/functions getEnv fallback from the original
  // upload-url endpoint — different Vercel runtimes expose env vars
  // through different mechanisms.
  let env = {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucketName: process.env.R2_BUCKET_NAME,
    accountId: process.env.R2_ACCOUNT_ID,
  }
  const needsFallback = Object.values(env).some((v) => !v)
  if (needsFallback) {
    try {
      const vercelEnv = getEnv?.()
      if (vercelEnv) {
        env = {
          accessKeyId: env.accessKeyId || vercelEnv.R2_ACCESS_KEY_ID,
          secretAccessKey: env.secretAccessKey || vercelEnv.R2_SECRET_ACCESS_KEY,
          bucketName: env.bucketName || vercelEnv.R2_BUCKET_NAME,
          accountId: env.accountId || vercelEnv.R2_ACCOUNT_ID,
        }
      }
    } catch {
      // getEnv only available within the Vercel serverless runtime
    }
  }
  return env
}

function createRandomId() {
  if (typeof randomUUID === 'function') return randomUUID().replace(/-/g, '')
  if (typeof randomBytes === 'function') return randomBytes(12).toString('hex')
  const cryptoObj = globalThis.crypto
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID().replace(/-/g, '')
  if (cryptoObj?.getRandomValues) {
    const bytes = new Uint32Array(3)
    cryptoObj.getRandomValues(bytes)
    return Array.from(bytes, (value) => value.toString(36)).join('')
  }
  return Math.random().toString(36).slice(2)
}

function sanitizeSegment(value) {
  if (!value) return ''
  return value
    .toString()
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '')
}

// ─── 1. upload-url ────────────────────────────────────────────────
/**
 * Returns a presigned PUT URL for the authenticated uploader.
 * Requires the canUpload entitlement and a per-user quota check
 * against the 10GB cap.
 */
async function handleUploadUrl(request) {
  try {
    const { user } = await authenticateRequest(request)
    const userAccess = await resolveUserAccessContext(user.id)
    if (!userAccess.entitlements?.canUpload) {
      throw new HttpError(403, 'Uploads are unavailable on your plan')
    }

    const { searchParams } = new URL(request.url)
    const fileSize = parseInt(searchParams.get('fileSize') ?? '0', 10)

    if (fileSize > 0 && supabaseAdmin) {
      const { data: rows, error: usageError } = await supabaseAdmin
        .from('sound_files')
        .select('size')
        .eq('owner_id', user.id)
      if (usageError) {
        throw new HttpError(500, 'Unable to verify storage usage')
      }
      const currentUsage = (rows ?? []).reduce((sum, row) => sum + (row.size ?? 0), 0)
      if (currentUsage + fileSize > MAX_UPLOAD_BYTES) {
        throw new HttpError(403, 'Storage limit reached. You have used your 10GB upload quota.')
      }
    }

    const { accessKeyId, secretAccessKey, bucketName, accountId } = getR2Config()
    if (!accessKeyId || !secretAccessKey || !bucketName || !accountId) {
      throw new HttpError(
        500,
        'Missing R2 configuration: R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, and R2_ACCOUNT_ID must be configured.'
      )
    }

    const client = new AwsClient({ accessKeyId, secretAccessKey })
    const providedKey = sanitizeSegment(searchParams.get('key'))
    const objectKey = providedKey || `${createRandomId()}.bin`

    const url = new URL(
      `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${objectKey}`
    )
    url.searchParams.set('X-Amz-Expires', '120')

    const signed = await client.sign(new Request(url, { method: 'PUT' }), {
      aws: { signQuery: true },
    })

    return jsonOk(request, {
      signedUrl: signed.url,
      key: objectKey,
      displayName: objectKey,
    })
  } catch (error) {
    return jsonError(request, error)
  }
}

// ─── 2. signed-url ────────────────────────────────────────────────
/**
 * Returns a short-lived GET URL for a sound's R2 object. Used by the
 * frontend to play sounds. Accepts anonymous requests (the
 * sound_files row's plan_tier controls access via the `hasPlanAccess`
 * check). Bearer token elevates to the user's plan.
 */
async function handleSignedUrl(request) {
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
    if (!key) throw new HttpError(400, "Missing 'key' query param")

    const objectKey = key.replace(/^\/+|\/+$/g, '')
    if (objectKey.includes('..')) throw new HttpError(400, 'Invalid storage key')

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

    if (!supabaseAdmin) throw new HttpError(500, 'Supabase admin client is not configured')

    const { data: soundFile, error: soundFileError } = await supabaseAdmin
      .from('sound_files')
      .select('id, owner_id, plan_tier, bucket, path')
      .eq('path', objectKey)
      .maybeSingle()
    if (soundFileError) {
      console.error('Failed to validate storage key', soundFileError)
      throw new HttpError(500, 'Unable to validate storage key')
    }
    if (!soundFile) throw new HttpError(404, 'Sound file not found')

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
    const url = new URL(
      `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${objectKey}`
    )
    url.searchParams.set('X-Amz-Expires', '120')

    const signed = await client.sign(new Request(url, { method: 'GET' }), {
      aws: { signQuery: true },
    })

    return jsonOk(request, { signedUrl: signed.url })
  } catch (error) {
    return jsonError(request, error)
  }
}

// ─── 3. delete ────────────────────────────────────────────────────
/**
 * Customer-facing delete: only for sounds the requester owns
 * (owner_id + bucket both equal user.id). Used to remove the user's
 * own uploads. Admin-curated deletion goes through /api/admin.
 */
async function handleDelete(request) {
  try {
    const { user } = await authenticateRequest(request)
    const userAccess = await resolveUserAccessContext(user.id)
    if (!userAccess.entitlements.canUpload) {
      throw new HttpError(403, 'You are not allowed to delete files')
    }

    if (!supabaseAdmin) throw new HttpError(500, 'Supabase admin client is not configured')

    const { searchParams } = new URL(request.url)
    const pathParam = searchParams.get('path')?.trim()
    if (!pathParam) throw new HttpError(400, "Missing 'path' query param")

    const objectKey = pathParam.replace(/^\/+|\/+$/g, '')
    if (objectKey.includes('..')) throw new HttpError(400, 'Invalid storage key')

    const { data: soundFile, error: soundFileError } = await supabaseAdmin
      .from('sound_files')
      .select('id, owner_id, bucket, path')
      .eq('owner_id', user.id)
      .eq('path', objectKey)
      .eq('bucket', user.id)
      .maybeSingle()
    if (soundFileError) {
      console.error('Failed to resolve sound file for deletion', soundFileError)
      throw new HttpError(500, 'Unable to validate delete request')
    }
    if (!soundFile) throw new HttpError(404, 'Sound file not found')

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

    const url = `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${soundFile.path}`
    const signed = await client.sign(new Request(url, { method: 'DELETE' }), {
      aws: { signQuery: true },
    })
    const res = await fetch(signed)
    if (!res.ok) {
      console.error('R2 deletion failed', await res.text())
      throw new HttpError(res.status, 'Failed to delete file')
    }

    return jsonOk(request, { success: true })
  } catch (error) {
    return jsonError(request, error)
  }
}
