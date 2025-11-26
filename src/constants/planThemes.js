export const PLAN_THEMES = {
  free: {
    card: 'sr-border sr-border-subtle hover:sr-border-strong focus-within:sr-border-strong shadow-[var(--color-shadow-soft)] bg-[var(--color-bg-surface)]',
    ring: '',
    cta: 'bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-app)]',
    badge: 'bg-[rgba(var(--color-border-strong-rgb),0.85)] text-[var(--color-text-inverse)]',
    soundHighlight: ''
  },
  basic: {
    card: 'sr-border border-accent-soft hover:border-accent focus-within:border-accent ring-1 ring-[rgba(var(--color-accent-rgb),0.4)] shadow-[0_8px_24px_rgba(var(--color-accent-rgb),0.08)] bg-[color-mix(in_srgb,var(--color-bg-surface)_94%,transparent)]',
    cta: 'bg-[var(--color-accent)] text-[var(--color-text-inverse)] hover:bg-[var(--color-accent-strong)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-app)]',
    badge: 'bg-[var(--color-accent-strong)] text-[var(--color-text-inverse)]',
    soundHighlight: 'ring-2 ring-offset-2 ring-[rgba(var(--color-accent-rgb),0.65)] ring-offset-[var(--color-bg-app)] shadow-[0_0_0_4px_rgba(var(--color-accent-rgb),0.15)] border-accent'
  },
  pro: {
    card: 'sr-border border-accent-strong hover:border-accent-strong focus-within:border-accent-strong ring-1 ring-[rgba(var(--color-accent-strong-rgb),0.35)] shadow-[0_10px_28px_rgba(var(--color-accent-strong-rgb),0.1)] bg-[color-mix(in_srgb,var(--color-bg-elevated)_92%,transparent)]',
    cta: 'bg-[var(--color-accent-strong)] text-[var(--color-text-inverse)] hover:bg-[var(--color-accent)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-app)]',
    badge: 'bg-[var(--color-accent)] text-[var(--color-text-inverse)]',
    soundHighlight: 'ring-2 ring-offset-2 ring-[rgba(var(--color-accent-strong-rgb),0.65)] ring-offset-[var(--color-bg-app)] shadow-[0_0_0_5px_rgba(var(--color-accent-strong-rgb),0.18)] border-accent-strong'
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
