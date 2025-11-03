import { z } from 'zod'

/**
 * Schema de validación para un item individual de la lista de tareas.
 */
export const todoItemSchema = z.object({
  id: z.string().uuid('ID debe ser un UUID válido'),
  text: z
    .string()
    .min(1, 'La tarea no puede estar vacía')
    .max(200, 'La tarea no puede exceder 200 caracteres')
    .trim(),
  completed: z.boolean(),
})

/**
 * Schema de validación para una lista de tareas.
 *
 * Validaciones:
 * - Mínimo 1 tarea requerida
 * - Máximo 50 tareas permitidas
 * - Cada tarea debe cumplir con todoItemSchema
 */
export const todoListSchema = z
  .array(todoItemSchema)
  .min(1, 'Debe agregar al menos una tarea')
  .max(50, 'Máximo 50 tareas permitidas')

/**
 * Schema opcional para listas de tareas (permite array vacío).
 */
export const todoListOptionalSchema = z.array(todoItemSchema).max(50, 'Máximo 50 tareas permitidas')

/**
 * Type inference de los schemas
 */
export type TodoItemFormData = z.infer<typeof todoItemSchema>
export type TodoListFormData = z.infer<typeof todoListSchema>
