'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TodoListField } from '@/components/custom/todo'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { todoListSchema } from '@/lib/validations/todo-validations'
import { useState } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'

// Schema del formulario de proyecto
const projectFormSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres').max(100),
  description: z.string().max(500).optional(),
  tasks: todoListSchema, // ✅ Validación integrada: mínimo 1 tarea, máximo 50
})

type ProjectFormData = z.infer<typeof projectFormSchema>

export default function TodoFormExamplePage() {
  const [submittedData, setSubmittedData] = useState<ProjectFormData | null>(null)

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: '',
      description: '',
      tasks: [], // Array vacío inicial
    },
  })

  const onSubmit = async (data: ProjectFormData) => {
    console.log('📝 Formulario enviado:', data)

    // Simular delay de API
    await new Promise((resolve) => setTimeout(resolve, 1000))

    setSubmittedData(data)
    form.reset()
  }

  return (
    <AppLayout
      pageTitle="TodoListField - Formulario"
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Ejemplos', href: '/examples' },
        { label: 'Todo Form' },
      ]}
    >
      <div className="space-y-6">
        {/* Info Banner */}
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📋 TodoListField - Compatible con Formularios
            </CardTitle>
            <CardDescription className="text-foreground">
              <p className="mb-2">
                Componente <code className="rounded bg-muted px-1 py-0.5">TodoListField</code>{' '}
                diseñado específicamente para integrarse con React Hook Form + Zod.
              </p>
              <ul className="list-inside list-disc space-y-1">
                <li>
                  Props estándar: <code>value</code> y <code>onChange</code>
                </li>
                <li>Validación automática con Zod schema</li>
                <li>Muestra mensajes de error de validación</li>
                <li>
                  Soporta estado <code>disabled</code> (durante submit)
                </li>
                <li>Previene Enter para evitar submit accidental del form</li>
              </ul>
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Formulario */}
          <Card>
            <CardHeader>
              <CardTitle>Crear Proyecto con Tareas</CardTitle>
              <CardDescription>
                Completa el formulario. La lista de tareas valida automáticamente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Campo: Nombre del Proyecto */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre del Proyecto</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Desarrollo de sitio web" {...field} />
                        </FormControl>
                        <FormDescription>
                          Nombre identificador del proyecto (3-100 caracteres)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Campo: Descripción */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descripción (Opcional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe el alcance del proyecto..."
                            className="resize-none"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Campo: Lista de Tareas ⭐ */}
                  <FormField
                    control={form.control}
                    name="tasks"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel>Tareas del Proyecto</FormLabel>
                        <FormDescription>
                          Agrega las tareas necesarias para completar el proyecto
                        </FormDescription>
                        <FormControl>
                          <TodoListField
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Ej: Diseñar mockups, Implementar backend..."
                            disabled={form.formState.isSubmitting}
                            error={fieldState.error?.message}
                            name="tasks"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Botones */}
                  <div className="flex gap-2">
                    <Button type="submit" disabled={form.formState.isSubmitting} className="flex-1">
                      {form.formState.isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creando...
                        </>
                      ) : (
                        'Crear Proyecto'
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => form.reset()}
                      disabled={form.formState.isSubmitting}
                    >
                      Limpiar
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Preview del resultado */}
          <div className="space-y-4">
            {/* Validación en Tiempo Real */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Validación en Tiempo Real</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Nombre válido:</span>
                    <ValidationIndicator
                      isValid={!form.formState.errors.name && !!form.watch('name')}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Tareas (mínimo 1):</span>
                    <ValidationIndicator
                      isValid={!form.formState.errors.tasks && form.watch('tasks').length > 0}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Formulario válido:</span>
                    <ValidationIndicator isValid={form.formState.isValid} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Último envío */}
            {submittedData && (
              <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    Proyecto Creado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="font-semibold">Nombre:</p>
                      <p className="text-muted-foreground">{submittedData.name}</p>
                    </div>
                    {submittedData.description && (
                      <div>
                        <p className="font-semibold">Descripción:</p>
                        <p className="text-muted-foreground">{submittedData.description}</p>
                      </div>
                    )}
                    <div>
                      <p className="font-semibold">Tareas ({submittedData.tasks.length}):</p>
                      <ul className="mt-1 space-y-1">
                        {submittedData.tasks.map((task) => (
                          <li key={task.id} className="flex items-start gap-2">
                            <span className="mt-1">{task.completed ? '✅' : '⬜'}</span>
                            <span className={task.completed ? 'line-through' : ''}>
                              {task.text}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Código de ejemplo */}
        <Card>
          <CardHeader>
            <CardTitle>Código de Implementación</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs">
              {`// 1. Schema con validación
import { todoListSchema } from '@/lib/validations/todo-validations'

const projectFormSchema = z.object({
  name: z.string().min(3),
  tasks: todoListSchema  // ✅ Validación: mínimo 1, máximo 50 tareas
})

// 2. Form setup
const form = useForm({
  resolver: zodResolver(projectFormSchema),
  defaultValues: { tasks: [] }
})

// 3. Uso en formulario
<FormField
  control={form.control}
  name="tasks"
  render={({ field, fieldState }) => (
    <FormItem>
      <FormLabel>Tareas</FormLabel>
      <FormControl>
        <TodoListField
          value={field.value}
          onChange={field.onChange}
          error={fieldState.error?.message}
          disabled={form.formState.isSubmitting}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>`}
            </pre>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

// Componente helper para indicadores de validación
function ValidationIndicator({ isValid }: { isValid: boolean }) {
  return isValid ? (
    <span className="text-green-600">✓ Válido</span>
  ) : (
    <span className="text-muted-foreground">○ Pendiente</span>
  )
}
