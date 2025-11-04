# TodoList Component

Componente de lista de tareas (TODO list) profesional con estado interno o controlado.

## ✅ Fase 1 y 2 Completadas

Este componente implementa **todas** las mejoras de las fases 1 y 2:

### Fase 1 - Bugs Arreglados ✅

- ✅ **IDs únicos garantizados**: Usa `crypto.randomUUID()` en lugar de `Date.now()`
- ✅ **Accesibilidad completa**: Todos los botones tienen `aria-label` descriptivos
- ✅ **Patrón Controlled/Uncontrolled**: Soporta ambos modos correctamente

### Fase 2 - Refactorización Arquitectural ✅

- ✅ **Lógica extraída a hook**: `useTodoList()` reutilizable y testeable
- ✅ **Confirmación antes de eliminar**: AlertDialog con descripción clara
- ✅ **Focus management**: El input mantiene foco después de agregar tareas

---

## 📦 Instalación

```bash
# Ya está instalado. Solo importa:
import { TodoList, TodoListField, type TodoItem } from '@/components/custom/todo'
```

---

## 🎯 Componentes Disponibles

### 1. `TodoList` - Standalone (Sin Formularios)

Para listas de tareas independientes, sin validación de formularios.

### 2. `TodoListField` - Para Formularios ⭐ NUEVO

Componente compatible con **React Hook Form** + **Zod** para usar dentro de formularios.

**¿Cuál usar?**

- ✅ **TodoList**: Listas simples, sin validación, standalone
- ✅ **TodoListField**: Dentro de formularios con React Hook Form

---

## 🎯 Uso - TodoList (Standalone)

### Modo 1: No Controlado (Estado Interno)

El componente maneja su propio estado. Ideal para casos simples.

```tsx
import { TodoList } from '@/components/custom/todo'

export default function MyPage() {
  return (
    <div className="container mx-auto p-6">
      <TodoList
        title="Mis Tareas del Día"
        description="Organiza tu trabajo diario"
        initialTodos={[
          { id: '1', text: 'Revisar emails', completed: false },
          { id: '2', text: 'Llamar a cliente', completed: true },
        ]}
      />
    </div>
  )
}
```

### Modo 2: Controlado (Estado en Padre)

El componente padre maneja el estado. Ideal para sincronizar con backend o múltiples componentes.

```tsx
'use client'

import { useState } from 'react'
import { TodoList, type TodoItem } from '@/components/custom/todo'

export default function ControlledExample() {
  const [todos, setTodos] = useState<TodoItem[]>([])

  // Sincronizar con backend cuando los todos cambian
  const handleTodosChange = async (newTodos: TodoItem[]) => {
    setTodos(newTodos)

    // Guardar en DB
    await fetch('/api/todos', {
      method: 'POST',
      body: JSON.stringify(newTodos),
    })
  }

  return <TodoList title="Tareas Sincronizadas" todos={todos} onTodosChange={handleTodosChange} />
}
```

---

## 🔧 API

### Props de `TodoList`

| Prop            | Tipo                          | Default             | Descripción                                                               |
| --------------- | ----------------------------- | ------------------- | ------------------------------------------------------------------------- |
| `title`         | `string`                      | `"Lista de Tareas"` | Título del componente                                                     |
| `description`   | `string`                      | -                   | Descripción opcional bajo el título                                       |
| `todos`         | `TodoItem[]`                  | -                   | **Modo controlado**: Lista externa de tareas                              |
| `onTodosChange` | `(todos: TodoItem[]) => void` | -                   | **Modo controlado**: Callback cuando cambian todos                        |
| `initialTodos`  | `TodoItem[]`                  | `[]`                | **Modo no controlado**: Tareas iniciales                                  |
| `autoSort`      | `boolean`                     | `true`              | Mueve automáticamente las tareas completadas al final (pendientes arriba) |

### Interface `TodoItem`

```typescript
interface TodoItem {
  id: string // ID único (generado con crypto.randomUUID)
  text: string // Texto de la tarea
  completed: boolean // Estado de completado
}
```

---

## 🎨 Características

### 1. IDs Únicos Garantizados

```typescript
// ✅ BIEN - Usa crypto.randomUUID()
const newTodo = {
  id: crypto.randomUUID(), // "550e8400-e29b-41d4-a716-446655440000"
  text: 'Mi tarea',
  completed: false,
}

// ❌ MAL - No usar Date.now() (puede generar duplicados)
const badTodo = {
  id: Date.now().toString(), // Colisiones si se agregan rápido
}
```

