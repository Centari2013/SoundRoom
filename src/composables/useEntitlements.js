import { computed } from 'vue'
import { PLANS } from '@/constants/entitlements'
import { PLAN_LABELS, getEntitlementCopy } from '@/constants/entitlementCopy'
import { limit as getPlanLimit } from '@/utils/permissions'
import { useAuth } from '@/composables/useAuth'
import { can } from '@/utils/permissions'
import { useEntitlementStore } from '@/stores/useEntitlementStore'

function findNextPlan(currentPlan, feature) {
  const startIndex = Math.max(PLANS.indexOf(currentPlan), 0)
  for (let i = startIndex + 1; i < PLANS.length; i += 1) {
    if (can(PLANS[i], feature)) return PLANS[i]
  }
  return PLANS[PLANS.length - 1] ?? null
}

function resolvePlanLabel(plan) {
  if (!plan) return 'Pro'
  return PLAN_LABELS[plan] ?? plan
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function formatLimitLabel(limit, featureName) {
  const normalized = featureName?.toLowerCase?.() ?? 'items'
  if (limit === 1) {
    return normalized.endsWith('s') ? `1 ${normalized.slice(0, -1)}` : `1 ${normalized}`
  }
  return `${limit} ${normalized}`
}

function findNextPlanWithHigherLimit(currentPlan, feature, currentUsage) {
  const startIndex = Math.max(PLANS.indexOf(currentPlan), 0)
  for (let i = startIndex + 1; i < PLANS.length; i += 1) {
    const plan = PLANS[i]
    const planLimit = getPlanLimit(plan, feature)
    if (planLimit === Infinity) return plan
    if (isFiniteNumber(planLimit) && planLimit > currentUsage) return plan
  }

  return PLANS[PLANS.length - 1] ?? null
}

export function useEntitlements() {
  const { tier } = useAuth()
  const entitlementStore = useEntitlementStore()

  const currentPlan = computed(() => tier.value ?? 'free')

  function canAccess(feature) {
    return can(currentPlan.value, feature)
  }

  function requireEntitlement(feature, options = {}) {
    if (canAccess(feature)) return true

    const targetPlan = options.requiredPlan || findNextPlan(currentPlan.value, feature)
    const planLabel = resolvePlanLabel(targetPlan)
    const copy = getEntitlementCopy(feature)

    entitlementStore.open({
      featureKey: feature,
      plan: planLabel,
      title: options.title ?? `Unlock ${copy.featureName}`,
      message: options.message ?? `Upgrade to the ${planLabel} plan to ${copy.action}.`
    })

    return false
  }

  function requireWithinLimit(feature, currentUsage, options = {}) {
    const limit = getPlanLimit(currentPlan.value, feature)

    if (limit === Infinity) return true
    if (!isFiniteNumber(limit)) return true
    if (currentUsage < limit) return true

    const copy = getEntitlementCopy(feature)
    const targetPlan = options.requiredPlan || findNextPlanWithHigherLimit(currentPlan.value, feature, currentUsage)
    const planLabel = resolvePlanLabel(targetPlan)
    const currentPlanLabel = resolvePlanLabel(currentPlan.value)
    const limitLabel = formatLimitLabel(limit, copy.featureName)
    const defaultTitle = `Save more ${copy.featureName}`
    const defaultMessage = `You've reached the limit of ${limitLabel} on the ${currentPlanLabel} plan. Upgrade to ${planLabel} to ${copy.action}.`

    entitlementStore.open({
      featureKey: feature,
      plan: planLabel,
      title: options.title ?? defaultTitle,
      message: options.message ?? defaultMessage
    })

    return false
  }

  return {
    currentPlan,
    canAccess,
    requireEntitlement,
    requireWithinLimit
  }
}
