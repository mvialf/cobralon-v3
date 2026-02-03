import { test as setup, expect } from '@playwright/test'
import path from 'path'

/**
 * Setup de Autenticación para Tests E2E
 *
 * Este archivo se ejecuta ANTES de todos los tests y:
 * 1. Hace login con credenciales de test
 * 2. Guarda la sesión (cookies) en un archivo
 * 3. Los tests posteriores reutilizan esta sesión
 *
 * Credenciales definidas en .env.local:
 * - TEST_USER_EMAIL
 * - TEST_USER_PASSWORD
 */

const authFile = path.join(__dirname, '../../.playwright/.auth/user.json')

setup('authenticate', async ({ page }) => {
  // Credenciales de test (desde .env.local)
  const email = process.env.TEST_USER_EMAIL || 'mvial@decoplast.cl'
  const password = process.env.TEST_USER_PASSWORD || 'Pirula84'

  // Ir a la página de login
  await page.goto('/login')

  // Esperar a que el formulario cargue
  await expect(page.locator('[data-slot="card-title"]')).toBeVisible()

  // Completar formulario
  await page.getByPlaceholder('tu@email.com').fill(email)
  // El label no tiene el atributo for, usar placeholder
  await page.locator('input[type="password"]').fill(password)

  // Click en botón de login
  await page.getByRole('button', { name: 'Iniciar Sesion' }).click()

  // Esperar a que redirija (timeout largo por cold start del server)
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: 30000,
  })

  // Verificar que estamos autenticados (no vemos el formulario de login)
  await expect(page.getByText('Iniciar Sesion')).not.toBeVisible({ timeout: 5000 })

  // Guardar estado de autenticación (cookies, localStorage)
  await page.context().storageState({ path: authFile })

  console.log('✅ Autenticación exitosa, sesión guardada en:', authFile)
})
