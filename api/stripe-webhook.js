import { Buffer } from 'node:buffer'
import { corsHeaders, jsonResponse } from './_utils/http.js'
import { stripe, supabaseAdmin } from './_utils/serverClients.js'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  })
}

export async function POST(request) {
  if (!stripe || !supabaseAdmin || !webhookSecret) {
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

  const user = await findUserByStripeCustomerId(customerId)
  if (!user) {
    console.warn('No Supabase user found for Stripe customer', customerId)
    return
  }

  const tier = normalizeTier(session.metadata?.tier) ?? 'basic'
  const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id

  await updateUser(user.id, {
    stripe_subscription_id: subscriptionId ?? null,
    tier,
  })
}

async function handleSubscriptionUpdated(subscription) {
  if (!subscription) return

  const customerId = extractCustomerId(subscription.customer)
  if (!customerId) {
    console.warn('Subscription update missing customer reference', subscription.id)
    return
  }

  const user = await findUserByStripeCustomerId(customerId)
  if (!user) {
    console.warn('No Supabase user found for Stripe customer', customerId)
    return
  }

  const tier =
    normalizeTier(subscription.metadata?.tier) ??
    normalizeTier(subscription.items?.data?.[0]?.price?.metadata?.tier) ??
    'basic'

  await updateUser(user.id, {
    stripe_subscription_id: subscription.id,
    tier,
  })
}

async function handleSubscriptionDeleted(subscription) {
  if (!subscription) return

  const customerId = extractCustomerId(subscription.customer)
  if (!customerId) {
    console.warn('Subscription deletion missing customer reference', subscription.id)
    return
  }

  const user = await findUserByStripeCustomerId(customerId)
  if (!user) {
    console.warn('No Supabase user found for Stripe customer', customerId)
    return
  }

  await updateUser(user.id, {
    stripe_subscription_id: null,
    tier: 'free',
  })
}

function extractCustomerId(customer) {
  if (!customer) return null
  if (typeof customer === 'string') return customer
  return customer.id ?? null
}

async function findUserByStripeCustomerId(customerId) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

async function updateUser(userId, updates) {
  const { error } = await supabaseAdmin.from('users').update(updates).eq('id', userId)

  if (error) {
    throw error
  }
}

function normalizeTier(tier) {
  if (typeof tier !== 'string') return null

  switch (tier.toLowerCase()) {
    case 'pro':
    case 'premium':
    case 'basic':
      return tier.toLowerCase()
    default:
      return null
  }
}
