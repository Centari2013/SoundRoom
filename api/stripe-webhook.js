import { Buffer } from 'node:buffer'
import { corsHeaders, jsonResponse } from './_utils/http.js'
import { stripe } from './_utils/serverClients.js'
import { getPlanFromPriceId, normalizePlanId } from './_utils/stripePlans.js'
import { updateUserPlanTier } from './_utils/userPlan.js'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

if (!webhookSecret) {
  console.warn('Missing STRIPE_WEBHOOK_SECRET environment variable. Stripe webhooks will not be verified.')
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  })
}

export async function POST(request) {
  if (!stripe || !webhookSecret) {
    return jsonResponse({ error: 'Stripe webhook is not configured' }, { status: 500 })
  }

  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return jsonResponse({ error: 'Missing Stripe signature' }, { status: 400 })
  }

  let event

  try {
    const bodyBuffer = Buffer.from(await request.arrayBuffer())
    event = stripe.webhooks.constructEvent(bodyBuffer, signature, webhookSecret)
  } catch (error) {
    console.error('Stripe webhook signature verification failed', error)
    return jsonResponse({ error: `Webhook Error: ${error.message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object)
        break
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionEvent(event.data.object)
        break
      default:
        break
    }

    return jsonResponse({ received: true })
  } catch (error) {
    console.error('Error handling Stripe webhook', error)
    return jsonResponse({ error: 'Failed to process webhook' }, { status: 500 })
  }
}

async function handleCheckoutSessionCompleted(session) {
  if (!session) return
  if (session.payment_status && session.payment_status !== 'paid') return

  const userId = session.client_reference_id || session.metadata?.userId
  if (!userId) return

  let plan = normalizePlanId(session.metadata?.planId)

  let subscriptionId = null
  let subscription = null

  if (typeof session.subscription === 'string') {
    subscriptionId = session.subscription
  } else if (session.subscription) {
    subscriptionId = session.subscription.id
    subscription = session.subscription
  }

  if (!plan && subscriptionId) {
    subscription = subscription || (await stripe.subscriptions.retrieve(subscriptionId, { expand: ['items'] }))
    const priceId = subscription?.items?.data?.[0]?.price?.id
    plan = getPlanFromPriceId(priceId)
  }

  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id

  await updateUserPlanTier({
    userId,
    plan,
    customerId,
    subscriptionId,
  })
}

async function handleSubscriptionEvent(subscription) {
  if (!subscription) return

  const userId = subscription.metadata?.userId
  if (!userId) return

  const status = subscription.status
  let plan = null

  if (status === 'active' || status === 'trialing') {
    const priceId = subscription.items?.data?.[0]?.price?.id
    plan = getPlanFromPriceId(priceId) || normalizePlanId(subscription.metadata?.planId)
  } else {
    plan = 'free'
  }

  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id
  const subscriptionIdValue = plan === 'free' ? null : subscription.id

  await updateUserPlanTier({
    userId,
    plan,
    customerId,
    subscriptionId: subscriptionIdValue,
  })
}
