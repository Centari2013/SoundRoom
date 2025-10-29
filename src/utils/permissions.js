// permissions.js
import { ENTITLEMENTS } from '@/constants/entitlements'
import { getThemeAvailabilityRank } from '@/constants/themes'

export function can(plan, feature) {
  const e = ENTITLEMENTS[plan] || ENTITLEMENTS.free
  return !!e[feature] // e.g. e.canUpload, e.timedLoops
}

export function limit(plan, key) {
  const e = ENTITLEMENTS[plan] || ENTITLEMENTS.free
  return e[key] ?? 0 // e.g. e.maxSavedRooms
}

export function themeAccessRank(plan) {
  const entitlementLevel = (ENTITLEMENTS[plan] || ENTITLEMENTS.free).themes
  return getThemeAvailabilityRank(entitlementLevel)
}

export function canUseTheme(plan, themeAvailability) {
  return themeAccessRank(plan) >= getThemeAvailabilityRank(themeAvailability)
}
