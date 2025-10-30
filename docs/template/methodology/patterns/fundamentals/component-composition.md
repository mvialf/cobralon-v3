# Composición de Componentes

## Regla

**Usa AppLayout para páginas consistentes y compón componentes pequeños.**

## ✅ Correcto

```tsx
import AppLayout from '@/components/layout/app-layout'

export default function DashboardPage() {
  return (
    <AppLayout
      pageTitle="Dashboard"
      pageDescription="Vista general del sistema"
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Dashboard' }
      ]}
    >
      <div>Contenido de la página</div>
    </AppLayout>
  )
}
```

## ❌ Incorrecto

```tsx
// NO reinventar el layout en cada página
export default function DashboardPage() {
  return (
    <div>
      <Sidebar />
      <div>
        <Header title="Dashboard" />
        <div>Contenido de la página</div>
      </div>
    </div>
  )
}
```

## Principio de Composición

### Pequeños Componentes Reutilizables

```tsx
// ✅ CORRECTO: Componentes pequeños y composables
function UserCard({ user }) {
  return (
    <Card>
      <CardHeader>
        <UserAvatar user={user} />
        <UserName user={user} />
      </CardHeader>
      <CardContent>
        <UserStats user={user} />
      </CardContent>
    </Card>
  )
}

// ❌ INCORRECTO: Componente monolítico
function UserCard({ user }) {
  return (
    <div className="...">
      <div className="...">
        <img src={user.avatar} />
        <h3>{user.name}</h3>
        <p>{user.email}</p>
        <div className="...">
          <span>Posts: {user.postsCount}</span>
          <span>Followers: {user.followersCount}</span>
        </div>
      </div>
    </div>
  )
}
```

## AppLayout: El Orchestrator

### Características

- ✅ Sidebar colapsible integrado
- ✅ Header con título, descripción y breadcrumbs
- ✅ Responsive (mobile → drawer, desktop → sidebar)
- ✅ Theme toggle automático

### Props de AppLayout

```typescript
interface AppLayoutProps {
  children: React.ReactNode
  pageTitle?: string         // Default: "Dashboard"
  pageDescription?: string   // Opcional
  breadcrumbs?: Array<{
    label: string
    href?: string           // Último breadcrumb sin href
  }>
}
```

### Ejemplo Completo

```tsx
import AppLayout from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function SettingsPage() {
  return (
    <AppLayout
      pageTitle="Configuración"
      pageDescription="Administra las configuraciones de tu cuenta"
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Configuración' },
      ]}
    >
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
          </CardHeader>
          <CardContent>
            <UserProfileForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Seguridad</CardTitle>
          </CardHeader>
          <CardContent>
            <SecuritySettings />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
```

## Composición de shadcn/ui

### Patrón Card

```tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

// ✅ CORRECTO: Componer piezas pequeñas
<Card>
  <CardHeader>
    <CardTitle>Título</CardTitle>
    <CardDescription>Descripción opcional</CardDescription>
  </CardHeader>
  <CardContent>
    Contenido principal
  </CardContent>
  <CardFooter>
    <Button>Acción</Button>
  </CardFooter>
</Card>
```

### Patrón Form

```tsx
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/components/ui/form'

// ✅ CORRECTO: Componer fields pequeños
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField
      control={form.control}
      name="username"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Username</FormLabel>
          <FormControl>
            <Input placeholder="johndoe" {...field} />
          </FormControl>
          <FormDescription>
            Tu nombre de usuario público.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
    <Button type="submit">Submit</Button>
  </form>
</Form>
```

## Cuando NO Usar AppLayout

### Landing Pages

```tsx
// ✅ CORRECTO: Sin sidebar/header para landing
export default function LandingPage() {
  return (
    <>
      <LandingHeader />
      <Hero />
      <Features />
      <Pricing />
      <Footer />
    </>
  )
}
```

### Auth Pages

```tsx
// ✅ CORRECTO: Layout custom para auth
export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Iniciar Sesión</CardTitle>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  )
}
```

## Composición vs Props

### ✅ Preferir Composición

```tsx
// ✅ MEJOR: Composición flexible
<Dialog>
  <DialogTrigger asChild>
    <Button>Abrir</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Título</DialogTitle>
    </DialogHeader>
    <CustomContent />
  </DialogContent>
</Dialog>
```

### ⚠️ Evitar Exceso de Props

```tsx
// ❌ EVITAR: Demasiadas props
<Dialog
  trigger={<Button>Abrir</Button>}
  title="Título"
  content={<CustomContent />}
  footer={<Button>Cerrar</Button>}
  showCloseButton={true}
  maxWidth="md"
  // ... 10 props más
/>
```

## Referencias

- [AppLayout Documentation](../../../components/app-layout.md)
- [Composición en React](https://react.dev/learn/passing-props-to-a-component#passing-jsx-as-children)
- [shadcn/ui Composition](https://ui.shadcn.com/docs/components)

---

[← Anterior: Función cn()](cn-function.md) | [Volver al índice](../README.md) | [Siguiente: shadcn/ui →](shadcn-ui.md)
