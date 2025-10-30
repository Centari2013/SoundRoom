import { supabaseAdmin } from './serverClients.js'
import { HttpError } from './errors.js'
import { getEntitlementsForPlan, normalizePlan } from './entitlements.js'

export async function authenticateRequest(request) {
  if (!supabaseAdmin) {
    throw new HttpError(500, 'Supabase admin client is not configured')
  }

  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : ''

  if (!token) {
    throw new HttpError(401, 'Missing bearer token')
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !data?.user) {
    throw new HttpError(401, 'Invalid or expired access token')
  }

  return { user: data.user, token }
}

export async function getUserPlan(userId) {
  if (!supabaseAdmin) {
    throw new HttpError(500, 'Supabase admin client is not configured')
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('plan_tier')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('Failed to load user profile', error)
    throw new HttpError(500, 'Unable to load user profile')
  }

  return normalizePlan(data?.plan_tier)
}

export async function resolveUserAccessContext(userId) {
  const plan = await getUserPlan(userId)
  const entitlements = getEntitlementsForPlan(plan)

  return { plan, entitlements }
}
