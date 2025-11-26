import { z } from 'zod'
import { normalizePhone } from '@/lib/utils/phone'

/**
 * Schema extendido para crear VisitEvent Y actualizar datos de la Visit
 *
 * Combina:
 * - Datos del evento (visitId, scheduledDate)
 * - Datos editables de la Visit (status, phone, name, observations)
 * - Datos de dirección (street, apartment, comuna, region)
 *
 * Patrón: Similar a createAftersaleEventWithUpdateSchema
 */
export const createVisitEventWithUpdateSchema = z.object({
  // Datos del evento
  visitId: z.string().uuid('ID de visita inválido'),
  scheduledDate: z.string().min(1, 'La fecha es requerida'),

  // Datos de la Visit (editables)
  visitStatusId: z.string().uuid('ID de estado inválido'),
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  phone: z
    .string()
    .optional()
    .transform((val) => (val ? normalizePhone(val) : undefined))
    .refine(
      (val) => !val || /^\+56[2-9]\d{8}$/.test(val),
      'Formato inválido. Debe ser un teléfono chileno válido (+56...)'
    ),
  observations: z
    .string()
    .max(1000, 'Las observaciones no pueden exceder 1000 caracteres')
    .optional()
    .nullable()
    .default(''),

  // Datos de dirección (editables)
  street: z.string().min(1, 'La calle es obligatoria'),
  apartment: z.string().nullable().optional(),
  comuna: z.string().min(1, 'La comuna es obligatoria'),
  region: z.string().min(1, 'La región es obligatoria'),

  // Team tags (integrantes asignados al evento)
  teamTagIds: z.array(z.string().uuid()).optional().nullable().default([]),
})

/**
 * Type inferido del schema para API
 */
export type CreateVisitEventWithUpdateInput = z.infer<typeof createVisitEventWithUpdateSchema>

/**
 * Form values para el formulario (scheduledDate como string para input type="date")
 */
export type VisitEventWithUpdateFormValues = {
  visitId: string
  scheduledDate: string
  visitStatusId: string
  name: string
  phone?: string
  observations?: string | null
  street: string
  apartment?: string | null
  comuna: string
  region: string
  teamTagIds: string[] | null
}
