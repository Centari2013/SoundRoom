import { expect, test } from '@playwright/test'

test.describe('launch smoke', () => {
  test('landing page renders primary launch content and navigation links', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: /build spatial audio rooms/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /launch the studio/i }).first()).toHaveAttribute('href', '/app')
    await expect(page.getByRole('link', { name: /privacy/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /terms/i })).toBeVisible()
  })

  test('legal and not-found routes render recoverable pages', async ({ page }) => {
    await page.goto('/privacy')
    await expect(page).toHaveTitle(/Privacy Policy \| SoundRoom/)
    await expect(page.getByText(/privacy/i).first()).toBeVisible()

    await page.goto('/definitely-not-a-real-page')
    await expect(page).toHaveTitle(/Page Not Found \| SoundRoom/)
    await expect(page.getByText(/not found|couldn't find/i).first()).toBeVisible()
  })

  test('protected account routes redirect anonymous visitors home', async ({ page }) => {
    await page.goto('/settings')

    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: /build spatial audio rooms/i })).toBeVisible()
  })

  test('desktop app route lazy-loads the editor canvas', async ({ page }) => {
    const consoleErrors = []
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text())
      }
    })

    await page.goto('/app')

    await expect(page.getByRole('application', { name: /soundroom 2d audio environment/i })).toBeVisible()
    expect(consoleErrors).toEqual([])
  })

  test('first-time desktop visitors can start and skip onboarding', async ({ page }) => {
    await page.addInitScript(() => {
      const now = new Date()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const today = `${now.getFullYear()}-${month}-${day}`

      localStorage.setItem('soundroom.welcomeLastSeen:anonymous', today)
      localStorage.removeItem('soundroom_onboarding_completed')
    })

    await page.goto('/app')

    await expect(page.getByText(/Welcome to SoundRoom\./i)).toBeVisible()
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByText(/This is the SoundStage\./i)).toBeVisible()

    await page.getByRole('button', { name: 'Skip' }).click()
    await expect.poll(() => page.evaluate(() => localStorage.getItem('soundroom_onboarding_completed'))).toBe('true')
  })

  test('mobile visitors see the desktop-only guard instead of the editor', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    })
    const page = await context.newPage()

    await page.goto('/')

    await expect(page.getByRole('heading', { name: /mobile version coming soon/i })).toBeVisible()
    await expect(page.getByText(/visit us on desktop/i)).toBeVisible()

    await context.close()
  })
})
