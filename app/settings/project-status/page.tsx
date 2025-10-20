'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { ProjectStatusDialog } from '@/components/dialogs/settings/project-status-dialog'
import { SortableStatusItem } from '@/components/settings/sortable-status-item'
import type { BadgeColor, ProjectStatus } from '@/lib/validations/project-status-validations'

export default function ProjectStatusSettingsPage() {
  const { toast } = useToast()

  // Estado
  const [statuses, setStatuses] = useState<ProjectStatus[]>([])
  const [badgeColors, setBadgeColors] = useState<BadgeColor[]>([])
  const [loading, setLoading] = useState(true)

  // Dialogs
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<ProjectStatus | null>(null)

  // Fetch data
  useEffect(() => {
    Promise.all([fetchStatuses(), fetchBadgeColors()])
      .then(() => setLoading(false))
      .catch((error) => {
        console.error('Error loading data:', error)
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los datos',
          variant: 'destructive',
        })
        setLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchStatuses = async () => {
    const response = await fetch('/api/project-status')
    const data = await response.json()
    setStatuses(data.projectStatuses)
  }

  const fetchBadgeColors = async () => {
    const response = await fetch('/api/badge-colors')
    const data = await response.json()
    setBadgeColors(data.badgeColors)
  }

  // Handlers
  const handleDelete = async () => {
    if (!selectedStatus) return

    try {
      const response = await fetch(`/api/project-status/${selectedStatus.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar el estado')
      }

      toast({
        title: 'Estado eliminado',
        description: data.message || 'El estado se eliminó correctamente',
      })

      setIsDeleteDialogOpen(false)
      setSelectedStatus(null)
      fetchStatuses()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al eliminar el estado',
        variant: 'destructive',
      })
    }
  }

  const openEditDialog = (status: ProjectStatus) => {
    setSelectedStatus(status)
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (status: ProjectStatus) => {
    setSelectedStatus(status)
    setIsDeleteDialogOpen(true)
  }

  const handleDialogSuccess = () => {
    fetchStatuses()
  }

  // Separar statuses en inicial, normales y final
  const { initialStatus, normalStatuses, finalStatus } = useMemo(() => {
    const initial = statuses.find((s) => s.isInitial)
    const final = statuses.find((s) => s.isFinal)
    const normals = statuses.filter((s) => !s.isInitial && !s.isFinal)

    return {
      initialStatus: initial,
      normalStatuses: normals,
      finalStatus: final,
    }
  }, [statuses])

  // Handler de drag and drop
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = normalStatuses.findIndex((s) => s.id === active.id)
    const newIndex = normalStatuses.findIndex((s) => s.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    // Actualizar UI optimísticamente
    const reorderedNormals = arrayMove(normalStatuses, oldIndex, newIndex)
    const newStatusesOrder = [
      ...(initialStatus ? [initialStatus] : []),
      ...reorderedNormals,
      ...(finalStatus ? [finalStatus] : []),
    ]
    setStatuses(newStatusesOrder)

    // Llamar API para persistir cambios
    try {
      const statusIds = reorderedNormals.map((s) => s.id)

      const response = await fetch('/api/project-status/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statusIds }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al reordenar los estados')
      }

      toast({
        title: 'Orden actualizado',
        description: 'Los estados se reordenaron correctamente',
      })

      // Refetch para obtener el order actualizado
      fetchStatuses()
    } catch (error) {
      // Revertir cambios en caso de error
      fetchStatuses()
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al reordenar los estados',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center p-8">Cargando...</div>
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Estados de Proyecto</CardTitle>
              <CardDescription>
                Gestiona los estados disponibles para clasificar tus proyectos
              </CardDescription>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Estado
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {statuses.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-muted-foreground text-sm">
                No hay estados configurados. Crea uno para empezar.
              </p>
            </div>
          ) : (
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext
                items={normalStatuses.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {/* Estado inicial - NO draggable */}
                  {initialStatus && (
                    <SortableStatusItem
                      status={initialStatus}
                      isDraggable={false}
                      onEdit={openEditDialog}
                      onDelete={openDeleteDialog}
                    />
                  )}

                  {/* Estados normales - SÍ draggable */}
                  {normalStatuses.map((status) => (
                    <SortableStatusItem
                      key={status.id}
                      status={status}
                      isDraggable={true}
                      onEdit={openEditDialog}
                      onDelete={openDeleteDialog}
                    />
                  ))}

                  {/* Estado final - NO draggable */}
                  {finalStatus && (
                    <SortableStatusItem
                      status={finalStatus}
                      isDraggable={false}
                      onEdit={openEditDialog}
                      onDelete={openDeleteDialog}
                    />
                  )}
                </div>
              </SortableContext>
            </DndContext>
          )}

          <div className="mt-6 rounded-lg border bg-muted/40 p-4">
            <p className="text-muted-foreground text-sm">
              💡 <strong>Nota:</strong> Los estados aquí configurados estarán disponibles al crear o
              editar proyectos. Arrastra los estados normales para reordenarlos. El estado inicial y
              final permanecen fijos.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialogs */}
      <ProjectStatusDialog
        mode="create"
        badgeColors={badgeColors}
        onSuccess={handleDialogSuccess}
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      {isEditDialogOpen && selectedStatus && (
        <ProjectStatusDialog
          mode="edit"
          status={selectedStatus}
          badgeColors={badgeColors}
          onSuccess={handleDialogSuccess}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción desactivará el estado &quot;{selectedStatus?.name}&quot;.
              {selectedStatus && selectedStatus._count.projects > 0 && (
                <span className="mt-2 block font-semibold text-destructive">
                  Atención: Este estado tiene {selectedStatus._count.projects} proyecto(s)
                  asignado(s) y no se puede eliminar.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
              disabled={selectedStatus ? selectedStatus._count.projects > 0 : false}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
