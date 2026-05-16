import { supabase } from './supabaseClient'
import { buildApiUrl } from '@app/utils/apiBase'

/**
 * Attach the current Supabase access token to a fetch request.
 * Every admin endpoint requires Bearer auth.
 */
async function withAuthHeaders(extra = {}) {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()
  if (error) throw new Error(`Could not read Supabase session: ${error.message}`)
  const token = session?.access_token
  if (!token) throw new Error('Not signed in.')
  return {
    Authorization: `Bearer ${token}`,
    ...extra,
  }
}

async function readError(res) {
  try {
    const body = await res.json()
    return body?.error || `Request failed with status ${res.status}`
  } catch {
    return `Request failed with status ${res.status}`
  }
}

/**
 * Soft delete a sound by id. Requires the caller to pass the exact
 * `name` string (the server re-checks). Removes the R2 file first,
 * then the sound_files row.
 */
export async function deleteSound({ id, confirmName }) {
  const params = new URLSearchParams({ id, confirm: confirmName })
  const res = await fetch(buildApiUrl(`/api/admin-delete-sound?${params}`), {
    method: 'DELETE',
    headers: await withAuthHeaders(),
  })
  if (!res.ok) throw new Error(await readError(res))
  return res.json()
}

/**
 * Patch editable metadata fields on a sound. The server whitelists
 * fields; anything not allowed is silently dropped.
 */
export async function updateSound({ id, patch }) {
  const res = await fetch(buildApiUrl('/api/admin-update-sound'), {
    method: 'PATCH',
    headers: await withAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ id, patch }),
  })
  if (!res.ok) throw new Error(await readError(res))
  return res.json()
}

/**
 * List every object key in the requested R2 bucket. Used for orphan
 * detection. `bucket` defaults to 'main'; pass 'preview' to enumerate
 * the previews bucket.
 */
export async function listR2Keys({ bucket = 'main' } = {}) {
  const params = new URLSearchParams({ bucket })
  const res = await fetch(buildApiUrl(`/api/admin-list-r2-keys?${params}`), {
    method: 'GET',
    headers: await withAuthHeaders(),
  })
  if (!res.ok) throw new Error(await readError(res))
  return res.json()
}

/**
 * Delete an R2 key with no corresponding live sound_files row. Server
 * refuses if the key is still owned by a row: for `bucket=main` it
 * checks `path`; for `bucket=preview` it parses the soundId out of the
 * key and checks `id`.
 */
export async function deleteR2Orphan({ key, confirmKey, bucket = 'main' }) {
  const params = new URLSearchParams({ key, confirm: confirmKey, bucket })
  const res = await fetch(buildApiUrl(`/api/admin-delete-r2-orphan?${params}`), {
    method: 'DELETE',
    headers: await withAuthHeaders(),
  })
  if (!res.ok) throw new Error(await readError(res))
  return res.json()
}
