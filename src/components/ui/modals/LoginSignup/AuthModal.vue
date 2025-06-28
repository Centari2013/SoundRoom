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
import { computed, ref } from 'vue'
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
const loading = ref(false)
const errorMessage = ref('')
const router = useRouter()
const title = computed(() => {
  return props.mode === 'login' ? 'Sign In' : props.mode === 'signup' ? 'Sign Up' : 'Reset Password'
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
    return { error: updateError };
  }
  signUpSuccess.value = true;
  loading.value = false;
  return { data };
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

