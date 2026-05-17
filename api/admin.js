/**
 * Consolidated admin endpoint.
 *
 * Dispatches by `?action=<name>` and HTTP method to one of four
 * internal handlers, each ported verbatim from its previous
 * standalone file:
 *
 *   GET    ?action=list-r2-keys      ← was api/admin-list-r2-keys.js
 *   PATCH  ?action=update-sound      ← was api/admin-update-sound.js
 *   DELETE ?action=delete-sound      ← was api/admin-delete-sound.js
 *   DELETE ?action=delete-r2-orphan  ← was api/admin-delete-r2-orphan.js
 *
 * Why consolidated: Vercel Hobby caps serverless functions at 12 and
 * each `api/*.js` file becomes its own function. The four admin
 * endpoints are gated by the same auth (`authenticateAdmin`) and
 * share identical CORS/error-handling patterns, so collapsing them
 * costs no security boundary and frees three function slots.
 *
 * Each internal handler keeps its own safety checks (HEAD-after-
 * DELETE verification, XML-error-body detection, sound_files
 * ownership re-checks, etc.) intact.
 */

import { AwsClient } from 'aws4fetch'
import { authenticateAdmin } from './_utils/adminAuth.js'
import { supabaseAdmin } from './_utils/serverClients.js'
import { HttpError } from './_utils/errors.js'
import { buildCorsHeaders } from './_utils/http.js'

const ALL_METHODS = 'GET, PATCH, DELETE, OPTIONS'

// ─── Dispatch ─────────────────────────────────────────────────────

export function OPTIONS(request) {
  return new Response(null, {
    status: 204,
    headers: buildCorsHeaders(request, ALL_METHODS),
  })
}

export function GET(request) {
  const action = readAction(request)
  if (action === 'list-r2-keys') return handleListR2Keys(request)
  return notFound(request, action)
}

export function PATCH(request) {
  const action = readAction(request)
  if (action === 'update-sound') return handleUpdateSound(request)
  return notFound(request, action)
}

export function DELETE(request) {
  const action = readAction(request)
  if (action === 'delete-sound') return handleDeleteSound(request)
  if (action === 'delete-r2-orphan') return handleDeleteR2Orphan(request)
  return notFound(request, action)
}

function readAction(request) {
  return (new URL(request.url).searchParams.get('action') || '').trim()
}

function notFound(request, action) {
  return jsonError(
    request,
    new HttpError(404, `Unknown admin action: ${action || '(missing)'}`)
  )
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
  console.error('[admin] unexpected error', error)
  return new Response(JSON.stringify({ error: 'Internal server error' }), {
    status: 500,
    headers: {
      ...buildCorsHeaders(request, ALL_METHODS),
      'Content-Type': 'application/json',
    },
  })
}

// ─── R2 helpers (shared by list / orphan-delete / sound-delete) ───

function readR2Env() {
  const {
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME,
    R2_PREVIEW_BUCKET_NAME,
    R2_ACCOUNT_ID,
  } = process.env
  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ACCOUNT_ID) {
    throw new HttpError(500, 'R2 credentials are not configured on the server.')
  }
  return {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    mainBucket: R2_BUCKET_NAME,
    previewBucket: R2_PREVIEW_BUCKET_NAME,
    accountId: R2_ACCOUNT_ID,
  }
}

function pickBucket(env, scope) {
  if (scope === 'preview') {
    if (!env.previewBucket) throw new HttpError(500, 'R2_PREVIEW_BUCKET_NAME is not configured.')
    return env.previewBucket
  }
  if (!env.mainBucket) throw new HttpError(500, 'R2_BUCKET_NAME is not configured.')
  return env.mainBucket
}

// ─── 1. list-r2-keys ──────────────────────────────────────────────
/**
 * Paginated read-only listing of every object in either the main or
 * preview R2 bucket. Used by the OrphanCheck UI to diff against the
 * sound_files table. Hard-caps total returned keys at 50k as a
 * runaway-guard.
 */
const LIST_MAX_KEYS_PER_PAGE = 1000
const LIST_MAX_TOTAL_KEYS = 50000

