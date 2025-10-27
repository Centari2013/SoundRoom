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
