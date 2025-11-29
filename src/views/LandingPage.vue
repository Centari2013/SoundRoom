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
            A browser-native canvas for placing, sculpting, and automating audio in 3D space.
            No installs. No friction. Just flow.
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
              class="p-6 aspect-video flex items-center justify-center 
                     bg-[radial-gradient(circle_at_40%_30%,rgba(88,101,242,0.25),transparent_55%),
                         var(--color-bg-surface)] border-b border-[var(--color-border-subtle)]"
            >
              <div class="relative w-full h-full flex items-center justify-center text-text-muted">
                <div class="absolute top-6 left-6 px-3 py-1 rounded-full bg-white/10 text-xs text-white/80">
                  Editor Preview
                </div>
                <span class="text-sm opacity-60">Canvas demo placeholder</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- SOCIAL PROOF -->
      <section class="grid gap-16 lg:grid-cols-2 items-center">
        <div class="space-y-6">
          <p class="text-sm uppercase tracking-[0.25em] text-[var(--color-accent-soft)]">
            Teams & creators
          </p>
          <h2 class="text-3xl font-semibold max-w-xl">
            Built for sound designers, storytellers, and immersive product teams.
          </h2>
          <p class="text-text-secondary max-w-xl">
            Whether you’re shipping an indie game or prototyping XR experiences, SoundRoom brings the entire spatial audio workflow into the browser.
          </p>
          <div class="flex flex-wrap gap-3 text-sm text-text-secondary">
            <span class="px-3 py-1 rounded-full border border-[var(--color-border-subtle)]">Unity & Unreal friendly</span>
            <span class="px-3 py-1 rounded-full border border-[var(--color-border-subtle)]">Realtime preview</span>
            <span class="px-3 py-1 rounded-full border border-[var(--color-border-subtle)]">Async collaboration</span>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-4 text-center">
          <div class="rounded-lg border border-[var(--color-border-subtle)] bg-surface-raised/50 p-6">
            <p class="text-2xl font-semibold text-text-primary">2.3M</p>
            <p class="text-sm text-text-secondary">Spatial renders</p>
          </div>
          <div class="rounded-lg border border-[var(--color-border-subtle)] bg-surface-raised/50 p-6">
            <p class="text-2xl font-semibold text-text-primary">38%</p>
            <p class="text-sm text-text-secondary">Faster reviews</p>
          </div>
          <div class="rounded-lg border border-[var(--color-border-subtle)] bg-surface-raised/50 p-6">
            <p class="text-2xl font-semibold text-text-primary">24/7</p>
            <p class="text-sm text-text-secondary">Cloud rendering</p>
          </div>
        </div>
      </section>

      <!-- FEATURES -->
      <section class="space-y-16">
        <div class="space-y-3">
          <p class="text-sm uppercase tracking-[0.25em] text-[var(--color-accent-soft)]">Why SoundRoom</p>
          <h2 class="text-3xl font-semibold max-w-2xl">Everything you need to sketch, iterate, and publish spatial audio.</h2>
        </div>

        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard emoji="🎛️" title="Timeline & automation" text="Draw envelopes, animate movement, and cue transitions directly in the browser." />
          <FeatureCard emoji="🌊" title="Impulse responses" text="Swap spaces instantly with curated IRs or upload your own captures." />
          <FeatureCard emoji="👥" title="Collaboration ready" text="Share review links with notes and timestamped comments." />
          <FeatureCard emoji="🛰️" title="Spatial formats" text="Export binaural, stereo, and multi-channel beds." />
          <FeatureCard emoji="🗂️" title="Asset library" text="Drag curated ambience packs or upload your own stems." />
          <FeatureCard emoji="🔐" title="Resilient cloud" text="Your projects autosave, version, and sync across devices." />
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
          <h3 class="text-3xl font-semibold">
            Open a blank room in seconds and sculpt immersive audio instantly.
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
          <RouterLink to="/privacy" class="hover:text-text-primary transition">Privacy</RouterLink>
          <RouterLink to="/terms" class="hover:text-text-primary transition">Terms</RouterLink>
          <RouterLink to="/support" class="hover:text-text-primary transition">Support</RouterLink>
        </div>
      </div>
    </footer>

  </div>
</template>

<script setup>
import FeatureCard from "@/components/Landing/FeatureCard.vue"
</script>
