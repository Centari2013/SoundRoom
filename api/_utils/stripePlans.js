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

export { PLAN_PRICE_MAPPING }
