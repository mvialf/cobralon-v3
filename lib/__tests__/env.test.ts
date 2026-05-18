import { describe, expect, it } from 'vitest'
import { createEnv } from '@/lib/env'

const validBaseEnv = {
  NODE_ENV: 'development',
  DATABASE_URL: 'postgresql://user:password@example.com/db?sslmode=require',
  DIRECT_URL: 'postgresql://user:password@example.com/db?sslmode=require',
} satisfies NodeJS.ProcessEnv

const validSecret = 'a'.repeat(32)

describe('createEnv', () => {
  it('requires DATABASE_URL', () => {
    const { DATABASE_URL: _databaseUrl, ...rawEnv } = validBaseEnv

    expect(() => createEnv(rawEnv)).toThrow('DATABASE_URL es requerida')
  })

  it('requires DIRECT_URL', () => {
    const { DIRECT_URL: _directUrl, ...rawEnv } = validBaseEnv

    expect(() => createEnv(rawEnv)).toThrow('DIRECT_URL es requerida')
  })

  it('uses localhost auth base URL in development when NEXT_PUBLIC_APP_URL is absent', () => {
    const env = createEnv(validBaseEnv)

    expect(env.AUTH_BASE_URL).toBe('http://localhost:3000')
  })

  it('requires NEXT_PUBLIC_APP_URL in production', () => {
    expect(() =>
      createEnv({
        ...validBaseEnv,
        NODE_ENV: 'production',
        BETTER_AUTH_SECRET: validSecret,
      })
    ).toThrow('NEXT_PUBLIC_APP_URL es requerida en produccion')
  })

  it('requires BETTER_AUTH_SECRET or AUTH_SECRET in production', () => {
    expect(() =>
      createEnv({
        ...validBaseEnv,
        NODE_ENV: 'production',
        NEXT_PUBLIC_APP_URL: 'https://cobralon.example.com',
      })
    ).toThrow('BETTER_AUTH_SECRET o AUTH_SECRET es requerida en produccion')
  })

  it('accepts AUTH_SECRET as production fallback', () => {
    const env = createEnv({
      ...validBaseEnv,
      NODE_ENV: 'production',
      NEXT_PUBLIC_APP_URL: 'https://cobralon.example.com',
      AUTH_SECRET: validSecret,
    })

    expect(env.AUTH_BASE_URL).toBe('https://cobralon.example.com')
    expect(env.AUTH_SECRET_VALUE).toBe(validSecret)
  })

  it('rejects invalid LOG_LEVEL', () => {
    expect(() =>
      createEnv({
        ...validBaseEnv,
        LOG_LEVEL: 'verbose',
      })
    ).toThrow('LOG_LEVEL')
  })
})
