import { test, expect } from '@playwright/test'

test('Should redirect to advert when first visiting', async ({ page }) => {
  // Redirect on first visit
  await page.goto('/')
  await expect(page).toHaveURL(/.*\/#\/advert/)

  const alreadyVisited = await page.evaluate(() => window.localStorage.getItem('alreadyVisited'))
  expect(alreadyVisited).toBe('true')

  // No redirect on first visit
  // page.reload()
  await page.goto('/#/')
  await expect(page).toHaveURL(/.*\/#\//)

  try {
    await page.waitForNavigation({ timeout: 2000 })
    expect(true).toBe(false)
  } catch (e: any) {
    expect(e.message).toContain('Timeout')
  }
})

test('Should not redirect to advert when first visiting with specific route', async ({ page }) => {
  // Dont redirect on first visit with specific route
  await page.goto('/#/settings')
  await expect(page).toHaveURL(/.*\/#\/settings/)

  const alreadyVisited = await page.evaluate(() => window.localStorage.getItem('alreadyVisited'))
  expect(alreadyVisited).toBe('true')

  try {
    await page.waitForNavigation({ timeout: 2000 })
    expect(true).toBe(false)
  } catch (e: any) {
    expect(e.message).toContain('Timeout')
  }

  // Dont redirect on second visit with specific route
  //page.reload()
  await page.goto('/#/settings')
  await expect(page).toHaveURL(/.*\/#\/settings/)

  try {
    await page.waitForNavigation({ timeout: 2000 })
    expect(true).toBe(false)
  } catch (e: any) {
    expect(e.message).toContain('Timeout')
  }
})
