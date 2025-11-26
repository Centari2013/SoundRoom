const tierOrder = ['free', 'basic', 'pro']

export function compareTiers(userTier = 'free', requiredTier = 'free') {
  const currentIndex = tierOrder.indexOf(String(userTier).toLowerCase())
  const requiredIndex = tierOrder.indexOf(String(requiredTier).toLowerCase())

  if (currentIndex === -1 || requiredIndex === -1) return 0
  return currentIndex - requiredIndex
}

export function formatTierLabel(tier = 'free') {
  const normalized = String(tier || 'free').toLowerCase()
  if (normalized === 'free') return 'Free'
  return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`
}

export const TIERS = tierOrder
