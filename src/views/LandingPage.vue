<template>
  <section
    class="flex-1 overflow-auto bg-[radial-gradient(circle_at_10%_20%,rgba(88,101,242,0.18),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(16,_185,_129,0.18),transparent_30%),var(--color-bg-app)] text-text-primary"
  >
    <div class="mx-auto max-w-6xl px-6 py-16 lg:py-24 space-y-24">
      <!-- Hero -->
      <div class="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] items-center">
        <div class="space-y-8">
          <p class="text-sm uppercase tracking-[0.3em] text-[color-mix(in_srgb,var(--color-accent)_60%,white)]">Immersive sound design</p>
          <h1 class="text-4xl sm:text-5xl lg:text-6xl font-semibold leading-tight">
            Build spatial audio rooms that feel alive.
          </h1>
          <p class="text-lg text-text-secondary max-w-2xl">
            SoundRoom is a browser-based canvas for placing, sculpting, and automating audio sources in 3D space. Sketch ideas fast, then
            polish mixes with impulse responses and precise controls.
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
            <button class="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition" type="button">
              <span class="h-2 w-2 rounded-full bg-[var(--color-success)]"></span>
              Watch 90s walkthrough (placeholder)
            </button>
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
              <div
                class="col-span-2 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.25),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(16,185,129,0.25),transparent_35%),var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-xl aspect-video relative"
              >
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

      <!-- Social proof -->
      <div class="grid gap-6 md:grid-cols-[1.1fr_0.9fr] items-center">
        <div class="space-y-4">
          <p class="text-sm uppercase tracking-[0.25em] text-[color-mix(in_srgb,var(--color-accent)_60%,white)]">Trusted by teams</p>
          <h2 class="text-3xl font-semibold">Built for sound designers, storytellers, and immersive product teams.</h2>
          <p class="text-text-secondary max-w-2xl">
            Whether you’re shipping an indie game, prototyping XR experiences, or designing restorative soundscapes, SoundRoom keeps your
            creative flow in the browser with no installs required.
          </p>
          <div class="flex flex-wrap gap-3 text-sm text-text-secondary">
            <span class="px-3 py-1 rounded-full border border-[var(--color-border-subtle)]">Unity &amp; Unreal friendly</span>
            <span class="px-3 py-1 rounded-full border border-[var(--color-border-subtle)]">Remote-ready for async teams</span>
            <span class="px-3 py-1 rounded-full border border-[var(--color-border-subtle)]">Built-in reference scenes</span>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="flex items-center justify-center rounded-xl border border-dashed border-[var(--color-border-subtle)] bg-surface-raised/60 px-4 py-6 text-text-muted text-sm">
            Logo strip placeholder
          </div>
          <div class="flex items-center justify-center rounded-xl border border-dashed border-[var(--color-border-subtle)] bg-surface-raised/60 px-4 py-6 text-text-muted text-sm">
            Award badges placeholder
          </div>
          <div class="col-span-2 grid grid-cols-3 gap-3 text-center text-sm text-text-secondary">
            <div class="rounded-lg border border-[var(--color-border-subtle)] bg-surface-raised/60 px-3 py-4">
              <p class="text-2xl font-semibold text-text-primary">2.3M</p>
              <p>Spatial renders</p>
            </div>
            <div class="rounded-lg border border-[var(--color-border-subtle)] bg-surface-raised/60 px-3 py-4">
              <p class="text-2xl font-semibold text-text-primary">38%</p>
              <p>Faster review cycles</p>
            </div>
            <div class="rounded-lg border border-[var(--color-border-subtle)] bg-surface-raised/60 px-3 py-4">
              <p class="text-2xl font-semibold text-text-primary">24/7</p>
              <p>Cloud renders</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Feature grid -->
      <div class="space-y-6">
        <div class="flex items-center justify-between gap-6 flex-wrap">
          <div class="space-y-2">
            <p class="text-sm uppercase tracking-[0.25em] text-[color-mix(in_srgb,var(--color-accent)_60%,white)]">Why SoundRoom</p>
            <h2 class="text-3xl font-semibold">Everything you need to sketch, iterate, and publish spatial audio.</h2>
          </div>
          <RouterLink to="/app">
            <button class="px-4 py-2 rounded-full border border-[var(--color-border-subtle)] text-sm hover:bg-surface-raised transition">
              Start a blank room
            </button>
          </RouterLink>
        </div>
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <article class="rounded-xl border border-[var(--color-border-subtle)] bg-surface-raised/70 p-5 space-y-3">
            <div class="flex items-center gap-3">
              <span class="h-10 w-10 rounded-full bg-[color-mix(in_srgb,var(--color-accent)_25%,transparent)] flex items-center justify-center text-[color-mix(in_srgb,var(--color-accent)_80%,white)]">🎛️</span>
              <h3 class="text-lg font-medium">Timeline + automation</h3>
            </div>
            <p class="text-sm text-text-secondary">Draw envelopes, automate movement, and cue transitions without leaving the browser.</p>
            <div class="h-24 rounded-lg border border-dashed border-[var(--color-border-subtle)] bg-surface-base/60 flex items-center justify-center text-xs text-text-muted">
              Timeline screenshot placeholder
            </div>
          </article>

          <article class="rounded-xl border border-[var(--color-border-subtle)] bg-surface-raised/70 p-5 space-y-3">
            <div class="flex items-center gap-3">
              <span class="h-10 w-10 rounded-full bg-[color-mix(in_srgb,var(--color-success)_25%,transparent)] flex items-center justify-center text-[color-mix(in_srgb,var(--color-success)_80%,white)]">🌊</span>
              <h3 class="text-lg font-medium">Impulse responses</h3>
            </div>
            <p class="text-sm text-text-secondary">Swap spaces instantly with curated IRs or upload your own captures for authentic depth.</p>
            <div class="h-24 rounded-lg border border-dashed border-[var(--color-border-subtle)] bg-surface-base/60 flex items-center justify-center text-xs text-text-muted">
              IR gallery placeholder
            </div>
          </article>

          <article class="rounded-xl border border-[var(--color-border-subtle)] bg-surface-raised/70 p-5 space-y-3">
            <div class="flex items-center gap-3">
              <span class="h-10 w-10 rounded-full bg-[color-mix(in_srgb,var(--color-warning)_25%,transparent)] flex items-center justify-center text-[color-mix(in_srgb,var(--color-warning)_80%,white)]">👥</span>
              <h3 class="text-lg font-medium">Collaboration ready</h3>
            </div>
            <p class="text-sm text-text-secondary">Share links for async reviews, capture timestamped notes, and keep stakeholders aligned.</p>
            <div class="h-24 rounded-lg border border-dashed border-[var(--color-border-subtle)] bg-surface-base/60 flex items-center justify-center text-xs text-text-muted">
              Commenting mock placeholder
            </div>
          </article>

          <article class="rounded-xl border border-[var(--color-border-subtle)] bg-surface-raised/70 p-5 space-y-3">
            <div class="flex items-center gap-3">
              <span class="h-10 w-10 rounded-full bg-[color-mix(in_srgb,var(--color-info)_25%,transparent)] flex items-center justify-center text-[color-mix(in_srgb,var(--color-info)_80%,white)]">🛰️</span>
              <h3 class="text-lg font-medium">Spatial formats</h3>
            </div>
            <p class="text-sm text-text-secondary">Export binaural, stereo fold-downs, and multi-channel beds for engines or DAWs.</p>
            <div class="h-24 rounded-lg border border-dashed border-[var(--color-border-subtle)] bg-surface-base/60 flex items-center justify-center text-xs text-text-muted">
              Export matrix placeholder
            </div>
          </article>

          <article class="rounded-xl border border-[var(--color-border-subtle)] bg-surface-raised/70 p-5 space-y-3">
            <div class="flex items-center gap-3">
              <span class="h-10 w-10 rounded-full bg-[color-mix(in_srgb,var(--color-accent)_20%,transparent)] flex items-center justify-center text-[color-mix(in_srgb,var(--color-accent)_80%,white)]">🗂️</span>
              <h3 class="text-lg font-medium">Asset library</h3>
            </div>
            <p class="text-sm text-text-secondary">Drag curated ambience packs, Foley, and voice beds—or drop in your own uploads.</p>
            <div class="h-24 rounded-lg border border-dashed border-[var(--color-border-subtle)] bg-surface-base/60 flex items-center justify-center text-xs text-text-muted">
              Library panel placeholder
            </div>
          </article>

          <article class="rounded-xl border border-[var(--color-border-subtle)] bg-surface-raised/70 p-5 space-y-3">
            <div class="flex items-center gap-3">
              <span class="h-10 w-10 rounded-full bg-[color-mix(in_srgb,var(--color-success)_20%,transparent)] flex items-center justify-center text-[color-mix(in_srgb,var(--color-success)_80%,white)]">🔐</span>
              <h3 class="text-lg font-medium">Resilient cloud</h3>
            </div>
            <p class="text-sm text-text-secondary">Project saves, versioning, and backups are handled automatically in the cloud.</p>
            <div class="h-24 rounded-lg border border-dashed border-[var(--color-border-subtle)] bg-surface-base/60 flex items-center justify-center text-xs text-text-muted">
              Version history placeholder
            </div>
          </article>
        </div>
      </div>

      <!-- Workflow -->
      <div class="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] items-center">
        <div class="space-y-4">
          <p class="text-sm uppercase tracking-[0.25em] text-[color-mix(in_srgb,var(--color-accent)_60%,white)]">Workflow</p>
          <h2 class="text-3xl font-semibold">Ship immersive audio faster with a browser-first pipeline.</h2>
          <p class="text-text-secondary">
            SoundRoom pairs a tactile canvas with structured workflows so teams can move from idea to deliverable without ceremony.
            Use these steps as checkpoints for your team or replace with your own process screenshots.
          </p>
          <div class="flex gap-3 flex-wrap">
            <RouterLink to="/app">
              <button class="px-4 py-2 rounded-full bg-[color-mix(in_srgb,var(--color-accent)_85%,black_15%)] text-white shadow-[0_12px_30px_rgba(0,0,0,0.25)] hover:translate-y-[-1px] transition text-sm">
                Build a room now
              </button>
            </RouterLink>
            <button class="px-4 py-2 rounded-full border border-[var(--color-border-subtle)] text-sm hover:bg-surface-raised transition" type="button">
              Download workflow PDF (placeholder)
            </button>
          </div>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="rounded-xl border border-[var(--color-border-subtle)] bg-surface-raised/60 p-4 space-y-3">
            <div class="flex items-center gap-2 text-sm font-medium">
              <span class="h-8 w-8 rounded-full bg-[color-mix(in_srgb,var(--color-accent)_20%,transparent)] flex items-center justify-center">1</span>
              Capture &amp; drop
            </div>
            <p class="text-sm text-text-secondary">Pull in ambient captures, voiceover, and Foley to establish your bed.</p>
            <div class="h-28 rounded-lg border border-dashed border-[var(--color-border-subtle)] bg-surface-base/60 flex items-center justify-center text-xs text-text-muted">
              Upload panel placeholder
            </div>
          </div>
          <div class="rounded-xl border border-[var(--color-border-subtle)] bg-surface-raised/60 p-4 space-y-3">
            <div class="flex items-center gap-2 text-sm font-medium">
              <span class="h-8 w-8 rounded-full bg-[color-mix(in_srgb,var(--color-success)_20%,transparent)] flex items-center justify-center">2</span>
              Stage &amp; automate
            </div>
            <p class="text-sm text-text-secondary">Place sources, automate trajectories, and audition impulse responses.</p>
            <div class="h-28 rounded-lg border border-dashed border-[var(--color-border-subtle)] bg-surface-base/60 flex items-center justify-center text-xs text-text-muted">
              Canvas + automation placeholder
            </div>
          </div>
          <div class="rounded-xl border border-[var(--color-border-subtle)] bg-surface-raised/60 p-4 space-y-3">
            <div class="flex items-center gap-2 text-sm font-medium">
              <span class="h-8 w-8 rounded-full bg-[color-mix(in_srgb,var(--color-info)_20%,transparent)] flex items-center justify-center">3</span>
              Review &amp; comment
            </div>
            <p class="text-sm text-text-secondary">Share review links with timestamped notes to keep directors and clients aligned.</p>
            <div class="h-28 rounded-lg border border-dashed border-[var(--color-border-subtle)] bg-surface-base/60 flex items-center justify-center text-xs text-text-muted">
              Review UI placeholder
            </div>
          </div>
          <div class="rounded-xl border border-[var(--color-border-subtle)] bg-surface-raised/60 p-4 space-y-3">
            <div class="flex items-center gap-2 text-sm font-medium">
              <span class="h-8 w-8 rounded-full bg-[color-mix(in_srgb,var(--color-warning)_20%,transparent)] flex items-center justify-center">4</span>
              Export &amp; handoff
            </div>
            <p class="text-sm text-text-secondary">Deliver binaural previews, stems, or multi-channel beds for Unity, Unreal, or DAWs.</p>
            <div class="h-28 rounded-lg border border-dashed border-[var(--color-border-subtle)] bg-surface-base/60 flex items-center justify-center text-xs text-text-muted">
              Export options placeholder
            </div>
          </div>
        </div>
      </div>

      <!-- Testimonials -->
      <div class="space-y-6">
        <div class="flex items-center justify-between gap-6 flex-wrap">
          <div class="space-y-2">
            <p class="text-sm uppercase tracking-[0.25em] text-[color-mix(in_srgb,var(--color-accent)_60%,white)]">Testimonials</p>
            <h2 class="text-3xl font-semibold">What teams say about SoundRoom.</h2>
            <p class="text-text-secondary">Swap these with real quotes or drop in video pull-quotes.</p>
          </div>
          <button class="px-4 py-2 rounded-full border border-[var(--color-border-subtle)] text-sm hover:bg-surface-raised transition" type="button">
            Import quotes CSV (placeholder)
          </button>
        </div>
        <div class="grid gap-4 lg:grid-cols-3">
          <article class="rounded-xl border border-[var(--color-border-subtle)] bg-surface-raised/70 p-6 space-y-4">
            <div class="h-10 w-10 rounded-full bg-[color-mix(in_srgb,var(--color-accent)_20%,transparent)]"></div>
            <p class="text-lg font-medium">“Swapped our DAW-heavy sprints for quick browser sketches.”</p>
            <p class="text-sm text-text-secondary">— Creative Director, Game Studio (placeholder)</p>
          </article>
          <article class="rounded-xl border border-[var(--color-border-subtle)] bg-surface-raised/70 p-6 space-y-4">
            <div class="h-10 w-10 rounded-full bg-[color-mix(in_srgb,var(--color-success)_20%,transparent)]"></div>
            <p class="text-lg font-medium">“Client reviews are faster now that they can walk the room in 3D.”</p>
            <p class="text-sm text-text-secondary">— Audio Lead, XR Agency (placeholder)</p>
          </article>
          <article class="rounded-xl border border-[var(--color-border-subtle)] bg-surface-raised/70 p-6 space-y-4">
            <div class="h-10 w-10 rounded-full bg-[color-mix(in_srgb,var(--color-warning)_20%,transparent)]"></div>
            <p class="text-lg font-medium">“Impulse responses + automation lanes make every pass feel intentional.”</p>
            <p class="text-sm text-text-secondary">— Supervising Sound Editor (placeholder)</p>
          </article>
        </div>
      </div>

      <!-- CTA -->
      <div class="rounded-2xl border border-[var(--color-border-strong)] bg-[color-mix(in_srgb,var(--color-panel)_80%,black_20%)] p-10 lg:p-14 shadow-[0_20px_60px_rgba(0,0,0,0.35)] space-y-6">
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div class="space-y-3 max-w-2xl">
            <p class="text-sm uppercase tracking-[0.25em] text-[color-mix(in_srgb,var(--color-accent)_60%,white)]">Get started</p>
            <h3 class="text-3xl font-semibold">Open a blank room in seconds—or drop in your own stems.</h3>
            <p class="text-text-secondary">Bring your own assets, invite collaborators, and keep everything versioned in the cloud.</p>
          </div>
          <div class="flex flex-wrap gap-4">
            <RouterLink to="/app">
              <button class="px-6 py-3 rounded-full bg-[color-mix(in_srgb,var(--color-accent)_85%,black_15%)] text-white shadow-[0_12px_40px_rgba(0,0,0,0.25)] hover:translate-y-[-1px] transition">
                Launch the studio
              </button>
            </RouterLink>
            <RouterLink to="/pricing">
              <button class="px-6 py-3 rounded-full border border-[var(--color-border-subtle)] text-text-primary bg-surface-base hover:bg-surface-raised transition">
                Compare plans
              </button>
            </RouterLink>
          </div>
        </div>
        <div class="grid gap-4 sm:grid-cols-3 text-sm text-text-secondary">
          <div class="rounded-lg border border-[var(--color-border-subtle)] bg-surface-raised/60 px-4 py-3">Placeholder for "Getting started" video</div>
          <div class="rounded-lg border border-[var(--color-border-subtle)] bg-surface-raised/60 px-4 py-3">Placeholder for "Sample room" download</div>
          <div class="rounded-lg border border-[var(--color-border-subtle)] bg-surface-raised/60 px-4 py-3">Placeholder for "Onboarding checklist"</div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
// Landing page is presentational and uses router links for primary calls to action.
</script>
