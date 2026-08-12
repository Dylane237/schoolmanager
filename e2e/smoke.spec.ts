import { test, expect } from '@playwright/test'

test.describe('Smoke — authentification', () => {
  test('page de connexion accessible', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Bon retour' })).toBeVisible()
    await expect(page.getByLabel('Adresse email')).toBeVisible()
    await expect(page.getByLabel('Mot de passe')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible()
  })

  test('redirection racine vers login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })
})
