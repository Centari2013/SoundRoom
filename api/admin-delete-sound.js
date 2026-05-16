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
 * DELETE /api/admin-delete-sound?id=<uuid>&confirm=<exact-name>
 *
 * Two safety gates beyond admin auth:
 *   1. The `id` must reference an existing sound_files row.
 *   2. The `confirm` query param must equal the row's `name` field
 *      exactly. The UI fills this by asking the user to type the
 *      sound's name; if anything goes wrong client-side, the server
 *      still won't delete an arbitrary sound by id.
 *
 * Operation order: R2 first, Supabase second. If R2 fails we don't
 * touch the DB; if Supabase fails after R2 succeeded we surface that
 * so the curator can manually clean up the row (better than a
 * silently-orphaned cloud file).
 */
export async function DELETE(request) {
  try {
    const { user } = await authenticateAdmin(request)

    if (!supabaseAdmin) {
      throw new HttpError(500, 'Supabase admin client is not configured.')
    }

    const { searchParams } = new URL(request.url)
    const id = (searchParams.get('id') || '').trim()
    const confirm = searchParams.get('confirm') || ''

    if (!id) {
      throw new HttpError(400, "Missing 'id' query param.")
    }

    // Fetch the row first so we know what we're about to destroy and
    // can verify the confirmation string matches.
    const { data: sound, error: fetchError } = await supabaseAdmin
      .from('sound_files')
      .select('id, name, path, bucket, plan_tier')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      console.error('[admin-delete] failed to fetch sound row', fetchError)
      throw new HttpError(500, 'Could not verify sound before deletion.')
    }

    if (!sound) {
      throw new HttpError(404, 'Sound not found.')
    }

    if (confirm !== sound.name) {
      console.warn('[admin-delete] confirmation mismatch', {
        adminId: user.id,
        soundId: id,
        expected: sound.name,
      })
      throw new HttpError(
        400,
        'Confirmation does not match the sound name. Deletion aborted.'
      )
    }

    const {
      R2_ACCESS_KEY_ID,
      R2_SECRET_ACCESS_KEY,
      R2_BUCKET_NAME,
      R2_PREVIEW_BUCKET_NAME,
      R2_ACCOUNT_ID,
    } = process.env

    if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_ACCOUNT_ID) {
      throw new HttpError(500, 'R2 storage is not configured on the server.')
    }

    const client = new AwsClient({
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    })

    // ── 1. Delete the main R2 file ─────────────────────────────────
    const objectKey = sound.path
    const mainUrl = `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${objectKey}`
    const signedMain = await client.sign(new Request(mainUrl, { method: 'DELETE' }), {
      aws: { signQuery: true },
    })
    const r2Res = await fetch(signedMain)
    // Always read the body — S3-compatible stores sometimes return 200
    // with an <Error> XML payload for malformed requests. Treat any
    // body containing <Error> as a real failure.
    const r2Body = await r2Res.text().catch(() => '')
    if (/<Error>[\s\S]*<\/Error>/i.test(r2Body)) {
      console.error('[admin-delete] R2 returned XML error body', {
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
      console.error('[admin-delete] R2 delete failed', {
        status: r2Res.status,
        body: r2Body.slice(0, 500),
        objectKey,
      })
      throw new HttpError(r2Res.status, `R2 deletion failed: ${r2Body.slice(0, 200)}`)
    }

    // Confirm the delete actually happened. If a HEAD after the DELETE
    // still resolves, refuse to remove the DB row — better to leave
    // the catalog intact and surface the storage problem than to
    // create a dangling DB row pointing at a phantom file.
    const headSignedMain = await client.sign(new Request(mainUrl, { method: 'HEAD' }), {
      aws: { signQuery: true },
    })
    const headRes = await fetch(headSignedMain)
    if (headRes.status !== 404) {
      console.error('[admin-delete] post-delete HEAD still resolves — object NOT deleted', {
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

    // ── 2. Best-effort delete of the preview file ───────────────────
    // Previews live in a separate bucket at `previews/<id>-preview.mp3`
    // (see api/generate-preview.js). If the bucket isn't configured or
    // the preview never existed we don't fail the whole operation —
    // a stray preview is harmless (no DB row references it after this
    // function returns) and the Orphan tab can clean any leftover.
    let previewDeletion = 'skipped'
    if (R2_PREVIEW_BUCKET_NAME) {
      const previewKey = `previews/${sound.id}-preview.mp3`
      const previewUrl = `https://${R2_PREVIEW_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${previewKey}`
      try {
        const signedPreview = await client.sign(new Request(previewUrl, { method: 'DELETE' }), {
          aws: { signQuery: true },
        })
        const previewRes = await fetch(signedPreview)
        if (previewRes.ok || previewRes.status === 404) {
          previewDeletion = previewRes.status === 404 ? 'not_found' : 'ok'
        } else {
          const body = await previewRes.text().catch(() => '')
          console.warn('[admin-delete] preview delete returned non-OK; continuing', {
            status: previewRes.status,
            body: body.slice(0, 200),
            previewKey,
          })
          previewDeletion = `error_${previewRes.status}`
        }
      } catch (err) {
        console.warn('[admin-delete] preview delete threw; continuing', err)
        previewDeletion = 'threw'
      }
    }

    // ── 3. Delete the Supabase row ──────────────────────────────────
    const { error: dbError } = await supabaseAdmin
      .from('sound_files')
      .delete()
      .eq('id', id)

    if (dbError) {
      console.error('[admin-delete] Supabase row delete failed AFTER R2 success', {
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

    console.info('[admin-delete] success', {
      adminId: user.id,
      adminEmail: user.email,
      soundId: id,
      soundName: sound.name,
      objectKey,
      previewDeletion,
    })

    return new Response(
      JSON.stringify({
        success: true,
        deleted: { id, name: sound.name, path: objectKey, previewDeletion },
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

    console.error('[admin-delete] unexpected error', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: {
        ...buildCorsHeaders(request, 'DELETE, OPTIONS'),
        'Content-Type': 'application/json',
      },
    })
  }
}
