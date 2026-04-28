<template>
  <div class="auth-callback w-full bg-surface-app text-text-primary">
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/utils/supabase'
const router = useRouter()
const route = useRoute()

function normalizeRedirectPath(input) {
  if (typeof input !== 'string') return ''
  const trimmed = input.trim()
  if (!trimmed.startsWith('/')) return ''
  if (trimmed.startsWith('//')) return ''
  return trimmed
}

function getPostAuthRouteTarget() {
  const redirectParam = Array.isArray(route.query.redirect)
    ? route.query.redirect[0]
    : route.query.redirect
  const planParam = Array.isArray(route.query.plan)
    ? route.query.plan[0]
    : route.query.plan
  const redirectPath = normalizeRedirectPath(redirectParam)

  if (!redirectPath) {
    return { name: 'app' }
  }

  const query = {}
  if (typeof planParam === 'string' && planParam.trim()) {
    query.plan = planParam.trim().toLowerCase()
  }

  return Object.keys(query).length > 0
    ? { path: redirectPath, query }
    : { path: redirectPath }
}

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
    router.push(getPostAuthRouteTarget())


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
