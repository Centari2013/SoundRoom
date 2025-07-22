import { test, expect } from '@playwright/test';

test('open password reset view', async ({ page }) => {
  await page.goto('/reset');
  await expect(page.getByRole('heading', { name: /reset password/i })).toBeVisible();
});
