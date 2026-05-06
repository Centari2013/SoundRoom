import { describe, expect, it } from 'vitest'
import { buildCorsHeaders, jsonResponse, resolveAllowedOrigin } from '@/../api/_utils/http.js'

function requestWithOrigin(origin) {
  return {
    headers: {
      get: (name) => (name.toLowerCase() === 'origin' ? origin : null),
    },
  }
}

describe('api http helpers', () => {
  it.each([
    'https://soundroom.live',
    'http://localhost:5173',
    'https://soundroom-preview.vercel.app',
  ])('allows trusted origin %s', (origin) => {
    expect(resolveAllowedOrigin(requestWithOrigin(origin))).toBe(origin)
  })

  it('falls back to production origin for untrusted origins', () => {
    expect(resolveAllowedOrigin(requestWithOrigin('https://evil.example'))).toBe('https://soundroom.live')
  })

  it('builds CORS headers with custom methods', () => {
    expect(buildCorsHeaders(requestWithOrigin('http://localhost:5173'), 'GET, OPTIONS'))
      .toMatchObject({
        'Access-Control-Allow-Origin': 'http://localhost:5173',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        Vary: 'Origin',
      })
  })

  it('returns JSON responses with CORS headers', async () => {
    const response = jsonResponse({ ok: true }, { status: 201 }, requestWithOrigin('https://soundroom.live'))

    expect(response.status).toBe(201)
    expect(response.headers.get('content-type')).toBe('application/json')
    expect(response.headers.get('access-control-allow-origin')).toBe('https://soundroom.live')
    await expect(response.json()).resolves.toEqual({ ok: true })
  })
})
