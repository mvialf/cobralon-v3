'use client'

import { useRef, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Trash2, Plus, AlertCircle } from 'lucide-react'
import { useTodoList, type TodoItem } from '@/hooks/use-todo-list'

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

  /**
   * Si las tareas completadas deben moverse automáticamente al final.
   * Cuando está activado, las tareas pendientes se muestran primero
   * y las completadas al final de la lista.
   * @default true
   */
  autoSort?: boolean
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
  autoSort = true,
}: TodoListFieldProps) {
  const { addTodo, toggleTodo, deleteTodo, stats } = useTodoList({
    todos: value,
    onChange,
  })

  // Ordenar tareas: pendientes primero, completadas al final
  const displayTodos = useMemo(() => {
    if (!autoSort) return value

    return value
      .map((todo, index) => ({ todo, index }))
      .sort((a, b) => {
        if (a.todo.completed === b.todo.completed) return a.index - b.index
        return a.todo.completed ? 1 : -1
      })
      .map(({ todo }) => todo)
  }, [value, autoSort])

  const [newTodo, setNewTodo] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleAddTodo = () => {
    if (disabled) return

    const result = addTodo(newTodo)

    if (result) {
      setNewTodo('')
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !disabled) {
      e.preventDefault()
      handleAddTodo()
    }
  }

  const handleToggle = (id: string) => {
    if (disabled) return
    toggleTodo(id)
  }

  const handleDelete = (id: string) => {
    if (disabled) return
    deleteTodo(id)
  }

  return (
    <div className="w-full">
      {/* Header (opcional) */}
      {(title || description) && (
        <div className="mb-3 space-y-1">
          {title && <h4 className="text-sm font-medium">{title}</h4>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      )}

      {/* Estadísticas */}
      {displayTodos.length > 0 && (
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
          {displayTodos.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No hay tareas. Agrega una para comenzar.
            </p>
          ) : (
            displayTodos.map((todo) => (
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
                  onClick={() => handleDelete(todo.id)}
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
  )
}
