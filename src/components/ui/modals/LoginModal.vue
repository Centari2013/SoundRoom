<!-- LoginModal.vue -->
<template>
  <SmallModalBase
  :title="'Sign Up'"
  :canClickOutside="false"
  :showCloseButton="true"
  @close="$emit('close')"
  >
    <div class="flex flex-col items-center justify-center text-center h-40 px-6 space-y-6 w-full">
      <p class="text-lg font-medium text-neutral-800 dark:text-neutral-200">
        Sign Up for SoundRoom
      </p>
      
      <div class="flex w-full">
        <input class="w-full" v-model="email" placeholder="your@email.com" />
      </div>
       <div class="flex space-x-4">
        <button
          v-for="button in buttonOptions"
          :key="button.label"
          class=""
          @click="button.action"
        >
          {{ button.label }}
        </button>
       </div>
    </div>
    
      

      
      
 
  </SmallModalBase>

</template>

<script setup>
import { ref } from 'vue'
import { supabase } from '@/utils/supabase'
import SmallModalBase from '@/components/ui/modals/SmallModalBase.vue'

defineEmits(['close'])

const email = ref('')

const buttonOptions = ref([
  { label: 'Send Magic Link', action: signIn },
  { label: 'Close', action: () => $emit('close') }
])


async function signIn() {
  const { error } = await supabase.auth.signInWithOtp({ email: email.value })
  if (error) {
    alert(error.message)
  } else {
    alert('Check your email for the magic link!')
  }
}
</script>

<style scoped>

.modal-box {
  background: #1e1e1e;
  color: #f5f5f5;
  padding: 2rem;
  border-radius: 1rem;
  max-width: 400px;
  width: 100%;
}


</style>