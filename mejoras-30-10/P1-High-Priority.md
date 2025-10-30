# P1 - Alta Prioridad (Impactan Developer Experience y Escalabilidad)

## ⚠️ Prioridad: ALTA

Estos problemas deben resolverse en las próximas 2-4 semanas para mantener velocidad de desarrollo y preparar el sistema para escalar.

---

## 1. React Query No Implementado (Instalado pero No Usado)

### 📊 Estado Actual

**Evidencia:**

```json
// package.json:27
"@tanstack/react-query": "^5.67.0",
```

**Pero:**

```typescript
// app/projects/page.tsx:47-70 (PATRÓN ACTUAL)
const fetchProjects = async () => {
  setIsLoadingPage(true)
  try {
    const params = new URLSearchParams({
      /* ... */
    })
    const response = await fetch(`/api/projects?${params}`)

    if (!response.ok) throw new Error('Error al cargar proyectos')

    const data = await response.json()
    setProjects(data.projects)
    setTotalProjects(data.pagination.total)
  } catch (error) {
    console.error('Error:', error)
    toast.error('Error al cargar proyectos')
  } finally {
    setIsLoadingPage(false)
  }
}

// Manual refetch en CADA mutación:
const handleProjectUpdated = () => {
  fetchProjects() // ❌ Refetch manual
}

const handleProjectDeleted = () => {
  fetchProjects() // ❌ Refetch manual
}
```

**Patrón repetido en:**

- `app/projects/page.tsx` (197 líneas)
- `app/payments/page.tsx` (similar)
- `app/customers/page.tsx` (similar)
- `components/tables/project-payments-table.tsx` (similar)

### 🔥 Impacto Real

#### **Problema 1: Código Repetitivo**

Cada página/componente que fetchea datos tiene:

1. ✅ Estado manual: `useState` para data, loading, error
2. ✅ Fetch manual en `useEffect`
3. ✅ Error handling manual
4. ✅ Loading states manuales
5. ✅ Refetch manual después de mutaciones

**Líneas de código duplicadas:** ~50-70 líneas por página

**Ejemplo típico:**

```typescript
const [projects, setProjects] = useState([])
const [isLoadingPage, setIsLoadingPage] = useState(true)
const [error, setError] = useState(null)

useEffect(() => {
  fetchProjects()
}, [currentPage, pageSize, customerFilter, statusFilter])

const fetchProjects = async () => {
  setIsLoadingPage(true)
  setError(null)
  try {
    // ... fetch logic
  } catch (error) {
    setError(error)
  } finally {
    setIsLoadingPage(false)
  }
}
```

#### **Problema 2: Sin Cache**

**Escenario:**

1. Usuario está en `/projects` (lista de proyectos)
2. Click en "Ver Detalle" → Navega a `/projects/123`
3. Usuario presiona "Atrás"
4. **Resultado:** `/projects` vuelve a fetchear TODO desde cero
5. UX: Loading spinner innecesario, datos que ya tenías desaparecen

**Con React Query:** Datos en cache, carga instantánea

#### **Problema 3: Sin Deduplicación**

**Escenario:**

```tsx
function ProjectsPage() {
  // Component A fetchea projects
  const [projects] = useState([])
  useEffect(() => {
    fetchProjects()
  }, [])

  return (
    <>
      <ProjectsTable data={projects} />
      <ProjectsSummary /> {/* También necesita projects */}
    </>
  )
}

function ProjectsSummary() {
  // Component B fetchea OTRA VEZ projects
  const [projects] = useState([])
  useEffect(() => {
    fetchProjects()
  }, [])
}
```

**Resultado:** 2 requests al mismo endpoint simultáneamente

**Con React Query:** Deduplicación automática, 1 solo request

#### **Problema 4: Stale Data**

**Escenario:**

1. Usuario abre `/projects` en pestaña 1
2. Usuario abre `/projects` en pestaña 2
3. Usuario crea proyecto en pestaña 2
4. **Resultado:** Pestaña 1 muestra datos viejos
5. Sin forma de sincronizar automáticamente

**Con React Query:** Refetch automático al enfocarse en pestaña

#### **Problema 5: Optimistic Updates Difíciles**

**Caso:** Usuario elimina un proyecto

**Sin React Query:**

```typescript
const handleDelete = async (id: string) => {
  try {
    await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    fetchProjects() // ❌ Refetch TODO (lento, flicker)
  } catch (error) {
    // ¿Cómo revertir si falla?
  }
}
```

**Con React Query:**

