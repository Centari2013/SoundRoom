import { expect, test } from '@playwright/test';
import { login } from './helpers/login';

test.describe('Theme switching', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'basic');
  });

  test('toggles between light and dark modes', async ({ page }) => {
    const body = page.locator('body');
    const themeToggle = page.getByTestId('theme-toggle');

    await expect(body).toHaveAttribute('data-theme', /light|default/i);
    await themeToggle.click();
    await expect(body).toHaveAttribute('data-theme', /dark/i);

    await themeToggle.click();
    await expect(body).toHaveAttribute('data-theme', /light|default/i);
  });

  test('pro-only themes can be applied by a pro account', async ({ page, context }) => {
    // Upgrade session to a pro account for this test without leaking across tests.
    const proPage = await context.newPage();
    await login(proPage, 'pro');

    await proPage.getByTestId('theme-menu').click();
    await proPage.getByTestId('theme-pro-aurora').click();

    await expect(proPage.getByTestId('theme-applied')).toContainText(/aurora/i);
    await proPage.close();
  });

  test('non-pro users are prompted to upgrade when selecting pro themes', async ({ page }) => {
    await page.getByTestId('theme-menu').click();
    await page.getByTestId('theme-pro-aurora').click();

    const upgradeModal = page.getByTestId('upgrade-modal');
    await expect(upgradeModal).toBeVisible();
    await expect(upgradeModal).toContainText(/upgrade|pro/i);
    await page.getByTestId('upgrade-modal-close').click();
    await expect(upgradeModal).toBeHidden();
  });
});
