<template>
  <form
    class="flex flex-col w-full space-y-3"
    @submit.prevent="handleSubmit"
    novalidate
  >
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
    />

    <label for="password" class="sr-only">Password</label>
    <div class="relative w-full">
      <PasswordInput
        id="password"
        name="password"
        v-model="password"
        autocomplete="current-password"
      />
    </div>

    <span class="h-3"></span>
    <BaseButton
      class="w-full"
      type="submit"
      :disabled="loading || !email || !password"
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
  </form>
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

function handleSubmit() {
  // Form submit (Enter or click): only fire when the button would be enabled.
  if (!email.value || !password.value) return
  emit('signIn', { email: email.value, password: password.value })
}

</script>

 