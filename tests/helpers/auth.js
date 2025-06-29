export async function login(page, email = 'zmasta13@gmail.com', password = 'Centari2013!') {
  await page.goto('http://localhost:4000/login')
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Enter your password').fill(password)
  await page.getByRole('button', { name: 'Sign In' }).click()
}
