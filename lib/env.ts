import { z } from 'zod'

const logLevelSchema = z
  .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'])
  .optional()

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: z
      .string({ required_error: 'DATABASE_URL es requerida' })
      .min(1, 'DATABASE_URL es requerida'),
    DIRECT_URL: z
      .string({ required_error: 'DIRECT_URL es requerida' })
      .min(1, 'DIRECT_URL es requerida'),
    NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL debe ser una URL valida').optional(),
    BETTER_AUTH_SECRET: z
      .string()
      .min(32, 'BETTER_AUTH_SECRET debe tener al menos 32 caracteres')
      .optional(),
    AUTH_SECRET: z.string().min(32, 'AUTH_SECRET debe tener al menos 32 caracteres').optional(),
    LOG_LEVEL: logLevelSchema,
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV !== 'production') return

    if (!value.NEXT_PUBLIC_APP_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['NEXT_PUBLIC_APP_URL'],
        message: 'NEXT_PUBLIC_APP_URL es requerida en produccion',
      })
    }

    if (!value.BETTER_AUTH_SECRET && !value.AUTH_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['BETTER_AUTH_SECRET'],
        message: 'BETTER_AUTH_SECRET o AUTH_SECRET es requerida en produccion',
      })
    }
  })

export type AppEnv = z.infer<typeof envSchema> & {
  AUTH_BASE_URL: string
  AUTH_SECRET_VALUE?: string
}

export function createEnv(rawEnv: NodeJS.ProcessEnv = process.env): AppEnv {
  const parsed = envSchema.safeParse(rawEnv)

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('; ')

    throw new Error(`Variables de entorno invalidas: ${details}`)
  }

  const authBaseUrl = parsed.data.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  return {
    ...parsed.data,
    AUTH_BASE_URL: authBaseUrl,
    AUTH_SECRET_VALUE: parsed.data.BETTER_AUTH_SECRET ?? parsed.data.AUTH_SECRET,
  }
}

let cachedEnv: AppEnv | undefined

export function getEnv(): AppEnv {
  cachedEnv ??= createEnv(withTestDefaults(process.env))
  return cachedEnv
}

function withTestDefaults(rawEnv: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  if (rawEnv.NODE_ENV !== 'test') return rawEnv

  return {
    ...rawEnv,
    DATABASE_URL: rawEnv.DATABASE_URL ?? 'postgresql://test:test@localhost:5432/cobralon_test',
    DIRECT_URL: rawEnv.DIRECT_URL ?? 'postgresql://test:test@localhost:5432/cobralon_test',
  }
}
