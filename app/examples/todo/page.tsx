'use client'

import { useState } from 'react'
import { TodoList, type TodoItem } from '@/components/custom/todo'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'

export default function TodoExamplesPage() {
  // Estado para el ejemplo controlado
  const [controlledTodos, setControlledTodos] = useState<TodoItem[]>([
    { id: crypto.randomUUID(), text: 'Implementar feature X', completed: false },
    { id: crypto.randomUUID(), text: 'Revisar PR #123', completed: true },
    { id: crypto.randomUUID(), text: 'Actualizar documentación', completed: false },
  ])

  // Handler para sincronizar (simula guardar en backend)
  const handleControlledChange = (newTodos: TodoItem[]) => {
    setControlledTodos(newTodos)
    console.log('📝 Todos actualizados (listo para sincronizar con backend):', newTodos)
  }

  // Simular guardar en backend
  const handleSaveToBackend = async () => {
    console.log('💾 Guardando en backend...', controlledTodos)
    // Simular delay de red
    await new Promise((resolve) => setTimeout(resolve, 500))
    alert(`✅ ${controlledTodos.length} tareas guardadas en backend (simulado)`)
  }

  return (
    <AppLayout
      pageTitle="Todo List - Ejemplos"
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Ejemplos', href: '/examples' },
        { label: 'Todo List' },
      ]}
    >
      <div className="space-y-6">
        {/* Info Banner */}
        <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">✅ Fase 1 y 2 Completadas</CardTitle>
            <CardDescription className="text-foreground">
              Este componente implementa todas las mejoras solicitadas:
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>IDs únicos con crypto.randomUUID()</li>
                <li>Accesibilidad completa (aria-labels)</li>
                <li>Confirmación antes de eliminar (AlertDialog)</li>
                <li>Focus management (mantiene foco en input)</li>
                <li>Lógica extraída a hook reutilizable</li>
                <li>Patrón Controlled/Uncontrolled correcto</li>
              </ul>
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Ejemplos */}
        <Tabs defaultValue="uncontrolled" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="uncontrolled">No Controlado</TabsTrigger>
            <TabsTrigger value="controlled">Controlado</TabsTrigger>
            <TabsTrigger value="multiple">Múltiples Listas</TabsTrigger>
          </TabsList>

          {/* Ejemplo 1: No Controlado */}
          <TabsContent value="uncontrolled" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Ejemplo 1: Modo No Controlado</CardTitle>
                <CardDescription>
                  El componente maneja su propio estado interno. Ideal para listas simples sin
                  necesidad de sincronizar con backend.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border p-4">
                  <TodoList
                    title="Tareas del Día"
                    description="Lista simple con estado interno"
                    initialTodos={[
                      { id: crypto.randomUUID(), text: 'Revisar emails', completed: false },
                      { id: crypto.randomUUID(), text: 'Llamar a cliente', completed: true },
                      { id: crypto.randomUUID(), text: 'Preparar presentación', completed: false },
                    ]}
                  />
                </div>

                <div className="mt-4 rounded-lg bg-muted p-4">
                  <p className="mb-2 text-sm font-semibold">Código:</p>
                  <pre className="overflow-x-auto text-xs">
                    {`<TodoList
  title="Tareas del Día"
  description="Lista simple con estado interno"
  initialTodos={[
    { id: crypto.randomUUID(), text: 'Revisar emails', completed: false },
    { id: crypto.randomUUID(), text: 'Llamar a cliente', completed: true }
  ]}
/>`}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ejemplo 2: Controlado */}
          <TabsContent value="controlled" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Ejemplo 2: Modo Controlado</CardTitle>
                <CardDescription>
                  El componente padre maneja el estado. Permite sincronizar con backend, compartir
                  estado entre componentes, etc.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Estado actual:</p>
                    <p className="text-xs text-muted-foreground">
                      {controlledTodos.length} tareas (
                      {controlledTodos.filter((t) => t.completed).length} completadas)
                    </p>
                  </div>
                  <Button onClick={handleSaveToBackend} variant="outline" size="sm">
                    💾 Guardar en Backend (simulado)
                  </Button>
                </div>

                <div className="rounded-lg border p-4">
                  <TodoList
                    title="Tareas Sincronizadas"
                    description="Abrir consola para ver cambios en tiempo real"
                    todos={controlledTodos}
                    onTodosChange={handleControlledChange}
                  />
                </div>

                <div className="rounded-lg bg-muted p-4">
                  <p className="mb-2 text-sm font-semibold">Código:</p>
                  <pre className="overflow-x-auto text-xs">
                    {`const [todos, setTodos] = useState<TodoItem[]>([...])

const handleChange = (newTodos: TodoItem[]) => {
  setTodos(newTodos)
  // Sincronizar con backend
  await fetch('/api/todos', {
    method: 'PUT',
    body: JSON.stringify(newTodos)
  })
}

<TodoList
  todos={todos}
  onTodosChange={handleChange}
/>`}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ejemplo 3: Múltiples Listas */}
          <TabsContent value="multiple" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Ejemplo 3: Múltiples Listas</CardTitle>
                <CardDescription>
                  Usa múltiples instancias del componente con diferentes estados.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <TodoList
                      title="🏠 Personal"
                      initialTodos={[
                        { id: crypto.randomUUID(), text: 'Comprar leche', completed: false },
                        { id: crypto.randomUUID(), text: 'Ir al gym', completed: false },
                      ]}
                    />
                  </div>
                  <div className="rounded-lg border p-4">
                    <TodoList
                      title="💼 Trabajo"
                      initialTodos={[
                        { id: crypto.randomUUID(), text: 'Code review', completed: true },
                        { id: crypto.randomUUID(), text: 'Daily standup', completed: true },
                        { id: crypto.randomUUID(), text: 'Deploy a producción', completed: false },
                      ]}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Características Técnicas */}
        <Card>
          <CardHeader>
            <CardTitle>🚀 Características Implementadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="mb-2 font-semibold">✅ Fase 1: Bugs Arreglados</h4>
                <ul className="space-y-1 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-green-500">•</span>
                    <span>IDs únicos con crypto.randomUUID()</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-green-500">•</span>
                    <span>Todos los botones tienen aria-label</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-green-500">•</span>
                    <span>Patrón Controlled/Uncontrolled correcto</span>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="mb-2 font-semibold">✅ Fase 2: Refactorización</h4>
                <ul className="space-y-1 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-green-500">•</span>
                    <span>Hook useTodoList() reutilizable</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-green-500">•</span>
                    <span>AlertDialog antes de eliminar</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-green-500">•</span>
                    <span>Focus permanece en input (Enter rápido)</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documentación */}
        <Card>
          <CardHeader>
            <CardTitle>📚 Documentación</CardTitle>
            <CardDescription>Más información sobre el componente</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Ver documentación completa en:{' '}
              <code className="rounded bg-muted px-1 py-0.5">components/custom/todo/README.md</code>
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
