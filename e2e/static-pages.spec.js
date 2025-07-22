import { test, expect } from '@playwright/test';

test('terms of service page has heading', async ({ page }) => {
  await page.goto('/terms');
  await expect(page.getByRole('heading', { name: 'Terms of Service' })).toBeVisible();
});

test('privacy policy page has heading', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible();
});

test('pricing page lists plans', async ({ page }) => {
  await page.goto('/pricing');
  await expect(page.getByRole('heading', { name: 'Choose Your Plan' })).toBeVisible();
});

test('logged out page shows message', async ({ page }) => {
  await page.goto('/logged-out');
  await expect(page.getByRole('heading', { name: "You've been signed out" })).toBeVisible();
});
