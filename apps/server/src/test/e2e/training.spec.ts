import { test, expect, type Page } from '@playwright/test'

// The browser projects run at the same time and the server keeps one connection per user, so each project gets its own
const users: Record<string, string> = { chromium: 'UserN', firefox: 'UserO', webkit: 'UserP' }

async function login(page: Page, username: string) {
  await page.locator('#topElementLoginButton').click()
  await page.locator('#LIusername').fill(username)
  await page.locator('#LIpassword').fill('password')
  await page.locator('.loginInputElement.loginButton').click()
  await page.locator('.loginInputElement.loginButton').waitFor({ state: 'detached', timeout: 10000 })
}

test('Progress of the tutorials is kept with the account', async ({ browser, request }, testInfo) => {
  const username = users[testInfo.project.name] ?? 'UserN'
  const { token } = await (await request.post('/gameApi/login', { data: { username, password: 'password' } })).json()
  const headers = { Authorization: `Bearer ${token}` }
  const changeId = (name: string) => `e2e-${name}-${Date.now()}`
  const marks = async () => Object.keys((await (await request.get('/gameApi/getProgress', { headers })).json()).marks)

  // The test may have run before: start without finished lessons in the account
  await request.post('/gameApi/addProgress', { headers, data: { id: changeId('reset'), remove: { marks: ['t.', 'feier.'] } } })
  expect(await marks()).toEqual([])

  // Read the first lesson without being logged in: it is done in this browser only
  const firstBrowser = await browser.newContext()
  const page = await firstBrowser.newPage()
  await page.goto('/#/training')
  await page.locator('.stufe-feld').first().click()
  await page.locator('.lektion .knoepfe button').click()
  await page.goto('/#/training')
  await expect(page.locator('.stufe-feld').first().locator('.pi-check')).toBeVisible()
  expect(await marks()).toEqual([])

  // Logging in takes it to the account
  await login(page, username)
  await expect.poll(marks).toEqual(['t.g01'])
  await firstBrowser.close()

  // Another browser knows nothing about it, until the user logs in there
  const secondBrowser = await browser.newContext()
  const otherPage = await secondBrowser.newPage()
  await otherPage.goto('/#/training')
  await expect(otherPage.locator('.stufe-feld').first()).toBeVisible()
  await expect(otherPage.locator('.stufe-feld .pi-check')).toHaveCount(0)
  await login(otherPage, username)
  await expect(otherPage.locator('.stufe-feld').first().locator('.pi-check')).toBeVisible()

  // A lesson finished somewhere else (in the app) is there when the page is opened again
  await request.post('/gameApi/addProgress', { headers, data: { id: changeId('app'), marks: { 't.g02': { t: Date.now(), p: 25 } } } })
  await otherPage.reload()
  await expect(otherPage.locator('.stufe-feld').nth(1).locator('.pi-check')).toBeVisible()
  await expect(otherPage.locator('.stufe-feld .pi-check')).toHaveCount(2)

  // The tutorials were reset somewhere else: the lessons are open again here
  await request.post('/gameApi/addProgress', { headers, data: { id: changeId('reset-again'), remove: { marks: ['t.', 'feier.'] } } })
  await otherPage.reload()
  await expect(otherPage.locator('.stufe-feld').first()).toBeVisible()
  await expect(otherPage.locator('.stufe-feld .pi-check')).toHaveCount(0)
  await secondBrowser.close()
})
