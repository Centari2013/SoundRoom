export const config = { runtime: 'nodejs' };

import { Buffer } from 'node:buffer'
import { corsHeaders, jsonResponse } from './_utils/http.js'
import { stripe } from './_utils/serverClients.js'
import {
  extractCustomerId,
  extractSubscriptionId,
  normalizePlanFromSubscription,
  resolvePlanFromCheckoutSession,
} from './_utils/stripePlans.js'
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

  const userId = await resolveUserForStripe({
    userId: session.metadata?.userId ?? null,
    customerId,
  })

  if (!userId) {
    console.warn('Unable to resolve user for checkout session', session.id)
    return
  }

  const { plan, subscriptionId } = resolvePlanFromCheckoutSession(session)

  await updateUserPlanTier({
    userId,
    plan: plan ?? (subscriptionId ? undefined : 'free'),
    customerId,
    subscriptionId: plan === 'free' ? null : subscriptionId ?? null,
  })
}

async function handleSubscriptionUpdated(subscription) {
  if (!subscription) return

  const customerId = extractCustomerId(subscription.customer)
  if (!customerId) {
    console.warn('Subscription update missing customer reference', subscription.id)
    return
  }

  const userId = await resolveUserForStripe({
    userId: subscription.metadata?.userId ?? null,
    customerId,
  })

  if (!userId) {
    console.warn('Unable to resolve user for subscription update', subscription.id)
    return
  }

  const subscriptionId = extractSubscriptionId(subscription)
  const status = subscription.status
  const isActiveStatus = ['trialing', 'active', 'past_due', 'unpaid'].includes(status)
  const derivedPlan = isActiveStatus ? normalizePlanFromSubscription(subscription) : 'free'
  const plan = derivedPlan ?? (isActiveStatus ? undefined : 'free')

  await updateUserPlanTier({
    userId,
    plan,
    customerId,
    subscriptionId: !plan || plan === 'free' ? null : subscriptionId,
  })
}

async function handleSubscriptionDeleted(subscription) {
  if (!subscription) return

  const customerId = extractCustomerId(subscription.customer)
  if (!customerId) {
    console.warn('Subscription deletion missing customer reference', subscription.id)
    return
  }

  const userId = await resolveUserForStripe({
    userId: subscription.metadata?.userId ?? null,
    customerId,
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
