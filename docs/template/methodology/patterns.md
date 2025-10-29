# Patrones de Código y Anti-Patrones

Este documento describe los patrones de código recomendados y anti-patrones a evitar en proyectos basados en este template.

> **💡 Para workflow completo de implementación:** Ver [Building Features Guide](../guides/building-features.md)

> **Nota:** Esta es una guía base. Expándela según las convenciones de tu equipo.

## Contenido Pendiente

Esta sección está en construcción. Se recomienda documentar:

- [ ] Patrones de hooks personalizados
- [ ] Manejo de estado (client vs server)
- [ ] Patrones de fetching de datos
- [ ] Manejo de errores
- [ ] Anti-patrones comunes a evitar

## Patrones Establecidos en el Template

### 1. Server Components por Defecto

```tsx
// ✅ CORRECTO: Server Component por defecto
export default function MyPage() {
  return <div>Server-rendered content</div>
}

// ❌ INCORRECTO: Usar "use client" innecesariamente
;('use client')
export default function MyPage() {
  return <div>Static content</div>
}
```

**Regla:** Solo usa `"use client"` cuando necesites interactividad del navegador.

### 2. Path Aliases

```tsx
// ✅ CORRECTO: Usar alias @/
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ❌ INCORRECTO: Rutas relativas profundas
import { Button } from '../../../components/ui/button'
```

### 3. Función cn() para Clases Condicionales

```tsx
// ✅ CORRECTO: Usar cn() para merge de clases
import { cn } from "@/lib/utils"

<div className={cn(
  "base-classes",
  condition && "conditional-classes",
  className
)} />

// ❌ INCORRECTO: Template literals manuales
<div className={`base-classes ${condition ? 'conditional-classes' : ''} ${className}`} />
```

### 4. Composición de Componentes

```tsx
// ✅ CORRECTO: AppLayout para páginas
import AppLayout from '@/components/layout/app-layout'

export default function DashboardPage() {
  return (
    <AppLayout
      pageTitle="Dashboard"
      pageDescription="Vista general del sistema"
      breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Dashboard' }]}
    >
      <div>Contenido de la página</div>
    </AppLayout>
  )
}
```

### 5. Componentes shadcn/ui

```tsx
// ✅ CORRECTO: Importar desde @/components/ui
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

// ❌ INCORRECTO: No reinventar componentes que ya existen
// No crear tu propio Button si shadcn/ui ya lo provee
```

## Anti-Patrones Comunes

### ❌ Client Components Innecesarios

Evita marcar todo como `"use client"`. Usa Server Components cuando sea posible.

### ❌ Props Drilling Excesivo

Si pasas props por >3 niveles, considera Context API o state management.

### ❌ Lógica de Negocio en Componentes

Extrae lógica compleja a hooks o funciones utilitarias.

### ❌ Estilos Inline Complejos

Usa Tailwind classes o crea componentes reutilizables.

### 6. Patrón de Formularios

Para mantener la consistencia y la reutilización, todos los formularios complejos deben crearse como componentes independientes dentro del directorio `components/forms/`.

- **Ubicación:** `components/forms/`
- **Convención:** Cada formulario debe ser un componente autocontenido que maneje su propio estado y validación.
- **Ejemplo:** `components/forms/user-profile-form.tsx`

```tsx
// ✅ CORRECTO: Crear un componente de formulario reutilizable
// components/forms/user-profile-form.tsx

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'

const profileFormSchema = z.object({
  username: z.string().min(2, 'El nombre de usuario debe tener al menos 2 caracteres.'),
  email: z.string().email('Por favor, introduce un email válido.'),
})

export function UserProfileForm() {
  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: '',
      email: '',
    },
  })

  function onSubmit(values: z.infer<typeof profileFormSchema>) {
    console.log(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="Tu nombre de usuario" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Guardar Cambios</Button>
      </form>
    </Form>
  )
}
```

Luego, la página que necesite este formulario simplemente lo importa y lo renderiza.

```tsx
// ✅ CORRECTO: Usar el componente en una página
// app/settings/profile/page.tsx

import { UserProfileForm } from '@/components/forms/user-profile-form'
import { AppLayout } from '@/components/layout/app-layout'

export default function ProfilePage() {
  return (
    <AppLayout pageTitle="Mi Perfil">
      <UserProfileForm />
    </AppLayout>
  )
}
```

