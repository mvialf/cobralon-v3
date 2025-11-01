# Patrón de Formularios

## Regla

**Todos los formularios complejos deben crearse como componentes independientes dentro del directorio `components/forms/`.**

## ✅ Correcto

```tsx
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

Luego, la página que necesite este formulario simplemente lo importa y lo renderiza:

```tsx
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

## Por Qué

### Ventajas

1. **Reutilización** - El formulario se puede usar en múltiples páginas o contextos
2. **Consistencia** - Todos los formularios siguen la misma estructura
3. **Mantenibilidad** - Un solo lugar para actualizar la lógica del formulario
4. **Testabilidad** - Fácil de testear de forma aislada
5. **Separación de responsabilidades** - La página solo maneja el layout, el form maneja su lógica

## Ubicación y Convenciones

- **Ubicación:** `components/forms/`
- **Convención de nombres:** `[entidad]-[acción]-form.tsx` (ej: `user-profile-form.tsx`, `project-create-form.tsx`)
- **Responsabilidades:**
  - Manejo de estado del formulario (React Hook Form)
  - Validación (Zod schema)
  - Submit logic
  - UI del formulario

## Estructura Recomendada

```
components/forms/
├── customer/
│   ├── customer-form.tsx
│   └── customer-search-form.tsx
├── projects/
│   ├── project-form.tsx
│   └── project-filter-form.tsx
└── payments/
    ├── payment-form.tsx
    └── payment-allocation-form.tsx
```

## Ejemplo con Props para Edición

```tsx
// components/forms/user-profile-form.tsx

interface UserProfileFormProps {
  initialData?: {
    username: string
    email: string
  }
  onSuccess?: () => void
}

export function UserProfileForm({ initialData, onSuccess }: UserProfileFormProps) {
  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: initialData || {
      username: '',
      email: '',
    },
  })

  function onSubmit(values: z.infer<typeof profileFormSchema>) {
    // Submit logic
    console.log(values)
    onSuccess?.()
  }

  return <Form {...form}>{/* ... */}</Form>
}
```

## Cuándo Crear un Componente Form

**✅ Crea un componente separado cuando:**

- El formulario tiene más de 3 campos
- Se usa en múltiples lugares
- Tiene lógica de validación compleja
- Incluye state management propio

**❌ NO crees componente separado cuando:**

- Formulario trivial (1-2 campos)
- Usado solo una vez
- Sin lógica de negocio

## Referencias

- [React Hook Form Documentation](https://react-hook-form.com)
- [Zod Documentation](https://zod.dev)
- [shadcn/ui Form](https://ui.shadcn.com/docs/components/form)

---

[← Anterior: shadcn/ui](../fundamentals/shadcn-ui.md) | [Volver al índice](../README.md) | [Siguiente: Patrón de Diálogos →](dialog-pattern.md)
