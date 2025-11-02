'use client'

import * as React from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Info, Plus, Copy, FileText, Image, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

// Form Dialog imports
import { UserProfileDialog } from '@/components/dialogs/examples/user-profile-dialog'
import { useToast } from '@/hooks/use-toast'
import { type UserProfileFormValues } from '@/lib/validations/user-profile-validations'

// Project Dialog imports
import { ProjectDialog } from '@/components/dialogs/projects/project-dialog'
import { type ProjectFormData } from '@/lib/validations/project-validations'

// Scrollable Dialog imports
import {
  ScrollableDialog,
  ScrollableDialogBody,
  ScrollableDialogClose,
  ScrollableDialogContent,
  ScrollableDialogDescription,
  ScrollableDialogFooter,
  ScrollableDialogHeader,
  ScrollableDialogTitle,
  ScrollableDialogTrigger,
} from '@/components/ui/scrollable-dialog'

// Capture Dialog imports
import { CaptureDialog, useCaptureDialog } from '@/components/custom/capture-dialog'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { formatDate } from '@/lib/format'

export default function DialogsPage() {
  const { toast: showToast } = useToast()

  // ========================================
  // FORM DIALOG STATES
  // ========================================
  const [isFormDialogOpen, setIsFormDialogOpen] = React.useState(false)

  const handleFormSubmit = (data: UserProfileFormValues) => {
    console.log('Form Dialog - Datos del formulario:', data)
    showToast({
      title: 'Perfil actualizado',
      description: `Los cambios de ${data.username} se guardaron correctamente`,
    })
  }

  const formDefaultValues: Partial<UserProfileFormValues> = {
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

  // ========================================
  // PROJECT DIALOG STATES
  // ========================================
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)

  const handleCreate = async (data: ProjectFormData) => {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    console.log('Project Dialog - Nuevo Proyecto:', data)
    toast.success('Proyecto creado exitosamente', {
      description: `Proyecto "${data.projectNumber}" creado correctamente`,
    })
  }

  const handleEdit = async (data: ProjectFormData) => {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    console.log('Project Dialog - Proyecto Editado:', data)
    toast.success('Proyecto actualizado exitosamente', {
      description: `Proyecto "${data.projectNumber}" actualizado correctamente`,
    })
  }

  const mockProjectData: Partial<ProjectFormData> = {
    customerId: '',
    projectNumber: 'PROJ-001',
    projectName: 'Proyecto Demo',
    phone: '+56912345678',
    street: 'Av. Providencia 1234',
    apartment: 'Oficina 501',
    comuna: 'Providencia',
    region: 'Metropolitana de Santiago',
    date: new Date(),
    subtotal: 1000000,
    taxRate: 19,
    currency: 'CLP',
    windowsCount: 10,
    squareMeters: 50.5,
    description: 'Proyecto de ejemplo para demostración del dialog',
  }

  // ========================================
  // CAPTURE DIALOG STATES
  // ========================================
  const [openBasic, setOpenBasic] = React.useState(false)
  const [openFallback, setOpenFallback] = React.useState(false)
  const [openAdvanced, setOpenAdvanced] = React.useState(false)
  const [openCustomHook, setOpenCustomHook] = React.useState(false)

  return (
    <AppLayout
      pageTitle="Dialogs - Ejemplos Completos"
      pageDescription="Todos los tipos de dialogs del sistema: formularios, scrollables y captura de contenido"
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Ejemplos', href: '/examples' },
        { label: 'Dialogs' },
      ]}
    >
      {/* Hero Section */}
      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Sistema Completo de Dialogs</AlertTitle>
        <AlertDescription>
          Esta página consolida TODOS los ejemplos de dialogs del sistema: formularios scrollables,
          dialogs con validación de lectura, y captura de contenido como imagen.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="form-dialog" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="form-dialog">Form Dialog</TabsTrigger>
          <TabsTrigger value="project-dialog">Project Dialog</TabsTrigger>
          <TabsTrigger value="scrollable">Scrollable</TabsTrigger>
          <TabsTrigger value="capture">Capture</TabsTrigger>
        </TabsList>

        {/* ========================================
            TAB: FORM DIALOG
        ======================================== */}
        <TabsContent value="form-dialog" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dialog Scrollable con Formulario Completo</CardTitle>
              <CardDescription>
                Dialog que contiene un formulario largo con scroll interno. Header y footer siempre
                visibles.
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

              <Button onClick={() => setIsFormDialogOpen(true)}>Abrir Dialog con Formulario</Button>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Implementación</h3>
                <p className="text-sm text-muted-foreground">
                  El dialog utiliza el componente <code>ScrollArea</code> de shadcn/ui para manejar
                  el scroll interno. El formulario está separado en un componente reutilizable.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Código de ejemplo */}
          <Card>
            <CardHeader>
              <CardTitle>Código de Ejemplo</CardTitle>
              <CardDescription>Cómo usar el componente UserProfileDialog</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs">
                <code>{`'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { UserProfileDialog } from '@/components/dialogs/examples/user-profile-dialog'

export default function MyPage() {
  const [isOpen, setIsOpen] = useState(false)

  const handleSubmit = (data) => {
    console.log('Datos guardados:', data)
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
        defaultValues={{ ... }}
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
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div>
                  <strong>Dialog:</strong>{' '}
                  <code className="text-xs">
                    components/dialogs/examples/user-profile-dialog.tsx
                  </code>
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

          <UserProfileDialog
            open={isFormDialogOpen}
            onOpenChange={setIsFormDialogOpen}
            onSubmit={handleFormSubmit}
            defaultValues={formDefaultValues}
          />
        </TabsContent>

        {/* ========================================
            TAB: PROJECT DIALOG
        ======================================== */}
        <TabsContent value="project-dialog" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Dialog con ScrollArea</CardTitle>
              <CardDescription>
                Dialog scrollable para formulario de proyecto completo (15+ campos) con footer
                sticky
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Características:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Dialog con max-width 4xl para formularios anchos</li>
                  <li>ScrollArea interno para contenido largo (max-height adaptativo)</li>
                  <li>Footer sticky con botones Cancelar/Guardar siempre visibles</li>
                  <li>Submit mediante atributo HTML `form` (no imperative handle)</li>
                  <li>Validación con React Hook Form + Zod</li>
                  <li>Loading state durante submit</li>
                  <li>Toast de confirmación al guardar</li>
                  <li>Responsive: full-screen en mobile, dialog en desktop</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Crear Proyecto
                </Button>

                <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
                  Editar Proyecto (con datos)
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                💡 Tip: Abre las DevTools (F12) y ve a la pestaña Console para ver los datos del
                formulario al hacer submit.
              </p>
            </CardContent>
          </Card>

          {/* Estructura */}
          <Card>
            <CardHeader>
              <CardTitle>Estructura</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
                {`<Dialog>
  <DialogContent className="max-h-[90vh] max-w-4xl">
    <DialogHeader>Título + Descripción</DialogHeader>

    <ScrollArea className="max-h-[calc(90vh-180px)]">
      <ProjectForm
        formId="project-dialog-form"
        showSubmitButton={false}
      />
    </ScrollArea>

    <DialogFooter>
      <Button variant="outline">Cancelar</Button>
      <Button type="submit" form="project-dialog-form">
        Guardar
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>`}
              </pre>
            </CardContent>
          </Card>

          {/* Notas técnicas */}
          <Card>
            <CardHeader>
              <CardTitle>Notas Técnicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div>
                <strong className="text-foreground">
                  ¿Por qué formId en lugar de imperative handle?
                </strong>
                <p>
                  Usar el atributo HTML{' '}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">form</code> es más
                  semántico, simple y sigue las mejores prácticas de React Hook Form.
                </p>
              </div>

              <div>
                <strong className="text-foreground">¿Por qué max-w-4xl?</strong>
                <p>
                  ProjectForm tiene campos anchos (AddressFields con FormGrid, múltiples
                  comboboxes). Un ancho de 896px (4xl) proporciona mejor espacio horizontal que
                  672px (2xl).
                </p>
              </div>

              <div>
                <strong className="text-foreground">¿Cómo funciona el ScrollArea?</strong>
                <p>
                  Se calcula dinámicamente:{' '}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    max-h-[calc(90vh-180px)]
                  </code>
                  . Esto asegura que el contenido scrollea mientras el header y footer permanecen
                  fijos.
                </p>
              </div>
            </CardContent>
          </Card>

          <ProjectDialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
            onSubmit={handleCreate}
            mode="create"
          />

          <ProjectDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            onSubmit={handleEdit}
            defaultValues={mockProjectData}
            mode="edit"
          />
        </TabsContent>

        {/* ========================================
            TAB: SCROLLABLE DIALOGS
        ======================================== */}
        <TabsContent value="scrollable" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Scrollable Dialog</CardTitle>
              <CardDescription>
                Dialog con contenido scrolleable y validación opcional de lectura completa antes de
                aceptar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Casos de Uso</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Términos y condiciones (requiere scroll completo)</li>
                  <li>Facturas detalladas con muchos items</li>
                  <li>Información larga sin requisito de lectura</li>
                  <li>Políticas con threshold personalizado</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Demo 1: Dialog simple */}
          <section className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">1. Dialog Simple (sin validación)</h3>
              <p className="text-muted-foreground text-sm">
                Contenido scrolleable sin validación de lectura completa
              </p>
            </div>

            <ScrollableDialog>
              <ScrollableDialogTrigger asChild>
                <Button variant="outline">Abrir Información</Button>
              </ScrollableDialogTrigger>
              <ScrollableDialogContent>
                <ScrollableDialogHeader>
                  <ScrollableDialogTitle>Información del Producto</ScrollableDialogTitle>
                </ScrollableDialogHeader>
                <ScrollableDialogBody>
                  <ScrollableDialogDescription asChild>
                    <div className="space-y-4">
                      <p>
                        Este es un ejemplo de dialog scrolleable que no requiere que el usuario lea
                        todo el contenido antes de cerrar.
                      </p>
                      <p>
                        Es útil para mostrar información larga como descripciones de productos,
                        detalles de transacciones, o cualquier contenido que pueda exceder el alto
                        visible.
                      </p>
                      <div className="space-y-2">
                        <h4 className="font-semibold">Características:</h4>
                        <ul className="list-disc space-y-1 pl-6">
                          <li>Header fijo en la parte superior</li>
                          <li>Contenido scrolleable en el medio</li>
                          <li>Footer fijo en la parte inferior</li>
                          <li>Sin validación de scroll</li>
                        </ul>
                      </div>
                    </div>
                  </ScrollableDialogDescription>
                </ScrollableDialogBody>
                <ScrollableDialogFooter>
                  <ScrollableDialogClose asChild>
                    <Button>Cerrar</Button>
                  </ScrollableDialogClose>
                </ScrollableDialogFooter>
              </ScrollableDialogContent>
            </ScrollableDialog>
          </section>

          <Separator />

          {/* Demo 2: Terms & Conditions */}
          <section className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">2. Términos y Condiciones</h3>
              <p className="text-muted-foreground text-sm">
                Requiere scrollear hasta el final antes de aceptar (threshold 99%)
              </p>
            </div>

            <ScrollableDialog>
              <ScrollableDialogTrigger asChild>
                <Button variant="outline">Ver Términos y Condiciones</Button>
              </ScrollableDialogTrigger>
              <ScrollableDialogContent requireScrollToBottom>
                <ScrollableDialogHeader>
                  <ScrollableDialogTitle>Términos y Condiciones</ScrollableDialogTitle>
                </ScrollableDialogHeader>
                <ScrollableDialogBody>
                  <ScrollableDialogDescription asChild>
                    <div className="space-y-4 [&_strong]:font-semibold [&_strong]:text-foreground">
                      <div className="space-y-1">
                        <p>
                          <strong>Aceptación de Términos</strong>
                        </p>
                        <p>
                          Al acceder y utilizar este sitio web, los usuarios aceptan cumplir y estar
                          sujetos a estos Términos de Servicio.
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p>
                          <strong>Responsabilidades de la Cuenta de Usuario</strong>
                        </p>
                        <p>
                          Los usuarios son responsables de mantener la confidencialidad de sus
                          credenciales de cuenta.
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p>
                          <strong>Uso de Contenido y Restricciones</strong>
                        </p>
                        <p>
                          El sitio web y su contenido original están protegidos por leyes de
                          propiedad intelectual.
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p>
                          <strong>Limitación de Responsabilidad</strong>
                        </p>
                        <p>El sitio web proporciona contenido "tal cual" sin garantías.</p>
                      </div>
                    </div>
                  </ScrollableDialogDescription>
                </ScrollableDialogBody>
                <ScrollableDialogFooter disableUntilScrolled>
                  <ScrollableDialogClose asChild>
                    <Button variant="outline">Cancelar</Button>
                  </ScrollableDialogClose>
                  <ScrollableDialogClose asChild>
                    <Button>Acepto</Button>
                  </ScrollableDialogClose>
                </ScrollableDialogFooter>
              </ScrollableDialogContent>
            </ScrollableDialog>
          </section>

          <Separator />

          {/* Demo 3: Payment Invoice */}
          <section className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">3. Factura de Pago Detallada</h3>
              <p className="text-muted-foreground text-sm">
                Dialog con muchos items, requiere scroll para confirmar
              </p>
            </div>

            <ScrollableDialog>
              <ScrollableDialogTrigger asChild>
                <Button variant="outline">Ver Factura Detallada</Button>
              </ScrollableDialogTrigger>
              <ScrollableDialogContent
                requireScrollToBottom
                scrollMessage="Revisa todos los items antes de confirmar el pago."
              >
                <ScrollableDialogHeader>
                  <ScrollableDialogTitle>Factura #12345</ScrollableDialogTitle>
                </ScrollableDialogHeader>
                <ScrollableDialogBody>
                  <div className="space-y-6">
                    <div>
                      <h4 className="mb-2 font-semibold">Cliente</h4>
                      <p className="text-sm">Juan Pérez</p>
                      <p className="text-muted-foreground text-sm">juan.perez@example.com</p>
                    </div>

                    <div>
                      <h4 className="mb-2 font-semibold">Items</h4>
                      <div className="space-y-2">
                        {Array.from({ length: 10 }, (_, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between border-b pb-2 text-sm"
                          >
                            <div>
                              <p className="font-medium">Producto {i + 1}</p>
                              <p className="text-muted-foreground text-xs">
                                Código: PROD-{String(i + 1).padStart(3, '0')}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">
                                ${((i + 1) * 100).toLocaleString('es-CL')}
                              </p>
                              <p className="text-muted-foreground text-xs">x{i + 1} unidades</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span className="font-medium">$5,500</span>
                        </div>
                        <div className="flex justify-between">
                          <span>IVA (19%):</span>
                          <span className="font-medium">$1,045</span>
                        </div>
                        <div className="flex justify-between border-t pt-2 text-base">
                          <span className="font-semibold">Total:</span>
                          <span className="font-semibold">$6,545</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollableDialogBody>
                <ScrollableDialogFooter disableUntilScrolled>
                  <ScrollableDialogClose asChild>
                    <Button variant="outline">Cancelar</Button>
                  </ScrollableDialogClose>
                  <ScrollableDialogClose asChild>
                    <Button>Confirmar Pago</Button>
                  </ScrollableDialogClose>
                </ScrollableDialogFooter>
              </ScrollableDialogContent>
            </ScrollableDialog>
          </section>

          {/* API Reference */}
          <Card>
            <CardHeader>
              <CardTitle>API Reference</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <h4 className="font-semibold">Props Principales:</h4>
                <ul className="list-disc space-y-1 pl-6">
                  <li>
                    <code className="text-xs">requireScrollToBottom</code>: Si es true, requiere
                    scroll completo (default: false)
                  </li>
                  <li>
                    <code className="text-xs">scrollThreshold</code>: Porcentaje de scroll necesario
                    0-1 (default: 0.99)
                  </li>
                  <li>
                    <code className="text-xs">scrollMessage</code>: Mensaje mostrado en footer
                  </li>
                  <li>
                    <code className="text-xs">disableUntilScrolled</code>: Deshabilita botones hasta
                    completar scroll
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================
            TAB: CAPTURE DIALOGS
        ======================================== */}
        <TabsContent value="capture" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>CaptureDialog Component</CardTitle>
              <CardDescription>
                Dialog que permite capturar su contenido como imagen PNG y copiarlo al portapapeles.
                Incluye fallback inteligente a texto plano si falla la captura.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Experimental</Badge>
                <span className="text-sm text-muted-foreground">
                  Validar con ≥3 casos reales antes de marcar como estable
                </span>
              </div>
              <div className="text-sm">
                <strong>Ubicación:</strong>{' '}
                <code className="bg-muted px-1.5 py-0.5 rounded">
                  components/custom/capture-dialog/
                </code>
              </div>
            </CardContent>
          </Card>

          {/* Ejemplo 1: Básico */}
          <section className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Image className="h-5 w-5" alt="" />
                1. Uso Básico (Zero Config)
              </h3>
              <p className="text-muted-foreground text-sm">
                CaptureDialog con configuración mínima. El fallback se extrae automáticamente del
                DOM.
              </p>
            </div>

            <Button onClick={() => setOpenBasic(true)}>Abrir Dialog Básico</Button>

            <CaptureDialog
              open={openBasic}
              onOpenChange={setOpenBasic}
              title="Resumen de Proyecto - Básico"
            >
              <div className="bg-capture-bg text-capture-foreground p-6 space-y-4">
                <div className="border-b border-capture-border pb-2">
                  <h2 className="text-xl font-semibold">RESUMEN DE PROYECTO</h2>
                  <p className="text-sm text-capture-foreground/70">
                    {formatDate(new Date(), 'short')}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Proyecto:</span>
                    <span>P 0001-2025</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Cliente:</span>
                    <span>Acme Corporation</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Total:</span>
                    <span className="font-bold">$1,500,000 CLP</span>
                  </div>
                </div>
              </div>
            </CaptureDialog>
          </section>

          <Separator />

          {/* Ejemplo 2: Con Fallback Custom */}
          <section className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5" />
                2. Con Fallback Custom
              </h3>
              <p className="text-muted-foreground text-sm">
                Provee función <code>getFallbackText</code> para generar texto profesional si falla
                la imagen.
              </p>
            </div>

            <Button onClick={() => setOpenFallback(true)}>Abrir Dialog con Fallback</Button>

            <CaptureDialog
              open={openFallback}
              onOpenChange={setOpenFallback}
              title="Estado de Cuenta"
              getFallbackText={() =>
                `
ESTADO DE CUENTA
Fecha: ${formatDate(new Date(), 'short')}

Proyecto: P 0042-2025
Cliente: Tech Solutions Inc.
Descripción: Sistema de gestión empresarial

RESUMEN FINANCIERO
Total Proyecto: $5,250,000 CLP
Total Pagado: $3,150,000 CLP
Saldo Pendiente: $2,100,000 CLP
Porcentaje Pagado: 60%

Estado: En Proceso ✓
              `.trim()
              }
            >
              <div className="bg-capture-bg text-capture-foreground p-6 space-y-4">
                <div className="border-b border-capture-border pb-2">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">ESTADO DE CUENTA</h2>
                    <span className="text-sm">{formatDate(new Date(), 'short')}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold mb-2">Información del Proyecto</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-capture-foreground/70">Proyecto:</span>
                        <span className="font-medium">P 0042-2025</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-capture-foreground/70">Cliente:</span>
                        <span className="font-medium">Tech Solutions Inc.</span>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-capture-border" />

                  <div>
                    <h3 className="font-semibold mb-2">Resumen Financiero</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-capture-foreground/70">Total Proyecto:</span>
                        <span className="font-bold text-lg">$5,250,000 CLP</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-capture-foreground/70">Total Pagado:</span>
                        <span className="font-semibold text-capture-green">$3,150,000 CLP</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-capture-foreground/70">Saldo Pendiente:</span>
                        <span className="font-semibold text-capture-orange">$2,100,000 CLP</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CaptureDialog>
          </section>

          <Separator />

          {/* Ejemplo 3: Con Callbacks */}
          <section className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">3. Con Callbacks de Success/Error</h3>
              <p className="text-muted-foreground text-sm">
                Usa <code>onCopySuccess</code> y <code>onCopyError</code> para tracking, analytics,
                etc.
              </p>
            </div>

            <Button onClick={() => setOpenAdvanced(true)}>Abrir Dialog con Callbacks</Button>

            <CaptureDialog
              open={openAdvanced}
              onOpenChange={setOpenAdvanced}
              title="Reporte Técnico"
              onCopySuccess={() => {
                console.log('✅ Imagen copiada exitosamente')
              }}
              onCopyError={(error) => {
                console.error('❌ Error al copiar:', error)
              }}
            >
              <div className="bg-capture-bg text-capture-foreground p-6">
                <h3 className="text-lg font-bold mb-4">REPORTE TÉCNICO</h3>
                <p className="text-sm">
                  Este dialog incluye callbacks de éxito/error. Abre la consola del navegador para
                  ver los logs.
                </p>
                <div className="mt-4 p-4 bg-capture-card rounded">
                  <code className="text-xs">console.log(copiedSuccessfully)</code>
                </div>
              </div>
            </CaptureDialog>
          </section>

          <Separator />

          {/* Ejemplo 4: Usando Solo el Hook */}
          <section className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">4. Usando Solo el Hook (useCaptureDialog)</h3>
              <p className="text-muted-foreground text-sm">
                Para casos donde necesitas usar la lógica en un dialog custom
              </p>
            </div>

            <Button onClick={() => setOpenCustomHook(true)}>Abrir Dialog Custom (Solo Hook)</Button>

            <CustomDialogWithHook open={openCustomHook} onOpenChange={setOpenCustomHook} />
          </section>

          {/* Documentación */}
          <Card>
            <CardHeader>
              <CardTitle>Documentación Completa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm space-y-1">
                <div>
                  <strong>README:</strong>{' '}
                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                    components/custom/capture-dialog/README.md
                  </code>
                </div>
                <div>
                  <strong>ADR:</strong>{' '}
                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                    docs/template/decisions/011-capture-dialog-pattern.md
                  </code>
                </div>
                <div>
                  <strong>Patterns:</strong>{' '}
                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                    docs/template/methodology/patterns.md#9-patrón-de-captura-de-diálogos
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  )
}

/**
 * Componente que usa solo el hook useCaptureDialog
 * Ejemplo de uso en dialog custom (AlertDialog)
 */
function CustomDialogWithHook({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { contentRef, handleCopy, isCopying } = useCaptureDialog({
    getFallbackText: () =>
      `
DIALOG CUSTOM CON HOOK
Este dialog usa solo el hook useCaptureDialog,
sin el wrapper <CaptureDialog>.

Fecha: ${formatDate(new Date(), 'short')}
    `.trim(),
  })

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogTrigger asChild>
        <span />
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Dialog Custom (Solo Hook)</AlertDialogTitle>
        </AlertDialogHeader>

        <div className="flex justify-end">
          <Button onClick={handleCopy} disabled={isCopying} size="sm" variant="outline">
            {isCopying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Copiando...
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copiar Contenido
              </>
            )}
          </Button>
        </div>

        <div ref={contentRef} className="bg-capture-bg text-capture-foreground p-4 rounded">
          <h3 className="font-bold mb-2">DIALOG CUSTOM CON HOOK</h3>
          <p className="text-sm mb-4">
            Este dialog usa <code className="bg-capture-card px-1 py-0.5">useCaptureDialog</code>{' '}
            directamente, sin el wrapper <code>{'<CaptureDialog>'}</code>.
          </p>
          <div className="text-xs text-capture-foreground/70">
            Fecha: {formatDate(new Date(), 'short')}
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