### 7. Patrón de Diálogos

De forma similar a los formularios, los diálogos reutilizables o con lógica interna deben ser encapsulados en sus propios componentes dentro de `components/dialogs/`.

- **Ubicación:** `components/dialogs/`
- **Convención:** El componente debe incluir el `AlertDialogTrigger` y el `AlertDialogContent`, exponiendo una interfaz simple a través de props (ej: `onConfirm`).
- **Ejemplo:** `components/dialogs/confirm-delete-dialog.tsx`

```tsx
// ✅ CORRECTO: Crear un componente de diálogo reutilizable
// components/dialogs/confirm-delete-dialog.tsx

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface ConfirmDeleteDialogProps {
  onConfirm: () => void
  children: React.ReactNode
}

export function ConfirmDeleteDialog({ onConfirm, children }: ConfirmDeleteDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
          <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Confirmar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

Este enfoque permite que las páginas simplemente usen el diálogo sin conocer sus detalles de implementación.

```tsx
// ✅ CORRECTO: Usar el componente en una página
// app/users/page.tsx

import { ConfirmDeleteDialog } from '@/components/dialogs/confirm-delete-dialog'
import { Button } from '@/components/ui/button'

export default function UsersPage() {
  const handleDelete = () => {
    console.log('Registro eliminado')
  }

  return (
    <ConfirmDeleteDialog onConfirm={handleDelete}>
      <Button variant="destructive">Eliminar Registro</Button>
    </ConfirmDeleteDialog>
  )
}
```

### 8. Patrón de Contenido Wide (Overflow Horizontal)

Cuando trabajas con contenido que puede exceder el ancho del viewport (tablas con muchas columnas, imágenes anchas, code blocks largos, gráficas horizontales), necesitas prevenir el **scroll horizontal duplicado** (scroll a nivel de página completa + scroll a nivel de contenido).

- **Ubicación:** Cualquier contenido que pueda ser más ancho que el viewport
- **Problema:** Sin manejo adecuado, obtienes dos scrollbars horizontales (uno en la página, otro en el contenido)
- **Solución:** Patrón de CSS overflow containment

#### El Problema

Sin manejo correcto del overflow:

- ❌ **Scroll a nivel de página:** Toda la aplicación (sidebar, header, contenido) se mueve horizontalmente
- ❌ **Scroll a nivel de contenido:** El contenido también tiene su propio scroll
- ❌ **UX pobre:** Usuario confundido por scroll duplicado, especialmente en mobile

#### La Solución: Card Wrapper con Overflow Containment

```tsx
// ✅ CORRECTO: Envolver contenido wide con Card y overflow control
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
;<Card className="overflow-hidden">
  {' '}
  {/* ← Contiene el overflow */}
  <CardHeader>
    <CardTitle>Título del Contenido</CardTitle>
  </CardHeader>
  <CardContent className="overflow-x-auto">
    {' '}
    {/* ← Permite scroll interno */}
    {/* Tu contenido wide aquí: DataTable, imagen, code block, etc. */}
  </CardContent>
</Card>
```

#### Por Qué Funciona

1. **`overflow-hidden` en Card:**
   - Previene que el contenido interno "escape" del contenedor
   - Elimina el scroll horizontal a nivel de página
   - El Card actúa como contenedor de contención

2. **`overflow-x-auto` en CardContent:**
   - Permite scroll horizontal SOLO dentro del contenedor
   - Se activa automáticamente cuando el contenido excede el ancho disponible
   - Mantiene el scroll vertical normal

#### Casos de Uso

Aplica este patrón cuando tengas:

**DataTables con muchas columnas (8+)**

```tsx
<Card className="overflow-hidden">
  <CardHeader>
    <CardTitle>Listado de Proyectos</CardTitle>
  </CardHeader>
  <CardContent className="overflow-x-auto">
    <DataTable columns={columns} data={data} />
  </CardContent>
</Card>
```

**Imágenes muy anchas**

```tsx
<Card className="overflow-hidden">
  <CardContent className="overflow-x-auto">
    <img src="/wide-diagram.png" alt="Diagrama" className="w-[2000px]" />
  </CardContent>
