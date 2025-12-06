import { Page, Route } from '@playwright/test';

/**
 * Supabase delegates Google OAuth through a hosted page. This helper intercepts the
 * Google authorization endpoint and immediately returns a callback-style redirect
 * that matches Supabase's expected hash fragment. No external network calls are made.
 */
export async function mockGoogleOAuth(page: Page, redirectUrl?: string) {
  const supabaseLikeRedirect =
    redirectUrl ??
    'http://localhost:4173/auth/v1/callback#access_token=fake-token&provider=google&expires_in=3600';

  await page.route('https://accounts.google.com/**', (route: Route) => {
    return route.fulfill({
      status: 302,
      headers: {
        location: supabaseLikeRedirect,
      },
      body: '',
    });
  });
}
