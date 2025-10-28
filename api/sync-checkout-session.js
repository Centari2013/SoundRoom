import { corsHeaders, jsonResponse } from './_utils/http.js'
import { stripe } from './_utils/serverClients.js'
import { getPlanFromPriceId, normalizePlanId } from './_utils/stripePlans.js'
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

    let plan = normalizePlanId(session.metadata?.planId)

    let subscription = null

    if (typeof session.subscription === 'string') {
      subscription = await stripe.subscriptions.retrieve(session.subscription, {
        expand: ['items'],
      })
    } else if (session.subscription) {
      subscription = session.subscription
    }

    if (!plan) {
      const priceId = subscription?.items?.data?.[0]?.price?.id
      const planFromPrice = getPlanFromPriceId(priceId)
      plan = planFromPrice ?? 'free'
    }

    const normalizedPlan = normalizePlanId(plan) ?? 'free'

    const customerId = extractCustomerId(session.customer)
    const subscriptionId = normalizedPlan === 'free' ? null : extractSubscriptionId(subscription)

    try {
      await updateUserPlanTier({
        userId,
        plan: normalizedPlan,
        customerId,
        subscriptionId,
      })
    } catch (error) {
      console.error('Failed to persist user plan tier after checkout session sync', error)
      return jsonResponse({ error: 'Failed to finalize plan' }, { status: 500 })
    }

    return jsonResponse({ status: 'ok', plan: normalizedPlan })
  } catch (error) {
    console.error('Failed to sync checkout session', error)
    return jsonResponse({ error: 'Failed to sync checkout session' }, { status: 500 })
  }
}

function extractCustomerId(customer) {
  if (!customer) return null
  if (typeof customer === 'string') return customer
  return customer.id ?? null
}

function extractSubscriptionId(subscription) {
  if (!subscription) return null
  if (typeof subscription === 'string') return subscription
  return subscription.id ?? null
}
