import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'path'

/**
 * Configuración de Vitest para tests de INTEGRACIÓN.
 *
 * Diferencias clave con `vitest.config.mts`:
 * - Environment: `node` (no jsdom). Estos tests no tocan DOM.
 * - Setup distinto: NO mockea `@/lib/db`, conecta a una DB real (branch de Neon).
 * - Aislamiento: corre en serie (`pool: 'forks'`, `singleFork: true`) para evitar
 *   colisiones en TRUNCATE/seed entre tests.
 * - Timeout más alto: queries reales pueden ser más lentas que mocks.
 *
 * Variables de entorno requeridas:
 * - `DATABASE_URL` apuntando a un branch de Neon DEDICADO a tests.
 * - El nombre del branch DEBE contener "test" para que `setup.ts` permita ejecutar.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/integration/setup.ts'],
    include: ['tests/integration/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist', '.next', 'build', 'tests/e2e/**'],
    testTimeout: 30000,
    hookTimeout: 60000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
