import { computed } from 'vue'
import { PLANS } from '@/constants/entitlements'
import { PLAN_LABELS, getEntitlementCopy } from '@/constants/entitlementCopy'
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

  return {
    currentPlan,
    canAccess,
    requireEntitlement
  }
}
