# Patrones de Código y Anti-Patrones

Este documento describe los patrones de código recomendados y anti-patrones a evitar en proyectos basados en este template.

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

**Personaliza y expande según los patrones de tu proyecto.**
