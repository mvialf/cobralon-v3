import { z } from 'zod'

/**
 * Schema para reordenar estados (project-status, visit-status, aftersale-status)
 */
export const reorderStatusSchema = z.object({
  statusIds: z.array(z.string().uuid('ID inválido')).min(1, 'Debe haber al menos un estado'),
})

export type ReorderStatusBody = z.infer<typeof reorderStatusSchema>

/**
 * Schema para reordenar tags (uninstall-tags)
 */
export const reorderTagSchema = z.object({
  tagIds: z.array(z.string().uuid('ID inválido')).min(1, 'Debe haber al menos una tag'),
})

export type ReorderTagBody = z.infer<typeof reorderTagSchema>
