<template>      
      <div class="flex flex-col w-full space-y-3">
        <input class="w-full" v-model="email" type="email" placeholder="your@email.com" />
        <input class="w-full" v-model="password" type="password" placeholder="Password" />
        <p v-if="!validEmail" class="text-red-500 text-sm">Please enter a valid email address.</p>
        <p v-if="!validPassword" class="text-red-500 text-sm">
          Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a symbol.
        </p>
        <span class="h-3"></span>
        <button
          class="w-full"
          @click="emit('signUp', { email, password })"
          :disabled="!validEmail || !validPassword"
        >
          Create Account
        </button>

        <OrSpacer />

        <button @click="emit('googleAuth')">
          Sign up with Google
        </button>
        
       </div>
       
  
</template>

<script setup>
import { ref, watch } from 'vue'

import { validateEmail, validatePassword } from '@/utils/validateData'

import OrSpacer from '@/components/ui/modals/LoginSignup/OrSpacer.vue'

const emit = defineEmits(['googleAuth', 'signUp', 'toggleLogging'])

const email = ref('')
const password = ref('')



const validEmail = ref(true)
const validPassword = ref(true)


watch([email, password], ([newEmail, newPassword]) => {
  if (!newEmail.length < 1) {
    validEmail.value = validateEmail(newEmail)
  }
  if (!newPassword.length < 1) {
    validPassword.value = validatePassword(newPassword).isValid
  }
})

</script>

<style scoped>




</style>