import { expect, test } from '@playwright/test';
import { credentials, invalidCredentials, login, logout, type UserTier } from './helpers/login';

test.describe('Authentication', () => {
  (['free', 'basic', 'pro'] as UserTier[]).forEach((tier) => {
    test(`logs in as ${tier} tier user`, async ({ page }) => {
      await login(page, tier);
      await expect(page.getByTestId('user-badge')).toContainText(credentials[tier].label);
    });
  });

  test('shows an error toast when credentials are invalid', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('auth-email').fill(invalidCredentials.email);
    await page.getByTestId('auth-password').fill(invalidCredentials.password);
    await page.getByTestId('auth-submit').click();

    const errorToast = page.getByTestId('auth-error');
    await expect(errorToast).toBeVisible();
    await expect(errorToast).toContainText(/invalid|incorrect|try again/i);
  });

  test('can logout after authenticating', async ({ page }) => {
    await login(page, 'basic');
    await logout(page);
  });
});
