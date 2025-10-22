'use client'

import * as React from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ProjectDialog } from '@/components/dialogs/projects/project-dialog'
import { type ProjectFormData } from '@/lib/validations/project-validations'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'

export default function ProjectDialogPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)

  const handleCreate = async (data: ProjectFormData) => {
    // Simular API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    console.log('📝 Nuevo Proyecto:', data)

    toast.success('Proyecto creado exitosamente', {
      description: `Proyecto "${data.projectNumber}" creado correctamente`,
    })
  }

  const handleEdit = async (data: ProjectFormData) => {
    // Simular API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    console.log('✏️ Proyecto Editado:', data)

    toast.success('Proyecto actualizado exitosamente', {
      description: `Proyecto "${data.projectNumber}" actualizado correctamente`,
    })
  }

  // Valores por defecto para edición (simulados)
  const mockProjectData: Partial<ProjectFormData> = {
    customerId: '', // Se llenará con el combobox
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

  return (
    <AppLayout
      pageTitle="Project Dialog Demo"
      pageDescription="Ejemplo de dialog scrollable con formulario de proyecto"
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Ejemplos', href: '/examples' },
        { label: 'Project Dialog' },
      ]}
    >
      <div className="space-y-6">
        {/* Card de introducción */}
        <Card>
          <CardHeader>
            <CardTitle>Project Dialog con ScrollArea</CardTitle>
            <CardDescription>
              Este componente demuestra cómo usar ProjectForm dentro de un Dialog scrollable con
              footer sticky. El formulario es largo (15+ campos) y el ScrollArea permite scroll
              mientras los botones permanecen siempre visibles.
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

            <div>
              <h3 className="text-sm font-medium mb-2">Estructura:</h3>
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
            </div>
          </CardContent>
        </Card>

        {/* Botones de demo */}
        <Card>
          <CardHeader>
            <CardTitle>Demos Interactivas</CardTitle>
            <CardDescription>
              Abre los dialogs para probar la funcionalidad. Revisa la consola del navegador para
              ver los datos del formulario.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
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
                <code className="text-xs bg-muted px-1 py-0.5 rounded">form</code> es más semántico,
                simple y sigue las mejores prácticas de React Hook Form. Los imperative handles
                están pensados para casos como focus programático o scroll, NO para submit de
                formularios.
              </p>
            </div>

            <div>
              <strong className="text-foreground">¿Por qué max-w-4xl?</strong>
              <p>
                ProjectForm tiene campos anchos (AddressFields con FormGrid, múltiples comboboxes).
                Un ancho de 896px (4xl) proporciona mejor espacio horizontal que 672px (2xl) sin ser
                demasiado grande.
              </p>
            </div>

            <div>
              <strong className="text-foreground">¿Cómo funciona el ScrollArea?</strong>
              <p>
                Se calcula dinámicamente:{' '}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  max-h-[calc(90vh-180px)]
                </code>
                . Esto asegura que el contenido scrollea mientras el header (DialogHeader) y footer
                (DialogFooter) permanecen fijos. Los 180px son aproximadamente header (~80px) +
                footer (~100px).
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
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
    </AppLayout>
  )
}
