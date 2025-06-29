import { test, expect } from '@playwright/test'


test('User can log in', async ({ page }) => {
  await page.goto('http://localhost:4000/login')

  await page.getByPlaceholder('your@email.com').fill('zmasta13@gmail.com')
  await page.getByPlaceholder('Enter your password').fill('Centari2013!')
  await page.getByRole('button', { name: 'Sign In' }).click()

  await expect(page.getByRole('button', { name: '+ Add Source' })).toBeVisible()
})
