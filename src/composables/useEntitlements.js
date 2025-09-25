import { computed } from 'vue'
import { FEATURE_DEFINITIONS, FEATURE_MAP, PLAN_ORDER } from '@/constants/entitlements'
import { useAuth } from '@/composables/useAuth'

const EMPTY_ENTITLEMENT = Object.freeze({
  status: 'unavailable',
  detail: '',
  limit: null,
  flags: {}
})

const normalizeLimit = (limit) => {
  if (typeof limit === 'number') return limit
  if (limit === Infinity) return Infinity
  return null
}

const buildEntitlementsForTier = (tier) => {
  return FEATURE_DEFINITIONS.reduce((acc, feature) => {
    const tierConfig = feature.tiers?.[tier] ?? {}
    acc[feature.key] = {
      status: tierConfig.status ?? 'unavailable',
      detail: tierConfig.detail ?? '',
      limit: normalizeLimit(tierConfig.limit),
      flags: feature.flags ?? {}
    }
    return acc
  }, {})
}

export function useEntitlements() {
  const { tier } = useAuth()

  const currentTier = computed(() => {
    const normalized = tier?.value?.toLowerCase?.() ?? 'free'
    return PLAN_ORDER.includes(normalized) ? normalized : 'free'
  })

  const entitlements = computed(() => buildEntitlementsForTier(currentTier.value))

  const getFeatureEntitlement = (featureKey) => entitlements.value[featureKey] ?? EMPTY_ENTITLEMENT

  const getFeatureStatus = (featureKey) => getFeatureEntitlement(featureKey).status

  const getFeatureDetail = (featureKey) => getFeatureEntitlement(featureKey).detail

  const getFeatureLimit = (featureKey, fallback = null) => {
    const limit = getFeatureEntitlement(featureKey).limit
    return limit ?? fallback
  }

  const hasFeature = (featureKey) => getFeatureStatus(featureKey) === 'included'

  const hasLimitedAccess = (featureKey) => getFeatureStatus(featureKey) === 'limited'

  const isFeatureComingSoon = (featureKey) => !!(FEATURE_MAP[featureKey]?.flags?.comingSoon)

  return {
    currentTier,
    entitlements,
    getFeatureEntitlement,
    getFeatureStatus,
    getFeatureDetail,
    getFeatureLimit,
    hasFeature,
    hasLimitedAccess,
    isFeatureComingSoon
  }
}

export function getFeatureDefinition(featureKey) {
  return FEATURE_MAP[featureKey]
}
