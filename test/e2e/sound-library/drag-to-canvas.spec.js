import { test, expect } from '@playwright/test';
import { mockSoundRoutes, mockSound } from './mockRoutes';

test.beforeEach(async ({ page }) => {
  await mockSoundRoutes(page);
});

test('drag loaded sound onto canvas', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /add source/i }).click();
  await page.getByRole('button', { name: 'Load' }).click();
  const item = page.getByRole('listitem', { name: mockSound.name });
  const canvas = page.getByRole('application');
  await item.dragTo(canvas);
  await expect(page.getByText(mockSound.name)).toBeVisible();
});
