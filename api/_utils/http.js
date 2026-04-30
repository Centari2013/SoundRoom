export const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://soundroom.live',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature, Authorization',
  'Access-Control-Allow-Credentials': 'true',
  Vary: 'Origin',
}

const STATIC_ALLOWED_ORIGINS = new Set([
  'https://soundroom.live',
  'http://localhost:5173',
])

function isAllowedOrigin(origin = '') {
  if (!origin) return false
  if (STATIC_ALLOWED_ORIGINS.has(origin)) return true
  return /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)
}

export function resolveAllowedOrigin(request) {
  const origin = request?.headers?.get?.('origin') || ''
  return isAllowedOrigin(origin) ? origin : 'https://soundroom.live'
}

export function buildCorsHeaders(request, methods = 'POST, OPTIONS') {
  return {
    'Access-Control-Allow-Origin': resolveAllowedOrigin(request),
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    Vary: 'Origin',
  }
}

export function jsonResponse(body, init = {}, request = null) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...buildCorsHeaders(request),
      ...(init.headers || {}),
    },
  })
}
