import { test, expect } from '@playwright/test'

test('User can sign up', async ({ page }) => {
  await page.goto('http://localhost:4000/')
  await page.getByRole('button', { name: 'Sign Up' }).click()

  await page.getByPlaceholder('your@email.com').fill('zaria.burton2000@gmail.com')
  await page.getByPlaceholder('Enter your password').fill('Centari2013!')
  await page.getByRole('button', { name: 'Show password' }).click()
  await page.getByPlaceholder('Display Name').fill('Zaria')
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Create Account' }).click()

  // Assert user redirected or sees welcome
  await expect(page.getByText('Welcome')).toBeVisible()
})