```typescript
const { mutate } = useMutation({
  mutationFn: deleteProject,
  onMutate: async (id) => {
    // ✅ Update UI inmediatamente (optimistic)
    queryClient.setQueryData(['projects'], (old) => old.filter((p) => p.id !== id))
  },
  onError: (err, id, context) => {
    // ✅ Revertir si falla (rollback automático)
    queryClient.setQueryData(['projects'], context.previousData)
  },
})
```

### 💡 Solución

#### **Fase 1: Setup React Query Provider**

```typescript
// app/providers.tsx (CREAR)
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minuto
            gcTime: 5 * 60 * 1000, // 5 minutos (antes: cacheTime)
            retry: 1,
            refetchOnWindowFocus: true,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

```typescript
// app/layout.tsx (MODIFICAR)
import { Providers } from './providers'

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <Providers>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  )
}
```

---

#### **Fase 2: Custom Hooks para Queries**

```typescript
// hooks/queries/use-projects.ts (CREAR)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

interface ProjectsQueryParams {
  page?: number
  limit?: number
  customerId?: string
  projectStatusId?: string
  hideFullyPaid?: boolean
  hideFinale?: boolean
}

// ✅ Query: GET projects
export function useProjects(params: ProjectsQueryParams) {
  return useQuery({
    queryKey: ['projects', params], // ← Key include params (auto refetch on change)
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      if (params.page) searchParams.set('page', params.page.toString())
      if (params.limit) searchParams.set('limit', params.limit.toString())
      if (params.customerId) searchParams.set('customerId', params.customerId)
      if (params.projectStatusId) searchParams.set('projectStatusId', params.projectStatusId)
      if (params.hideFullyPaid) searchParams.set('hideFullyPaid', 'true')
      if (params.hideFinale) searchParams.set('hideFinale', 'true')

      const response = await fetch(`/api/projects?${searchParams}`)
      if (!response.ok) {
        throw new Error('Error al cargar proyectos')
      }

      return response.json()
    },
    staleTime: 60 * 1000, // Cache por 1 minuto
  })
}

// ✅ Query: GET single project
export function useProject(id: string) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${id}`)
      if (!response.ok) throw new Error('Proyecto no encontrado')
      return response.json()
    },
    enabled: !!id, // Solo fetch si ID existe
  })
}

// ✅ Mutation: CREATE project
export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ProjectFormData) => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al crear proyecto')
      }

      return response.json()
    },
    onSuccess: () => {
      // ✅ Invalidar cache de proyectos (auto refetch)
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Proyecto creado exitosamente')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// ✅ Mutation: UPDATE project
export function useUpdateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProjectFormData }) => {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al actualizar')
      }

      return response.json()
    },
    onMutate: async ({ id, data }) => {
      // ✅ Cancelar queries en flight
      await queryClient.cancelQueries({ queryKey: ['projects', id] })

      // ✅ Snapshot del valor anterior (para rollback)
      const previousProject = queryClient.getQueryData(['projects', id])

      // ✅ Optimistic update: actualizar UI inmediatamente
      queryClient.setQueryData(['projects', id], (old: any) => ({
        ...old,
        ...data,
      }))

      return { previousProject }
    },
    onError: (err, { id }, context) => {
      // ✅ Rollback en caso de error
      if (context?.previousProject) {
        queryClient.setQueryData(['projects', id], context.previousProject)
      }
      toast.error('Error al actualizar proyecto')
    },
    onSuccess: (data, { id }) => {
      // ✅ Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.setQueryData(['projects', id], data)
      toast.success('Proyecto actualizado')
    },
  })
}

// ✅ Mutation: DELETE project
export function useDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al eliminar')
      }
    },
    onMutate: async (id) => {
      // ✅ Optimistic update: remover de lista inmediatamente
      await queryClient.cancelQueries({ queryKey: ['projects'] })

      const previousData = queryClient.getQueryData(['projects'])

      queryClient.setQueryData(['projects'], (old: any) => ({
        ...old,
        projects: old.projects.filter((p: any) => p.id !== id),
      }))

      return { previousData }
    },
    onError: (err, id, context) => {
      // ✅ Rollback
      if (context?.previousData) {
        queryClient.setQueryData(['projects'], context.previousData)
      }
      toast.error('Error al eliminar proyecto')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Proyecto eliminado')
    },
  })
}
```

---

#### **Fase 3: Migrar Componentes**

**ANTES:**

