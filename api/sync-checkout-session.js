import { corsHeaders, jsonResponse } from './_utils/http.js'
import { stripe } from './_utils/serverClients.js'
import { extractCustomerId, resolvePlanFromCheckoutSession } from './_utils/stripePlans.js'
import { updateUserPlanTier } from './_utils/userPlan.js'

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  })
}

export async function POST(request) {
  if (!stripe) {
    return jsonResponse({ error: 'Stripe is not configured' }, { status: 500 })
  }

  let payload

  try {
    payload = await request.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const sessionId = typeof payload.sessionId === 'string' ? payload.sessionId.trim() : ''

  if (!sessionId) {
    return jsonResponse({ error: 'Missing sessionId' }, { status: 400 })
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'subscription.items'],
    })

    if (session.payment_status !== 'paid') {
      return jsonResponse({ status: 'pending' }, { status: 202 })
    }

    const userId = session.client_reference_id || session.metadata?.userId

    if (!userId) {
      return jsonResponse({ error: 'Checkout session is missing user reference' }, { status: 400 })
    }

    const { plan: resolvedPlan, subscriptionId: resolvedSubscriptionId } =
      await resolvePlanFromCheckoutSession(session, stripe)

    const customerId = extractCustomerId(session.customer)
    const planToPersist = resolvedPlan ?? (resolvedSubscriptionId ? undefined : 'free')
    const subscriptionId = planToPersist === 'free' ? null : resolvedSubscriptionId ?? null

    try {
      const persistedPlan = await updateUserPlanTier({
        userId,
        plan: planToPersist,
        customerId,
        subscriptionId,
      })

      if (planToPersist === undefined) {
        return jsonResponse({ status: 'pending' }, { status: 202 })
      }

      return jsonResponse({ status: 'ok', plan: persistedPlan ?? planToPersist ?? 'free' })
    } catch (error) {
      console.error('Failed to persist user plan tier after checkout session sync', error)
      return jsonResponse({ error: 'Failed to finalize plan' }, { status: 500 })
    }
  } catch (error) {
    console.error('Failed to sync checkout session', error)
    return jsonResponse({ error: 'Failed to sync checkout session' }, { status: 500 })
  }
}
