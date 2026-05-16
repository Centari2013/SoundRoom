<template>
  <div class="flex-1 overflow-auto bg-[var(--color-bg-app)] px-4 py-12 sm:px-6 sm:py-16">
    <div class="mx-auto w-full max-w-4xl rounded-lg bg-white p-6 text-left shadow-lg sm:p-10">
      <div
        name="termly-embed"
        :data-id="policyId"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'

defineProps({
  policyId: {
    type: String,
    required: true,
  },
})

const termlyScriptId = 'termly-jssdk'
const termlyScriptSrc = 'https://app.termly.io/embed-policy.min.js'

onMounted(() => {
  if (document.getElementById(termlyScriptId)) return

  const firstScript = document.getElementsByTagName('script')[0]
  const script = document.createElement('script')
  script.id = termlyScriptId
  script.type = 'text/javascript'
  script.src = termlyScriptSrc

  if (firstScript?.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript)
    return
  }

  document.head.appendChild(script)
})
</script>
