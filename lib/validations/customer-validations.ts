import { z } from 'zod'

/**
 * Schema de validación para clientes
 */
export const customerSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  phone: z.string().min(1, 'El teléfono es requerido'), // Obligatorio
  email: z.string().email('Correo electrónico inválido').optional().or(z.literal('')), // Opcional
})

export type CustomerFormData = z.infer<typeof customerSchema>