### 2. Confirmación Antes de Eliminar

Cuando el usuario hace clic en eliminar, aparece un AlertDialog:

- Muestra el nombre de la tarea a eliminar
- Botón "Cancelar" (gris)
- Botón "Eliminar" (rojo destructivo)
- No se puede cerrar accidentalmente

### 3. Focus Management

Después de agregar una tarea con Enter o el botón:

- El input se limpia automáticamente
- El foco permanece en el input
- Permite agregar múltiples tareas rápidamente

### 4. Accesibilidad Completa

```tsx
// Todos los elementos tienen aria-labels descriptivos
<Button aria-label="Agregar tarea">
  <Plus />
</Button>

<Checkbox aria-label={`Marcar tarea "${todo.text}" como completada`} />

<Button aria-label={`Eliminar tarea "${todo.text}"`}>
  <Trash2 />
</Button>
```

### 5. Estadísticas Memoizadas

```typescript
const stats = useMemo(
  () => ({
    total: todos.length,
    completed: todos.reduce((count, t) => count + (t.completed ? 1 : 0), 0),
    pending: todos.reduce((count, t) => count + (t.completed ? 0 : 1), 0),
  }),
  [todos]
)

// Performance: Solo recalcula cuando `todos` cambia
```

### 6. Auto-Sort de Tareas Completadas ⭐

Por defecto, las tareas completadas se mueven automáticamente al final de la lista:

```tsx
// ✅ Comportamiento por defecto (autoSort = true)
<TodoList title="Mis Tareas" />

// Resultado visual:
// 1. [ ] Tarea pendiente 1
// 2. [ ] Tarea pendiente 2
// 3. [x] Tarea completada 1  ← Va al final automáticamente
// 4. [x] Tarea completada 2
```

**Desactivar auto-sort:**

```tsx
// ❌ Mantener orden cronológico (autoSort = false)
<TodoList title="Mis Tareas" autoSort={false} />

// Las tareas NO se reordenan al marcarlas como completadas
```

**Beneficios:**

- ✅ **UX mejorada**: Tareas pendientes (lo importante) siempre visibles arriba
- ✅ **Patrón estándar**: Usado por Google Tasks, Microsoft To Do, Todoist
- ✅ **Claridad visual**: Separación clara entre pendientes y completadas
- ✅ **Zero friction**: Automático, sin UI adicional

**Cuándo desactivar:**

- Cuando el orden cronológico/secuencial importa (ej: pasos de un proceso)
- Cuando las tareas representan un timeline histórico
- Cuando el usuario necesita ver el orden exacto de creación

---

## 🧪 Hook: `useTodoList`

El hook es reutilizable y testeable independientemente del componente.

### Uso del Hook

```typescript
import { useTodoList } from '@/hooks/use-todo-list'

function MyCustomComponent() {
  const { todos, addTodo, toggleTodo, deleteTodo, stats } = useTodoList()

  const handleAdd = () => {
    addTodo("Nueva tarea")
  }

  return (
    <div>
      <p>Completadas: {stats.completed} / {stats.total}</p>
      {todos.map(todo => (
        <div key={todo.id}>
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => toggleTodo(todo.id)}
          />
          <span>{todo.text}</span>
          <button onClick={() => deleteTodo(todo.id)}>X</button>
        </div>
      ))}
    </div>
  )
}
```

### API del Hook

| Función      | Tipo                                        | Descripción                                     |
| ------------ | ------------------------------------------- | ----------------------------------------------- |
| `addTodo`    | `(text: string) => TodoItem[] \| undefined` | Agrega tarea (retorna undefined si texto vacío) |
| `toggleTodo` | `(id: string) => TodoItem[]`                | Alterna estado completado                       |
| `deleteTodo` | `(id: string) => TodoItem[]`                | Elimina tarea                                   |
| `stats`      | `{ total, completed, pending }`             | Estadísticas memoizadas                         |

---

## 🎯 Casos de Uso

### 1. Lista Simple (Sin Persistencia)

```tsx
<TodoList title="Quick Notes" />
```

### 2. Con Estado Inicial

```tsx
<TodoList
  initialTodos={[
    { id: crypto.randomUUID(), text: 'Setup project', completed: true },
    { id: crypto.randomUUID(), text: 'Write tests', completed: false },
  ]}
/>
```

### 3. Sincronizado con Backend

```tsx
const [todos, setTodos] = useState<TodoItem[]>([])

useEffect(() => {
  fetch('/api/todos').then(res => res.json()).then(setTodos)
}, [])

<TodoList
  todos={todos}
  onTodosChange={async (newTodos) => {
    setTodos(newTodos)
    await fetch('/api/todos', { method: 'PUT', body: JSON.stringify(newTodos) })
  }}
/>
```

