import { Page } from '@playwright/test'

/**
 * Simulate a successful Supabase OAuth callback without contacting Google.
 * The app expects Supabase to exchange the OAuth redirect hash for a session,
 * so we stub the REST endpoints Supabase would normally call.
 */
export async function mockGoogleCallback(page: Page) {
  // Intercept the token exchange that Supabase JS performs after the redirect.
  await page.route('**/auth/v1/token*', async (route) => {
    const responseBody = {
      access_token: 'mock-access-token',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'mock-refresh-token',
      provider_token: 'mock-provider-token',
      user: {
        id: 'mock-user-id',
        email: 'oauth_test@soundroom.dev',
        email_confirmed_at: new Date().toISOString(),
        user_metadata: { full_name: 'OAuth Roomie', avatar_url: null },
      },
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(responseBody) })
  })

  // Drive the browser to the callback route with hash params Supabase expects.
  const hash = new URLSearchParams({
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: '3600',
    token_type: 'bearer',
    provider_token: 'mock-provider-token',
    type: 'recovery',
  }).toString()

  await page.goto(`/auth/callback#${hash}`, { waitUntil: 'networkidle' })
}
