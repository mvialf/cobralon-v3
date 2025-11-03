import { useState, useMemo } from 'react'

export interface TodoItem {
  id: string
  text: string
  completed: boolean
}

interface UseTodoListOptions {
  /**
   * Todos externos para modo controlado.
   * Si se proveen, el hook NO mantendrá estado interno.
   */
  todos?: TodoItem[]
  /**
   * Callback cuando los todos cambian (modo controlado).
   * Requerido si se provee `todos`.
   */
  onTodosChange?: (todos: TodoItem[]) => void
  /**
   * Todos iniciales para modo no controlado.
   * Solo se usa si `todos` no está definido.
   */
  initialTodos?: TodoItem[]
}

/**
 * Hook para manejar lógica de una lista de tareas (todos).
 *
 * Soporta dos modos:
 * - **Controlado**: Pasa `todos` + `onTodosChange`. El componente padre maneja el estado.
 * - **No controlado**: NO pases `todos`. El hook maneja su propio estado interno.
 *
 * @example
 * // Modo no controlado (estado interno)
 * const { todos, addTodo, toggleTodo, deleteTodo, stats } = useTodoList()
 *
 * @example
 * // Modo controlado (estado en padre)
 * const [myTodos, setMyTodos] = useState<TodoItem[]>([])
 * const { addTodo, toggleTodo, deleteTodo, stats } = useTodoList({
 *   todos: myTodos,
 *   onTodosChange: setMyTodos
 * })
 */
export function useTodoList(options: UseTodoListOptions = {}) {
  const { todos: externalTodos, onTodosChange, initialTodos = [] } = options

  // Determinar si el hook está en modo controlado
  const isControlled = externalTodos !== undefined

  // Estado interno (solo usado en modo no controlado)
  const [internalTodos, setInternalTodos] = useState<TodoItem[]>(initialTodos)

  // Usar todos externos si está controlado, sino usar internos
  const todos = isControlled ? externalTodos : internalTodos

  // Función helper para actualizar todos (controlado o no controlado)
  const updateTodos = (newTodos: TodoItem[]) => {
    if (isControlled) {
      // Modo controlado: notificar al padre
      onTodosChange?.(newTodos)
    } else {
      // Modo no controlado: actualizar estado interno
      setInternalTodos(newTodos)
    }
  }

  /**
   * Agrega una nueva tarea a la lista.
   * @param text - Texto de la tarea. Se hace trim automáticamente.
   * @returns Los todos actualizados, o undefined si el texto está vacío.
   */
  const addTodo = (text: string): TodoItem[] | undefined => {
    const trimmedText = text.trim()

    if (!trimmedText) {
      return undefined
    }

    const newTodos: TodoItem[] = [
      ...todos,
      {
        id: crypto.randomUUID(), // ✅ IDs únicos garantizados
        text: trimmedText,
        completed: false,
      },
    ]

    updateTodos(newTodos)
    return newTodos
  }

  /**
   * Alterna el estado completado de una tarea.
   * @param id - ID de la tarea a alternar.
   * @returns Los todos actualizados.
   */
  const toggleTodo = (id: string): TodoItem[] => {
    const newTodos = todos.map((todo) =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    )

    updateTodos(newTodos)
    return newTodos
  }

  /**
   * Elimina una tarea de la lista.
   * @param id - ID de la tarea a eliminar.
   * @returns Los todos actualizados.
   */
  const deleteTodo = (id: string): TodoItem[] => {
    const newTodos = todos.filter((todo) => todo.id !== id)

    updateTodos(newTodos)
    return newTodos
  }

  /**
   * Estadísticas de la lista de tareas.
   * Memoizadas para evitar recalcular en cada render.
   */
  const stats = useMemo(
    () => ({
      total: todos.length,
      completed: todos.reduce((count, todo) => count + (todo.completed ? 1 : 0), 0),
      pending: todos.reduce((count, todo) => count + (todo.completed ? 0 : 1), 0),
    }),
    [todos]
  )

  return {
    todos,
    addTodo,
    toggleTodo,
    deleteTodo,
    stats,
  }
}
