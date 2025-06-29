<template>
  <div class="auth-callback">
    <p>Completing login, please wait...</p>
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
    sessionStorage.setItem('justLoggedIn', 'true')
    router.push('/')
  } else {
    console.error('Login failed:', error)
    router.push('/auth/error')
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
  color: #666;
}
</style>
