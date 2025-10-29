import { ref, readonly, computed } from 'vue'
import { supabase } from '@/utils/supabase'

/**
 * Current authenticated Supabase user (or null if logged out)
 * @type {import('vue').Ref<import('@supabase/supabase-js').User | null>}
 */
const user = ref(null)

/**
 * Flag to indicate if the session has been checked
 * (useful to prevent UI flashes before auth is loaded)
 * @type {import('vue').Ref<boolean>}
 */
const sessionLoaded = ref(false)

/**
 * Reactive user tier (e.g. 'free', 'pro')
 * Automatically loaded with session and kept in sync with cache
 * @type {import('vue').Ref<string>}
 */
const tier = ref('free')

const TIER_CACHE_KEY = 'userTier'
const CACHE_DURATION_MS = 1000 * 60 * 30 // 30 minutes

const hasBillingHistory = ref(false)

function writeTierToCache(newTier, billingHistory = hasBillingHistory.value) {
  const normalized = (newTier || 'free').toLowerCase()
  const normalizedBillingHistory = !!billingHistory

  localStorage.setItem(TIER_CACHE_KEY, JSON.stringify({
    value: normalized,
    hasBillingHistory: normalizedBillingHistory,
    updatedAt: Date.now()
  }))

  hasBillingHistory.value = normalizedBillingHistory

  return normalized
}

/**
 * Get the user's current tier from cache or database.
 *
 * @param {string} userId - Supabase user ID
 * @param {boolean} [forceRefresh=false] - If true, bypass cache and fetch fresh tier
 * @returns {Promise<string>} - Returns tier (e.g. 'free' or 'pro'), defaulting to 'free'
 */
export async function getUserTier(userId, forceRefresh = false) {
  if (!userId) return 'free'

  const cached = localStorage.getItem(TIER_CACHE_KEY)

  if (cached && !forceRefresh) {
    try {
      const { value, updatedAt, hasBillingHistory: cachedBillingHistory } = JSON.parse(cached)
      const isFresh = Date.now() - updatedAt < CACHE_DURATION_MS
      if (isFresh) {
        hasBillingHistory.value = !!cachedBillingHistory
        return value
      }
    } catch {
      console.warn('Invalid cached tier, ignoring')
    }
  }

  const { data } = await supabase
    .from('users')
    .select('plan_tier, stripe_customer_id')
    .eq('id', userId)
    .single()

  const newTier = data?.plan_tier ?? 'free'
  const billingHistory = Boolean(data?.stripe_customer_id)

  return writeTierToCache(newTier, billingHistory)
}

/**
 * Refresh the reactive tier value and cache, based on current user.
 *
 * @param {boolean} [force=false] - If true, bypass cache
 * @returns {Promise<void>}
 */
export async function refreshTier(force = false) {
  if (!user.value?.id) {
    tier.value = 'free'
    hasBillingHistory.value = false
    return
  }

  tier.value = await getUserTier(user.value.id, force)
}

/**
 * Immediately updates the reactive tier state and cache.
 *
 * @param {string} value
 */
function primeTier(value) {
  tier.value = writeTierToCache(value)
}

function primeBillingHistory(value) {
  writeTierToCache(tier.value, value)
}

// Initial session check
supabase.auth.getSession().then(({ data }) => {
  user.value = data.session?.user ?? null
  sessionLoaded.value = true
  if (user.value?.id) refreshTier()
})

// Listen for login/logout and update user/tier accordingly
supabase.auth.onAuthStateChange(async (_event, session) => {
  user.value = session?.user ?? null
  sessionLoaded.value = true
  if (user.value?.id) refreshTier(true)
  else tier.value = 'free'
})

refreshTier(true) // Initial tier load

/**
 * Composable hook to access current user, tier, and auth state.
 *
 * @returns {{
 *   user: Readonly<import('vue').Ref<import('@supabase/supabase-js').User | null>>,
 *   sessionLoaded: Readonly<import('vue').Ref<boolean>>,
 *   isAuthenticated: import('vue').ComputedRef<boolean>,
 *   tier: Readonly<import('vue').Ref<string>>,
 *   hasBillingHistory: Readonly<import('vue').Ref<boolean>>,
 *   getTier: (userId: string, forceRefresh?: boolean) => Promise<string>,
 *   refreshTier: (force?: boolean) => Promise<void>,
 *   primeTier: (value: string) => void,
 *   primeBillingHistory: (value: boolean) => void,
 *   clearUser: () => void
 * }}
 */
export function useAuth() {
  return {
    user: readonly(user),
    sessionLoaded: readonly(sessionLoaded),
    isAuthenticated: computed(() => !!user.value),
    tier: readonly(tier),
    hasBillingHistory: readonly(hasBillingHistory),
    getTier: getUserTier,
    refreshTier,
    primeTier,
    primeBillingHistory,
    clearUser: () => {
      user.value = null
      tier.value = 'free'
      hasBillingHistory.value = false
      localStorage.removeItem(TIER_CACHE_KEY)
    }
  }
}