async function handleListR2Keys(request) {
  try {
    await authenticateAdmin(request)

    const { searchParams } = new URL(request.url)
    const bucketParam = (searchParams.get('bucket') || 'main').toLowerCase()
    const env = readR2Env()
    const bucketName = pickBucket(env, bucketParam)

    const client = new AwsClient({
      accessKeyId: env.accessKeyId,
      secretAccessKey: env.secretAccessKey,
    })

    const baseUrl = `https://${bucketName}.${env.accountId}.r2.cloudflarestorage.com`

    const allKeys = []
    let continuationToken = null
    let truncated = false

    while (true) {
      const url = new URL(`${baseUrl}/`)
      url.searchParams.set('list-type', '2')
      url.searchParams.set('max-keys', String(LIST_MAX_KEYS_PER_PAGE))
      if (continuationToken) url.searchParams.set('continuation-token', continuationToken)

      const signed = await client.sign(new Request(url, { method: 'GET' }), {
        aws: { signQuery: true },
      })
      const res = await fetch(signed)

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        console.error('[admin/list-r2-keys] list failed', {
          status: res.status,
          body: body.slice(0, 500),
        })
        throw new HttpError(res.status, `R2 list failed: ${body.slice(0, 200)}`)
      }

      const xml = await res.text()
      const { keys, nextToken, isTruncated } = parseListObjectsXml(xml)
      allKeys.push(...keys)

      if (allKeys.length > LIST_MAX_TOTAL_KEYS) {
        allKeys.length = LIST_MAX_TOTAL_KEYS
        truncated = true
        break
      }

      if (!isTruncated || !nextToken) break
      continuationToken = nextToken
    }

    return jsonOk(request, {
      bucket: bucketParam === 'preview' ? 'preview' : 'main',
      keys: allKeys,
      count: allKeys.length,
      truncated,
    })
  } catch (error) {
    return jsonError(request, error)
  }
}

function parseListObjectsXml(xml) {
  // Minimal regex parser for S3 ListObjectsV2 — fields are simple
  // text with no nested markup so this is safe (and faster than
  // pulling in a full XML library for a single use-case).
  const keys = []
  const contentRegex = /<Contents>([\s\S]*?)<\/Contents>/g
  const keyRegex = /<Key>([\s\S]*?)<\/Key>/
  const sizeRegex = /<Size>([\s\S]*?)<\/Size>/

  let match
  while ((match = contentRegex.exec(xml)) !== null) {
    const block = match[1]
    const keyMatch = block.match(keyRegex)
    const sizeMatch = block.match(sizeRegex)
    if (!keyMatch) continue
    keys.push({ key: keyMatch[1], size: sizeMatch ? Number(sizeMatch[1]) : 0 })
  }

  const isTruncated = /<IsTruncated>\s*true\s*<\/IsTruncated>/i.test(xml)
  const nextTokenMatch = xml.match(
    /<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/
  )
  return {
    keys,
    isTruncated,
    nextToken: nextTokenMatch ? nextTokenMatch[1] : null,
  }
}

// ─── 2. update-sound ──────────────────────────────────────────────
/**
 * Metadata-only patch on a sound_files row. Server hard-whitelists
 * editable fields so a malicious client can never touch path / id /
 * size / duration / created_at / owner_id / preview_url — anything
 * tied to the actual stored file is immutable through this path.
 */
const EDITABLE_FIELDS = new Set([
  'name',
  'tags',
  'bucket',
  'plan_tier',
  'cone_inner',
  'cone_outer',
  'source',
  'license_type',
])

async function handleUpdateSound(request) {
  try {
    const { user } = await authenticateAdmin(request)

    if (!supabaseAdmin) {
      throw new HttpError(500, 'Supabase admin client is not configured.')
    }

    let payload
    try {
      payload = await request.json()
    } catch {
      throw new HttpError(400, 'Invalid JSON payload.')
    }

    const id = typeof payload?.id === 'string' ? payload.id.trim() : ''
    const patch = payload?.patch ?? {}

    if (!id) throw new HttpError(400, "Missing 'id' in body.")
    if (typeof patch !== 'object' || patch === null) {
      throw new HttpError(400, "Missing 'patch' object in body.")
    }

    const safePatch = {}
    for (const [key, value] of Object.entries(patch)) {
      if (EDITABLE_FIELDS.has(key)) safePatch[key] = value
    }
    if (Object.keys(safePatch).length === 0) {
      throw new HttpError(400, 'No editable fields in patch.')
    }

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('sound_files')
      .select('id, name')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      console.error('[admin/update-sound] failed to fetch row', fetchError)
      throw new HttpError(500, 'Could not verify sound before update.')
    }
    if (!existing) throw new HttpError(404, 'Sound not found.')

    const { data, error } = await supabaseAdmin
      .from('sound_files')
      .update(safePatch)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[admin/update-sound] update failed', error)
      throw new HttpError(500, `Update failed: ${error.message}`)
    }

    console.info('[admin/update-sound] success', {
      adminId: user.id,
      adminEmail: user.email,
      soundId: id,
      changedFields: Object.keys(safePatch),
    })

    return jsonOk(request, { success: true, sound: data })
  } catch (error) {
    return jsonError(request, error)
  }
}

