import { z } from 'zod'
import { chilePhoneSchema } from './common'

/**
 * Schema de validación para clientes
 */
export const customerSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  phone: chilePhoneSchema,
  email: z.string().email('Correo electrónico inválido').optional().or(z.literal('')), // Opcional
})

export type CustomerFormData = z.infer<typeof customerSchema>
