import { expect, test } from '@playwright/test'
import { mockGoogleCallback } from './helpers/mockOAuthCallback'

// We only validate the presence of the Google OAuth button and a mocked redirect.
test.describe('Google OAuth (mocked)', () => {
  test('button is visible and callback can be simulated', async ({ page }) => {
    await page.goto('/app/login')
    const googleButton = page.locator('[data-test="google-oauth-button"]')
    await expect(googleButton).toBeVisible()

    // Mock the Supabase callback path without calling Google.
    await mockGoogleCallback(page)
    await expect(page).toHaveURL(/auth\/callback/)
  })
})
