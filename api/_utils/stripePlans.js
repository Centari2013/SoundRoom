const PLAN_PRICE_MAPPING = {
  basic: 'price_1SB0vsAMgU12pIQI2NT4UfnP',
  pro: 'price_1SB0yNAMgU12pIQIOPDh0581',
}

const PLAN_PRODUCT_MAPPING = {
  basic: 'prod_T7FQ16alcKlf3h',
  pro: 'prod_T7FTCaAkapuxmX',
}

const PRICE_PLAN_MAPPING = Object.entries(PLAN_PRICE_MAPPING).reduce((acc, [plan, priceId]) => {
  acc[priceId] = plan
  return acc
}, {})

const PRODUCT_PLAN_MAPPING = Object.entries(PLAN_PRODUCT_MAPPING).reduce(
  (acc, [plan, productId]) => {
    acc[productId] = plan
    return acc
  },
  {},
)

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

export function getPlanFromProductId(productId) {
  if (!productId) return null
  return PRODUCT_PLAN_MAPPING[productId] ?? null
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

  const fromMetadata =
    normalizePlanId(subscription.metadata?.planId) ?? normalizePlanId(subscription.metadata?.tier)
  if (fromMetadata) {
    return fromMetadata
  }

  const item = subscription.items?.data?.[0]
  const itemMetadataPlan =
    normalizePlanId(item?.metadata?.planId) ?? normalizePlanId(item?.metadata?.tier)
  if (itemMetadataPlan) {
    return itemMetadataPlan
  }

  const priceMetadataPlan =
    normalizePlanId(item?.price?.metadata?.planId) ?? normalizePlanId(item?.price?.metadata?.tier)
  if (priceMetadataPlan) {
    return priceMetadataPlan
  }

  const priceId = item?.price?.id ?? subscription.plan?.id
  const planFromPrice = getPlanFromPriceId(priceId)
  if (planFromPrice) {
    return planFromPrice
  }

  const productId = item?.price?.product ?? subscription.plan?.product
  const planFromProduct = getPlanFromProductId(productId)
  if (planFromProduct) {
    return planFromProduct
  }

  return null
}

function normalizePlanFromSessionMetadata(session) {
  if (!session) {
    return null
  }

  const fromMetadata =
    normalizePlanId(session.metadata?.planId) ?? normalizePlanId(session.metadata?.tier)
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

  const planFromProduct = getPlanFromProductId(session.metadata?.productId)
  if (planFromProduct) {
    return planFromProduct
  }

  return null
}

export function resolvePlanFromCheckoutSession(session) {
  if (!session) {
    return { plan: 'free', subscriptionId: null }
  }

  const subscriptionId = extractSubscriptionId(session.subscription)
  const planFromSession = normalizePlanFromSessionMetadata(session)

  if (planFromSession) {
    return { plan: planFromSession, subscriptionId }
  }

  const subscriptionPlan = normalizePlanFromSubscription(
    typeof session.subscription === 'object' ? session.subscription : null,
  )

  if (subscriptionPlan) {
    return { plan: subscriptionPlan, subscriptionId }
  }

  if (!subscriptionId) {
    return { plan: 'free', subscriptionId: null }
  }

  return { plan: undefined, subscriptionId }
}

export { PLAN_PRICE_MAPPING, PLAN_PRODUCT_MAPPING }
