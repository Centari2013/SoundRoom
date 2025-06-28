<!-- LoginModal.vue -->
<template>
  <div class="flex flex-col w-full space-y-3">
  <label for="email" class="sr-only">Email</label>
  <input
    id="email"
    class="w-full"
    v-model="email"
    type="email"
    placeholder="you@example.com"
    autocomplete="email"
    required
  />

  <label for="password" class="sr-only">Password</label>
  <div class="relative w-full">
    <input
      :type="showPassword ? 'text' : 'password'"
      id="password"
      class="w-full"
      v-model="password"
      placeholder="Password"
      autocomplete="current-password"
      required
      aria-describedby="signin-error"
    />
    <BaseButton
      class="absolute right-3 top-1/2 transform -translate-y-1/2 eye-button"
      @click="showPassword = !showPassword"
      :aria-label="showPassword ? 'Hide password' : 'Show password'"
    >
      <component :is="showPassword ? EyeOpen : EyeClosed" class="h-5 w-5 text-gray-500 dark:text-gray-800" />
    </BaseButton>
  </div>

  <span class="h-3"></span>
  <BaseButton
    class="w-full"
    @click="emit('signIn', { email, password })"
    :disabled="loading || !email || !password"
  >
    Sign In
  </BaseButton>

  <span
    v-if="errorMessage"
    id="signin-error"
    class="text-red-500 text-sm"
    role="alert"
    aria-live="assertive"
  >
    {{ errorMessage }}
  </span>

  <OrSpacer />

  <BaseButton
    class="w-full"
    @click="$emit('googleAuth')"
    :disabled="loading"
  >
    Sign in with Google
  </BaseButton>
</div>
  
</template>

<script setup>
import { ref } from 'vue'

import OrSpacer from '@/components/ui/modals/LoginSignup/OrSpacer.vue'
import EyeOpen from '@/assets/icons/eyeOpen.svg'
import EyeClosed from '@/assets/icons/eyeClosed.svg'

import BaseButton from '@/components/ui/input/BaseButton.vue'

const emit = defineEmits(['googleAuth', 'signIn', 'toggleLogging'])

defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
  errorMessage: {
    type: String,
    default: '',
  },
})

const email = ref('')
const password = ref('')
const showPassword = ref(false)

</script>

<style scoped>
.eye-button {
  background: none;
  
}
.eye-button:focus {
  outline: 2px solid #4a90e2; /* Focus ring color */
}
</style>  