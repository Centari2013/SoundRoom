import { test, expect } from '@playwright/test';

test('shows login modal when visiting /login', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
});

test('shows sign up modal when visiting /signup', async ({ page }) => {
  await page.goto('/signup');
  await expect(page.getByRole('heading', { name: 'Sign Up' })).toBeVisible();
});