### 4. Multiple Listas (Estado Compartido)

```tsx
const [personalTodos, setPersonalTodos] = useState<TodoItem[]>([])
const [workTodos, setWorkTodos] = useState<TodoItem[]>([])

<div className="grid md:grid-cols-2 gap-4">
  <TodoList
    title="Personal"
    todos={personalTodos}
    onTodosChange={setPersonalTodos}
  />
  <TodoList
    title="Trabajo"
    todos={workTodos}
    onTodosChange={setWorkTodos}
  />
</div>
```

---

## 🧪 Testing

El hook es fácil de testear con Vitest:

```typescript
import { renderHook, act } from '@testing-library/react'
import { useTodoList } from '@/hooks/use-todo-list'

describe('useTodoList', () => {
  it('debe agregar tarea correctamente', () => {
    const { result } = renderHook(() => useTodoList())

    act(() => {
      result.current.addTodo('Test task')
    })

    expect(result.current.todos).toHaveLength(1)
    expect(result.current.todos[0].text).toBe('Test task')
    expect(result.current.todos[0].id).toMatch(/^[a-f0-9-]{36}$/) // UUID válido
  })

  it('debe ignorar textos vacíos', () => {
    const { result } = renderHook(() => useTodoList())

    act(() => {
      result.current.addTodo('   ')
    })

    expect(result.current.todos).toHaveLength(0)
  })
})
```

---

## 🎨 Customización

### Estilos

El componente usa clases de Tailwind CSS. Para customizar:

```tsx
// Modificar en components/custom/todo/todo-list.tsx
<div className="w-full max-w-2xl">
  {' '}
  {/* Agregar max-width */}
  ...
</div>
```

### Sin Confirmación de Eliminación

Si no quieres el AlertDialog:

```tsx
// Modificar handleDeleteClick para eliminar directamente
const handleDeleteClick = (id: string) => {
  deleteTodo(id)
}

// Y remover el AlertDialog del JSX
```

---

## 📊 Comparación: Antes vs Después

| Aspecto                     | Antes (Original)        | Después (Refactorizado) |
| --------------------------- | ----------------------- | ----------------------- |
| **IDs únicos**              | ❌ Date.now()           | ✅ crypto.randomUUID()  |
| **Accesibilidad**           | ❌ Sin aria-labels      | ✅ Completa             |
| **Confirmación eliminar**   | ❌ No                   | ✅ AlertDialog          |
| **Focus management**        | ❌ No                   | ✅ Sí (useRef)          |
| **Lógica separada**         | ❌ Todo en componente   | ✅ Hook reutilizable    |
| **Testeable**               | ⚠️ Difícil              | ✅ Fácil (hook aislado) |
| **Controlled/Uncontrolled** | ⚠️ Bug con initialTodos | ✅ Patrón correcto      |
| **Performance**             | ⚠️ Recalcula stats      | ✅ useMemo              |
| **Auto-sort completadas**   | ❌ No                   | ✅ Sí (configurable)    |

---

## 📝 TodoListField - Para Formularios

### ¿Qué es TodoListField?

Componente diseñado específicamente para **integrarse con React Hook Form + Zod** en formularios.

### Diferencias clave vs TodoList

| Característica            | TodoList                 | TodoListField          |
| ------------------------- | ------------------------ | ---------------------- |
| **Props**                 | `todos`, `onTodosChange` | `value`, `onChange` ✅ |
| **React Hook Form**       | ❌ No compatible         | ✅ Compatible          |
| **Validación Zod**        | ❌ No                    | ✅ Sí                  |
| **Errores de validación** | ❌ No                    | ✅ Muestra errores     |
| **Estado disabled**       | Manual                   | ✅ Automático          |
| **Enter previene submit** | No                       | ✅ Sí (previene)       |

### Uso en Formularios

```tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TodoListField } from '@/components/custom/todo'
import { todoListSchema } from '@/lib/validations/todo-validations'

// 1. Schema del formulario
const projectSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  tasks: todoListSchema, // ✅ Validación: mínimo 1 tarea, máximo 50
})

type ProjectForm = z.infer<typeof projectSchema>

// 2. Componente de formulario
export function CreateProjectForm() {
  const form = useForm<ProjectForm>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      description: '',
      tasks: [], // Array vacío inicial
    },
  })

  const onSubmit = (data: ProjectForm) => {
    console.log('Proyecto:', data)
    // { name: "...", description: "...", tasks: [...] }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Campo: Nombre */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Proyecto</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Campo: Tareas ⭐ */}
        <FormField
          control={form.control}
          name="tasks"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>Tareas del Proyecto</FormLabel>
              <FormDescription>Agrega las tareas necesarias (mínimo 1)</FormDescription>
              <FormControl>
                <TodoListField
                  value={field.value}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                  disabled={form.formState.isSubmitting}
                  placeholder="Ej: Diseñar mockups..."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={form.formState.isSubmitting}>
          Crear Proyecto
        </Button>
      </form>
    </Form>
  )
}
```

### Props de TodoListField

| Prop          | Tipo                          | Requerido | Descripción                                                             |
| ------------- | ----------------------------- | --------- | ----------------------------------------------------------------------- |
| `value`       | `TodoItem[]`                  | ✅ Sí     | Valor actual (viene de React Hook Form)                                 |
| `onChange`    | `(value: TodoItem[]) => void` | ✅ Sí     | Callback de cambio (viene de React Hook Form)                           |
| `placeholder` | `string`                      | No        | Placeholder del input (default: "Agregar nueva tarea...")               |
| `disabled`    | `boolean`                     | No        | Si está deshabilitado (ej: durante submit)                              |
| `error`       | `string`                      | No        | Mensaje de error de validación                                          |
| `title`       | `string`                      | No        | Título opcional de la lista                                             |
| `description` | `string`                      | No        | Descripción opcional                                                    |
| `name`        | `string`                      | No        | Nombre del campo (para accesibilidad)                                   |
| `autoSort`    | `boolean`                     | No        | Mueve automáticamente las tareas completadas al final (default: `true`) |

### Validaciones Disponibles

```typescript
import {
  todoItemSchema, // Schema para 1 tarea
  todoListSchema, // Lista con mínimo 1 tarea (requerido)
  todoListOptionalSchema, // Lista opcional (puede estar vacía)
} from '@/lib/validations/todo-validations'

// Schema para formularios donde las tareas son obligatorias
const requiredSchema = z.object({
  tasks: todoListSchema, // ✅ Mínimo 1 tarea
})

// Schema para formularios donde las tareas son opcionales
const optionalSchema = z.object({
  tasks: todoListOptionalSchema, // ✅ Puede estar vacío
})
```

### Casos de Uso en Formularios

#### 1. Proyecto con Entregables

```tsx
const projectSchema = z.object({
  name: z.string(),
  deliverables: todoListSchema, // Lista de entregables
})
```

#### 2. Orden de Compra con Ítems

```tsx
const purchaseOrderSchema = z.object({
  vendor: z.string(),
  items: todoListSchema, // Lista de productos
})
```

#### 3. Checklist de Verificación

```tsx
const verificationSchema = z.object({
  processName: z.string(),
  checklist: todoListSchema, // Lista de verificaciones
})
```

### Ejemplo Completo Funcional

Ver página de ejemplo: **`/examples/todo-form`**

La página incluye:

- ✅ Formulario completo con validación
- ✅ Visualización en tiempo real del estado de validación
- ✅ Preview del resultado al enviar
- ✅ Código de ejemplo comentado

### Comportamiento del Enter

**Importante:** TodoListField previene el submit del form cuando presionas Enter en el input.

```tsx
// ✅ Enter en input de tarea → Agrega tarea (NO envía form)
// ✅ Enter en otros campos → Envía form (comportamiento normal)

const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter' && !disabled) {
    e.preventDefault() // ✅ Previene submit
    handleAddTodo()
  }
}
```

---

## 🚀 Próximas Mejoras (Fase 3)

Si quieres extender el componente:

- [x] **Auto-sort**: Tareas completadas al final automáticamente ✅ **IMPLEMENTADO**
- [ ] **Modo de edición**: Doble click en tarea para editar
- [ ] **Drag & Drop**: Reordenar tareas manualmente
- [ ] **Categorías/Tags**: Agrupar tareas
- [ ] **Fechas de vencimiento**: Deadlines y recordatorios
- [ ] **Prioridades**: Alta/Media/Baja
- [ ] **Filtros**: Ver solo completadas/pendientes
- [ ] **Persistencia local**: LocalStorage automático
- [ ] **Undo/Redo**: Deshacer eliminaciones
- [ ] **Animación smooth**: Transiciones al reordenar (con Framer Motion)

---

## 📄 Licencia

Parte del template SaaS. Ver [LICENSE](../../../LICENSE).
