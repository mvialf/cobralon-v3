'use client'

import { useState, useRef } from 'react'
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
import { Trash2, Plus } from 'lucide-react'
import { useTodoList, type TodoItem } from '@/hooks/use-todo-list'

interface TodoListProps {
  /**
   * Título de la lista de tareas.
   * @default "Lista de Tareas"
   */
  title?: string

  /**
   * Descripción opcional de la lista.
   */
  description?: string

  /**
   * Modo controlado: Lista de tareas externa.
   * Si se provee, el componente NO mantendrá estado interno.
   * Debe usarse junto con `onTodosChange`.
   */
  todos?: TodoItem[]

  /**
   * Modo controlado: Callback cuando los todos cambian.
   * Requerido si se provee `todos`.
   */
  onTodosChange?: (todos: TodoItem[]) => void

  /**
   * Modo no controlado: Tareas iniciales.
   * Solo se usa si `todos` NO está definido.
   * @default []
   */
  initialTodos?: TodoItem[]
}

/**
 * Componente de lista de tareas (TODO list) con estado interno o controlado.
 *
 * **Modos de uso:**
 *
 * 1. **No controlado** (estado interno):
 * ```tsx
 * <TodoList title="Mis Tareas" />
 * ```
 *
 * 2. **Controlado** (estado en componente padre):
 * ```tsx
 * const [todos, setTodos] = useState<TodoItem[]>([])
 * <TodoList todos={todos} onTodosChange={setTodos} />
 * ```
 *
 * **Características:**
 * - ✅ IDs únicos (crypto.randomUUID)
 * - ✅ Confirmación antes de eliminar
 * - ✅ Focus management (mantiene foco en input)
 * - ✅ Accesible (aria-labels, keyboard navigation)
 * - ✅ Contador de tareas completadas
 */
export function TodoList({
  title = 'Lista de Tareas',
  description,
  todos,
  onTodosChange,
  initialTodos,
}: TodoListProps) {
  // Hook de lógica de todos (controlado o no controlado)
  const {
    todos: currentTodos,
    addTodo,
    toggleTodo,
    deleteTodo,
    stats,
  } = useTodoList({
    todos,
    onTodosChange,
    initialTodos,
  })

  // Estado local del input
  const [newTodo, setNewTodo] = useState('')

  // Ref del input para focus management
  const inputRef = useRef<HTMLInputElement>(null)

  // Estado para confirmación de eliminación
  const [todoToDelete, setTodoToDelete] = useState<{ id: string; text: string } | null>(null)

  /**
   * Maneja el agregado de una nueva tarea.
   * Mantiene el foco en el input después de agregar.
   */
  const handleAddTodo = () => {
    const result = addTodo(newTodo)

    if (result) {
      setNewTodo('')
      // Mantener foco en input para agregar rápidamente múltiples tareas
      inputRef.current?.focus()
    }
  }

  /**
   * Maneja el Enter en el input.
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddTodo()
    }
  }

  /**
   * Abre el diálogo de confirmación antes de eliminar.
   */
  const handleDeleteClick = (id: string, text: string) => {
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

  return (
    <>
      <div className="w-full">
        {/* Header */}
        <div className="space-y-2">
          <h3 className="text-balance text-2xl font-semibold leading-none tracking-tight">
            {title}
          </h3>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
          <div className="flex items-center gap-2 py-2">
            <p className="text-sx">
              {stats.completed} / {stats.total} completadas
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Input para nueva tarea */}
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              placeholder="Agregar nueva tarea..."
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
              aria-label="Nueva tarea"
            />
            <Button onClick={handleAddTodo} size="icon" aria-label="Agregar tarea">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Lista de tareas */}
          <div className="space-y-2">
            {currentTodos.length === 0 ? (
              <p className="text-center text-muted-foreground">
                No hay tareas. ¡Agrega una para comenzar!
              </p>
            ) : (
              currentTodos.map((todo) => (
                <div key={todo.id} className="flex items-center gap-3 rounded-lg px-2">
                  <Checkbox
                    checked={todo.completed}
                    onCheckedChange={() => toggleTodo(todo.id)}
                    id={`todo-${todo.id}`}
                    aria-label={`Marcar tarea "${todo.text}" como ${todo.completed ? 'pendiente' : 'completada'}`}
                  />
                  <label
                    htmlFor={`todo-${todo.id}`}
                    className={`flex-1 cursor-pointer select-none ${
                      todo.completed ? 'text-muted-foreground line-through' : ''
                    }`}
                  >
                    {todo.text}
                  </label>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteClick(todo.id, todo.text)}
                    className="h-8 w-8"
                    aria-label={`Eliminar tarea "${todo.text}"`}
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
