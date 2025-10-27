export const config = { runtime: 'nodejs' };

import { Buffer } from 'node:buffer'
import { corsHeaders, jsonResponse } from './_utils/http.js'
import { stripe } from './_utils/serverClients.js'
import { getPlanFromPriceId, normalizePlanId } from './_utils/stripePlans.js'
import { resolveUserForStripe, updateUserPlanTier } from './_utils/userPlan.js'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  })
}

export async function POST(request) {
  if (!stripe || !webhookSecret) {
    console.error('Stripe webhook invoked without required configuration')
    return jsonResponse({ error: 'Stripe webhook is not configured' }, { status: 500 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return jsonResponse({ error: 'Missing Stripe signature' }, { status: 400 })
  }

  let event

  try {
    const payload = Buffer.from(await request.arrayBuffer())
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
  } catch (error) {
    console.error('Invalid Stripe webhook signature', error)
    return jsonResponse({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        await handleCheckoutSessionCompleted(session)
        break
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object
        await handleSubscriptionUpdated(subscription)
        break
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        await handleSubscriptionDeleted(subscription)
        break
      }
      default:
        break
    }

    return jsonResponse({ received: true })
  } catch (error) {
    console.error('Error handling Stripe webhook event', error)
    return jsonResponse({ error: 'Failed to process webhook' }, { status: 500 })
  }
}

async function handleCheckoutSessionCompleted(session) {
  if (!session) return

  const customerId = extractCustomerId(session.customer)
  if (!customerId) {
    console.warn('Checkout session missing customer reference', session.id)
    return
  }

  const customerEmail = session.customer_details?.email ?? session.customer_email ?? null
  const referencedUserId = session.metadata?.userId ?? session.client_reference_id ?? null

  const userId = await resolveUserForStripe({
    userId: referencedUserId,
    customerId,
    customerEmail,
  })

  if (!userId) {
    console.warn('Unable to resolve user for checkout session', session.id)
    return
  }

  let plan = normalizePlanFromSession(session)

  if (!plan) {
    const subscription = await resolveSubscription(session.subscription)
    plan = normalizePlanFromSubscription(subscription)
  }

  const subscriptionId = extractSubscriptionId(session.subscription)

  await updateUserPlanTier({
    userId,
    plan,
    customerId,
    subscriptionId: plan === 'free' ? null : subscriptionId,
  })
}

async function handleSubscriptionUpdated(subscription) {
  if (!subscription) return

  const customerId = extractCustomerId(subscription.customer)
  if (!customerId) {
    console.warn('Subscription update missing customer reference', subscription.id)
    return
  }

  const customerEmail = subscription.customer_email ?? null
  const referencedUserId = subscription.metadata?.userId ?? null

  const userId = await resolveUserForStripe({
    userId: referencedUserId,
    customerId,
    customerEmail,
  })

  if (!userId) {
    console.warn('Unable to resolve user for subscription update', subscription.id)
    return
  }

  const plan = normalizePlanFromSubscription(subscription)

  await updateUserPlanTier({
    userId,
    plan,
    customerId,
    subscriptionId: plan === 'free' ? null : subscription.id,
  })
}

async function handleSubscriptionDeleted(subscription) {
  if (!subscription) return

  const customerId = extractCustomerId(subscription.customer)
  if (!customerId) {
    console.warn('Subscription deletion missing customer reference', subscription.id)
    return
  }

  const customerEmail = subscription.customer_email ?? null
  const referencedUserId = subscription.metadata?.userId ?? null

  const userId = await resolveUserForStripe({
    userId: referencedUserId,
    customerId,
    customerEmail,
  })

  if (!userId) {
    console.warn('Unable to resolve user for subscription deletion', subscription.id)
    return
  }

  await updateUserPlanTier({
    userId,
    plan: 'free',
    customerId,
    subscriptionId: null,
  })
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

async function resolveSubscription(subscription) {
  if (!subscription) {
    return null
  }

  if (typeof subscription !== 'string') {
    return subscription
  }

  if (!stripe) {
    return null
  }

  try {
    return await stripe.subscriptions.retrieve(subscription, {
      expand: ['items'],
    })
  } catch (error) {
    console.warn('Failed to retrieve subscription for checkout session', error)
    return null
  }
}

function normalizePlanFromSession(session) {
  if (!session) return null

  const fromMetadata = normalizePlanId(session.metadata?.planId) ?? normalizePlanId(session.metadata?.tier)
  if (fromMetadata) {
    return fromMetadata
  }

  const planFromPrice = getPlanFromPriceId(session.metadata?.priceId)
  if (planFromPrice) {
    return planFromPrice
  }

  return null
}

function normalizePlanFromSubscription(subscription) {
  if (!subscription) {
    return 'free'
  }

  const fromMetadata = normalizePlanId(subscription.metadata?.planId) ?? normalizePlanId(subscription.metadata?.tier)
  if (fromMetadata) {
    return fromMetadata
  }

  const priceMetadataTier = normalizePlanId(subscription.items?.data?.[0]?.price?.metadata?.planId) ??
    normalizePlanId(subscription.items?.data?.[0]?.price?.metadata?.tier)
  if (priceMetadataTier) {
    return priceMetadataTier
  }

  const priceId = subscription.items?.data?.[0]?.price?.id
  const planFromPrice = getPlanFromPriceId(priceId)
  if (planFromPrice) {
    return planFromPrice
  }

  return 'free'
}