// ─── 3. delete-sound ──────────────────────────────────────────────
/**
 * Two-gate destructive flow: server requires the typed `confirm`
 * query param to equal the row's `name` before proceeding. Performs
 * R2 main delete → preview best-effort delete → HEAD verification
 * → Supabase row delete. If R2 reports success but HEAD finds the
 * object still present, the DB row is preserved and an explanatory
 * 500 surfaces (better to keep a row pointing at a real file than
 * to dangle a row pointing at a phantom).
 */
async function handleDeleteSound(request) {
  try {
    const { user } = await authenticateAdmin(request)

    if (!supabaseAdmin) {
      throw new HttpError(500, 'Supabase admin client is not configured.')
    }

    const { searchParams } = new URL(request.url)
    const id = (searchParams.get('id') || '').trim()
    const confirm = searchParams.get('confirm') || ''

    if (!id) throw new HttpError(400, "Missing 'id' query param.")

    const { data: sound, error: fetchError } = await supabaseAdmin
      .from('sound_files')
      .select('id, name, path, bucket, plan_tier')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      console.error('[admin/delete-sound] failed to fetch row', fetchError)
      throw new HttpError(500, 'Could not verify sound before deletion.')
    }
    if (!sound) throw new HttpError(404, 'Sound not found.')

    if (confirm !== sound.name) {
      console.warn('[admin/delete-sound] confirmation mismatch', {
        adminId: user.id,
        soundId: id,
        expected: sound.name,
      })
      throw new HttpError(
        400,
        'Confirmation does not match the sound name. Deletion aborted.'
      )
    }

    const env = readR2Env()
    if (!env.mainBucket) throw new HttpError(500, 'R2 storage is not configured on the server.')

    const client = new AwsClient({
      accessKeyId: env.accessKeyId,
      secretAccessKey: env.secretAccessKey,
    })

    // 1. Delete main R2 file.
    const objectKey = sound.path
    const mainUrl = `https://${env.mainBucket}.${env.accountId}.r2.cloudflarestorage.com/${objectKey}`
    const signedMain = await client.sign(new Request(mainUrl, { method: 'DELETE' }), {
      aws: { signQuery: true },
    })
    const r2Res = await fetch(signedMain)
    const r2Body = await r2Res.text().catch(() => '')
    if (/<Error>[\s\S]*<\/Error>/i.test(r2Body)) {
      console.error('[admin/delete-sound] R2 returned XML error body', {
        status: r2Res.status,
        bodyExcerpt: r2Body.slice(0, 600),
        objectKey,
      })
      throw new HttpError(
        500,
        `R2 returned an error body (HTTP ${r2Res.status}): ${r2Body.slice(0, 300)}`
      )
    }
    if (!r2Res.ok && r2Res.status !== 404) {
      console.error('[admin/delete-sound] R2 delete failed', {
        status: r2Res.status,
        body: r2Body.slice(0, 500),
        objectKey,
      })
      throw new HttpError(r2Res.status, `R2 deletion failed: ${r2Body.slice(0, 200)}`)
    }

    // Confirm delete actually happened. Refuse to remove DB row if not.
    const headSignedMain = await client.sign(new Request(mainUrl, { method: 'HEAD' }), {
      aws: { signQuery: true },
    })
    const headRes = await fetch(headSignedMain)
    if (headRes.status !== 404) {
      console.error('[admin/delete-sound] post-delete HEAD still resolves', {
        headStatus: headRes.status,
        objectKey,
      })
      throw new HttpError(
        500,
        `R2 reported delete success (HTTP ${r2Res.status}) but a follow-up HEAD returned ` +
          `${headRes.status}. The object is still present. Common causes: object versioning ` +
          `enabled on the bucket, or the deployed R2_BUCKET_NAME differs from the bucket the ` +
          `list endpoint reads. The sound_files row was NOT deleted.`
      )
    }

    // 2. Best-effort delete of the preview (separate bucket).
    let previewDeletion = 'skipped'
    if (env.previewBucket) {
      const previewKey = `previews/${sound.id}-preview.mp3`
      const previewUrl = `https://${env.previewBucket}.${env.accountId}.r2.cloudflarestorage.com/${previewKey}`
      try {
        const signedPreview = await client.sign(new Request(previewUrl, { method: 'DELETE' }), {
          aws: { signQuery: true },
        })
        const previewRes = await fetch(signedPreview)
        if (previewRes.ok || previewRes.status === 404) {
          previewDeletion = previewRes.status === 404 ? 'not_found' : 'ok'
        } else {
          const body = await previewRes.text().catch(() => '')
          console.warn('[admin/delete-sound] preview delete non-OK; continuing', {
            status: previewRes.status,
            body: body.slice(0, 200),
            previewKey,
          })
          previewDeletion = `error_${previewRes.status}`
        }
      } catch (err) {
        console.warn('[admin/delete-sound] preview delete threw; continuing', err)
        previewDeletion = 'threw'
      }
    }

    // 3. Delete the Supabase row.
    const { error: dbError } = await supabaseAdmin
      .from('sound_files')
      .delete()
      .eq('id', id)

    if (dbError) {
      console.error('[admin/delete-sound] Supabase row delete failed AFTER R2 success', {
        id,
        objectKey,
        dbError,
      })
      throw new HttpError(
        500,
        'R2 file deleted but the database row could not be removed. ' +
          'Please remove it manually from Supabase Studio.'
      )
    }

    console.info('[admin/delete-sound] success', {
      adminId: user.id,
      adminEmail: user.email,
      soundId: id,
      soundName: sound.name,
      objectKey,
      previewDeletion,
    })

    return jsonOk(request, {
      success: true,
      deleted: { id, name: sound.name, path: objectKey, previewDeletion },
    })
  } catch (error) {
    return jsonError(request, error)
  }
}

