import { expect, Page } from '@playwright/test'

export type UserCredential = { email: string; password: string }

export const users = {
  free: { email: 'test_free@soundroom.dev', password: 'SoundRoomTest123!' },
  basic: { email: 'test_basic@soundroom.dev', password: 'SoundRoomTest123!' },
  pro: { email: 'test_pro@soundroom.dev', password: 'SoundRoomTest123!' },
} satisfies Record<string, UserCredential>

export async function disableOnboarding(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('soundroom_onboarding_completed', 'true')
    localStorage.setItem('soundroom_onboarding_started', 'true')
  })
}

async function openAuthModal(page: Page) {
  // Suppress the onboarding tour that can intercept pointer events during navigation.
  await disableOnboarding(page)

  await page.goto('/app', { waitUntil: 'networkidle' })
  await page.locator('[data-test="nav-menu-toggle"]').click()
  await page.locator('[data-test="nav-sign-in"]').click()
  await expect(page.getByRole('dialog', { name: /sign in/i })).toBeVisible()
}

export async function loginAs(page: Page, user: UserCredential) {
  await openAuthModal(page)
  await page.locator('[data-test="login-email-input"]').fill(user.email)
  await page.locator('[data-test="login-password-input"]').fill(user.password)
  await page.locator('[data-test="login-submit-button"]').click()

  await page.waitForURL('**/auth/callback', { waitUntil: 'networkidle' })
  await page.waitForURL('**/app', { waitUntil: 'networkidle' })
  await page.locator('[data-test="nav-menu-toggle"]').click()
  await expect(page.locator('[data-test="nav-sign-out"]')).toBeVisible()
  await page.locator('[data-test="nav-menu-toggle"]').click()
}

export async function logout(page: Page) {
  await page.locator('[data-test="nav-menu-toggle"]').click()
  await page.locator('[data-test="nav-sign-out"]').click()
  await page.waitForURL('**/logged-out')
}

export async function assertLoggedOut(page: Page) {
  await expect(page.getByRole('heading', { name: /logged out/i })).toBeVisible()
  await page.getByRole('link', { name: /return/i }).click({ force: true })
  await page.waitForURL('**/')
}
