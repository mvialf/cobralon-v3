export interface TodoItem {
  id: string
  text: string
  completed: boolean
}

interface UseTodoListOptions {
  /** Lista de todos (controlada por el padre). */
  todos: TodoItem[]
  /** Callback cuando los todos cambian. */
  onChange: (todos: TodoItem[]) => void
}

/**
 * Hook para manejar lógica de una lista de tareas (todos).
 * Modo controlado: el componente padre maneja el estado.
 *
 * @example
 * const [myTodos, setMyTodos] = useState<TodoItem[]>([])
 * const { addTodo, toggleTodo, deleteTodo, stats } = useTodoList({
 *   todos: myTodos,
 *   onChange: setMyTodos
 * })
 */
export function useTodoList({ todos, onChange }: UseTodoListOptions) {
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
        id: crypto.randomUUID(),
        text: trimmedText,
        completed: false,
      },
    ]

    onChange(newTodos)
    return newTodos
  }

  /**
   * Alterna el estado completado de una tarea.
   */
  const toggleTodo = (id: string): TodoItem[] => {
    const newTodos = todos.map((todo) =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    )

    onChange(newTodos)
    return newTodos
  }

  /**
   * Elimina una tarea de la lista.
   */
  const deleteTodo = (id: string): TodoItem[] => {
    const newTodos = todos.filter((todo) => todo.id !== id)

    onChange(newTodos)
    return newTodos
  }

  const stats = {
    total: todos.length,
    completed: todos.reduce((count, todo) => count + (todo.completed ? 1 : 0), 0),
    pending: todos.reduce((count, todo) => count + (todo.completed ? 0 : 1), 0),
  }

  return {
    todos,
    addTodo,
    toggleTodo,
    deleteTodo,
    stats,
  }
}
