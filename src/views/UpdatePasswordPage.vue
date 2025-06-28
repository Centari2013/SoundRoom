<template>
  <div class="flex flex-col items-center justify-center min-h-screen px-4 py-8">
    <div class="w-full max-w-sm space-y-4">
      <h2 class="text-xl font-semibold text-center">Reset Your Password</h2>

      <input
        class="w-full"
        type="password"
        v-model="newPassword"
        placeholder="Enter new password"
      />

      <button
        class="w-full"
        :disabled="!validPassword"
        @click="submitNewPassword"
      >
        Update Password
      </button>

      <p v-if="error" class="text-red-500 text-sm text-center">{{ error }}</p>
      <p v-if="success" class="text-green-600 text-sm text-center">Password updated! You can now sign in.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '@/utils/supabase'
import { validatePassword } from '@/utils/validateData'

const newPassword = ref('')
const error = ref('')
const success = ref(false)

const validPassword = computed(() => {
  return validatePassword(newPassword.value).isValid
})

async function submitNewPassword() {
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword.value
  })

  if (updateError) {
    error.value = updateError.message
    return
  }

  success.value = true
}
</script>
