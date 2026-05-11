<template>
  <!-- Each page is its own <form> so Enter advances the right action:
       page 0 → Continue, page 1 → Create Account. -->
  <form
    v-if="pageNumber === 0"
    class="flex flex-col w-full space-y-3"
    @submit.prevent="advanceToDetails"
    novalidate
  >
    <BaseInput
      name="email"
      class="w-full"
      v-model="email"
      type="email"
      placeholder="your@email.com"
      autocomplete="email"
    />

    <div class="relative w-full">
      <PasswordInput
        name="password"
        :type="showPassword ? 'text' : 'password'"
        v-model="password"
        autocomplete="new-password"
      />
    </div>

    <p v-if="email && !validEmail" class="text-status-danger text-sm">
      Please enter a valid email address.
    </p>
    <p v-if="password && !validPassword" class="text-status-danger text-sm">
      Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a symbol.
    </p>
    <span class="h-3"></span>
    <BaseButton
      class="w-full"
      type="submit"
      :disabled="!validEmail || !validPassword || !email || !password"
    >
      Continue
    </BaseButton>
  </form>

  <div v-else-if="signUpSuccess" class="flex flex-col w-full space-y-3">
    <p class="text-status-success text-sm">Sign up successful! Please check your email to verify your account.</p>
  </div>

  <form
    v-else
    class="flex flex-col w-full space-y-3"
    @submit.prevent="handleCreateAccount"
    novalidate
  >
    <BaseInput
      class="w-full"
      v-model="email"
      type="email"
      placeholder="your@email.com"
      :disabled="true"
    />

    <div class="relative w-full">
      <PasswordInput
        :type="showPassword ? 'text' : 'password'"
        v-model="password"
        :disabled="true"
      />
    </div>


    <div class="flex-grow border-t border-border-subtle mt-3 mb-6"></div>


    <BaseInput
      name="nickname"
      class="w-full"
      v-model="displayName"
      type="text"
      placeholder="Display Name"
      :disabled="loading"
      autocomplete="nickname"
    />

    <p v-if="errorMessage" class="text-status-danger text-sm">
      {{ errorMessage }}
    </p>
    <span class="h-5"></span>
    <!-- TOS agreement -->
    <div class="flex justify-center space-x-2 text-xs text-[var(--color-text-muted)]">
      <BaseInput
        id="tos"
        type="checkbox"
        v-model="agreedToTOS"
        class="accent-[var(--color-accent)]"
        :disabled="loading"
      />
      <label for="tos" class="leading-snug">
        I agree to the
        <RouterLink to="/terms" target="_blank" class="underline">Terms</RouterLink>
        and
        <RouterLink to="/privacy" target="_blank" class="underline">Privacy Policy</RouterLink>.
      </label>
    </div>

    <div class="flex space-x-2">
      <BaseButton
        :disabled="loading"
        class="w-full"
        type="button"
        @click="() => {pageNumber = 0; emit('hideGoogleButton', false)}"
      >
        Back
      </BaseButton>
      <BaseButton
        class="w-full"
        type="submit"
        :disabled="!validEmail || !validPassword || !agreedToTOS || loading || !displayName"
      >
        Create Account
      </BaseButton>
    </div>
  </form>
</template>

<script setup>
import { ref, watch } from 'vue'
import { validateEmail, validatePassword } from '@/utils/validateData'
import BaseButton from '@/components/ui/input/BaseButton.vue'
import BaseInput from '@/components/ui/input/BaseInput.vue'
import PasswordInput from '@/components/ui/input/PasswordInput.vue'
const emit = defineEmits(['hideGoogleButton', 'signUp'])

defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
  errorMessage: {
    type: String,
    default: '',
  },
  signUpSuccess: {
    type: Boolean,
    default: false,
  },
})

const email = ref('')
const password = ref('')
const displayName = ref('')
const showPassword = ref(false)
const agreedToTOS = ref(false)
const validEmail = ref(true)
const validPassword = ref(true)
const pageNumber = ref(0)

watch([email, password], ([newEmail, newPassword]) => {
  if (!newEmail.length < 1) {
    validEmail.value = validateEmail(newEmail)
  }
  if (!newPassword.length < 1) {
    validPassword.value = validatePassword(newPassword).isValid
  }
})

function advanceToDetails() {
  if (!validEmail.value || !validPassword.value || !email.value || !password.value) return
  pageNumber.value = 1
  emit('hideGoogleButton', true)
}

function handleCreateAccount() {
  if (!validEmail.value || !validPassword.value || !agreedToTOS.value || !displayName.value) return
  emit('signUp', { email: email.value, password: password.value, displayName: displayName.value })
}
</script>
