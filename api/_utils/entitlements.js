export const PLAN_ORDER = ['free', 'basic', 'pro']

export const ENTITLEMENTS = {
  free: {
    canUpload: false,
  },
  basic: {
    canUpload: false,
  },
  pro: {
    canUpload: true,
  },
}

export function normalizePlan(plan) {
  const normalized = typeof plan === 'string' ? plan.toLowerCase() : 'free'

  if (normalized === 'users') {
    return 'users'
  }

  return PLAN_ORDER.includes(normalized) ? normalized : 'free'
}

export function getEntitlementsForPlan(plan) {
  const normalized = normalizePlan(plan)
  return ENTITLEMENTS[normalized] ?? ENTITLEMENTS.free
}

export function hasPlanAccess(userPlan, requiredPlan) {
  if (!requiredPlan) {
    return true
  }

  const normalizedRequired = normalizePlan(requiredPlan)

  if (normalizedRequired === 'users') {
    return false
  }

  const userRank = PLAN_ORDER.indexOf(normalizePlan(userPlan))
  const requiredRank = PLAN_ORDER.indexOf(normalizedRequired)

  if (requiredRank === -1) {
    return false
  }

  return userRank >= requiredRank
}

export function resolveRequiredPlan(soundFile, fallbackBase) {
  if (!soundFile) {
    return normalizePlan(fallbackBase)
  }

  if (soundFile.required_plan) {
    return normalizePlan(soundFile.required_plan)
  }

  if (soundFile.requiredPlan) {
    return normalizePlan(soundFile.requiredPlan)
  }

  if (soundFile.plan_tier) {
    return normalizePlan(soundFile.plan_tier)
  }

  if (soundFile.base) {
    return normalizePlan(soundFile.base)
  }

  return normalizePlan(fallbackBase)
}
