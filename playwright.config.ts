import { defineConfig, devices } from '@playwright/test'

/**
 * Configuración de Playwright para E2E testing
 *
 * @see https://playwright.dev/docs/test-configuration
 * @see docs/template/decisions/010-playwright-mcp.md
 */
export default defineConfig({
  // Directorio donde están los tests E2E
  testDir: './tests/e2e',

  // Ejecutar tests en paralelo
  fullyParallel: true,

  // Fallar el build si hay tests con .only en CI
  forbidOnly: !!process.env.CI,

  // Reintentos en caso de fallo
  retries: process.env.CI ? 2 : 0,

  // Workers: 1 en CI para evitar race conditions, automático en local
  workers: process.env.CI ? 1 : undefined,

  // Reporter: HTML para debugging local, GitHub Actions en CI
  reporter: process.env.CI ? 'github' : 'html',

  // Configuración compartida para todos los tests
  use: {
    // URL base de la aplicación
    baseURL: 'http://localhost:3000',

    // Trace solo en primer reintento (para debugging)
    trace: 'on-first-retry',

    // Screenshots solo cuando fallan
    screenshot: 'only-on-failure',

    // Videos solo cuando fallan
    video: 'retain-on-failure',
  },

  // Proyectos = diferentes navegadores
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    // Webkit deshabilitado - requiere librerías adicionales en WSL
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  // Web server: levantar dev server automáticamente
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutos
  },
})
