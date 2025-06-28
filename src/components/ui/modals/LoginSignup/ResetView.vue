<template>
  <div class="flex flex-col w-full">
    <input v-if="!sent"
      class="w-full"
      v-model="email"
      type="email"
      placeholder="Enter your email to reset password"
    />

    <span class="h-3"></span>
    <p v-if="email && !validEmail" class="text-red-500 text-sm">
      Please enter a valid email address.
    </p>

    <span v-if="!sent" class="h-6"></span>

    <button v-if="!sent"
      class="w-full"
      @click="handleSendResetLink"
      :disabled="!email ||!validEmail"
    >
      Send Reset Link
    </button>

    <p v-if="sent" class="text-green-500 text-sm">
      If you're a Roomie, you should receive a reset link in your email shortly.
    </p>


    <button
      class="text-sm mt-2"
      :class="{'mt-6': sent, 'mt-2': !sent}"
      @click="emit('backToLogin')"
    >
      Back to Sign In
    </button>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { validateEmail } from '@/utils/validateData'
const emit = defineEmits(['resetPassword', 'backToLogin'])

const email = ref('')
const validEmail = ref(true)
const sent = ref(false)

watch(email, (newEmail) => {
  if (newEmail.length > 0) {
    validEmail.value = validateEmail(newEmail)
  }
})

const handleSendResetLink = () => {
  sent.value = true
  emit('resetPassword', email.value)
}
</script>
