<!-- LoginModal.vue -->
<template>
  <SmallModalBase
  :title="title"
  :canClickOutside="false"
  :showCloseButton="true"
  @close="router.push('/')"
  >
    <div class="flex flex-col items-center justify-center text-center h-full px-6 space-y-6 w-full">
      <SignInView
        v-if="mode === 'login'"
        @signIn="resetPassword"
        @googleAuth="handleGoogleAuth"
      />
      <SignUpView
        v-if="mode === 'signup'"
        @signUp="signUpNewUser"
        @googleAuth="handleGoogleAuth"
      />
      <ResetView
        v-if="mode === 'reset'"
        @resetPassword="signInWithEmail"
        @backToLogin="$emit('mode', 'login')"
      />

      <RouterLink v-if="mode !== 'reset'"
        :to="mode === 'login' ? '/signup' : '/login'"
        @click="emit('mode', mode === 'login' ? 'signup' : 'login')"
        class="text-sm text-blue-500 cursor-pointer"
        >
        {{ mode === 'login' ? 'Don\'t have an account? Sign Up' : 'Have an account? Sign In' }}
      </RouterLink>

      <RouterLink
        v-if="mode === 'login'"
        to="/reset"
        @click="$emit('mode', 'reset')"
        class="text-sm text-blue-500 cursor-pointer"
      >
        Forgot Password?
      </RouterLink>
    </div>
    
  </SmallModalBase>

</template>

<script setup>
import { computed } from 'vue'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'vue-router'
import SmallModalBase from '@/components/ui/modals/SmallModalBase.vue'
import SignInView from '@/components/ui/modals/LoginSignup/SignInView.vue'
import SignUpView from '@/components/ui/modals/LoginSignup/SignUpView.vue'
import ResetView from '@/components/ui/modals/LoginSignup/ResetView.vue'

const props = defineProps({
  mode: {
    type: String,
    default: 'signup', // 'login' | 'signup' | 'reset'
  },
})

const emit = defineEmits(['mode'])

const router = useRouter()
const title = computed(() => {
  return props.mode.charAt(0).toUpperCase() + props.mode.slice(1)
})

async function signUpNewUser({ email, password }) {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: 'http://localhost:4000',
    },
  })

  if (error) {
    console.error('Error signing up:', error.message)
    return
  }
}

async function signInWithEmail({ email, password }) {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) {
    console.error('Error signing in:', error.message)
    return
  }
}

async function handleGoogleAuth() {
  supabase.auth.signInWithOAuth({
    provider: 'google',
  })
}

async function resetPassword(email) {
  /* const { error } = await supabase.auth.resetPasswordForEmail('valid.email@supabase.io', {
    redirectTo: 'http://localhost:4000/account/update-password',
  })
  if (error) {
    console.error('Error resetting password:', error.message)
    return
  } */
}
</script>

