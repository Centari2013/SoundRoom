// utils/userAuth.ts
import { ref, readonly, computed } from 'vue'
import { supabase } from '@/utils/supabase'
import { get } from 'http'

const user = ref(null)
const sessionLoaded = ref(false) // ✅ Track when session is ready

// On app init, fetch current session
supabase.auth.getSession().then(({ data }) => {
  user.value = data.session?.user ?? null
  sessionLoaded.value = true
})

// Listen for login/logout events
supabase.auth.onAuthStateChange((_event, session) => {
  user.value = session?.user ?? null
  sessionLoaded.value = true
})

const TIER_CACHE_KEY = 'userTier'
const CACHE_DURATION_MS = 1000 * 60 * 30 // 30 minutes

/**
 * Get user's tier, with caching and auto-refresh logic.
 * @param {string} userId - Supabase user ID
 * @param {boolean} forceRefresh - if true, bypasses cache
 * @returns {Promise<'free' | 'pro' | string>} - user's tier (default: 'free')
 */
export async function getUserTier(userId, forceRefresh = false) {
  if (!userId) return 'free'

  const cached = localStorage.getItem(TIER_CACHE_KEY)

  if (cached && !forceRefresh) {
    try {
      const { value, updatedAt } = JSON.parse(cached)
      const isFresh = Date.now() - updatedAt < CACHE_DURATION_MS
      if (isFresh) return value
    } catch (err) {
      console.warn('Tier cache corrupted, ignoring')
    }
  }

  const { data, error } = await supabase
    .from('users')
    .select('tier')
    .eq('id', userId)
    .single()

  const tier = data?.tier ?? 'free'

  localStorage.setItem(TIER_CACHE_KEY, JSON.stringify({
    value: tier,
    updatedAt: Date.now()
  }))

  return tier
}

/**
 * Provide reactive authentication state and helper utilities.
 *
 * @returns {{
 *   user: import('vue').Ref<any>,
 *   isAuthenticated: import('vue').ComputedRef<boolean>,
 *   sessionLoaded: import('vue').Ref<boolean>,
 *   clearUser: Function
 * }}
 */
export function useAuth() {
  return {
    user: readonly(user),
    isAuthenticated: computed(() => !!user.value),
    sessionLoaded: readonly(sessionLoaded), // expose for guards/UI delay
    clearUser: () => (user.value = null),
    getTier: (force = false) => getUserTier(user.value?.id, force)
  }
}
