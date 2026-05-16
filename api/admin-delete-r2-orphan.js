import { AwsClient } from 'aws4fetch'
import { authenticateAdmin } from './_utils/adminAuth.js'
import { supabaseAdmin } from './_utils/serverClients.js'
import { HttpError } from './_utils/errors.js'
import { buildCorsHeaders } from './_utils/http.js'

export function OPTIONS(request) {
  return new Response(null, {
    status: 204,
    headers: buildCorsHeaders(request, 'DELETE, OPTIONS'),
  })
}

/**
 * DELETE /api/admin-delete-r2-orphan?key=<r2-key>&confirm=<exact-key>
 *
 * For deleting R2 files that have NO corresponding sound_files row.
 * Three safety gates beyond admin auth:
 *   1. The caller must echo the exact key back as `confirm`. UI asks
 *      the curator to type the key.
 *   2. The server re-checks Supabase: if a sound_files row exists for
 *      this path, the endpoint REFUSES to delete. This is the
 *      orphan-deletion endpoint — it must not touch live files. If
 *      you want to delete a row-backed file, use admin-delete-sound
 *      instead.
 *   3. R2 returns 404 if the file doesn't exist; we surface that as
 *      a 404 rather than reporting fake success.
 */
export async function DELETE(request) {
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
      console.warn('[admin-orphan-delete] confirmation mismatch', {
        adminId: user.id,
        expected: key,
      })
      throw new HttpError(
        400,
        'Confirmation does not match the R2 key. Deletion aborted.'
      )
    }

    // CRITICAL GUARD: ensure no sound_files row "owns" this object.
    // The relationship differs by bucket:
    //   - main bucket: rows reference R2 objects via `path`
    //   - preview bucket: previews are keyed as
    //     `previews/<soundId>-preview.mp3`, so we check by `id`
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
        console.error('[admin-orphan-delete] preview DB lookup failed', lookupError)
        throw new HttpError(500, 'Could not verify orphan status before deletion.')
      }
      if (liveRow) {
        console.warn('[admin-orphan-delete] refused — preview belongs to live sound', {
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
        console.error('[admin-orphan-delete] DB lookup failed', lookupError)
        throw new HttpError(500, 'Could not verify orphan status before deletion.')
      }

      if (matchingRow) {
        console.warn('[admin-orphan-delete] refused — key is referenced by sound_files row', {
          adminId: user.id,
          key,
          rowId: matchingRow.id,
        })
        throw new HttpError(
          409,
          `Refused: a sound_files row (${matchingRow.id} — "${matchingRow.name}") still references this key. ` +
            'Use the regular delete flow to remove both at once.'
        )
      }
    }

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

    let bucketName
    if (bucketParam === 'preview') {
      bucketName = R2_PREVIEW_BUCKET_NAME
      if (!bucketName) throw new HttpError(500, 'R2_PREVIEW_BUCKET_NAME is not configured.')
    } else {
      bucketName = R2_BUCKET_NAME
      if (!bucketName) throw new HttpError(500, 'R2_BUCKET_NAME is not configured.')
    }

    const client = new AwsClient({
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    })

    const url = `https://${bucketName}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`
    const signed = await client.sign(new Request(url, { method: 'DELETE' }), {
      aws: { signQuery: true },
    })

    const r2Res = await fetch(signed)
    // Always read the body — even on 2xx — because S3-compatible stores
    // sometimes return 200 with an <Error> XML payload for things like
    // SignatureDoesNotMatch. We treat any body containing `<Error>` as
    // a real failure regardless of the HTTP status code.
    const bodyText = await r2Res.text().catch(() => '')
    const looksLikeXmlError = /<Error>[\s\S]*<\/Error>/i.test(bodyText)

    if (looksLikeXmlError) {
      console.error('[admin-orphan-delete] R2 returned XML error body despite status', {
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
      console.error('[admin-orphan-delete] R2 delete failed', {
        status: r2Res.status,
        body: bodyText.slice(0, 500),
        bucket: bucketName,
        key,
      })
      throw new HttpError(r2Res.status, `R2 deletion failed: ${bodyText.slice(0, 200)}`)
    }

    // Belt-and-suspenders: a HEAD on the key after delete should return
    // 404. If it doesn't, the bucket is misconfigured (versioning?) or
    // the signed URL targeted a different object. Surface this so the
    // orphan-scan loop can stop early instead of looking like success.
    const headSigned = await client.sign(new Request(url, { method: 'HEAD' }), {
      aws: { signQuery: true },
    })
    const headRes = await fetch(headSigned)
    if (headRes.status !== 404) {
      console.error('[admin-orphan-delete] post-delete HEAD still resolves — object NOT deleted', {
        headStatus: headRes.status,
        bucket: bucketName,
        key,
      })
      throw new HttpError(
        500,
        `R2 reported delete success (HTTP ${r2Res.status}) but a follow-up HEAD on the same key ` +
          `returned ${headRes.status}. The object is still present. Likely causes: bucket has object ` +
          `versioning enabled, or the LIST/DELETE bucket configuration is mismatched. Check the ` +
          `server logs and your R2_BUCKET_NAME / R2_PREVIEW_BUCKET_NAME env vars.`
      )
    }

    console.info('[admin-orphan-delete] success', {
      adminId: user.id,
      adminEmail: user.email,
      bucket: bucketParam === 'preview' ? 'preview' : 'main',
      bucketName,
      key,
      r2DeleteStatus: r2Res.status,
      postDeleteHeadStatus: headRes.status,
    })

    return new Response(
      JSON.stringify({
        success: true,
        deleted: { key },
        // Diagnostics — surface to UI so we can see at a glance whether
        // R2 actually processed the delete (status, head check).
        diag: {
          bucket: bucketParam === 'preview' ? 'preview' : 'main',
          bucketName,
          r2DeleteStatus: r2Res.status,
          postDeleteHeadStatus: headRes.status,
        },
      }),
      {
        status: 200,
        headers: {
          ...buildCorsHeaders(request, 'DELETE, OPTIONS'),
          'Content-Type': 'application/json',
        },
      }
    )
  } catch (error) {
    if (error instanceof HttpError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.status,
        headers: {
          ...buildCorsHeaders(request, 'DELETE, OPTIONS'),
          'Content-Type': 'application/json',
        },
      })
    }

    console.error('[admin-orphan-delete] unexpected error', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: {
        ...buildCorsHeaders(request, 'DELETE, OPTIONS'),
        'Content-Type': 'application/json',
      },
    })
  }
}
