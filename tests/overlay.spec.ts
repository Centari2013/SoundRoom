import { expect, test } from '@playwright/test'
import { disableOnboarding } from './helpers/login'

// The audio resume overlay should render on load and dismiss when clicked.
test('audio resume overlay appears and can be dismissed', async ({ page }) => {
  await disableOnboarding(page)
  await page.goto('/app')
  const overlay = page.locator('[data-test="audio-resume-overlay"]')
  await expect(overlay).toBeVisible()
  await overlay.click()
  await expect(overlay).toBeHidden()
})
