const PLAN_PRICE_MAPPING = {
  basic: process.env.STRIPE_BASIC_PRICE_ID,
  pro: process.env.STRIPE_PRO_PRICE_ID,
}

const PRICE_PLAN_MAPPING = Object.entries(PLAN_PRICE_MAPPING).reduce((acc, [plan, priceId]) => {
  if (priceId) acc[priceId] = plan
  return acc
}, {})

export function normalizePlanId(value) {
  if (!value) return null
  const normalized = String(value).toLowerCase()
  if (normalized === 'free' || normalized === 'basic' || normalized === 'pro') {
    return normalized
  }
  return null
}

export function getPlanFromPriceId(priceId) {
  if (!priceId) return null
  return PRICE_PLAN_MAPPING[priceId] ?? null
}

export function extractCustomerId(customer) {
  if (!customer) return null
  if (typeof customer === 'string') return customer
  return customer.id ?? null
}

export function extractSubscriptionId(subscription) {
  if (!subscription) return null
  if (typeof subscription === 'string') return subscription
  return subscription.id ?? null
}

export function normalizePlanFromSubscription(subscription) {
  if (!subscription) {
    return null
  }

  const priceItem = subscription.items?.data?.[0] ?? null
  const price = priceItem?.price ?? null

  const planFromPriceMetadata =
    normalizePlanId(price?.metadata?.planId) ?? normalizePlanId(price?.metadata?.tier)
  if (planFromPriceMetadata) {
    return planFromPriceMetadata
  }

  const planFromPriceId = getPlanFromPriceId(price?.id)
  if (planFromPriceId) {
    return planFromPriceId
  }

  const planFromSubscriptionMetadata =
    normalizePlanId(subscription.metadata?.planId) ?? normalizePlanId(subscription.metadata?.tier)
  if (planFromSubscriptionMetadata) {
    return planFromSubscriptionMetadata
  }

  return null
}

export async function resolveSubscription(subscription, stripeClient) {
  if (!subscription) {
    return null
  }

  if (typeof subscription !== 'string') {
    if (subscription.items?.data?.length) {
      return subscription
    }

    if (!stripeClient) {
      return subscription
    }

    try {
      return await stripeClient.subscriptions.retrieve(subscription.id, { expand: ['items'] })
    } catch (error) {
      console.warn('Failed to refresh subscription with items', error)
      return subscription
    }
  }

  if (!stripeClient) {
    return null
  }

  try {
    return await stripeClient.subscriptions.retrieve(subscription, { expand: ['items'] })
  } catch (error) {
    console.warn('Failed to retrieve subscription', error)
    return null
  }
}

function normalizePlanFromSessionMetadata(session) {
  if (!session) {
    return null
  }

  const fromMetadata = normalizePlanId(session.metadata?.planId) ?? normalizePlanId(session.metadata?.tier)
  if (fromMetadata) {
    return fromMetadata
  }

  const priceMetadataTier = normalizePlanId(session.metadata?.priceTier)
  if (priceMetadataTier) {
    return priceMetadataTier
  }

  const planFromPrice = getPlanFromPriceId(session.metadata?.priceId)
  if (planFromPrice) {
    return planFromPrice
  }

  return null
}

export async function resolvePlanFromCheckoutSession(session, stripeClient) {
  if (!session) {
    return { plan: 'free', subscriptionId: null }
  }

  const subscriptionIdFromSession = extractSubscriptionId(session.subscription)
  const planFromSession = normalizePlanFromSessionMetadata(session)

  if (planFromSession) {
    return { plan: planFromSession, subscriptionId: subscriptionIdFromSession }
  }

  const subscription = await resolveSubscription(session.subscription, stripeClient)
  const subscriptionPlan = normalizePlanFromSubscription(subscription)
  const subscriptionId = extractSubscriptionId(subscription) ?? subscriptionIdFromSession

  if (subscriptionPlan) {
    return { plan: subscriptionPlan, subscriptionId }
  }

  if (!subscriptionId) {
    return { plan: 'free', subscriptionId: null }
  }

  return { plan: undefined, subscriptionId }
}

export { PLAN_PRICE_MAPPING }