```typescript
// app/projects/page.tsx (197 líneas - ANTES)
'use client'

import { useState, useEffect } from 'react'

export default function ProjectsPage() {
  const [projects, setProjects] = useState([])
  const [isLoadingPage, setIsLoadingPage] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const fetchProjects = async () => {
    setIsLoadingPage(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
      })
      const response = await fetch(`/api/projects?${params}`)
      const data = await response.json()
      setProjects(data.projects)
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoadingPage(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [currentPage, pageSize])

  const handleProjectUpdated = () => {
    fetchProjects() // ❌ Manual refetch
  }

  return (
    <div>
      {isLoadingPage ? (
        <div>Cargando...</div>
      ) : (
        <DataTable data={projects} />
      )}
    </div>
  )
}
```

**DESPUÉS:**

```typescript
// app/projects/page.tsx (DESPUÉS - mucho más simple)
'use client'

import { useState } from 'react'
import { useProjects, useDeleteProject } from '@/hooks/queries/use-projects'

export default function ProjectsPage() {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [hideFullyPaid, setHideFullyPaid] = useState(false)

  // ✅ Un solo hook, maneja todo
  const { data, isLoading, error } = useProjects({
    page: currentPage,
    limit: pageSize,
    hideFullyPaid,
  })

  const deleteMutation = useDeleteProject()

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id) // ✅ Optimistic update automático
  }

  if (isLoading) return <div>Cargando...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      <DataTable
        data={data.projects}
        onDelete={handleDelete}
      />
    </div>
  )
}
```

**Líneas de código:**

- **ANTES:** 197 líneas
- **DESPUÉS:** ~80 líneas
- **Reducción:** 60% menos código

**Beneficios:**

- ✅ Sin `useState` manual para data/loading/error
- ✅ Sin `useEffect` manual
- ✅ Sin refetch manual
- ✅ Optimistic updates automáticos
- ✅ Cache automático
- ✅ Deduplicación automática

---

#### **Fase 4: DevTools**

```typescript
// Agregar en app/providers.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

<QueryClientProvider client={queryClient}>
  {children}
  <ReactQueryDevtools initialIsOpen={false} /> {/* ✅ Herramienta de debug */}
</QueryClientProvider>
```

**Features:**

- Ver todas las queries activas
- Ver cache actual
- Refetch manual
- Invalidar queries
- Ver stale/fresh status

---

### 📋 Plan de Acción

| Fase | Tarea                           | Tiempo | Archivos                         |
| ---- | ------------------------------- | ------ | -------------------------------- |
| 1    | Setup Provider                  | 30 min | `app/providers.tsx`              |
| 2    | Crear hooks de projects         | 2 hrs  | `hooks/queries/use-projects.ts`  |
| 3    | Migrar `app/projects/page.tsx`  | 1 hr   | Página principal                 |
| 4    | Crear hooks de payments         | 2 hrs  | `hooks/queries/use-payments.ts`  |
| 5    | Migrar `app/payments/page.tsx`  | 1 hr   | Página de pagos                  |
| 6    | Crear hooks de customers        | 1 hr   | `hooks/queries/use-customers.ts` |
| 7    | Migrar `app/customers/page.tsx` | 1 hr   | Página de clientes               |

**Total:** 2 días de trabajo

**ROI:**

- Reducción de código: 40-60%
- Mejor UX (cache, optimistic updates)
- Menos bugs (menos código custom)
- Más rápido agregar features

---

## 2. Formulario de 471 Líneas (project-form.tsx)

### 📊 Estado Actual

**Archivo:** `components/forms/projects/project-form.tsx`

```typescript
// 471 líneas con múltiples responsabilidades:
// 1. Customer selection (Combobox)
// 2. Project status (Combobox)
// 3. Financial fields (subtotal, tax, total)
// 4. Address fields (región, comuna, calle)
// 5. Project details (windows, squareMeters, description)
// 6. Date picker
// 7. Validation logic
// 8. Submit logic
```

**Problemas:**

1. ❌ **Difícil de mantener:** Cambiar algo requiere leer 471 líneas
2. ❌ **Difícil de testear:** Muchas responsabilidades acopladas
3. ❌ **Difícil de reutilizar:** No puedes extraer solo campos de dirección
4. ❌ **Difícil de extender:** Agregar campo = buscar dónde insertarlo en 471 líneas

### 🔥 Impacto Real

**Escenario 1: Bug en cálculo de total**

- Archivo de 471 líneas
- Bug está en línea 280
- Para encontrarlo: leer 280 líneas
- Para entender contexto: leer fields relacionados (otras 100 líneas)
- **Total tiempo:** 20-30 minutos solo para ubicar el bug

**Con componentes pequeños:**

- Archivo `FinancialFields.tsx` de 50 líneas
- Bug obvio en línea 30
- **Total tiempo:** 2-3 minutos

