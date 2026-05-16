import { authenticateAdmin } from './_utils/adminAuth.js'
import { supabaseAdmin } from './_utils/serverClients.js'
import { HttpError } from './_utils/errors.js'
import { buildCorsHeaders } from './_utils/http.js'

// Whitelist of editable fields. NEVER allow `id`, `path`, `bucket`
// (wait — bucket IS editable for re-categorization), `created_at`,
// `mime_type`, `size`, `duration_seconds`, `owner_id`, `preview_url`.
// Anything that's tied to the actual file in R2 is locked.
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

export function OPTIONS(request) {
  return new Response(null, {
    status: 204,
    headers: buildCorsHeaders(request, 'PATCH, OPTIONS'),
  })
}

/**
 * PATCH /api/admin-update-sound
 * Body: { id: string, patch: { [field]: value, ... } }
 *
 * Only fields in EDITABLE_FIELDS are written; any other key in the
 * patch is silently dropped. No file/storage operations happen here —
 * this is metadata-only.
 */
export async function PATCH(request) {
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

    // Filter to whitelisted fields. Drop anything else without
    // erroring (forward-compatible if the client knows about a field
    // the server hasn't whitelisted yet).
    const safePatch = {}
    for (const [key, value] of Object.entries(patch)) {
      if (EDITABLE_FIELDS.has(key)) {
        safePatch[key] = value
      }
    }

    if (Object.keys(safePatch).length === 0) {
      throw new HttpError(400, 'No editable fields in patch.')
    }

    // Verify the row exists first so the curator gets a clear "not found"
    // instead of a silent zero-row update.
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('sound_files')
      .select('id, name')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      console.error('[admin-update] failed to fetch sound row', fetchError)
      throw new HttpError(500, 'Could not verify sound before update.')
    }

    if (!existing) {
      throw new HttpError(404, 'Sound not found.')
    }

    const { data, error } = await supabaseAdmin
      .from('sound_files')
      .update(safePatch)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[admin-update] update failed', error)
      throw new HttpError(500, `Update failed: ${error.message}`)
    }

    console.info('[admin-update] success', {
      adminId: user.id,
      adminEmail: user.email,
      soundId: id,
      changedFields: Object.keys(safePatch),
    })

    return new Response(JSON.stringify({ success: true, sound: data }), {
      status: 200,
      headers: {
        ...buildCorsHeaders(request, 'PATCH, OPTIONS'),
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    if (error instanceof HttpError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.status,
        headers: {
          ...buildCorsHeaders(request, 'PATCH, OPTIONS'),
          'Content-Type': 'application/json',
        },
      })
    }

    console.error('[admin-update] unexpected error', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: {
        ...buildCorsHeaders(request, 'PATCH, OPTIONS'),
        'Content-Type': 'application/json',
      },
    })
  }
}
