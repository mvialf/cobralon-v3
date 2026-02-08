import { FlatCompat } from '@eslint/eslintrc'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const eslintConfig = [
  {
    ignores: [
      // Build artifacts
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      '.playwright-mcp/**',
      'coverage/**',

      // Documentación y configuración
      '.claude/**',
      'docs/**',
      'scripts/**',
      'capturas/**',

      // Tests (excluidos del lint de producción)
      'tests/**',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/__tests__/**',
    ],
  },
  ...compat.config({
    extends: ['next/core-web-vitals', 'next/typescript', 'prettier'],
    plugins: ['prettier', 'unused-imports'],
    rules: {
      'prettier/prettier': 'warn',

      // ========================================
      // VARIABLES NO USADAS (mejorado con autofix)
      // ========================================
      '@typescript-eslint/no-unused-vars': 'off', // Deshabilitado en favor de unused-imports
      'unused-imports/no-unused-imports': 'error', // Autofix para imports no usados
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],

      // ========================================
      // CÓDIGO MUERTO Y REDUNDANTE (nuevas reglas)
      // ========================================
      'no-unused-private-class-members': 'warn',
      'no-useless-assignment': 'warn',
      'no-unused-expressions': 'warn',
      'no-useless-return': 'warn',
      'no-useless-concat': 'warn',

      // ========================================
      // REGLAS EXISTENTES (mantener)
      // ========================================
      '@typescript-eslint/no-explicit-any': 'warn',
      'react/no-unescaped-entities': 'off',
      'react-hooks/exhaustive-deps': 'warn',
    },
  }),
]

export default eslintConfig
