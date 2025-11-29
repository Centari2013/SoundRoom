<template>
  <div class="auth-callback w-full bg-surface-app text-text-primary">
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/utils/supabase'
const router = useRouter()

onMounted(async () => { 
  const { data, error } = await supabase.auth.getSession()

  if (data.session) {
    // User is logged in, proceed with fetching user profile
    sessionStorage.setItem('justLoggedIn', 'true')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Fallbacks from OAuth metadata
    const fallbackDisplayName = user.user_metadata.full_name || user.user_metadata.name || 'Roomie'
    const fallbackAvatar = user.user_metadata.avatar_url || null

    // Fetch from your custom `users` table
    const { data: profile, error } = await supabase
      .from('users')
      .select('avatar_url, display_name')
      .eq('id', user.id)
      .single()

    const finalProfile = {
      display_name: profile?.display_name || fallbackDisplayName,
      avatar_url: profile?.avatar_url || fallbackAvatar
    }

    localStorage.setItem('userProfile', JSON.stringify(finalProfile))
    router.push({ name: 'app' })


  } else {
    console.error('Login failed:', error)
    router.push({ name: 'auth-error' })
  }
})

</script>

<style scoped>
.auth-callback {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100dvh;
  font-size: 1.2rem;
  color: var(--color-text-muted);
}
</style>
