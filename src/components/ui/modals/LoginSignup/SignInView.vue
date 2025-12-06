<template>
  <div class="flex flex-col w-full space-y-3">
    <label for="email" class="sr-only">Email</label>
    <BaseInput
      id="email"
      class="w-full"
      v-model="email"
      type="email"
      name="email"
      placeholder="your@email.com"
      autocomplete="email"
      required
      data-test="login-email-input"
    />

    <label for="password" class="sr-only">Password</label>
    <div class="relative w-full">
      <PasswordInput
        id="password"
        name="password"
        v-model="password"
        autocomplete="current-password"
        data-test="login-password-input"
      />
    </div>

    <span class="h-3"></span>
    <BaseButton
      class="w-full"
      @click="emit('signIn', { email, password })"
      :disabled="loading || !email || !password"
      data-test="login-submit-button"
    >
      Sign In
    </BaseButton>

    <span
      v-if="errorMessage"
      id="signin-error"
      class="text-status-danger text-sm"
      role="alert"
      aria-live="assertive"
    >
      {{ errorMessage }}
    </span>
  </div>
</template>


<script setup>
import { ref } from 'vue'

import BaseButton from '@/components/ui/input/BaseButton.vue'
import BaseInput from '@/components/ui/input/BaseInput.vue'
import PasswordInput from '@/components/ui/input/PasswordInput.vue' 

const emit = defineEmits(['signIn', 'toggleLogging'])

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

 