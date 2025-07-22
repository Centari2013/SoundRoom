import { test, expect } from '@playwright/test';

test('open login modal', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
});
