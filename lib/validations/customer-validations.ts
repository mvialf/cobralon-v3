import { z } from 'zod'
import { normalizePhone } from '@/lib/utils/phone'

/**
 * Schema de validación para clientes
 */
export const customerSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  phone: z
    .string()
    .min(1, 'El teléfono es requerido')
    .transform((val) => normalizePhone(val)) // Normaliza a formato E.164 automáticamente
    .refine(
      (val) => /^\+56[2-9]\d{8}$/.test(val),
      'Formato inválido. Debe ser un teléfono chileno válido (+56...)'
    ),
  email: z.string().email('Correo electrónico inválido').optional().or(z.literal('')), // Opcional
})

export type CustomerFormData = z.infer<typeof customerSchema>
