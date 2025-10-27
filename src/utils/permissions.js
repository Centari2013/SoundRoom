// permissions.js
import { ENTITLEMENTS } from '@/constants/entitlements'

export function can(plan, feature) {
  const e = ENTITLEMENTS[plan] || ENTITLEMENTS.free
  return !!e[feature] // e.g. e.canUpload, e.timedLoops
}

export function limit(plan, key) {
  const e = ENTITLEMENTS[plan] || ENTITLEMENTS.free
  return e[key] ?? 0 // e.g. e.maxSavedRooms
}
