import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(), // Para resolver path aliases (@/components, @/lib, etc.)
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    css: true,
    // Timeout aumentado para tests con componentes Radix UI
    testTimeout: 10000,
    // Patrones de archivos de test
    include: ['**/__tests__/**/*.{test,spec}.{ts,tsx}', '**/*.{test,spec}.{ts,tsx}'],
    // Excluir node_modules y build folders
    exclude: ['node_modules', 'dist', '.next', 'build'],
    // Optimización de dependencias para Radix UI (Vitest 3.x sintaxis moderna)
    deps: {
      optimizer: {
        web: {
          include: ['@radix-ui/react-*'],
        },
      },
    },
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'vitest.setup.ts',
        '**/*.config.{ts,js}',
        '**/types/**',
        '**/*.d.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
