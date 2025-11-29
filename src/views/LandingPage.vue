<template>
  <div class="relative flex-1 overflow-auto bg-[var(--color-bg-app)] text-text-primary">

    <!-- Top vignette -->
    <div class="pointer-events-none absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-black/20 to-transparent z-0"></div>


    <!-- Background gradients -->
    <div
      class="absolute inset-0 z-0 
             bg-[radial-gradient(circle_at_30%_10%,rgba(88,101,242,0.15),transparent_55%),
                 radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.15),transparent_55%)]"
    ></div>

    <main class="relative z-10 mx-auto max-w-6xl px-6 py-32 lg:py-44 space-y-40">

      <!-- HERO -->
      <section class="grid gap-16 lg:grid-cols-2 items-center">
        <!-- Left -->
        <div class="space-y-8 max-w-xl">
          <p class="text-sm uppercase tracking-[0.25em] text-[var(--color-accent-soft)]">
            Immersive sound design
          </p>
          <h1 class="text-5xl lg:text-6xl font-semibold leading-tight">
            Build spatial audio rooms that feel alive.
          </h1>
          <p class="text-lg text-text-secondary">
            Build living soundscapes right in your browser. Drag sources, position them
            spatially, and layer ambience without installing a single tool.
          </p>

          <div class="flex flex-wrap gap-4 justify-center">
            <RouterLink :to="{name: 'app'}">
              <button
                class="px-6 py-3 rounded-full bg-[var(--color-accent)] text-white shadow-[0_12px_40px_rgba(0,0,0,0.35)] hover:translate-y-[-1px] transition"
              >
                Launch the studio
              </button>
            </RouterLink>
            <RouterLink :to="{name: 'upgrade'}">
              <button
                class="px-6 py-3 rounded-full border border-[var(--color-border-subtle)] text-text-primary hover:bg-surface-raised transition"
              >
                View plans
              </button>
            </RouterLink>
          </div>
        </div>

        <!-- Right -->
        <div class="relative">
          <!-- Subtle glow -->
          <div class="absolute inset-0 blur-3xl bg-[rgba(88,101,242,0.25)] -z-10"></div>

          <div
            class="relative rounded-2xl border border-[var(--color-border-strong)] 
                   bg-[color-mix(in_srgb,var(--color-panel)_85%,black_15%)]
                   shadow-[0_24px_60px_rgba(0,0,0,0.45)] overflow-hidden"
          >
            <div
              class=" flex items-center justify-center 
                     bg-[radial-gradient(circle_at_40%_30%,rgba(88,101,242,0.25),transparent_55%),
                         var(--color-bg-surface)] border-b border-[var(--color-border-subtle)]"
            >
              <div class="relative w-full h-full flex items-center justify-center text-text-muted">
                <div class="relative rounded-2xl border border-[var(--color-border-strong)] shadow-[0_24px_60px_rgba(0,0,0,0.45)] overflow-hidden">

                  <!-- Browser top bar -->
                  <div class="flex items-center justify-between px-4 py-2 bg-[var(--color-bg-surface)] border-b border-[var(--color-border-subtle)]">

                    <!-- Left: Dots -->
                    <div class="flex items-center gap-2">
                      <span class="h-3 w-3 rounded-full bg-[#ff5f57]"></span>
                      <span class="h-3 w-3 rounded-full bg-[#ffbd2e]"></span>
                      <span class="h-3 w-3 rounded-full bg-[#28c840]"></span>
                    </div>

                    <!-- Center: Fake URL Bar -->
                    <div class="flex-1 flex justify-center pointer-events-none">
                      <div class="w-2/3 h-5 rounded-md bg-white/5 text-sm text-center">
                        soundroom.live
                      </div>
                    </div>

                    <!-- Right: Empty (but needed to center properly) -->
                    <div class="w-12"></div>
                  </div>


                  <!-- Inner screenshot / mock -->
                  <div class="bg-[var(--color-bg-surface)] flex items-center justify-center">
                    <img 
                      src="/images/editor-preview.jpeg" 
                      alt="SoundRoom canvas preview"
                      class="w-full h-full object-cover opacity-95"
                    />
                  </div>

                </div>

              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- SOCIAL PROOF -->
      <div class="grid grid-cols-3 gap-4 text-center">
        <div class="rounded-lg border border-[var(--color-border-subtle)] bg-surface-raised/50 p-6">
          <p class="text-2xl font-semibold text-text-primary">0 installs</p>
          <p class="text-sm text-text-secondary">Runs fully in-browser</p>
        </div>
        <div class="rounded-lg border border-[var(--color-border-subtle)] bg-surface-raised/50 p-6">
          <p class="text-2xl font-semibold text-text-primary">15+ packs</p>
          <p class="text-sm text-text-secondary">Curated ambient sounds</p>
        </div>
        <div class="rounded-lg border border-[var(--color-border-subtle)] bg-surface-raised/50 p-6">
          <p class="text-2xl font-semibold text-text-primary">Unlimited</p>
          <p class="text-sm text-text-secondary">Real-time mixing</p>
        </div>
      </div>


      <!-- FEATURES -->
      <section class="space-y-16">
        <div class="space-y-3 items-center text-center flex flex-col">
          <p class="text-sm uppercase tracking-[0.25em] text-[var(--color-accent-soft)]">Why SoundRoom</p>
          <h2 class="text-3xl font-semibold max-w-2xl">Everything you need to sketch, iterate, and enjoy spatial audio.</h2>
        </div>

        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            emoji="🎧"
            title="Spatial placement"
            text="Drag sources onto a live canvas and position them around the listener with directional cones."
          >
            <template #visual>
              <svg xmlns="http://www.w3.org/2000/svg" width="90%" height="90%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-radar-icon lucide-radar"><path d="M19.07 4.93A10 10 0 0 0 6.99 3.34"/><path d="M4 6h.01"/><path d="M2.29 9.62A10 10 0 1 0 21.31 8.35"/><path d="M16.24 7.76A6 6 0 1 0 8.23 16.67"/><path d="M12 18h.01"/><path d="M17.99 11.66A6 6 0 0 1 15.77 16.67"/><circle cx="12" cy="12" r="2"/><path d="m13.41 10.59 5.66-5.66"/></svg>
            </template>
          </FeatureCard>


          <FeatureCard emoji="🌫️" title="Curated ambience packs"
            text="Browse themed sound packs and stack textures to build immersive rooms fast.">
            <template #visual>
              <svg xmlns="http://www.w3.org/2000/svg" width="90%" height="90%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-layers-icon lucide-layers"><path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/></svg>
            </template>
          </FeatureCard>

          <FeatureCard emoji="📥" title="Pro uploads"
            text="Upload your own audio files and mix them with library assets.">
            <template #visual>
              <svg xmlns="http://www.w3.org/2000/svg" width="90%" height="90%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-cloud-upload-icon lucide-cloud-upload"><path d="M12 13v8"/><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="m8 17 4-4 4 4"/></svg>
            </template>
          </FeatureCard>

          <FeatureCard emoji="🔁" title="Organic scheduling"
            text="Randomize playback gaps so loops feel natural instead of repetitive.">
            <template #visual>
              <svg xmlns="http://www.w3.org/2000/svg" width="90%" height="90%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shuffle-icon lucide-shuffle"><path d="m18 14 4 4-4 4"/><path d="m18 2 4 4-4 4"/><path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22"/><path d="M2 6h1.972a4 4 0 0 1 3.6 2.2"/><path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45"/></svg>
            </template>
          </FeatureCard>

          <FeatureCard emoji="🎚️" title="Mixing controls"
            text="Adjust volume, direction, cone angles, and master gain—all in real time.">
            <template #visual>
              <svg xmlns="http://www.w3.org/2000/svg" width="90%" height="90%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sliders-vertical-icon lucide-sliders-vertical"><path d="M10 8h4"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M17 16h4"/><path d="M19 12V3"/><path d="M19 21v-5"/><path d="M3 14h4"/><path d="M5 10V3"/><path d="M5 21v-7"/></svg>
            </template>
          </FeatureCard>

          <FeatureCard emoji="💾" title="Room saving"
            text="Save, load, and manage your rooms in the cloud.">
            <template #visual>
              <svg xmlns="http://www.w3.org/2000/svg" width="90%" height="90%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-save-icon lucide-save"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg>
            </template>
          </FeatureCard>
          
        </div>
      </section>

      <!-- CTA -->
      <section
        class="rounded-2xl border border-[var(--color-border-strong)]  flex flex-col text-center items-center
               bg-[color-mix(in_srgb,var(--color-panel)_80%,black_20%)] 
               p-14 shadow-[0_20px_60px_rgba(0,0,0,0.35)] space-y-8"
      >
        <div class="space-y-4 max-w-2xl">
          <p class="text-sm uppercase tracking-[0.25em] text-[var(--color-accent-soft)]">Get started</p>
          <h3 class="text-3xl font-semibold leading-tight">
            Open a blank room in seconds and sculpt your own personal
            <span
              class="bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-success)]
                    bg-clip-text text-transparent"
            >
              SoundRoom
            </span>.
          </h3>

          <p class="text-text-secondary">
            Bring your own assets or use our curated packs. Everything lives in the cloud.
          </p>
        </div>

        <div class="flex flex-wrap gap-4 justify-center">
          <RouterLink :to="{name: 'app'}">
            <button class="px-6 py-3 rounded-full bg-[var(--color-accent)] text-white shadow-[0_12px_40px_rgba(0,0,0,0.25)] hover:translate-y-[-1px] transition">
              Launch the studio
            </button>
          </RouterLink>
          <RouterLink :to="{name: 'upgrade'}">
            <button class="px-6 py-3 rounded-full border border-[var(--color-border-subtle)] text-text-primary hover:bg-surface-raised transition">
              Compare plans
            </button>
          </RouterLink>
        </div>
      </section>

    </main>

    <!-- Footer -->
    <footer class="py-10 text-center text-sm text-text-secondary">
      <div class="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-between gap-4">
        <p class="opacity-60">© 2025 SoundRoom</p>
        <div class="flex gap-6">
          <RouterLink :to="{name: 'privacy'}" class="hover:text-text-primary transition">Privacy</RouterLink>
          <RouterLink :to="{name: 'terms'}" class="hover:text-text-primary transition">Terms</RouterLink>
          <RouterLink :to="{name: 'help'}" class="hover:text-text-primary transition">Support</RouterLink>
        </div>
      </div>
    </footer>

  </div>
</template>

<script setup>
import FeatureCard from "@/components/Landing/FeatureCard.vue"
</script>
