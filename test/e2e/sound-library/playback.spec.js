import { test, expect } from '@playwright/test';
import { mockSoundRoutes, mockSound } from './mockRoutes';

test.beforeEach(async ({ page }) => {
  await mockSoundRoutes(page);
});

test('toggle play and pause for all sounds', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /add source/i }).click();
  await page.getByRole('button', { name: 'Load' }).click();
  const item = page.getByRole('listitem', { name: mockSound.name });
  const canvas = page.getByRole('application');
  await item.dragTo(canvas);
  const playButton = page.getByRole('button', { name: /play all/i });
  await playButton.click();
  await expect(page.getByRole('button', { name: /pause all/i })).toBeVisible();
  await page.getByRole('button', { name: /pause all/i }).click();
  await expect(page.getByRole('button', { name: /play all/i })).toBeVisible();
});
