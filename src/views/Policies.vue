<template>
  <div class="flex-1 overflow-auto bg-[var(--color-bg-app)] text-text-primary">
    <main class="mx-auto flex min-h-full max-w-4xl flex-col justify-center px-6 py-16 sm:py-24">
      <section class="space-y-8 text-left">
        <div class="space-y-3">
          <p class="text-sm uppercase tracking-[0.25em] text-[var(--color-accent-soft)]">
            Legal
          </p>
          <h1 class="text-4xl font-semibold leading-tight sm:text-5xl">
            Policies & Terms
          </h1>
          <p class="max-w-2xl text-text-secondary">
            A quick index for the documents that cover how SoundRoom works, what data is
            handled, and the terms that apply when you use the service.
          </p>
        </div>

        <div class="grid gap-4 sm:grid-cols-3">
          <RouterLink
            v-for="item in policyLinks"
            :key="item.name"
            :to="{ name: item.route }"
            class="group rounded-lg border border-[var(--color-border-subtle)] bg-[color-mix(in_srgb,var(--color-panel)_85%,black_15%)] p-5 text-left transition hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-elevated)]"
          >
            <span class="block text-lg font-semibold text-text-primary">
              {{ item.name }}
            </span>
            <span class="mt-2 block text-sm leading-6 text-text-secondary">
              {{ item.description }}
            </span>
            <span class="mt-4 inline-block text-sm font-medium text-[var(--color-accent-soft)] transition group-hover:text-[var(--color-accent)]">
              Read document
            </span>
          </RouterLink>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
const policyLinks = [
  {
    name: 'Privacy Policy',
    route: 'privacy',
    description: 'How account data, uploads, analytics, and privacy preferences are handled.',
  },
  {
    name: 'Terms of Service',
    route: 'terms',
    description: 'Usage rules, account responsibilities, subscriptions, and service limits.',
  },
  {
    name: 'Cookie Policy',
    route: 'cookies',
    description: 'Essential storage, analytics, and the technologies needed to operate SoundRoom.',
  },
]
</script>
