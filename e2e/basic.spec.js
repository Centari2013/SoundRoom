import { test, expect } from '@playwright/test';

test('should display SoundRoom header', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'SoundRoom' })).toBeVisible();
});
