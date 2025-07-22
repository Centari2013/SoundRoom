import { test, expect } from '@playwright/test';

test('logged out screen links back to login', async ({ page }) => {
  await page.goto('/logged-out');
  await page.getByRole('button', { name: /sign in again/i }).click();
  await expect(page).toHaveURL(/\/login$/);
});
