import { test, expect } from '@playwright/test'

test('Should redirect to advert only when first visiting', async ({ page }) => {
  // Redirect on first visit
  await page.goto('http://localhost:3000/')
  await page.goto('http://localhost:3000/#/')
  await page.goto('http://localhost:3000/#/advert')

  const alreadyVisited = await page.evaluate(() => window.localStorage.getItem('alreadyVisited'))
  expect(alreadyVisited).toBe('true')

  // No redirect on first visit
  page.reload()
  await page.goto('http://localhost:3000/#/')

  try {
    await page.waitForNavigation({ timeout: 5000 })
    expect(true).toBe(false)
  } catch (e: any) {
    expect(e.message).toContain('Timeout')
  }
})
