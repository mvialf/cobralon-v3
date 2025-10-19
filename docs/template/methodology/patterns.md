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

---

**Personaliza y expande según los patrones de tu proyecto.**
