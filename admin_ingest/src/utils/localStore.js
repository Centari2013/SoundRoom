const STORAGE_KEY = 'soundroom_admin_ingest_v1'

function safeParse(payload, fallback) {
  try {
    return payload ? JSON.parse(payload) : fallback
  } catch (error) {
    console.warn('[admin-ingest] Failed to parse persisted state', error)
    return fallback
  }
}

export function loadPersistedState() {
  if (typeof localStorage === 'undefined') return {}
  return safeParse(localStorage.getItem(STORAGE_KEY), {})
}

export function persistState(partial) {
  if (typeof localStorage === 'undefined') return
  const next = { ...loadPersistedState(), ...partial }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

export function clearPersistedState() {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}
