import { expect, test } from '@playwright/test';
import { login } from './helpers/login';

test.describe('Entitlement gating', () => {
  test('free users are prompted to upgrade when launching a pro feature', async ({ page }) => {
    await login(page, 'free');

    await page.getByTestId('feature-pro-bounce').click();
    const upgradeModal = page.getByTestId('upgrade-modal');

    await expect(upgradeModal).toBeVisible();
    await expect(upgradeModal).toContainText(/pro|upgrade/i);
  });

  test('basic users are also guided to upgrade for pro-only tools', async ({ page }) => {
    await login(page, 'basic');

    await page.getByTestId('feature-pro-bounce').click();
    await expect(page.getByTestId('upgrade-modal')).toBeVisible();
  });
});
