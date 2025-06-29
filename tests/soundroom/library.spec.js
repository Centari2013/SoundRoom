import { test, expect } from '@playwright/test'


test('User can add and control sound sources', async ({ page }) => {
  // Assume already logged in from auth helpers
  await page.goto('http://localhost:4000/')

  await page.getByRole('button', { name: '+ Add Source' }).click()
  await page.getByText('Waterfall').click()

  await expect(page.getByText('Waterfall')).toBeVisible()
  await page.getByRole('button', { name: 'Pause' }).click()
  await page.getByRole('button', { name: 'Play' }).click()
  await page.getByRole('button', { name: 'Delete' }).click()
})
