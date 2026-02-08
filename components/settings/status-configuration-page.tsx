'use client'

import { useState, useEffect, useMemo, type ComponentType } from 'react'
import { Plus } from 'lucide-react'
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { toast } from 'sonner'
import { GenericSortableStatusItem } from '@/components/settings/generic-sortable-status-item'
import {
  type BaseStatus,
  type BadgeColor,
  type EntityConfig,
} from '@/lib/validations/base-status-validations'

/**
 * Props para el componente de dialog de status
 * Cada tipo de entidad tendrá su propio dialog que cumple con esta interfaz
 */
export interface StatusDialogProps<T extends BaseStatus> {
  mode: 'create' | 'edit'
  status?: T
  badgeColors: BadgeColor[]
  onSuccess: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

/**
 * Props para el componente de página de configuración de status
 */
interface StatusConfigurationPageProps<T extends BaseStatus> {
  entityConfig: EntityConfig
  DialogComponent: ComponentType<StatusDialogProps<T>>
}

export function StatusConfigurationPage<T extends BaseStatus>({
  entityConfig,
  DialogComponent,
}: StatusConfigurationPageProps<T>) {
  // Estado
  const [statuses, setStatuses] = useState<T[]>([])
  const [badgeColors, setBadgeColors] = useState<BadgeColor[]>([])
  const [loading, setLoading] = useState(true)

  // Dialogs
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<T | null>(null)

  // Fetch data
  useEffect(() => {
    Promise.all([fetchStatuses(), fetchBadgeColors()])
      .then(() => setLoading(false))
      .catch((error) => {
        console.error('Error loading data:', error)
        toast.error('No se pudieron cargar los datos')
        setLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchStatuses = async () => {
    const response = await fetch(entityConfig.apiEndpoint)
    const data = await response.json()
    setStatuses(data[entityConfig.responseKey])
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
      const response = await fetch(`${entityConfig.apiEndpoint}/${selectedStatus.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar el estado')
      }

      toast.success(data.message || 'El estado se eliminó correctamente')

      setIsDeleteDialogOpen(false)
      setSelectedStatus(null)
      fetchStatuses()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar el estado')
    }
  }

  const openEditDialog = (status: T) => {
    setSelectedStatus(status)
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (status: T) => {
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

      const response = await fetch(`${entityConfig.apiEndpoint}/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statusIds }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al reordenar los estados')
      }

      toast.success('Los estados se reordenaron correctamente')

      // Refetch para obtener el order actualizado
      fetchStatuses()
    } catch (error) {
      // Revertir cambios en caso de error
      fetchStatuses()
      toast.error(error instanceof Error ? error.message : 'Error al reordenar los estados')
    }
  }

  // Obtener count del status seleccionado
  const getSelectedStatusCount = (): number => {
    if (!selectedStatus) return 0
    return selectedStatus._count[entityConfig.countField] ?? 0
  }

  if (loading) {
    return <div className="flex items-center justify-center p-8">Cargando...</div>
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{entityConfig.title}</CardTitle>
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
                    <GenericSortableStatusItem
                      status={initialStatus}
                      isDraggable={false}
                      onEdit={openEditDialog}
                      onDelete={openDeleteDialog}
                      entityConfig={entityConfig}
                    />
                  )}

                  {/* Estados normales - SÍ draggable */}
                  {normalStatuses.map((status) => (
                    <GenericSortableStatusItem
                      key={status.id}
                      status={status}
                      isDraggable={true}
                      onEdit={openEditDialog}
                      onDelete={openDeleteDialog}
                      entityConfig={entityConfig}
                    />
                  ))}

                  {/* Estado final - NO draggable */}
                  {finalStatus && (
                    <GenericSortableStatusItem
                      status={finalStatus}
                      isDraggable={false}
                      onEdit={openEditDialog}
                      onDelete={openDeleteDialog}
                      entityConfig={entityConfig}
                    />
                  )}
                </div>
              </SortableContext>
            </DndContext>
          )}

          <div className="mt-6 rounded-lg border bg-muted/40 p-4">
            <p className="text-muted-foreground text-sm">
              💡 <strong>Nota:</strong> Los estados aquí configurados estarán disponibles al crear o
              editar {entityConfig.entityNamePlural}. Arrastra los estados normales para
              reordenarlos. El estado inicial y final permanecen fijos.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialogs */}
      <DialogComponent
        mode="create"
        badgeColors={badgeColors}
        onSuccess={handleDialogSuccess}
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      {isEditDialogOpen && selectedStatus && (
        <DialogComponent
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
              {getSelectedStatusCount() > 0 && (
                <span className="mt-2 block font-semibold text-destructive">
                  Atención: Este estado tiene {getSelectedStatusCount()}{' '}
                  {getSelectedStatusCount() === 1
                    ? entityConfig.entityName
                    : entityConfig.entityNamePlural}{' '}
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
              disabled={getSelectedStatusCount() > 0}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
