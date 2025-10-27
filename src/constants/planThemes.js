export const PLAN_THEMES = {
  free: {
    card: 'border border-neutral-300 dark:border-neutral-800 hover:border-neutral-900 focus-within:border-neutral-900 dark:hover:border-neutral-100 dark:focus-within:border-neutral-100',
    ring: '',
    cta: 'bg-neutral-200 text-neutral-900 hover:bg-neutral-300 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700',
    badge: 'bg-neutral-500/80 text-white',
    soundHighlight: ''
  },
  basic: {
    card: 'border border-sky-400/70 dark:border-sky-600/80 hover:border-sky-500 focus-within:border-sky-500 dark:hover:border-sky-400 dark:focus-within:border-sky-400 ring-1 ring-sky-400/50 dark:ring-sky-500/60 shadow-sky-500/5',
    cta: 'bg-sky-600 text-white hover:bg-sky-500 focus-visible:ring-2 focus-visible:ring-sky-400 dark:bg-sky-500 dark:hover:bg-sky-400 dark:focus-visible:ring-sky-300',
    badge: 'bg-sky-500 text-white',
    soundHighlight: 'ring-2 ring-offset-2 ring-sky-400/70 dark:ring-sky-500/70 ring-offset-white dark:ring-offset-neutral-950 shadow-sky-500/20 border-sky-300/80 dark:border-sky-600'
  },
  pro: {
    card: 'border border-violet-400/80 dark:border-violet-600/80 hover:border-violet-500 focus-within:border-violet-500 dark:hover:border-violet-400 dark:focus-within:border-violet-400 ring-1 ring-violet-400/50 dark:ring-violet-500/60 shadow-violet-500/5',
    cta: 'bg-violet-600 text-white hover:bg-violet-500 focus-visible:ring-2 focus-visible:ring-violet-400 dark:bg-violet-500 dark:hover:bg-violet-400 dark:focus-visible:ring-violet-300',
    badge: 'bg-violet-500 text-white',
    soundHighlight: 'ring-2 ring-offset-2 ring-violet-400/70 dark:ring-violet-500/70 ring-offset-white dark:ring-offset-neutral-950 shadow-violet-500/20 border-violet-300/80 dark:border-violet-600'
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
