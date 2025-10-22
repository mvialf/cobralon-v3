'use client'

import * as React from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UserProfileDialog } from '@/components/dialogs/examples/user-profile-dialog'
import { useToast } from '@/hooks/use-toast'
import { type UserProfileFormValues } from '@/lib/validations/user-profile-validations'

export default function FormDialogPage() {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const { toast } = useToast()

  const handleSubmit = (data: UserProfileFormValues) => {
    // Simular guardado
    console.log('Datos del formulario:', data)

    toast({
      title: 'Perfil actualizado',
      description: `Los cambios de ${data.username} se guardaron correctamente`,
    })
  }

  // Datos de ejemplo para el formulario
  const defaultValues: Partial<UserProfileFormValues> = {
    username: 'juanperez',
    email: 'juan@ejemplo.com',
    firstName: 'Juan',
    lastName: 'Pérez',
    phone: '+56912345678',
    bio: 'Desarrollador apasionado por la tecnología y la creación de soluciones innovadoras.',
    website: 'https://ejemplo.com',
    company: 'Mi Empresa',
    location: 'Santiago, Chile',
    notifications: true,
    marketing: false,
  }

  return (
    <AppLayout
      pageTitle="Dialog con Formulario"
      pageDescription="Ejemplo de dialog scrollable con formulario completo"
      breadcrumbs={[{ label: 'Ejemplos', href: '/examples' }, { label: 'Dialog con Formulario' }]}
    >
      <div className="space-y-6">
        {/* Descripción */}
        <Card>
          <CardHeader>
            <CardTitle>Dialog Scrollable con Formulario</CardTitle>
            <CardDescription>
              Ejemplo de dialog que contiene un formulario largo con scroll interno. Útil cuando el
              contenido del dialog es extenso y no cabe en la ventana.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Características</h3>
              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                <li>
                  <strong>ScrollArea:</strong> Contenido scrollable sin afectar header/footer
                </li>
                <li>
                  <strong>Altura máxima:</strong> 90vh para adaptarse a diferentes pantallas
                </li>
                <li>
                  <strong>Header y Footer fijos:</strong> Siempre visibles mientras se hace scroll
                </li>
                <li>
                  <strong>Formulario completo:</strong> Validación con React Hook Form + Zod
                </li>
                <li>
                  <strong>Responsive:</strong> Se adapta a mobile y desktop
                </li>
                <li>
                  <strong>Patrón reutilizable:</strong> Form y Dialog en componentes separados
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Implementación</h3>
              <p className="text-sm text-muted-foreground">
                El dialog utiliza el componente <code>ScrollArea</code> de shadcn/ui para manejar el
                scroll interno. El formulario está separado en un componente reutilizable (
                <code>UserProfileForm</code>) y el dialog (<code>UserProfileDialog</code>) lo
                envuelve.
              </p>
              <p className="text-sm text-muted-foreground">
                Este patrón sigue las recomendaciones de{' '}
                <code>docs/template/methodology/patterns.md</code>:
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                <li>
                  Formularios en <code>components/forms/</code>
                </li>
                <li>
                  Dialogs en <code>components/dialogs/</code>
                </li>
                <li>
                  Validaciones en <code>lib/validations/</code>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Demo */}
        <Card>
          <CardHeader>
            <CardTitle>Demo</CardTitle>
            <CardDescription>
              Haz clic en el botón para abrir el dialog con el formulario scrollable
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setIsDialogOpen(true)}>Abrir Dialog con Formulario</Button>
          </CardContent>
        </Card>

        {/* Código de ejemplo */}
        <Card>
          <CardHeader>
            <CardTitle>Código de Ejemplo</CardTitle>
            <CardDescription>Cómo usar el componente UserProfileDialog</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
              <code>{`'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { UserProfileDialog } from '@/components/dialogs/examples/user-profile-dialog'
import { useToast } from '@/hooks/use-toast'

export default function MyPage() {
  const [isOpen, setIsOpen] = useState(false)
  const { toast } = useToast()

  const handleSubmit = (data) => {
    console.log('Datos guardados:', data)
    toast({
      title: 'Perfil actualizado',
      description: 'Los cambios se guardaron correctamente',
    })
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        Editar Perfil
      </Button>

      <UserProfileDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        onSubmit={handleSubmit}
        defaultValues={{
          username: 'usuario',
          email: 'usuario@ejemplo.com',
          firstName: 'Juan',
          lastName: 'Pérez',
          // ... más valores por defecto
        }}
      />
    </>
  )
}`}</code>
            </pre>
          </CardContent>
        </Card>

        {/* Archivos relacionados */}
        <Card>
          <CardHeader>
            <CardTitle>Archivos Relacionados</CardTitle>
            <CardDescription>Componentes y validaciones utilizados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>
                <strong>Dialog:</strong>{' '}
                <code className="text-xs">components/dialogs/examples/user-profile-dialog.tsx</code>
              </div>
              <div>
                <strong>Formulario:</strong>{' '}
                <code className="text-xs">components/forms/examples/user-profile-form.tsx</code>
              </div>
              <div>
                <strong>Validaciones:</strong>{' '}
                <code className="text-xs">lib/validations/user-profile-validations.ts</code>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Campos del formulario */}
        <Card>
          <CardHeader>
            <CardTitle>Campos del Formulario</CardTitle>
            <CardDescription>El formulario incluye los siguientes campos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Información Básica</h3>
                <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  <li>Nombre</li>
                  <li>Apellido</li>
                  <li>Nombre de usuario</li>
                  <li>Email</li>
                  <li>Teléfono</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Información Adicional</h3>
                <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  <li>Biografía (textarea, 500 chars max)</li>
                  <li>Sitio web</li>
                  <li>Empresa</li>
                  <li>Ubicación</li>
                </ul>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <h3 className="text-sm font-medium">Preferencias</h3>
                <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  <li>Notificaciones (checkbox)</li>
                  <li>Marketing (checkbox)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog */}
      <UserProfileDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={defaultValues}
      />
    </AppLayout>
  )
}
