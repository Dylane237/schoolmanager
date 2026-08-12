import { test, expect } from '@playwright/test'

test.describe('Sync UI', () => {
  test('page login accessible (prérequis sync)', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('route sync status requiert auth', async ({ request }) => {
    const res = await request.get('/api/sync/status')
    expect(res.status()).toBe(401)
  })

  test('route sync db requiert auth', async ({ request }) => {
    const res = await request.get('/api/sync/db')
    expect(res.status()).toBe(401)
  })
})
