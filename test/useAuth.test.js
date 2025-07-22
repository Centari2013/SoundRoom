import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'

let callbacks

vi.mock('@/utils/supabase', () => {
  callbacks = []
  return {
    supabase: {
      auth: {
        getSession: vi.fn(async () => ({ data: { session: { user: { id: '1' } } } })),
        onAuthStateChange: vi.fn((cb) => { callbacks.push(cb) })
      }
    }
  }
})

describe('useAuth', () => {
  beforeEach(() => {
    vi.resetModules()
    if (callbacks) callbacks.length = 0
  })

  it('initializes user state and clears it', async () => {
    const { useAuth } = await import('../src/composables/useAuth.js')
    await nextTick()
    const auth = useAuth()
    expect(auth.isAuthenticated.value).toBe(true)
    auth.clearUser()
    expect(auth.user.value).toBe(null)
  })

  it('responds to auth state changes', async () => {
    const { useAuth } = await import('../src/composables/useAuth.js')
    await nextTick()
    const auth = useAuth()
    callbacks[0]('SIGNED_OUT', null)
    await nextTick()
    expect(auth.isAuthenticated.value).toBe(false)
    expect(auth.sessionLoaded.value).toBe(true)
  })
})
