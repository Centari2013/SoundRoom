export const PLAN_THEMES = {
  free: {
    card: 'border border-border-subtle hover:border-border-strong focus-within:border-border-strong shadow-soft bg-surface-base',
    ring: '',
    cta: 'bg-surface-raised text-text-primary hover:bg-surface-base focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface-app',
    badge: 'bg-border-strong/85 text-text-inverse',
    soundHighlight: ''
  },
  basic: {
    card: 'border border-accent-soft/65 hover:border-accent focus-within:border-accent ring-1 ring-accent/40 shadow-soft bg-surface-base/94',
    cta: 'bg-accent text-text-inverse hover:bg-accent-strong focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface-app',
    badge: 'bg-accent-strong text-text-inverse',
    soundHighlight: 'ring-2 ring-offset-2 ring-accent/65 ring-offset-surface-app shadow-soft border-accent/60'
  },
  pro: {
    card: 'border border-accent-strong/60 hover:border-accent-strong focus-within:border-accent-strong ring-1 ring-accent-strong/35 shadow-strong bg-surface-raised/92',
    cta: 'bg-accent-strong text-text-inverse hover:bg-accent focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface-app',
    badge: 'bg-accent text-text-inverse',
    soundHighlight: 'ring-2 ring-offset-2 ring-accent-strong/65 ring-offset-surface-app shadow-strong border-accent-strong/70'
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
