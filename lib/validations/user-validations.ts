import { z } from 'zod'

export const createUserSchema = z.object({
  email: z.string().email('Email inválido').trim().toLowerCase(),
  name: z.string().min(1, 'El nombre es obligatorio').max(100).trim(),
  role: z.enum(['user', 'admin']).optional().default('user'),
})

export type CreateUserBody = z.infer<typeof createUserSchema>
