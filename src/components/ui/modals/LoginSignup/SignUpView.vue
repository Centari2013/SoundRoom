<template>
  <div class="flex flex-col w-full space-y-3">
    <template v-if="pageNumber === 0">
      <!-- Page 1: Email + Password -->
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

      <p v-if="email && !validEmail" class="text-red-500 text-sm">
        Please enter a valid email address.
      </p>
      <p v-if="password && !validPassword" class="text-red-500 text-sm">
        Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a symbol.
      </p>
      <span class="h-3"></span>
      <BaseButton
        class="w-full"
        @click="() => {pageNumber = 1;emit('hideGoogleButton', true)}"
        :disabled="!validEmail || !validPassword || !email || !password"
      >
        Continue
      </BaseButton>

    </template>
    <template v-else-if="signUpSuccess">
      <p class="text-green-500 text-sm">Sign up successful! Please check your email to verify your account.</p>
    </template>
    <template v-if="pageNumber === 1 && !signUpSuccess">
      <!-- Page 2: Edit + TOS + more fields -->
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
  

      <div class="flex-grow border-t border-gray-300 mt-3 mb-6"></div>


      <BaseInput
        name="nickname"
        class="w-full"
        v-model="displayName"
        type="text"
        placeholder="Display Name"
        :disabled="loading"
        autocomplete="nickname"
      />

      <p v-if="errorMessage" class="text-red-500 text-sm">
        {{ errorMessage }}
      </p>
      <span class="h-5"></span>
      <!-- TOS agreement -->
      <div class="flex justify-center space-x-2 text-xs text-neutral-400">
        <BaseInput
          id="tos"
          type="checkbox"
          v-model="agreedToTOS"
          class=" accent-white"
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
        <BaseButton :disabled="loading" class="w-full" @click="() => {pageNumber = 0; emit('hideGoogleButton', false)}">Back</BaseButton>
        <BaseButton
          class="w-full"
          :disabled="!validEmail || !validPassword || !agreedToTOS || loading || !displayName"
          @click="emit('signUp', { email, password, displayName })"
        >
          Create Account
        </BaseButton>
      </div>
    </template>
  </div>
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
</script>
