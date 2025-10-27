import { supabaseAdmin } from './serverClients.js'
import { normalizePlanId } from './stripePlans.js'

const DEFAULT_PLAN = 'free'

export async function updateUserPlanTier({ userId, plan, customerId, subscriptionId }) {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not configured')
  }

  if (!userId) {
    throw new Error('Missing user reference for plan update')
  }

  const normalizedPlan = normalizePlanId(plan) ?? DEFAULT_PLAN

  const updatePayload = { plan_tier: normalizedPlan }

  if (customerId !== undefined) {
    updatePayload.stripe_customer_id = customerId
  }

  if (subscriptionId !== undefined) {
    updatePayload.stripe_subscription_id = subscriptionId
  }

  const { error } = await supabaseAdmin.from('users').update(updatePayload).eq('id', userId)

  if (error) {
    if (error.code === '42703') {
      const { error: fallbackError } = await supabaseAdmin
        .from('users')
        .update({ plan_tier: normalizedPlan })
        .eq('id', userId)

      if (fallbackError) {
        throw new Error(`Supabase plan update failed: ${fallbackError.message}`)
      }
    } else {
      throw new Error(`Supabase plan update failed: ${error.message}`)
    }
  }

  return normalizedPlan
}

export async function resolveUserForStripe({ userId, customerId, customerEmail }) {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not configured')
  }

  if (userId) {
    return userId
  }

  if (customerId) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle()

    if (!error && data?.id) {
      return data.id
    }
  }

  if (customerEmail) {
    try {
      const { data } = await supabaseAdmin.auth.admin.getUserByEmail(customerEmail)
      if (data?.user?.id) {
        return data.user.id
      }
    } catch (error) {
      console.warn('Failed to resolve user via Supabase auth email lookup', error)
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', customerEmail)
      .maybeSingle()

    if (!error && data?.id) {
      return data.id
    }
  }

  return null
}
