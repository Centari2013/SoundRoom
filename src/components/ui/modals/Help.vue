<template>
  <div v-if="isHelpOpen" @click.self="emit('close')" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
    <div class="bg-white dark:bg-neutral-950 rounded-2xl w-[80vw] h-[80vh] relative flex flex-col overflow-hidden shadow-2xl border border-neutral-300 dark:border-neutral-800">
      
      <!-- Absolute Floating Header -->
      <div class="absolute top-0 left-0 right-0 z-10 flex justify-between items-center px-6 py-4 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md border-b border-neutral-300 dark:border-neutral-800">
        <h1 class="text-2xl font-bold tracking-tight">Welcome to SoundRoom</h1>
        <button @click="() => {$emit('close'); formSubmitted = false;}" class="text-sm underline hover:text-neutral-600 dark:hover:text-neutral-400">Close</button>
      </div>

      <!-- Scrollable Content -->
      <div class="flex-1 overflow-y-auto p-8 pt-24 space-y-8 text-left text-sm leading-relaxed">
        
        <!-- Help Sections (same as before) -->
        <section>
          <p class="mb-4">
            SoundRoom lets you build immersive 3D soundscapes by placing, rotating, and layering audio sources on a spatial canvas.
          </p>
        </section>
        
        <section>
            <h2 class="text-lg font-semibold mb-2">Getting Started</h2>
            <ul class="list-disc list-inside space-y-1">
              <li>Open the Sound Library using the left sidebar.</li>
              <li>Drag a sound onto the canvas to place it.</li>
              <li>Each sound can be moved and rotated independently.</li>
            </ul>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2">Moving the Listener</h2>
            <ul class="list-disc list-inside space-y-1">
              <li>Use <strong>WASD</strong> or the <strong>Arrow Keys</strong> to move the Listener.</li>
              <li>Use <strong>Q</strong> and <strong>E</strong> to rotate the Listener’s direction.</li>
            </ul>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2">Controlling Sounds</h2>
            <ul class="list-disc list-inside space-y-1">
              <li>Select a sound to view its settings in the right panel.</li>
              <li>Drag to reposition, or use <strong>Z</strong> and <strong>C</strong> to rotate it.</li>
              <li>Adjust volume with the slider.</li>
            </ul>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2">Managing Your Scene</h2>
            <ul class="list-disc list-inside space-y-1">
              <li>Cycle through sounds with <strong>Tab</strong>.</li>
              <li>Delete sounds with <strong>Delete</strong> or <strong>Backspace</strong>.</li>
              <li>Undo with <strong>U</strong>, redo with <strong>R</strong>.</li>
              <li>Right-click any sound for more options.</li>
            </ul>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2">Uploading Your Own Sounds</h2>
            <p class="text-neutral-500 italic">Not yet implemented!</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-2">Tips for Better Sound Design</h2>
            <ul class="list-disc list-inside space-y-1">
              <li>Layer different sounds for depth and richness.</li>
              <li>Rotate sources for natural directional effects.</li>
              <li>Use silence strategically for contrast and impact.</li>
            </ul>
          </section>

        <!-- Contact Form or Thank You -->
        <section>
          <h2 class="text-lg font-semibold mb-4">Wanna Chat?</h2>
          <p class="mb-4">
            Got questions, feedback, or ideas? Drop a message below — it goes straight to me.
          </p>

          <div v-if="!formSubmitted">
            <form @submit.prevent="handleSubmit" class="space-y-4">
              <div>
                <label for="name" class="block text-sm font-medium mb-1">Your Name</label>
                <input
                  type="text"
                  id="name"
                  v-model="form.name"
                  required
                  class="max-w-70 px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label for="email" class="block text-sm font-medium mb-1">Your Email</label>
                <input
                  type="email"
                  id="email"
                  v-model="form.email"
                  required
                  class="max-w-70 px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label for="message" class="block text-sm font-medium mb-1">Your Message</label>
                <textarea
                  id="message"
                  v-model="form.message"
                  rows="4"
                  required
                  class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                ></textarea>
              </div>

              <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm">
                Send Message
              </button>
            </form>
          </div>

          <div v-else class="p-4 rounded bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
            <p class="font-semibold">Thanks for reaching out!</p>
            <p class="text-sm mt-1">I'll get back to you soon.</p>
          </div>

        </section>

      </div>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  isHelpOpen: Boolean
})

const emit = defineEmits(['close'])

// form data
const form = ref({
  name: '',
  email: '',
  message: ''
})


const formSubmitted = ref(false)

async function handleSubmit() {
  const endpoint = 'https://formsubmit.co/257ab6daf6e7524d72c5dd1293888134'

  const payload = new FormData()
  payload.append('name', form.value.name)
  payload.append('email', form.value.email)
  payload.append('message', form.value.message)
  payload.append('_captcha', 'false')
  payload.append('_subject', '[SoundRoom Inquiry]')
  payload.append('_honey', '')
  payload.append('_autoresponse', "Thanks for using SoundRoom! I'll get to your email shortly!")


  try {
    await fetch(endpoint, {
      method: 'POST',
      body: payload,
      headers: { 'Accept': 'application/json' }
    })

    formSubmitted.value = true
    form.value = {
      name: '',
      email: '',
      message: ''
    }

    
  } catch (error) {
    console.error('Form submission error:', error)
    alert('Something went wrong. Please try again later.')
  }
}

</script>