</Card>
```

**Code blocks largos**

```tsx
<Card className="overflow-hidden">
  <CardContent className="overflow-x-auto">
    <pre>
      <code>{longCodeSnippet}</code>
    </pre>
  </CardContent>
</Card>
```

**Gráficas horizontales**

```tsx
<Card className="overflow-hidden">
  <CardHeader>
    <CardTitle>Análisis de Ventas</CardTitle>
  </CardHeader>
  <CardContent className="overflow-x-auto">
    <BarChart data={data} width={1200} />
  </CardContent>
</Card>
```

#### Resultado

✅ **Scroll horizontal:** Solo dentro del Card (donde está el contenido wide)
✅ **Página:** Sin scroll horizontal, solo vertical
✅ **Mobile:** El contenido es scrollable horizontalmente dentro del Card
✅ **Desktop:** Si la ventana es suficientemente ancha, no hay scroll

#### Documentación Detallada

Para patrones específicos de DataTable, ver:

- [DataTable Best Practices](../components/data-table.md#handling-horizontal-overflow)
- [DataTable Pattern Guide](../components/data-table-pattern.md)
- [Create DataTable Page Tutorial](../guides/create-new-datatable-page.md)

---

### 9. Patrón de Captura de Diálogos (CaptureDialog)

⚠️ **Estado: Experimental** - Validar con ≥3 casos de uso antes de marcar como estable.

Cuando necesitas que los usuarios puedan **copiar contenido de diálogos como imágenes** para compartir fuera de la aplicación (WhatsApp, email, soporte), usa el componente `<CaptureDialog>`.

- **Ubicación:** `components/custom/capture-dialog/`
- **Features:**
  - Captura contenido como imagen PNG (alta calidad)
  - Copia automáticamente al portapapeles
  - Fallback inteligente a texto si falla la imagen
  - Theme consistente (independiente de dark/light mode)
- **Documentación:** [README.md](../../../components/custom/capture-dialog/README.md)
- **Decisión:** [ADR-011: Capture Dialog Pattern](../decisions/011-capture-dialog-pattern.md)

#### Caso de Uso

Perfecto para diálogos que muestran información que usuarios necesitan compartir:

- Estados de cuenta
- Resúmenes de pago
- Reportes de proyecto
- Calendarios de cuotas
- Facturas/recibos

#### Uso Básico

```tsx
// ✅ CORRECTO: Usar CaptureDialog para contenido compartible
import { CaptureDialog } from '@/components/custom/capture-dialog'
;<CaptureDialog open={open} onOpenChange={setOpen} title="Estado de Cuenta">
  <div className="bg-capture-bg text-capture-foreground p-6">
    <h2 className="text-xl font-bold">Proyecto: P 0001-2025</h2>
    <p>Cliente: Acme Corp</p>
    <p>Total: $1,500,000 CLP</p>
  </div>
</CaptureDialog>
```

#### Con Fallback Custom (Recomendado)

Para fallback profesional si falla la captura de imagen:

```tsx
// ✅ MEJOR: Proveer función getFallbackText
<CaptureDialog
  title="Estado de Cuenta"
  getFallbackText={() =>
    `
ESTADO DE CUENTA
Proyecto: ${project.projectNumber}
Cliente: ${customer.name}
Total Proyecto: ${formatCurrency(project.total)}
Total Pagado: ${formatCurrency(project.totalPaid)}
Saldo Pendiente: ${formatCurrency(project.balance)}
  `.trim()
  }
>
  <ProjectSummaryContent project={project} />
</CaptureDialog>
```

#### Uso Avanzado: Solo el Hook

Si necesitas lógica de captura sin el wrapper de Dialog:

```tsx
import { useCaptureDialog } from '@/components/custom/capture-dialog'

