import { PLANS } from '@/constants/entitlements'

const PLAN_INDEX = PLANS.reduce((acc, plan, index) => {
  acc[plan] = index
  return acc
}, {})

const SOUND_TIER_FEATURE = {
  basic: 'curatedPacks',
  pro: 'allPacks',
  users: 'canUpload'
}

function normalizeSoundTier(rawTier) {
  if (!rawTier) return 'free'
  const tier = String(rawTier).toLowerCase()
  if (tier === 'user' || tier === 'users') return 'users'
  return PLANS.includes(tier) ? tier : 'free'
}

function normalizeUserTier(rawTier) {
  if (!rawTier) return 'free'
  const tier = String(rawTier).toLowerCase()
  return PLANS.includes(tier) ? tier : 'free'
}

function getPlanRank(plan) {
  return PLAN_INDEX[plan] ?? -1
}

/**
 * Determine whether the current user can access a given sound based on plan tier and ownership.
 *
 * @param {Object} sound - raw sound record from the database
 * @param {{ userTier?: string, userId?: string }} [context]
 * @returns {{
 *   accessible: boolean,
 *   locked: boolean,
 *   isOwner: boolean,
 *   normalizedSoundTier: string,
 *   requiredPlan: string | null,
 *   entitlementFeature: string | null,
 *   reason: 'tier' | 'ownership' | null,
 *   canUpgrade: boolean
 * }}
 */
export function evaluateSoundAccess(sound, context = {}) {
  const normalizedSoundTier = normalizeSoundTier(sound?.plan_tier)
  const normalizedUserTier = normalizeUserTier(context.userTier)
  const ownerId = sound?.owner_id ?? null
  const currentUserId = context.userId ?? null
  const isOwner = Boolean(ownerId && currentUserId && ownerId === currentUserId)
  const userCanUpload = Boolean(context.canUpload)

  let accessible = true
  let reason = null

  if (normalizedSoundTier === 'users') {
    accessible = isOwner && userCanUpload
    if (!accessible) {
      reason = isOwner ? 'tier' : 'ownership'
    }
  } else if (!isOwner) {
    const soundRank = getPlanRank(normalizedSoundTier)
    if (soundRank >= 0) {
      const userRank = getPlanRank(normalizedUserTier)
      accessible = userRank >= soundRank
      reason = accessible ? null : 'tier'
    }
  }

  const requiredPlan = !accessible && reason === 'tier'
    ? (normalizedSoundTier === 'users' ? 'pro' : normalizedSoundTier)
    : null
  const entitlementFeature = SOUND_TIER_FEATURE[normalizedSoundTier] ?? null

  return {
    accessible,
    locked: !accessible,
    isOwner,
    normalizedSoundTier,
    requiredPlan,
    entitlementFeature,
    reason,
    canUpgrade: reason === 'tier'
  }
}

/**
 * Merge access metadata onto a sound record without mutating the original reference.
 *
 * @param {Object} sound
 * @param {{ userTier?: string, userId?: string }} [context]
 * @returns {Object}
 */
export function annotateSoundAccess(sound, context = {}) {
  const access = evaluateSoundAccess(sound, context)
  const derivedBase = sound?.base ?? sound?.plan_tier ?? (sound?.owner_id ? 'users' : 'free')
  return {
    ...sound,
    base: derivedBase,
    locked: access.locked,
    accessReason: access.reason,
    requiredPlan: access.requiredPlan,
    entitlementFeature: access.entitlementFeature,
    canUpgrade: access.canUpgrade
  }
}

/**
 * Filter a list of sounds down to the entries the current user can access.
 *
 * @param {Array<Object>} sounds
 * @param {{ userTier?: string, userId?: string }} [context]
 * @returns {Array<Object>}
 */
export function filterAccessibleSounds(sounds, context = {}) {
  return sounds.filter(sound => evaluateSoundAccess(sound, context).accessible)
}
