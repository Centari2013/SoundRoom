import { test, expect } from '@playwright/test';
import { mockSoundRoutes, mockSound } from './mockRoutes';

test.beforeEach(async ({ page }) => {
  await mockSoundRoutes(page);
});

test('load sound from library', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /add source/i }).click();
  await page.getByRole('button', { name: 'Load' }).click();
  await expect(page.getByRole('listitem', { name: mockSound.name })).toBeVisible();
});
