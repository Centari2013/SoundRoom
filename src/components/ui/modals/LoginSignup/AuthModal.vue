<!-- LoginModal.vue -->
<template>
  <SmallModalBase
  :title="title"
  :canClickOutside="false"
  :showCloseButton="true"
  @close="router.push('/app')"
  role="dialog"
  aria-modal="true"
  :aria-labelledby="'modal-title'"
>
  <div
    class="flex flex-col items-center justify-center text-center h-full px-6 space-y-6 w-full"
    :aria-describedby="'modal-description'"
  >
    <p id="modal-description" class="sr-only">
      Authentication modal: {{ title }} form. Use tab to navigate form fields.
    </p>

    <!-- Authentication Views -->
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
      @hideGoogleButton="(hide) => hideGoogleButton = hide"
    />
    <OrSpacer v-if="mode !== 'reset' && !hideGoogleButton" />
    <BaseButton
      v-if="mode !== 'reset' && !hideGoogleButton"
      class="w-full"
      @click="handleGoogleAuth"
      :disabled="loading"
    >
      Continue with Google
    </BaseButton>

    <p v-if="mode !== 'reset' && !hideGoogleButton" class="text-xs text-[var(--color-text-muted)] text-center">
      By continuing, you agree to our
      <a href="/terms" target="_blank" class="underline">Terms</a> and
      <a href="/privacy" target="_blank" class="underline">Privacy Policy</a>.
    </p>
    <ResetView
      v-if="mode === 'reset'"
      v-bind="{ loading, sent, errorMessage }"
      @resetPassword="resetPassword"
      @backToLogin="router.push('/login')"
    />

    <!-- Mode Switch Links -->
    <RouterLink
      v-if="mode !== 'reset' && !signUpSuccess"
      :to="mode === 'login' ? '/signup' : '/login'"
      @click="emit('mode', mode === 'login' ? 'signup' : 'login')"
      class="text-sm text-accent cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
    >
      {{ mode === 'login' ? 'Don\'t have an account? Sign Up' : 'Have an account? Sign In' }}
    </RouterLink>

    <RouterLink
      v-if="mode === 'login'"
      to="/reset"
      @click="$emit('mode', 'reset')"
      class="text-sm text-accent cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
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
import BaseButton from '@/components/ui/input/BaseButton.vue'
import OrSpacer from '@/components/ui/modals/LoginSignup/OrSpacer.vue'
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
const sent = ref(false) // For reset password view
const hideGoogleButton = ref(false) // To hide Google button in SignUpView
const errorMessage = ref('')
const router = useRouter()
const title = computed(() => {
  return mode.value === 'login' ? 'Sign In' : mode.value === 'signup' ? 'Sign Up' : 'Reset Password'
})

const resetErrorMessage = () => {
  errorMessage.value = ''
}


const signUpSuccess = ref(false)

async function signUpNewUser({ email, password, displayName }) {
  resetErrorMessage();
  loading.value = true;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${location.origin}/login`,
    },
  });

  const fakeUser = data?.user && data.user.identities?.length === 0;

  if (error || fakeUser) {
    const message = error?.message ?? 'User already exists. Try logging in instead.';

    errorMessage.value = message;
    console.warn('Signup failed or user exists:', message);

    loading.value = false;
    return { error: new Error(message) };
  }

  const userId = data.user?.id;
  if (!userId) {
    console.warn('No user ID returned after signup.');
    loading.value = false;
    return { error: new Error('No user ID returned.') };
  }

  const { error: updateError } = await supabase
    .from('users')
    .update({
      display_name: displayName,
    })
    .eq('id', userId);

  if (updateError) {
    console.error('Failed to update user metadata:', updateError.message);
    errorMessage.value = updateError.message;
    loading.value = false;
    return { error: updateError };
  }

  signUpSuccess.value = true;
  loading.value = false;
  return { success: true };
}



async function signInWithEmail({ email, password }) {
  loading.value = true
  resetErrorMessage();

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

  // If you're storing anything extra (e.g. username), fetch it now
  const { data: profile } = await supabase
    .from('users')
    .select('avatar_url, display_name')
    .eq('id', data.user.id)
    .single()

  localStorage.setItem('userProfile', JSON.stringify(profile))

  // Example: redirect to auth callback
  router.push('/auth/callback')
  loading.value = false
}


async function handleGoogleAuth() {
  resetErrorMessage();
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`, // Ensure this matches your OAuth redirect URI
      scopes: 'email openid profile',
      queryParams: {
        access_type: 'offline', // gets provider_refresh_token
        prompt: 'consent',      // forces consent screen (important)
      },
    },
  });
}


async function resetPassword(email) {
  resetErrorMessage();
  loading.value = true
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/update-password`,
  })
  if (error) {
    errorMessage.value = error.message
    console.error('Error resetting password:', error.message)
  }
  loading.value = false
  sent.value = true
}
</script>

