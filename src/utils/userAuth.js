// composables/useAuth.ts
import { ref, readonly, computed } from 'vue'
import { supabase } from '@/utils/supabase'

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

export function useAuth() {
  return {
    user: readonly(user),
    isAuthenticated: computed(() => !!user.value),
    sessionLoaded: readonly(sessionLoaded), // expose for guards/UI delay
    clearUser: () => (user.value = null)
  }
}
