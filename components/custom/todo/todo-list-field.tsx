'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Trash2, Plus, AlertCircle } from 'lucide-react'
import { useTodoList, type TodoItem } from '@/hooks/use-todo-list'
import { useState } from 'react'

interface TodoListFieldProps {
  /**
   * Valor actual de la lista (compatible con React Hook Form).
   */
  value: TodoItem[]

  /**
   * Callback cuando el valor cambia (compatible con React Hook Form).
   */
  onChange: (value: TodoItem[]) => void

  /**
   * Placeholder del input.
   * @default "Agregar nueva tarea..."
   */
  placeholder?: string

  /**
   * Si el campo está deshabilitado (ej: durante submit del form).
   * @default false
   */
  disabled?: boolean

  /**
   * Mensaje de error de validación (viene desde React Hook Form).
   */
  error?: string

  /**
   * Título opcional de la lista.
   */
  title?: string

  /**
   * Descripción opcional.
   */
  description?: string

  /**
   * Nombre del campo (para accesibilidad).
   */
  name?: string
}

/**
 * Componente de lista de tareas compatible con React Hook Form.
 *
 * **Uso con React Hook Form:**
 * ```tsx
 * <FormField
 *   control={form.control}
 *   name="tasks"
 *   render={({ field, fieldState }) => (
 *     <FormItem>
 *       <FormLabel>Tareas</FormLabel>
 *       <FormControl>
 *         <TodoListField
 *           value={field.value}
 *           onChange={field.onChange}
 *           error={fieldState.error?.message}
 *           disabled={form.formState.isSubmitting}
 *         />
 *       </FormControl>
 *       <FormMessage />
 *     </FormItem>
 *   )}
 * />
 * ```
 *
 * **Características:**
 * - ✅ Compatible con React Hook Form
 * - ✅ Validación con Zod
 * - ✅ Muestra errores de validación
 * - ✅ Estados disabled/loading
 * - ✅ IDs únicos (crypto.randomUUID)
 * - ✅ Accesible (aria-labels)
 * - ✅ Confirmación antes de eliminar
 * - ✅ Focus management
 */
export function TodoListField({
  value,
  onChange,
  placeholder = 'Agregar nueva tarea...',
  disabled = false,
  error,
  title,
  description,
  name,
}: TodoListFieldProps) {
  // Hook de lógica de todos (modo controlado)
  const { addTodo, toggleTodo, deleteTodo, stats } = useTodoList({
    todos: value,
    onTodosChange: onChange,
  })

  // Estado local del input
  const [newTodo, setNewTodo] = useState('')

  // Ref del input para focus management
  const inputRef = useRef<HTMLInputElement>(null)

  // Estado para confirmación de eliminación
  const [todoToDelete, setTodoToDelete] = useState<{ id: string; text: string } | null>(null)

  /**
   * Maneja el agregado de una nueva tarea.
   */
  const handleAddTodo = () => {
    if (disabled) return

    const result = addTodo(newTodo)

    if (result) {
      setNewTodo('')
      inputRef.current?.focus()
    }
  }

  /**
   * Maneja el Enter en el input.
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !disabled) {
      e.preventDefault() // Evitar submit del form
      handleAddTodo()
    }
  }

  /**
   * Abre el diálogo de confirmación antes de eliminar.
   */
  const handleDeleteClick = (id: string, text: string) => {
    if (disabled) return
    setTodoToDelete({ id, text })
  }

  /**
   * Confirma y ejecuta la eliminación.
   */
  const handleConfirmDelete = () => {
    if (todoToDelete) {
      deleteTodo(todoToDelete.id)
      setTodoToDelete(null)
    }
  }

  /**
   * Cancela la eliminación.
   */
  const handleCancelDelete = () => {
    setTodoToDelete(null)
  }

  /**
   * Maneja el toggle de completado.
   */
  const handleToggle = (id: string) => {
    if (disabled) return
    toggleTodo(id)
  }

  return (
    <>
      <div className="w-full">
        {/* Header (opcional) */}
        {(title || description) && (
          <div className="mb-3 space-y-1">
            {title && <h4 className="text-sm font-medium">{title}</h4>}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
        )}

        {/* Estadísticas */}
        {value.length > 0 && (
          <div className="mb-2 flex items-center gap-2">
            <p className="text-xs text-muted-foreground">
              {stats.completed} / {stats.total} completadas
            </p>
          </div>
        )}

        <div className="space-y-3">
          {/* Input para nueva tarea */}
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              placeholder={placeholder}
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
              aria-label={name ? `Nueva tarea para ${name}` : 'Nueva tarea'}
              disabled={disabled}
              aria-invalid={!!error}
            />
            <Button
              type="button"
              onClick={handleAddTodo}
              size="icon"
              aria-label="Agregar tarea"
              disabled={disabled || !newTodo.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Mensaje de error de validación */}
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Lista de tareas */}
          <div className="space-y-2">
            {value.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No hay tareas. Agrega una para comenzar.
              </p>
            ) : (
              value.map((todo) => (
                <div
                  key={todo.id}
                  className={`flex items-center gap-3 rounded-lg px-2 py-1 ${
                    disabled ? 'opacity-50' : 'hover:bg-accent/50'
                  }`}
                >
                  <Checkbox
                    checked={todo.completed}
                    onCheckedChange={() => handleToggle(todo.id)}
                    id={`todo-${todo.id}`}
                    aria-label={`Marcar tarea "${todo.text}" como ${todo.completed ? 'pendiente' : 'completada'}`}
                    disabled={disabled}
                  />
                  <label
                    htmlFor={`todo-${todo.id}`}
                    className={`flex-1 select-none text-sm ${
                      todo.completed ? 'text-muted-foreground line-through' : ''
                    } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {todo.text}
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteClick(todo.id, todo.text)}
                    className="h-8 w-8"
                    aria-label={`Eliminar tarea "${todo.text}"`}
                    disabled={disabled}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Dialog de confirmación de eliminación */}
      <AlertDialog open={!!todoToDelete} onOpenChange={handleCancelDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tarea?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar la tarea{' '}
              <span className="font-semibold text-foreground">
                &quot;{todoToDelete?.text}&quot;
              </span>
              ? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
