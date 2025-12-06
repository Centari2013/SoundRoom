import { expect, test } from '@playwright/test'
import { assertLoggedOut, loginAs, logout, users } from './helpers/login'

const INVALID_USER = { email: 'nope@soundroom.dev', password: 'WrongPassword!' }

test.describe('Authentication', () => {
  for (const [tier, creds] of Object.entries(users)) {
    test(`allows ${tier} user to log in`, async ({ page }) => {
      await loginAs(page, creds)
      await expect(page).toHaveURL(/\/app/)
    })
  }

  test('shows validation on invalid credentials', async ({ page }) => {
    await page.goto('/app')
    await page.locator('[data-test="nav-menu-toggle"]').click()
    await page.locator('[data-test="nav-sign-in"]').click()

    await page.locator('[data-test="login-email-input"]').fill(INVALID_USER.email)
    await page.locator('[data-test="login-password-input"]').fill(INVALID_USER.password)
    await page.locator('[data-test="login-submit-button"]').click()

    await expect(page.getByRole('alert')).toBeVisible()
  })

  test('logout returns the user to the logged-out screen', async ({ page }) => {
    await loginAs(page, users.free)
    await logout(page)
    await assertLoggedOut(page)
  })
})
