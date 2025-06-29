<!-- LoginModal.vue -->
<template>
  <div class="flex flex-col w-full space-y-3">
  <label for="email" class="sr-only">Email</label>
  <BaseInput
    id="email"
    class="w-full"
    v-model="email"
    type="email"
    placeholder="your@email.com"
    autocomplete="email"
    required
  />

  <label for="password" class="sr-only">Password</label>
  <div class="relative w-full">
    <PasswordInput
      :type="showPassword ? 'text' : 'password'"
      v-model="password"
    />

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
</div>
  
</template>

<script setup>
import { ref } from 'vue'

import EyeOpen from '@/assets/icons/eyeOpen.svg'
import EyeClosed from '@/assets/icons/eyeClosed.svg'

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

 