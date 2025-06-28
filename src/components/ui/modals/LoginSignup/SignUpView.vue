<template>
  <div class="flex flex-col w-full space-y-3">
    <template v-if="pageNumber === 0">
      <!-- Page 1: Email + Password -->
      <input
        class="w-full"
        v-model="email"
        type="email"
        placeholder="your@email.com"
      />

      <div class="relative w-full">
        <input
          :type="showPassword ? 'text' : 'password'"
          class="w-full pr-12"
          v-model="password"
          placeholder="Password"
        />
        <div
          type="button"
          class="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer"
          @click="showPassword = !showPassword"
        >
          <component :is="showPassword ? EyeOpen : EyeClosed" class="h-5 w-5 text-gray-500" />
        </div>
      </div>

      <p v-if="email && !validEmail" class="text-red-500 text-sm">
        Please enter a valid email address.
      </p>
      <p v-if="password && !validPassword" class="text-red-500 text-sm">
        Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a symbol.
      </p>

      <button
        class="w-full"
        @click="pageNumber = 1"
        :disabled="!validEmail || !validPassword || !email || !password"
      >
        Continue
      </button>

      <OrSpacer />

      <button @click="emit('googleAuth')" class="w-full">
        Sign up with Google
      </button>

      <p class="text-xs text-neutral-400 text-center">
        By continuing, you agree to our
        <a href="/terms" target="_blank" class="underline">Terms</a> and
        <a href="/privacy" target="_blank" class="underline">Privacy Policy</a>.
      </p>
    </template>
    <template v-else-if="signUpSuccess">
      <p class="text-green-500 text-sm">Sign up successful! Please check your email to verify your account.</p>
    </template>
    <template v-if="pageNumber === 1 && !signUpSuccess">
      <!-- Page 2: Edit + TOS + more fields -->
      <input
        class="w-full"
        v-model="email"
        type="email"
        placeholder="your@email.com"
        :disabled="true"
      />
      
      <div class="relative w-full">
        <input
          :type="showPassword ? 'text' : 'password'"
          class="w-full pr-12"
          v-model="password"
          placeholder="Password"
          :disabled="true"
        />
        <div
          type="button"
          class="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer"
          @click="showPassword = !showPassword"
        >
          <component :is="showPassword ? EyeOpen : EyeClosed" class="h-5 w-5 text-gray-500" />
        </div>
      </div>
  

      <div class="flex-grow border-t border-gray-300 mt-3 mb-6"></div>


      <input
        class="w-full"
        v-model="firstName"
        type="text"
        placeholder="First Name"
        :disabled="loading"
      />
      <!-- Optional extra fields -->
      <input
        class="w-full"
        v-model="username"
        type="text"
        placeholder="Username"
        :disabled="loading"
      />

      <p v-if="errorMessage" class="text-red-500 text-sm">
        {{ errorMessage }}
      </p>
      <span class="h-10"></span>
      <!-- TOS agreement -->
      <div class="flex justify-center space-x-2 text-xs text-neutral-400">
        <input
          id="tos"
          type="checkbox"
          v-model="agreedToTOS"
          class=" accent-white"
          :disabled="loading"
        />
        <label for="tos" class="leading-snug">
          I agree to the
          <a href="/terms" target="_blank" class="underline">Terms</a>
          and
          <a href="/privacy" target="_blank" class="underline">Privacy Policy</a>.
        </label>
      </div>

      <div class="flex space-x-2">
        <button :disabled="loading" class="w-full" @click="pageNumber = 0">Back</button>
        <button
          class="w-full"
          :disabled="!validEmail || !validPassword || !agreedToTOS || loading"
          @click="emit('signUp', { email, password, firstName, username })"
        >
          Create Account
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { validateEmail, validatePassword } from '@/utils/validateData'
import OrSpacer from '@/components/ui/modals/LoginSignup/OrSpacer.vue'
import EyeOpen from '@/assets/icons/eyeOpen.svg'
import EyeClosed from '@/assets/icons/eyeClosed.svg'

const emit = defineEmits(['googleAuth', 'signUp'])

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
const firstName = ref('')
const username = ref('')
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