function MyCustomDialog() {
  const { contentRef, handleCopy, isCopying } = useCaptureDialog({
    getFallbackText: () => generateMyText(),
    onSuccess: () => toast.success('¡Copiado!'),
  })

  return (
    <AlertDialog>
      <AlertDialogContent>
        <Button onClick={handleCopy} disabled={isCopying}>
          {isCopying ? <Loader2 className="animate-spin" /> : <Copy />}
        </Button>

        <div ref={contentRef} className="bg-capture-bg">
          {/* Tu contenido */}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

#### Theming

El componente usa variables CSS `capture-*` que son **fijas** (light mode) para consistencia:

```css
/* Clases Tailwind disponibles */
bg-capture-bg           /* Fondo principal */
text-capture-foreground /* Texto principal */
border-capture-border   /* Bordes */
bg-capture-card         /* Cards internos */
```

**Razón:** Todas las capturas se ven profesionales y consistentes, sin importar si el usuario tiene dark mode.

#### Anti-Patrones

```tsx
// ❌ INCORRECTO: No usar clases de theme normal (varían con dark/light)
<div className="bg-background text-foreground">
  {/* Captura se verá diferente según theme del usuario */}
</div>

// ❌ INCORRECTO: No implementar captura manualmente en cada dialog
const handleCopy = async () => {
  const canvas = await snapdom.toCanvas(...)
  // Código duplicado, difícil de mantener
}

// ✅ CORRECTO: Usar clases capture-* para consistencia
<div className="bg-capture-bg text-capture-foreground">
  {/* Siempre se ve igual */}
</div>

// ✅ CORRECTO: Usar componente o hook reutilizable
<CaptureDialog>...</CaptureDialog>
```

#### Limitaciones Conocidas

1. **Contenido muy largo (>5000px):** Puede degradar performance
2. **Elementos externos (iframes, videos):** No se capturan
3. **Fonts externas:** Requiere espera (ya manejado automáticamente)

Ver documentación completa en [README.md](../../../components/custom/capture-dialog/README.md)

---

## ❌ Anti-Patrón: Conditional Styling Hardcodeado en Columnas

### El Problema

**NUNCA** uses valores mágicos hardcodeados para aplicar estilos condicionales en columnas de DataTable:

```tsx
// ❌ ANTI-PATRÓN: Valores hardcodeados, no configurables
{
  accessorKey: 'balance',
  header: 'Saldo',
  cell: ({ row }) => {
    const balance = row.original.balance
    const className =
      balance === 0
        ? 'text-success font-semibold'
        : balance > 2000000  // ← ¿Por qué 2,000,000? ¿Quién lo decide?
          ? 'text-destructive font-semibold'
          : ''
    return <span className={className}>{formatCurrency(balance)}</span>
  },
}
```

### Por Qué Es Malo

1. **Valores mágicos sin contexto**
   - ¿Por qué `2000000`? ¿CLP? ¿USD?
   - ¿Es un límite de riesgo? ¿Un threshold de negocio?
   - Cambiar este valor requiere editar código

2. **No es reutilizable**
   - Lógica duplicada en cada columna que necesite colores
   - Cada tabla define sus propios thresholds
   - Inconsistencia entre vistas

3. **Difícil de mantener**
   - Cambios de negocio requieren tocar código
   - No hay single source of truth
   - Imposible configurar por usuario/contexto

4. **Confunde a otros desarrolladores**
   - Al copiar-pegar, usan valores sin entender
   - No hay documentación de qué significan
   - Genera deuda técnica

### Por Qué el Ejemplo Existía

El ejemplo DataTable (`app/examples/data-table/`) **YA demostraba** conditional styling correctamente con:

- ✅ **StatusBadge** (líneas 76-89) - Estados con colores configurables
- ✅ **PriorityBadge** (líneas 94-103) - Prioridades con mapping explícito

La columna balance con valores hardcodeados era **redundante** y demostraba un **mal patrón**.

### Soluciones Correctas

#### Opción A: Solo Formateo (Recomendado para mayoría)

Si no necesitas colores condicionales, **NO los agregues**:

```tsx
// ✅ CORRECTO: Simple y claro
{
  accessorKey: 'balance',
  header: 'Saldo',
  cell: ({ row }) => formatCurrency(row.original.balance),
  meta: {
    headerClassName: 'text-right',
    cellClassName: 'text-right',
  },
}
```

**Razón:** Usuarios pueden interpretar los números. No necesitan colores para todo.

#### Opción B: Badge Configurable (Para Estados/Categorías)

Si realmente necesitas visualización con colores, usa un **componente reutilizable**:

```tsx
// 1. Definir configuración de negocio
const BALANCE_THRESHOLDS = {
  PAID_OFF: 0,           // Verde: Pagado completamente
  HIGH_RISK: 2000000,    // Rojo: Riesgo alto (>2M)
} as const

// 2. Componente reutilizable
function BalanceBadge({ balance, currency }: { balance: number; currency: string }) {
  const formatted = formatCurrency(balance, currency)

  if (balance === BALANCE_THRESHOLDS.PAID_OFF) {
    return <Badge variant="success">{formatted}</Badge>
  }

  if (balance > BALANCE_THRESHOLDS.HIGH_RISK) {
    return <Badge variant="destructive">{formatted}</Badge>
  }

  return <span className="font-medium">{formatted}</span>
}

// 3. Usar en columna
{
  accessorKey: 'balance',
  header: 'Saldo',
  cell: ({ row }) => (
    <BalanceBadge
      balance={row.original.balance}
      currency={row.original.currency}
    />
  ),
  meta: {
    headerClassName: 'text-right',
    cellClassName: 'text-right',
  },
}
```

**Ventajas:**

- ✅ Thresholds documentados con nombres descriptivos
- ✅ Componente reutilizable entre tablas
- ✅ Single source of truth
- ✅ Fácil cambiar valores desde configuración

#### Opción C: Helper Function (Para Lógica Compleja)

Si la lógica es compleja, extrae a un helper:

```tsx
// lib/business-logic/balance-classification.ts
export const BALANCE_THRESHOLDS = {
  PAID_OFF: 0,
  LOW_RISK: 500000,
  MEDIUM_RISK: 1000000,
  HIGH_RISK: 2000000,
} as const

export type BalanceRisk = 'paid-off' | 'low' | 'medium' | 'high'

export function classifyBalanceRisk(balance: number): BalanceRisk {
  if (balance === BALANCE_THRESHOLDS.PAID_OFF) return 'paid-off'
  if (balance < BALANCE_THRESHOLDS.LOW_RISK) return 'low'
  if (balance < BALANCE_THRESHOLDS.MEDIUM_RISK) return 'medium'
  if (balance < BALANCE_THRESHOLDS.HIGH_RISK) return 'medium'
  return 'high'
}

export function getBalanceRiskVariant(risk: BalanceRisk): BadgeProps['variant'] {
  const variants = {
    'paid-off': 'success',
    'low': 'default',
    'medium': 'warning',
    'high': 'destructive',
  } as const

  return variants[risk]
}

// En columns.tsx
import { classifyBalanceRisk, getBalanceRiskVariant } from '@/lib/business-logic/balance-classification'

{
  accessorKey: 'balance',
  header: 'Saldo',
  cell: ({ row }) => {
    const balance = row.original.balance
    const risk = classifyBalanceRisk(balance)
    const variant = getBalanceRiskVariant(risk)

    return (
      <Badge variant={variant}>
        {formatCurrency(balance, row.original.currency)}
      </Badge>
    )
  },
}
```

**Ventajas:**

- ✅ Lógica testeable de forma aislada
- ✅ Documentación explícita de reglas de negocio
- ✅ Reutilizable en múltiples lugares (API, reportes, etc.)
- ✅ Fácil agregar nuevos niveles de riesgo

### Cuándo SÍ Usar Colores Condicionales

**Casos válidos:**

1. **Estados con semántica clara**
   - ✅ Estado de pago: Pendiente (amarillo), Pagado (verde), Rechazado (rojo)
   - ✅ Prioridad: Alta (rojo), Media (amarillo), Baja (gris)
   - ✅ Stock: Sin stock (rojo), Poco stock (amarillo), En stock (verde)

2. **Con configuración explícita**
   - ✅ Thresholds definidos en constantes
   - ✅ Mapeo de estados a colores documentado
   - ✅ Componente reutilizable

**Casos inválidos:**

- ❌ Valores numéricos con thresholds arbitrarios sin contexto
- ❌ Lógica inline que no se puede reutilizar
- ❌ "Colorear por colorear" sin agregar valor semántico

### Regla de Oro

> **Si necesitas agregar un comentario explicando por qué un número es importante, ese número no debe estar hardcodeado en el código.**

Muévelo a:

1. Una constante con nombre descriptivo
2. Una configuración de negocio
3. Una variable de entorno (si aplica)

---

## 10. Patrón Avanzado: Form + Dialog con Edición Asíncrona

### El Problema

Cuando necesitas un formulario que funcione tanto para **crear** como para **editar** registros, surge un desafío técnico: los datos de edición se cargan **asincrónicamente** (fetch API), pero React Hook Form solo usa `defaultValues` en la **inicialización** del formulario.

**Flujo problemático:**

```
1. Modal abre → Form se monta con defaultValues=undefined
2. Form se inicializa con valores vacíos
3. DESPUÉS fetch completa → defaultValues se actualiza
4. ❌ Form NO se actualiza (defaultValues es ignored después del mount)
```

### Arquitectura de 3 Capas

El patrón correcto usa una arquitectura de 3 capas:

```
┌─────────────────────────────────────────────────────────┐
│  Layer 3: Controlled Dialog (Edit/New)                 │
│  - Maneja open/onOpenChange state                       │
│  - Carga datos asincrónicamente (modo edit)             │
│  - Pasa defaultValues a Layer 2                         │
│                                                         │
│  Ejemplo: EditProjectDialog, NewProjectDialog          │
└─────────────────────────────────────────────────────────┘
                    ↓ defaultValues
┌─────────────────────────────────────────────────────────┐
│  Layer 2: Generic Dialog (Reusable)                    │
│  - Envuelve el formulario en Dialog UI                 │
│  - Maneja submit/cancel buttons                        │
│  - Pasa defaultValues + mode a Layer 1                 │
│                                                         │
│  Ejemplo: ProjectDialog                                │
└─────────────────────────────────────────────────────────┘
                    ↓ defaultValues + mode
┌─────────────────────────────────────────────────────────┐
│  Layer 1: Form Component (Pure Logic)                  │
│  - React Hook Form + Zod validation                    │
│  - useEffect detecta cambios en defaultValues           │
│  - form.reset() cuando defaultValues cambian            │
│                                                         │
│  Ejemplo: ProjectForm                                  │
└─────────────────────────────────────────────────────────┘
```

### Implementación Completa

#### Layer 1: Form Component con Reset

```typescript
// components/forms/projects/project-form.tsx
import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

interface ProjectFormProps {
  onSubmit: (data: ProjectFormData) => void | Promise<void>
  defaultValues?: Partial<ProjectFormData>
  isSubmitting?: boolean
  showSubmitButton?: boolean
}

export const ProjectForm = React.forwardRef<ProjectFormHandle, ProjectFormProps>(
  ({ onSubmit, defaultValues, isSubmitting, showSubmitButton = true }, ref) => {
    const form = useForm<ProjectFormData>({
      resolver: zodResolver(projectFormSchema),
      defaultValues: {
        // Valores por defecto estáticos
        name: '',
        email: '',
        phone: '',
        // Sobrescribir con defaultValues si existen
        ...defaultValues,
      },
    })

    // ⭐ CLAVE: Reset form cuando defaultValues cambian (modo edición)
    React.useEffect(() => {
      if (defaultValues) {
        form.reset({
          name: defaultValues.name || '',
          email: defaultValues.email || '',
          phone: defaultValues.phone || '',
          // ... todos los campos
        })
      }
    }, [defaultValues, form])

    // Exponer métodos al padre via ref
    React.useImperativeHandle(ref, () => ({
      submit: () => form.handleSubmit(onSubmit)(),
      reset: () => form.reset(),
    }))

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {/* Campos del formulario */}
          <FormField control={form.control} name="name" {...} />
          <FormField control={form.control} name="email" {...} />

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

**Por qué el useEffect es necesario:**

- React Hook Form **NO** reacciona automáticamente a cambios en el prop `defaultValues`
- Los `defaultValues` solo se usan durante la inicialización (primera vez que se monta)
- Para actualizar el form después de montado, **DEBES** usar `form.reset(newValues)`

#### Layer 2: Generic Dialog

```typescript
// components/dialogs/projects/project-dialog.tsx
'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ProjectForm, ProjectFormHandle } from '@/components/forms/projects/project-form'
import { type ProjectFormData } from '@/lib/validations/project-validations'

interface ProjectDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSubmit: (data: ProjectFormData) => void | Promise<void>
  defaultValues?: Partial<ProjectFormData>
  mode?: 'create' | 'edit'
}

export function ProjectDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  mode = 'create',
}: ProjectDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const formRef = React.useRef<ProjectFormHandle>(null)

  const handleSubmit = async (data: ProjectFormData) => {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
      onOpenChange?.(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const title = mode === 'create' ? 'Crear Proyecto' : 'Editar Proyecto'
  const description = mode === 'create'
    ? 'Ingresa los datos del nuevo proyecto'
    : 'Actualiza la información del proyecto'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)] px-6">
          <div className="py-4">
            <ProjectForm
              ref={formRef}
              showSubmitButton={false}
              onSubmit={handleSubmit}
              defaultValues={defaultValues}
              isSubmitting={isSubmitting}
            />
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 pb-6">
          <Button variant="outline" onClick={() => onOpenChange?.(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={() => formRef.current?.submit()} disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : mode === 'create' ? 'Crear' : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

**Características:**

- ✅ Genérico y reutilizable
- ✅ Maneja estado de submitting
- ✅ Usa ref para trigger submit desde footer
- ✅ Scrollable para formularios largos

#### Layer 3: Edit Dialog (Asynchronous Loading)

```typescript
// components/dialogs/projects/edit-project-dialog.tsx
'use client'

import * as React from 'react'
import { ProjectDialog } from '@/components/dialogs/projects/project-dialog'
import { type ProjectFormData } from '@/lib/validations/project-validations'
import { toast } from 'sonner'

interface EditProjectDialogProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onProjectUpdated?: () => void
}

export function EditProjectDialog({
  projectId,
  open,
  onOpenChange,
  onProjectUpdated,
}: EditProjectDialogProps) {
  const [defaultValues, setDefaultValues] = React.useState<Partial<ProjectFormData>>()

  // Cargar datos cuando el dialog abre
  const loadProjectData = React.useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`)
      if (!response.ok) throw new Error('Error al cargar proyecto')

      const project = await response.json()

      // Transformar datos del API al formato del formulario
      setDefaultValues({
        customerId: project.customer.id,
        projectNumber: project.projectNumber,
        projectName: project.projectName || '',
        phone: project.phone,
        street: project.street,
        // ... resto de campos
      })
    } catch (error) {
      console.error('Error al cargar proyecto:', error)
      toast.error('Error al cargar los datos del proyecto')
      onOpenChange(false)
    }
  }, [projectId, onOpenChange])

  // Trigger fetch cuando abre
  React.useEffect(() => {
    if (open && !defaultValues) {
      loadProjectData()
    }
  }, [open, defaultValues, loadProjectData])

  const handleSubmit = async (data: ProjectFormData) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al actualizar')
      }

      toast.success('Proyecto actualizado exitosamente')
      onOpenChange(false)
      setDefaultValues(undefined) // Reset para forzar recarga en próxima apertura
      onProjectUpdated?.()
    } catch (error) {
      console.error('Error:', error)
      toast.error(error instanceof Error ? error.message : 'Error al actualizar')
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    // Limpiar state al cerrar
    if (!newOpen) {
      setDefaultValues(undefined)
    }
    onOpenChange(newOpen)
  }

  return (
    <ProjectDialog
      open={open}
      onOpenChange={handleOpenChange}
      onSubmit={handleSubmit}
      defaultValues={defaultValues}
      mode="edit"
    />
  )
}
```

**Características:**

- ✅ Carga datos asincrónicamente
- ✅ Maneja loading state
- ✅ Transforma datos API → Form format
- ✅ Limpia state al cerrar (fuerza reload en próxima apertura)

#### Layer 3: New Dialog (Simple)

```typescript
// components/dialogs/projects/new-project-dialog.tsx
'use client'

