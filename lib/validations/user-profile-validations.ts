/**
 * Validaciones para formulario de perfil de usuario
 */
import { z } from 'zod'

/**
 * Schema de validación para perfil de usuario
 */
export const userProfileSchema = z.object({
  username: z.string().min(2, 'El nombre de usuario debe tener al menos 2 caracteres'),
  email: z.string().email('Por favor, introduce un email válido'),
  firstName: z.string().min(1, 'El nombre es requerido'),
  lastName: z.string().min(1, 'El apellido es requerido'),
  phone: z.string().optional(),
  bio: z.string().max(500, 'La biografía no puede exceder 500 caracteres').optional(),
  website: z.string().url('Por favor, introduce una URL válida').optional().or(z.literal('')),
  company: z.string().optional(),
  location: z.string().optional(),
  notifications: z.boolean().default(true),
  marketing: z.boolean().default(false),
})

export type UserProfileFormValues = z.infer<typeof userProfileSchema>