**Escenario 2: Agregar campo nuevo**

Sin refactor:

1. Abrir `project-form.tsx` (471 líneas)
2. Buscar dónde insertar campo (~5 min)
3. Agregar FormField (~10 min)
4. Actualizar validations (~5 min)
5. Testear manualmente (~10 min)
6. **Total:** 30 minutos

Con refactor:

1. Abrir componente específico (50 líneas)
2. Agregar campo (~5 min)
3. Tests automáticos te avisan si rompiste algo
4. **Total:** 5-10 minutos

### 💡 Solución

#### **Fase 1: Extraer Sub-Componentes**

```
components/forms/projects/
├── project-form.tsx (orchestrator - 150 líneas)
├── customer-selection.tsx (50 líneas)
├── project-status-field.tsx (40 líneas)
├── financial-fields.tsx (80 líneas)
├── address-fields.tsx (100 líneas) [YA EXISTE]
└── project-details-fields.tsx (60 líneas)
```

**Implementación:**

```typescript
// components/forms/projects/customer-selection.tsx (CREAR)
import { UseFormReturn } from 'react-hook-form'
import { Combobox } from '@/components/ui/combobox'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'

interface CustomerSelectionProps {
  form: UseFormReturn<ProjectFormData>
  onCustomerCreated?: () => void
}

export function CustomerSelection({ form, onCustomerCreated }: CustomerSelectionProps) {
  const [customers, setCustomers] = useState([])
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true)

  useEffect(() => {
    loadCustomers()
  }, [])

  const loadCustomers = async () => {
    // ... fetch logic
  }

  return (
    <FormField
      control={form.control}
      name="customerId"
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel>Cliente *</FormLabel>
          <FormControl>
            <Combobox
              options={customers}
              value={field.value}
              onValueChange={field.onChange}
              placeholder="Selecciona un cliente"
              searchPlaceholder="Buscar cliente..."
              emptyText="No se encontraron clientes"
              onCreate={onCustomerCreated}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
```

```typescript
// components/forms/projects/financial-fields.tsx (CREAR)
import { UseFormReturn } from 'react-hook-form'
import { CurrencyInput } from '@/components/ui/currency-input'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'

interface FinancialFieldsProps {
  form: UseFormReturn<ProjectFormData>
  currency: string
  onTotalChange?: (total: number) => void
}

export function FinancialFields({ form, currency, onTotalChange }: FinancialFieldsProps) {
  const subtotal = form.watch('subtotal')
  const taxRate = form.watch('taxRate')

  // ✅ Auto-calculate total cuando cambia subtotal o taxRate
  useEffect(() => {
    if (subtotal !== undefined && taxRate !== undefined) {
      const calculatedTotal = subtotal + (subtotal * taxRate) / 100
      form.setValue('total', calculatedTotal)
      onTotalChange?.(calculatedTotal)
    }
  }, [subtotal, taxRate, form, onTotalChange])

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {/* Subtotal */}
      <FormField
        control={form.control}
        name="subtotal"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Subtotal *</FormLabel>
            <FormControl>
              <CurrencyInput
                currency={currency}
                value={field.value}
                onValueChange={(value) => field.onChange(value.floatValue)}
                placeholder="0"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Tax Rate */}
      <FormField
        control={form.control}
        name="taxRate"
        render={({ field }) => (
          <FormItem>
            <FormLabel>IVA (%) *</FormLabel>
            <FormControl>
              <Input
                type="number"
                step="0.01"
                {...field}
                onChange={(e) => field.onChange(parseFloat(e.target.value))}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Total (read-only, auto-calculated) */}
      <FormField
        control={form.control}
        name="total"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Total *</FormLabel>
            <FormControl>
              <CurrencyInput
                currency={currency}
                value={field.value}
                readOnly
                className="bg-muted"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
```

```typescript
// components/forms/projects/project-details-fields.tsx (CREAR)
import { UseFormReturn } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'

interface ProjectDetailsFieldsProps {
  form: UseFormReturn<ProjectFormData>
}

export function ProjectDetailsFields({ form }: ProjectDetailsFieldsProps) {
  return (
    <div className="space-y-4">
      {/* Project Name */}
      <FormField
        control={form.control}
        name="projectName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nombre del Proyecto</FormLabel>
            <FormControl>
              <Input placeholder="Ej: Instalación ventanas oficina" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Windows Count */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="windowsCount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cantidad de Ventanas</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="0"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Square Meters */}
        <FormField
          control={form.control}
          name="squareMeters"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Metros Cuadrados</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Description */}
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Descripción</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Detalles adicionales del proyecto..."
                className="min-h-[100px]"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
```

