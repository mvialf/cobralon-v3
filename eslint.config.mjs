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
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      '.playwright-mcp/**',
      'coverage/**',
    ],
  },
  ...compat.config({
    extends: ['next/core-web-vitals', 'next/typescript', 'prettier'],
    plugins: ['prettier'],
    rules: {
      'prettier/prettier': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      'react/no-unescaped-entities': 'off',
      'react-hooks/exhaustive-deps': 'warn',
    },
  }),
]

export default eslintConfig
