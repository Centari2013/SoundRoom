import { Buffer } from 'node:buffer'
import { corsHeaders, jsonResponse } from './_utils/http.js'
import { stripe } from './_utils/serverClients.js'
import { getPlanFromPriceId, normalizePlanId } from './_utils/stripePlans.js'
import { resolveUserForStripe, updateUserPlanTier } from './_utils/userPlan.js'

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

  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
  const customerEmail =
    session.customer_details?.email ||
    session.customer_email ||
    (typeof session.customer === 'object' ? session.customer?.email : null)

  const resolvedUserId = await resolveUserForStripe({
    userId: session.client_reference_id || session.metadata?.userId,
    customerId,
    customerEmail,
  })

  if (!resolvedUserId) {
    console.warn('Unable to resolve user for checkout session', session.id)
    return
  }

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
    plan = await resolvePlanFromPrice(priceId)
  }

  if (!plan && Array.isArray(session.display_items) && session.display_items.length > 0) {
    const priceId = session.display_items[0]?.price?.id
    plan = await resolvePlanFromPrice(priceId)
  }

  await updateUserPlanTier({
    userId: resolvedUserId,
    plan,
    customerId,
    subscriptionId,
  })
}

async function handleSubscriptionEvent(subscription) {
  if (!subscription) return

  const status = subscription.status
  let plan = null

  if (status === 'active' || status === 'trialing') {
    const priceId = subscription.items?.data?.[0]?.price?.id
    plan = (await resolvePlanFromPrice(priceId)) || normalizePlanId(subscription.metadata?.planId)
  } else {
    plan = 'free'
  }

  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id
  let customerEmail =
    subscription.customer_email ||
    (typeof subscription.customer === 'object' ? subscription.customer?.email : null)

  if (!customerEmail && customerId) {
    try {
      const customer = await stripe.customers.retrieve(customerId)
      customerEmail = customer?.email ?? null
    } catch (error) {
      console.warn('Failed to retrieve Stripe customer for email resolution', error)
    }
  }

  const resolvedUserId = await resolveUserForStripe({
    userId: subscription.metadata?.userId,
    customerId,
    customerEmail,
  })

  if (!resolvedUserId) {
    console.warn('Unable to resolve user for subscription event', subscription.id)
    return
  }

  const subscriptionIdValue = plan === 'free' ? null : subscription.id

  await updateUserPlanTier({
    userId: resolvedUserId,
    plan,
    customerId,
    subscriptionId: subscriptionIdValue,
  })
}

async function resolvePlanFromPrice(priceId) {
  if (!priceId) return null

  const mapped = getPlanFromPriceId(priceId)
  if (mapped) return mapped

  if (!stripe) return null

  try {
    const price = await stripe.prices.retrieve(priceId, { expand: ['product'] })
    return (
      normalizePlanId(price?.metadata?.planId) ||
      normalizePlanId(price?.product?.metadata?.planId) ||
      null
    )
  } catch (error) {
    console.warn('Failed to resolve plan from Stripe price metadata', error)
    return null
  }
}
