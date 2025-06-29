<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
function goHome() {
  router.push('/')
}
</script>

<template>
  <div class="auth-error">
    <h1>Login Failed</h1>
    <p>Something went wrong during login. Please try again.</p>
    <button @click="goHome">Back to Home</button>
  </div>
</template>

<style scoped>
.auth-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100dvh;
  text-align: center;
}
button {
  margin-top: 1rem;
  padding: 0.5rem 1.2rem;
  font-weight: bold;
  border: none;
  border-radius: 4px;
  background-color: #333;
  color: white;
  cursor: pointer;
}
button:hover {
  background-color: #555;
}
</style>
