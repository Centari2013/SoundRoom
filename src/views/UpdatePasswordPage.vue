<template>
  <div class="flex flex-col items-center justify-center min-h-screen px-4 py-12 bg-white text-black dark:bg-black dark:text-white transition-colors">
    <div class="w-full max-w-sm space-y-6 bg-[#f8f8f8] dark:bg-[#111] rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-neutral-800 transition-colors">
      <h2 class="text-2xl font-semibold text-center tracking-wide">Reset Your Password</h2>

      <PasswordInput
        v-model="newPassword"
        placeholder="Enter new password"
      />

      <BaseButton
        :disabled="!validPassword || loading"
        @click="submitNewPassword"
      >
        {{ loading ? 'Updating...' : 'Update Password' }}
      </BaseButton>

      <p v-if="error" class="text-red-600 dark:text-red-400 text-sm text-center">{{ error }}</p>
      <p v-if="success" class="text-green-700 dark:text-green-400 text-sm text-center">
        Password updated. You can now sign in.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/utils/supabase'
import { validatePassword } from '@/utils/validateData'
import BaseButton from '@/components/ui/input/BaseButton.vue'
import PasswordInput from '@/components/ui/input/PasswordInput.vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const newPassword = ref('')
const error = ref('')
const success = ref(false)
const loading = ref(false)

const validPassword = computed(() => {
  return validatePassword(newPassword.value).isValid
})

async function submitNewPassword() {
  error.value = ''
  loading.value = true

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword.value
  })

  

  if (updateError) {
    error.value = updateError.message
    loading.value = false
    return
  }

  success.value = true
  setTimeout(() => router.push('/login'), 2500)
}

onMounted(async () => {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session || !session.user) {
    error.value = 'Invalid session. Please use the reset link in your email or try resetting your password again.'
  }
})
</script>