**Orchestrator (refactorizado):**

```typescript
// components/forms/projects/project-form.tsx (REFACTORIZADO - ~150 líneas)
import { CustomerSelection } from './customer-selection'
import { ProjectStatusField } from './project-status-field'
import { FinancialFields } from './financial-fields'
import { AddressFields } from './address-fields'
import { ProjectDetailsFields } from './project-details-fields'

export const ProjectForm = React.forwardRef<ProjectFormHandle, ProjectFormProps>(
  ({ onSubmit, defaultValues, isSubmitting, showSubmitButton = true }, ref) => {
    const form = useForm<ProjectFormData>({
      resolver: zodResolver(projectFormSchema),
      defaultValues,
    })

    // ... lógica de reset cuando defaultValues cambia (ya existe)

    React.useImperativeHandle(ref, () => ({
      submit: () => form.handleSubmit(onSubmit)(),
      reset: () => form.reset(),
    }))

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* ✅ Componentes extraídos */}
          <CustomerSelection form={form} />

          <ProjectStatusField form={form} />

          <FinancialFields
            form={form}
            currency={defaultValues?.currency || 'CLP'}
          />

          <AddressFields form={form} />

          <ProjectDetailsFields form={form} />

          {/* Date picker (pequeño, dejarlo inline) */}
          <FormField control={form.control} name="date" {...} />

          {showSubmitButton && (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          )}
        </form>
      </Form>
    )
  }
)
```

**Resultado:**

- **ANTES:** 471 líneas
- **DESPUÉS:** ~150 líneas (orchestrator) + 5 archivos de 40-100 líneas
- **Beneficio:** Cada archivo es fácil de entender y testear

---

### 📋 Plan de Acción

| Fase | Tarea                              | Tiempo | Archivo                      |
| ---- | ---------------------------------- | ------ | ---------------------------- |
| 1    | Extraer CustomerSelection          | 1 hr   | `customer-selection.tsx`     |
| 2    | Extraer ProjectStatusField         | 30 min | `project-status-field.tsx`   |
| 3    | Extraer FinancialFields            | 1 hr   | `financial-fields.tsx`       |
| 4    | Extraer ProjectDetailsFields       | 1 hr   | `project-details-fields.tsx` |
| 5    | Refactorizar project-form.tsx      | 1 hr   | `project-form.tsx`           |
| 6    | Tests de FinancialFields (crítico) | 1 hr   | `financial-fields.test.tsx`  |

**Total:** 1 día

---

## 3. TypeScript `any` Rompe Type Safety

### 📊 Estado Actual

**Archivo:** `app/projects/columns.tsx:262`

```typescript
const { onProjectUpdated } = (table.options.meta as any) || {}
```

**Problema:**

- ✅ TypeScript tiene type inference
- ❌ `as any` bypassa TODOS los checks
- ❌ Errores de tipo no se detectan
- ❌ Autocomplete no funciona

### 💡 Solución

```typescript
// app/projects/columns.tsx (CORREGIDO)

// 1. Definir type para table meta
interface ProjectsTableMeta {
  onProjectUpdated?: () => void
  onProjectDeleted?: (id: string) => void
}

// 2. Usar type guard
function getProjectsTableMeta(table: any): ProjectsTableMeta {
  return (table.options.meta || {}) as ProjectsTableMeta
}

// 3. Usar en columnas
export const projectColumns: ColumnDef<ProjectWithRelations>[] = [
  {
    id: 'actions',
    cell: ({ row, table }) => {
      const { onProjectUpdated, onProjectDeleted } = getProjectsTableMeta(table)

      // ✅ Ahora TypeScript sabe los tipos
      return (
        <ProjectActionsCell
          project={row.original}
          onProjectUpdated={onProjectUpdated}
          onProjectDeleted={onProjectDeleted}
        />
      )
    },
  },
]
```

**Esfuerzo:** 30 minutos

---

## 🎯 Resumen P1

| Problema             | Impacto                     | Solución                     | Esfuerzo |
| -------------------- | --------------------------- | ---------------------------- | -------- |
| React Query no usado | Código duplicado, sin cache | Implementar hooks + provider | 2 días   |
| Form de 471 líneas   | Difícil mantener/testear    | Extraer sub-componentes      | 1 día    |
| TypeScript `any`     | Pierde type safety          | Definir types correctos      | 30 min   |

**Total estimado:** 3-4 días de trabajo

**ROI:**

- Velocidad de desarrollo: +40%
- Menos bugs: tests más fáciles
- Mejor UX: cache, optimistic updates