import * as React from 'react'
import { ProjectDialog } from '@/components/dialogs/projects/project-dialog'
import { type ProjectFormData } from '@/lib/validations/project-validations'
import { toast } from 'sonner'

interface NewProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProjectCreated?: () => void
}

export function NewProjectDialog({
  open,
  onOpenChange,
  onProjectCreated,
}: NewProjectDialogProps) {
  const handleSubmit = async (data: ProjectFormData) => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al crear proyecto')
      }

      toast.success('Proyecto creado exitosamente')
      onOpenChange(false)
      onProjectCreated?.()
    } catch (error) {
      console.error('Error:', error)
      toast.error(error instanceof Error ? error.message : 'Error al crear proyecto')
    }
  }

  return (
    <ProjectDialog
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={handleSubmit}
      mode="create"
    />
  )
}
```

**Características:**

- ✅ Más simple que EditDialog
- ✅ No necesita cargar datos
- ✅ No necesita defaultValues

### Uso en Parent Component

```typescript
// app/projects/columns.tsx (ejemplo en DataTable)
function ProjectActionsCell({ project, onProjectUpdated }) {
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger>...</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog controlado por state local */}
      <EditProjectDialog
        projectId={project.id}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onProjectUpdated={onProjectUpdated}
      />
    </>
  )
}
```

### Anti-Patrones a Evitar

#### ❌ Anti-Pattern 1: Trigger Pattern con State Interno

```tsx
// ❌ INCORRECTO: Dialog con trigger interno y state interno
export function EditProjectDialog({ projectId, trigger }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div onClick={() => setOpen(true)}>{trigger}</div>
      <Dialog open={open} onOpenChange={setOpen}>
        {/* ... */}
      </Dialog>
    </>
  )
}

