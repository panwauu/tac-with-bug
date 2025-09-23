import { test, expect } from '@playwright/test'

test('Test login', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/.*\/#\/advert/)

  // Login
  await page.locator('#topElementLoginButton').click()
  await page.locator('#LIusername').click()
  await page.locator('#LIusername').fill('UserA')
  await page.locator('#LIpassword').press('Tab')
  await page.locator('#LIpassword').fill('password')

  page.locator('.loginInputElement.loginButton').click()
  await page.locator('.loginInputElement.loginButton').waitFor({ state: 'detached', timeout: 10000 })

  await expect(page).toHaveURL(/\/advert/)

  expect(page.locator('.userContainer')).toContainText('UserA')
})
