import { ref, readonly, computed } from 'vue'
import { supabase } from '@/utils/supabase'

const user = ref(null)

// Initialize the session
supabase.auth.getSession().then(({ data }) => {
  user.value = data.session?.user ?? null
})

// Keep in sync with auth state changes (login/logout)
supabase.auth.onAuthStateChange((_event, session) => {
  user.value = session?.user ?? null
})

export function useAuth() {
  return {
    user: readonly(user),
    isAuthenticated: computed(() => !!user.value), // ✅ this must be returned
    clearUser: () => (user.value = null)
  }
}