// ❌ PROBLEMA: No puedes abrir el dialog desde el padre
// El click del trigger compite con el onClick del DropdownMenuItem
```

#### ❌ Anti-Pattern 2: No Limpiar State al Cerrar

```tsx
// ❌ INCORRECTO: No limpiar defaultValues
const handleOpenChange = (newOpen: boolean) => {
  onOpenChange(newOpen)
  // Falta: limpiar defaultValues cuando se cierra
}

// ❌ PROBLEMA: Si abres el dialog con proyecto A, luego con proyecto B,
// verás brevemente los datos de A antes de cargar B
```

#### ❌ Anti-Pattern 3: No Usar useEffect en el Form

```tsx
// ❌ INCORRECTO: Solo pasar defaultValues sin useEffect
const form = useForm({
  defaultValues: {
    ...defaultValues, // ❌ Solo se usa en mount inicial
  },
})

// ❌ PROBLEMA: Cuando defaultValues cambia después del mount,
// el form NO se actualiza automáticamente
```

#### ❌ Anti-Pattern 4: Conditional Rendering

```tsx
// ❌ INCORRECTO: Conditional rendering del form
{
  defaultValues && <ProjectForm defaultValues={defaultValues} />
}

// ❌ PROBLEMA: El form se desmonta y remonta, perdiendo focus,
// estado de validación, y causando flash visual
```

### Ventajas de Este Patrón

1. **✅ Reutilización**
   - Layer 1 (Form) es 100% reutilizable
   - Layer 2 (Dialog) es reutilizable para create/edit
   - Layer 3 son wrappers delgados específicos

2. **✅ Separación de Responsabilidades**
   - Form: Lógica de validación y UI
   - Dialog: UI de modal y layout
   - Edit/New: Lógica de negocio (fetch, submit)

3. **✅ Type-Safe**
   - Zod schema compartido
   - Type inference automático
   - Props bien definidas

4. **✅ Testeable**
   - Cada layer se puede testear independientemente
   - Form puede testearse sin Dialog
   - Edit logic puede testearse con mock fetch

5. **✅ Mantenible**
   - Cambios en UI del form no afectan lógica de dialogs
   - Cambios en API solo afectan Layer 3
   - Fácil agregar nuevos dialogs (Layer 3)

### Cuándo Usar Este Patrón

**✅ USA este patrón cuando:**

- Necesitas create + edit del mismo formulario
- Los datos de edición se cargan asincrónicamente
- El formulario es complejo (>5 campos)
- Quieres reutilizar el formulario en múltiples lugares

**❌ NO uses este patrón cuando:**

- Formulario trivial (1-2 campos)
- No necesitas modo edición
- Los datos están disponibles sincrónicamente
- Prefer simplicity over architecture

### Referencias

- **React Hook Form defaultValues:** https://react-hook-form.com/docs/useform#defaultValues
- **React Hook Form reset:** https://react-hook-form.com/docs/useform/reset
- **Radix UI Dialog:** https://www.radix-ui.com/primitives/docs/components/dialog
- **Implementación real:** `components/dialogs/projects/edit-project-dialog.tsx`

---

**Personaliza y expande según los patrones de tu proyecto.**