// ─── 4. delete-r2-orphan ──────────────────────────────────────────
/**
 * R2 key cleanup for objects with no live sound_files row. Server
 * re-derives ownership independently per bucket:
 *   - main: refuses if a row references `path = key`
 *   - preview: parses `previews/<uuid>-preview.mp3` and refuses if a
 *     row exists with `id = uuid`
 * The typed `confirm` query param must equal the key exactly.
 * Includes the same XML-error and HEAD-verification guardrails as
 * delete-sound.
 */
async function handleDeleteR2Orphan(request) {
  try {
    const { user } = await authenticateAdmin(request)

    if (!supabaseAdmin) {
      throw new HttpError(500, 'Supabase admin client is not configured.')
    }

    const { searchParams } = new URL(request.url)
    const key = (searchParams.get('key') || '').trim()
    const confirm = searchParams.get('confirm') || ''
    const bucketParam = (searchParams.get('bucket') || 'main').toLowerCase()

    if (!key) throw new HttpError(400, "Missing 'key' query param.")
    if (key.includes('..')) throw new HttpError(400, 'Invalid key.')

    if (confirm !== key) {
      console.warn('[admin/orphan-delete] confirmation mismatch', {
        adminId: user.id,
        expected: key,
      })
      throw new HttpError(
        400,
        'Confirmation does not match the R2 key. Deletion aborted.'
      )
    }

    // Ownership guard, branched per bucket.
    if (bucketParam === 'preview') {
      const previewMatch = /^previews\/([0-9a-fA-F-]+)-preview\.mp3$/.exec(key)
      if (!previewMatch) {
        throw new HttpError(
          400,
          'Preview keys must match `previews/<uuid>-preview.mp3`. Deletion aborted.'
        )
      }
      const soundId = previewMatch[1]
      const { data: liveRow, error: lookupError } = await supabaseAdmin
        .from('sound_files')
        .select('id, name')
        .eq('id', soundId)
        .maybeSingle()
      if (lookupError) {
        console.error('[admin/orphan-delete] preview DB lookup failed', lookupError)
        throw new HttpError(500, 'Could not verify orphan status before deletion.')
      }
      if (liveRow) {
        console.warn('[admin/orphan-delete] refused — preview belongs to live sound', {
          adminId: user.id,
          key,
          soundId,
        })
        throw new HttpError(
          409,
          `Refused: the sound_files row "${liveRow.name}" (id ${liveRow.id}) is still live. ` +
            'This preview belongs to a real sound — use the regular delete flow.'
        )
      }
    } else {
      const { data: matchingRow, error: lookupError } = await supabaseAdmin
        .from('sound_files')
        .select('id, name, path')
        .eq('path', key)
        .maybeSingle()
      if (lookupError) {
        console.error('[admin/orphan-delete] DB lookup failed', lookupError)
        throw new HttpError(500, 'Could not verify orphan status before deletion.')
      }
      if (matchingRow) {
        console.warn('[admin/orphan-delete] refused — key is referenced', {
          adminId: user.id,
          key,
          rowId: matchingRow.id,
        })
        throw new HttpError(
          409,
          `Refused: a sound_files row (${matchingRow.id} — "${matchingRow.name}") still ` +
            'references this key. Use the regular delete flow to remove both at once.'
        )
      }
    }

    const env = readR2Env()
    const bucketName = pickBucket(env, bucketParam)
    const client = new AwsClient({
      accessKeyId: env.accessKeyId,
      secretAccessKey: env.secretAccessKey,
    })

    const url = `https://${bucketName}.${env.accountId}.r2.cloudflarestorage.com/${key}`
    const signed = await client.sign(new Request(url, { method: 'DELETE' }), {
      aws: { signQuery: true },
    })
    const r2Res = await fetch(signed)
    const bodyText = await r2Res.text().catch(() => '')

    if (/<Error>[\s\S]*<\/Error>/i.test(bodyText)) {
      console.error('[admin/orphan-delete] R2 returned XML error body', {
        status: r2Res.status,
        bodyExcerpt: bodyText.slice(0, 600),
        bucket: bucketName,
        key,
      })
      throw new HttpError(
        500,
        `R2 returned an error body (HTTP ${r2Res.status}): ${bodyText.slice(0, 300)}`
      )
    }
    if (!r2Res.ok && r2Res.status !== 404) {
      console.error('[admin/orphan-delete] R2 delete failed', {
        status: r2Res.status,
        body: bodyText.slice(0, 500),
        bucket: bucketName,
        key,
      })
      throw new HttpError(r2Res.status, `R2 deletion failed: ${bodyText.slice(0, 200)}`)
    }

    const headSigned = await client.sign(new Request(url, { method: 'HEAD' }), {
      aws: { signQuery: true },
    })
    const headRes = await fetch(headSigned)
    if (headRes.status !== 404) {
      console.error('[admin/orphan-delete] post-delete HEAD still resolves', {
        headStatus: headRes.status,
        bucket: bucketName,
        key,
      })
      throw new HttpError(
        500,
        `R2 reported delete success (HTTP ${r2Res.status}) but a follow-up HEAD on the same ` +
          `key returned ${headRes.status}. The object is still present. Likely causes: bucket ` +
          `has object versioning enabled, or the LIST/DELETE bucket configuration is ` +
          `mismatched. Check the server logs and your R2_BUCKET_NAME / R2_PREVIEW_BUCKET_NAME ` +
          `env vars.`
      )
    }

    console.info('[admin/orphan-delete] success', {
      adminId: user.id,
      adminEmail: user.email,
      bucket: bucketParam === 'preview' ? 'preview' : 'main',
      bucketName,
      key,
      r2DeleteStatus: r2Res.status,
      postDeleteHeadStatus: headRes.status,
    })

    return jsonOk(request, {
      success: true,
      deleted: { key },
      diag: {
        bucket: bucketParam === 'preview' ? 'preview' : 'main',
        bucketName,
        r2DeleteStatus: r2Res.status,
        postDeleteHeadStatus: headRes.status,
      },
    })
  } catch (error) {
    return jsonError(request, error)
  }
}
