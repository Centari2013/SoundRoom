<template>
  <section class="flex-1 overflow-auto bg-[radial-gradient(circle_at_10%_20%,rgba(88,101,242,0.18),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(16, 185, 129,0.18),transparent_30%),var(--color-bg-app)] text-text-primary">
    <div class="mx-auto max-w-6xl px-6 py-16 lg:py-24">
      <div class="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] items-center">
        <div class="space-y-8">
          <p class="text-sm uppercase tracking-[0.3em] text-[color-mix(in_srgb,var(--color-accent)_60%,white)]">Immersive sound design</p>
          <h1 class="text-4xl sm:text-5xl lg:text-6xl font-semibold leading-tight">
            Build spatial audio rooms that feel alive.
          </h1>
          <p class="text-lg text-text-secondary max-w-2xl">
            SoundRoom is a browser-based canvas for placing, sculpting, and automating audio sources in 3D space. Sketch ideas fast, then polish mixes with impulse responses and precise controls.
          </p>
          <div class="flex flex-wrap items-center gap-4">
            <RouterLink to="/app">
              <button class="px-6 py-3 rounded-full bg-[color-mix(in_srgb,var(--color-accent)_85%,black_15%)] text-white shadow-[0_12px_40px_rgba(0,0,0,0.25)] hover:translate-y-[-1px] transition">
                Launch the studio
              </button>
            </RouterLink>
            <RouterLink to="/pricing">
              <button class="px-6 py-3 rounded-full border border-[var(--color-border-subtle)] text-text-primary bg-surface-base hover:bg-surface-raised transition">
                View pricing
              </button>
            </RouterLink>
          </div>
          <div class="flex flex-wrap gap-6 text-sm text-text-secondary">
            <div class="flex items-center gap-2">
              <span class="h-2 w-2 rounded-full bg-[var(--color-success)]"></span>
              Real-time spatialization
            </div>
            <div class="flex items-center gap-2">
              <span class="h-2 w-2 rounded-full bg-[var(--color-accent)]"></span>
              Drag-and-drop sound sources
            </div>
            <div class="flex items-center gap-2">
              <span class="h-2 w-2 rounded-full bg-[var(--color-warning)]"></span>
              Save, recall, and share rooms
            </div>
          </div>
        </div>

        <div class="relative">
          <div class="absolute inset-0 blur-3xl bg-[radial-gradient(circle,rgba(94,234,212,0.3),transparent_50%)]"></div>
          <div class="relative rounded-2xl border border-[var(--color-border-strong)] bg-[color-mix(in_srgb,var(--color-panel)_85%,black_15%)] shadow-[0_24px_60px_rgba(0,0,0,0.35)] overflow-hidden">
            <div class="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border-subtle)] bg-[color-mix(in_srgb,var(--color-panel)_90%,black_10%)]">
              <div class="flex items-center gap-2 text-sm text-text-secondary">
                <span class="h-2 w-2 rounded-full bg-[#ef4444]"></span>
                <span class="h-2 w-2 rounded-full bg-[#f59e0b]"></span>
                <span class="h-2 w-2 rounded-full bg-[#10b981]"></span>
                <span class="ml-2">Room: Demo Loft</span>
              </div>
              <span class="text-xs text-text-muted">Live spatial preview</span>
            </div>
            <div class="grid grid-cols-3 gap-6 p-6">
              <div class="col-span-2 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.25),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(16,185,129,0.25),transparent_35%),var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-xl aspect-video relative">
                <div class="absolute inset-0 flex items-center justify-center text-text-muted text-sm">Interactive canvas preview</div>
                <div class="absolute top-4 left-4 flex gap-2">
                  <span class="px-3 py-1 rounded-full bg-[color-mix(in_srgb,var(--color-accent)_15%,transparent)] text-[color-mix(in_srgb,var(--color-accent)_80%,white)] text-xs">Binaural</span>
                  <span class="px-3 py-1 rounded-full bg-[color-mix(in_srgb,var(--color-success)_15%,transparent)] text-[color-mix(in_srgb,var(--color-success)_80%,white)] text-xs">IR: Cathedral</span>
                </div>
              </div>
              <div class="space-y-4">
                <div class="rounded-lg border border-[var(--color-border-subtle)] bg-surface-raised px-4 py-3">
                  <p class="text-sm font-medium">Source stack</p>
                  <p class="text-xs text-text-muted">Layer ambiences, music beds, and dialogue with per-source controls.</p>
                </div>
                <div class="rounded-lg border border-[var(--color-border-subtle)] bg-surface-raised px-4 py-3">
                  <p class="text-sm font-medium">Spatial mixer</p>
                  <p class="text-xs text-text-muted">Tune distance curves, pan laws, and reflections in real time.</p>
                </div>
                <div class="rounded-lg border border-[var(--color-border-subtle)] bg-surface-raised px-4 py-3">
                  <p class="text-sm font-medium">Exports</p>
                  <p class="text-xs text-text-muted">Bounce stems or share interactive rooms with collaborators.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
// Landing page is presentational and uses router links for primary calls to action.
</script>
