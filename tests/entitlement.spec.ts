import { expect, test } from '@playwright/test'
import { loginAs, users } from './helpers/login'

test.describe('Entitlement gating', () => {
  test('free user sees upgrade prompt when hitting gated feature', async ({ page }) => {
    await page.route('**/rest/v1/sound_files**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    })

    await loginAs(page, users.free)
    await page.goto('/sound-library')

    // Attempt an upload action which requires canUpload entitlement
    await page.locator('[data-test="upload-sound-button"]').click()
    await expect(page.getByText(/see plans/i)).toBeVisible()
  })
})
