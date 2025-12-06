import { expect, test } from '@playwright/test';
import { mockGoogleOAuth } from './helpers/mockOAuthCallback';

const GOOGLE_AUTH_REGEX = /https:\/\/accounts\.google\.com\/.*oauth2/i;

test.describe('Google OAuth entry point', () => {
  test('renders the Google auth button with a valid redirect URL', async ({ page }) => {
    await page.goto('/login');
    const googleButton = page.getByTestId('google-oauth-button');

    await expect(googleButton).toBeVisible();
    const href = await googleButton.getAttribute('href');
    expect(href).not.toBeNull();
    expect(href as string).toMatch(GOOGLE_AUTH_REGEX);
  });

  test('mocks the OAuth callback without contacting Google', async ({ page }) => {
    await mockGoogleOAuth(page);
    await page.goto('/login');

    const googleButton = page.getByTestId('google-oauth-button');
    await expect(googleButton).toBeVisible();

    await Promise.all([
      page.waitForURL(/auth\/v1\/callback/),
      googleButton.click(),
    ]);

    await expect(page.getByTestId('auth-success')).toContainText(/google/i);
  });
});
