import { expect, test } from '@playwright/test'
import { loginAs, users } from './helpers/login'

async function openThemeSettings(page) {
  await page.goto('/settings', { waitUntil: 'networkidle' })
  await expect(page.getByRole('heading', { name: /appearance/i })).toBeVisible()
}

test.describe('Themes', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, users.free)
  })

  test('switches between light and dark themes', async ({ page }) => {
    await openThemeSettings(page)

    await page.locator('[data-test="theme-option-light"]').click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', /light/i)

    await page.locator('[data-test="theme-option-dark"]').click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', /dark/i)
  })

  test('premium themes can be applied by pro tier only', async ({ page, context }) => {
    // Stub the themes endpoint to guarantee a Pro-only option is available.
    await page.route('**/rest/v1/themes**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'builtin-light', name: 'light', required_plan: 'free', theme_base: 'light', css_vars: {} },
          { id: 'pro-nebula', name: 'nebula', required_plan: 'pro', theme_base: 'dark', css_vars: { '--color-accent': '#7c3aed' } },
        ]),
      })
    })

    await openThemeSettings(page)
    const proCard = page.locator('[data-test="theme-option-pro-nebula"]')
    await proCard.click()
    await expect(page.getByText(/requires pro plan/i)).toBeVisible()
    await expect(page.locator('[data-test="save-theme-button"]')).toBeDisabled()

    // Log in as pro in a new tab to show it unlocks.
    const proContext = await context.newPage()
    await loginAs(proContext, users.pro)
    await proContext.route('**/rest/v1/themes**', async (route) => route.abort())
    await proContext.goto('/settings')
    await proContext.locator('[data-test="theme-option-pro-nebula"]').click()
    await proContext.locator('[data-test="save-theme-button"]').click()
    await expect(proContext.getByText(/saved/i)).toBeVisible()
  })
})
