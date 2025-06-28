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
        v-bind="{ loading, errorMessage }"
        @signIn="signInWithEmail"
        @googleAuth="handleGoogleAuth"
      />
      <SignUpView
        v-if="mode === 'signup'"
        v-bind="{ loading, errorMessage, signUpSuccess }"
        @signUp="signUpNewUser"
        @googleAuth="handleGoogleAuth"
      />
      <ResetView
        v-if="mode === 'reset'"
        @resetPassword="resetPassword"
        @backToLogin="$emit('mode', 'login')"
      />

      <RouterLink v-if="mode !== 'reset' && !signUpSuccess"
        :to="mode === 'login' ? '/signup' : '/login'"
        @click="emit('mode', mode === 'login' ? 'signup' : 'login')"
        class="text-sm text-blue-500 cursor-pointer"
        >
        {{ mode === 'login' ? 'Don\'t have an account? Sign Up' : mode === 'signup' ? 'Have an account? Sign In' : '' }}
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
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/utils/supabase'
import SmallModalBase from '@/components/ui/modals/SmallModalBase.vue'
import SignInView from '@/components/ui/modals/LoginSignup/SignInView.vue'
import SignUpView from '@/components/ui/modals/LoginSignup/SignUpView.vue'
import ResetView from '@/components/ui/modals/LoginSignup/ResetView.vue'

const mode = ref('login') // Default mode
const route = useRoute()

watch(
  () => route.path,
  (newPath) => {
    if (newPath.includes('signup')) mode.value = 'signup'
    else if (newPath.includes('reset')) mode.value = 'reset'
    else mode.value = 'login'
  },
  { immediate: true } // so it runs on first load
)


const emit = defineEmits(['mode'])
const loading = ref(false)
const errorMessage = ref('')
const router = useRouter()
const title = computed(() => {
  return mode.value === 'login' ? 'Sign In' : mode.value === 'signup' ? 'Sign Up' : 'Reset Password'
})

const signUpSuccess = ref(false)

async function signUpNewUser({ email, password, firstName, username }) {
  loading.value = true
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${location.origin}/login`,
    },
  });

  if (error) {
    errorMessage.value = error.message;
    console.error('Signup failed:', error.message);
    loading.value = false;
    return { error };
  }


  const userId = data.user?.id;
  if (!userId) {
    console.warn('No user ID returned after signup.');
    loading.value = false;
    return { error: new Error('No user ID returned.') };
  }

  // Update public.users with extra metadata
  const { error: updateError } = await supabase
    .from('users')
    .update({
      username,
      first_name: firstName,
    })
    .eq('id', userId);

  if (updateError) {
    console.error('Failed to update user metadata:', updateError.message);
    loading.value = false;
    errorMessage.value = updateError.message;
    return 
  }
  signUpSuccess.value = true;
  loading.value = false;
  return ;
}


async function signInWithEmail({ email, password }) {
  loading.value = true
  errorMessage.value = ''

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    errorMessage.value = error.message
    console.error('Error signing in:', error.message)
    loading.value = false
    return
  }

  // Check if email is confirmed
  if (!data.user.email_confirmed_at) {
    errorMessage.value = 'Please verify your email before signing in.'
    await supabase.auth.signOut()
    loading.value = false
    return
  }

  // Save session if needed (Supabase auto-handles localStorage by default)
  // But if you're storing anything extra (e.g. username), fetch it now
  const { data: profile } = await supabase
    .from('users')
    .select('username, avatar_url, first_name')
    .eq('id', data.user.id)
    .single()

  // Example: redirect to home
  router.push('/')
  loading.value = false
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

