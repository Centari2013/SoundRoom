import { expect, test } from '@playwright/test';
import { login } from './helpers/login';

test.describe('Overlay visibility', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'free');
  });

  test('shows the active audio overlay when playback is running', async ({ page }) => {
    await page.getByTestId('audio-play').click();
    await expect(page.getByTestId('audio-overlay')).toBeVisible();
    await expect(page.getByTestId('audio-overlay')).toContainText(/playing|live/i);
  });

  test('shows the empty overlay when no sources are present', async ({ page }) => {
    await page.getByTestId('clear-sources').click();
    await expect(page.getByTestId('empty-overlay')).toBeVisible();
    await expect(page.getByTestId('audio-overlay')).toBeHidden();
  });
});
