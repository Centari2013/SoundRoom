<template>
  <div class="flex flex-col w-full">
  <label for="reset-email" class="sr-only">Email address</label>
  <BaseInput
    id="reset-email"
    v-if="!sent"
    class="w-full"
    v-model="email"
    type="email"
    placeholder="Enter your email to reset password"
    required
    autocomplete="email"
    aria-describedby="reset-error"
  />

  <span class="h-3"></span>
  <p
    v-if="email && !validEmail"
    class="text-red-500 text-sm"
    id="reset-error"
    role="alert"
    aria-live="assertive"
  >
    Please enter a valid email address.
  </p>

  <span v-if="!sent" class="h-6"></span>
  <BaseButton
    v-if="!sent"
    class="w-full"
    @click="handleSendResetLink"
    :disabled="!email || !validEmail"
  >
    Send Reset Link
  </BaseButton>

  <p
    v-if="sent"
    class="text-green-500 text-sm"
    role="alert"
    aria-live="polite"
  >
    If you're a Roomie, you should receive a reset link in your email shortly.
  </p>
  <p
    v-if="errorMessage"
    class="text-red-500 text-sm"
    role="alert"
    aria-live="assertive"
  >
    {{ errorMessage }}
  </p>

  <BaseButton
    class="text-sm mt-2"
    :class="{ 'mt-6': sent, 'mt-2': !sent }"
    @click="emit('backToLogin')"
  >
    Back to Sign In
  </BaseButton>
</div>

</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { validateEmail } from '@/utils/validateData'
import BaseButton from '@/components/ui/input/BaseButton.vue'
import BaseInput from '@/components/ui/input/BaseInput.vue'

const emit = defineEmits(['resetPassword', 'backToLogin'])
defineProps({
  loading: {
    type: Boolean,
    default: false
  },
  sent: {
    type: Boolean,
    default: false
  },
  errorMessage: {
    type: String,
    default: ''
  }
})


const email = ref('')
const validEmail = ref(true)


watch(email, (newEmail) => {
  if (newEmail.length > 0) {
    validEmail.value = validateEmail(newEmail)
  }
})

const handleSendResetLink = () => {
  emit('resetPassword', email.value)
}
</script>
