import { authenticateRequest } from './auth.js'
import { HttpError } from './errors.js'

/**
 * Fail-closed admin gate.
 *
 * Requires the `ADMIN_USER_IDS` env var (comma-separated Supabase user
 * UUIDs). If the var is empty or missing, every admin endpoint
 * rejects with 403 — there is no implicit admin. This is deliberate:
 * we'd rather lock the curator out than let an arbitrary signed-in
 * user near destructive endpoints.
 *
 * @param {Request} request
 * @returns {Promise<{ user: Object, token: string }>}
 */
export async function authenticateAdmin(request) {
  const { user, token } = await authenticateRequest(request)

  const raw = process.env.ADMIN_USER_IDS || ''
  const adminIds = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  if (adminIds.length === 0) {
    console.warn('[admin] ADMIN_USER_IDS env var is empty — all admin endpoints will refuse requests')
    throw new HttpError(403, 'Admin endpoints are not configured on this deployment.')
  }

  if (!adminIds.includes(user.id)) {
    console.warn('[admin] Non-admin attempted admin endpoint', { userId: user.id, email: user.email })
    throw new HttpError(403, 'Admin access required.')
  }

  return { user, token }
}
