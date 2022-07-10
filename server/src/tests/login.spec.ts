import { test, expect } from '@playwright/test'

test('Test login', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/.*\/#\/advert/)

  // Login
  await page.locator('button:has-text("Login")').click()
  await page.locator('text=BenutzernamePasswortAnmelden >> input[name="username"]').click()
  await page.locator('text=BenutzernamePasswortAnmelden >> input[name="username"]').fill('UserA')
  await page.locator('text=BenutzernamePasswortAnmelden >> input[name="username"]').press('Tab')
  await page.locator('text=BenutzernamePasswortAnmelden >> input[name="password"]').fill('password')
  await page.locator('button:has-text("Anmelden")').click()

  await page.locator('button:has-text("Anmelden")').waitFor({ state: 'detached', timeout: 3000 })

  await expect(page).toHaveURL(/\/advert/)

  expect(page.locator('.userContainer')).toContainText('UserA')
})
