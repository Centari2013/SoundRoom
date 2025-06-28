<!-- LoginModal.vue -->
<template>
 
  <div class="flex flex-col w-full space-y-3">
    <input class="w-full" v-model="email" type="email" placeholder="your@email.com" />
    <input class="w-full" v-model="password" type="password" placeholder="Password" />
      
    <span class="h-3"></span>
    <button
      class="w-full"
      @click="emit('signIn', { email, password })"
      :disabled="!email || !password"
    >
      Sign In
    </button>
    <OrSpacer />

    <button @click="$emit('googleAuth')">
      Sign in with Google
    </button>
    
  </div>
    
</template>

<script setup>
import { ref } from 'vue'

import OrSpacer from '@/components/ui/modals/LoginSignup/OrSpacer.vue'

const emit = defineEmits(['googleAuth', 'signIn', 'toggleLogging'])

const email = ref('')
const password = ref('')

</script>
