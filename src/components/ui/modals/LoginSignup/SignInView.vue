<!-- LoginModal.vue -->
<template>
 
  <div class="flex flex-col w-full space-y-3">
    <input class="w-full" v-model="email" type="email" placeholder="your@email.com" />
    <div class="relative w-full">
      <input :type="showPassword ? 'text' : 'password'" class="w-full" v-model="password" type="password" placeholder="Password" />
      <div
        type="button"
        class="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer"
        @click="showPassword = !showPassword"
      >
      <component :is="showPassword ? EyeOpen : EyeClosed" class="h-5 w-5 text-gray-500" />
    </div>
      
    </div>
    
      
    <span class="h-3"></span>
    <button
      class="w-full"
      @click="emit('signIn', { email, password })"
      :disabled="loading || !email || !password"
    >
      Sign In
    </button>
    <span class="text-red-500 text-sm" v-if="errorMessage">{{ errorMessage }}</span>
    <OrSpacer />

    <button @click="$emit('googleAuth')" :disabled="loading">
      Sign in with Google
    </button>
    
  </div>
    
</template>

<script setup>
import { ref } from 'vue'

import OrSpacer from '@/components/ui/modals/LoginSignup/OrSpacer.vue'
import EyeOpen from '@/assets/icons/eyeOpen.svg'
import EyeClosed from '@/assets/icons/eyeClosed.svg'

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
