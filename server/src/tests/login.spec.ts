import { test, expect } from '@playwright/test'

test('Test login', async ({ page }) => {
  await page.goto('http://localhost:8081/')
  await page.goto('http://localhost:8081/#/')
  await page.goto('http://localhost:8081/#/advert')

  // Login
  await page.locator('button:has-text("Login")').click()
  await page.locator('text=BenutzernamePasswortAnmelden >> input[name="username"]').click()
  await page.locator('text=BenutzernamePasswortAnmelden >> input[name="username"]').fill('UserA')
  await page.locator('text=BenutzernamePasswortAnmelden >> input[name="username"]').press('Tab')
  await page.locator('text=BenutzernamePasswortAnmelden >> input[name="password"]').fill('password')
  await page.locator('button:has-text("Anmelden")').click()

  await expect(page).toHaveURL('http://localhost:8081/#/de/advert')

  // Click #home div:has-text("Oskar") >> nth=2
  expect(page.locator('.userContainer')).toContainText('UserA')
})
