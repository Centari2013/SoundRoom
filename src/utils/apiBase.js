function normalizeBase(base) {
  if (!base) return ''
  const trimmed = base.trim()
  if (!trimmed) return ''
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed
}

/**
 * Build a full API URL using an optional explicit base.
 * Falls back to relative paths when no base is configured so the
 * app can keep working in single-origin deployments.
 */
export function buildApiUrl(path) {
  const base = normalizeBase(import.meta?.env?.VITE_API_BASE_URL)
  if (!base) return path
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`
}

export function getApiBase() {
  return normalizeBase(import.meta?.env?.VITE_API_BASE_URL)
}
