export const PLAN_THEMES = {
  free: {
    card: 'border border-border-subtle hover:border-border-strong focus-within:border-border-strong shadow-soft bg-surface-base',
    ring: '',
    cta: 'bg-surface-raised text-text-primary hover:bg-surface-base focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-app',
    badge: 'bg-[rgba(var(--color-border-strong-rgb),0.85)] text-text-inverse',
    soundHighlight: ''
  },
  basic: {
    card: 'border border-[rgba(var(--color-accent-soft-rgb),0.65)] hover:border-[var(--color-accent)] focus-within:border-[var(--color-accent)] ring-1 ring-[rgba(var(--color-accent-rgb),0.4)] shadow-[0_8px_24px_rgba(var(--color-accent-rgb),0.08)] bg-[color-mix(in_srgb,var(--color-bg-surface)_94%,transparent)]',
    cta: 'bg-accent text-text-inverse hover:bg-accent-strong focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-app',
    badge: 'bg-accent-strong text-text-inverse',
    soundHighlight: 'ring-2 ring-offset-2 ring-[rgba(var(--color-accent-rgb),0.65)] ring-offset-surface-app shadow-[0_0_0_4px_rgba(var(--color-accent-rgb),0.15)] border-[rgba(var(--color-accent-rgb),0.6)]'
  },
  pro: {
    card: 'border border-[rgba(var(--color-accent-strong-rgb),0.6)] hover:border-[var(--color-accent-strong)] focus-within:border-[var(--color-accent-strong)] ring-1 ring-[rgba(var(--color-accent-strong-rgb),0.35)] shadow-[0_10px_28px_rgba(var(--color-accent-strong-rgb),0.1)] bg-[color-mix(in_srgb,var(--color-bg-elevated)_92%,transparent)]',
    cta: 'bg-accent-strong text-text-inverse hover:bg-accent focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-app',
    badge: 'bg-accent text-text-inverse',
    soundHighlight: 'ring-2 ring-offset-2 ring-[rgba(var(--color-accent-strong-rgb),0.65)] ring-offset-surface-app shadow-[0_0_0_5px_rgba(var(--color-accent-strong-rgb),0.18)] border-[rgba(var(--color-accent-strong-rgb),0.7)]'
  }
}

export function getPlanTheme(planId) {
  const normalized = (planId ?? '').toLowerCase()
  return PLAN_THEMES[normalized] ?? PLAN_THEMES.free
}

export function getSoundHighlightClass(planId) {
  const normalized = (planId ?? '').toLowerCase()
  return PLAN_THEMES[normalized]?.soundHighlight ?? ''
}

export function getPlanBadgeClass(planId) {
  const normalized = (planId ?? '').toLowerCase()
  return PLAN_THEMES[normalized]?.badge ?? PLAN_THEMES.free.badge
}
