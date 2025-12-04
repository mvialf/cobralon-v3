'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, Pencil, Trash2, CheckCircle, XCircle, GripVertical } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { PaymentMethodDialog } from '@/components/dialogs/settings/payment-method-dialog'
import type { PaymentMethod } from '@/lib/validations/payment-method-validations'

// Componente de fila sortable
interface SortableRowProps {
  method: PaymentMethod
  onToggle: (method: PaymentMethod) => void
  onEdit: (method: PaymentMethod) => void
  onDelete: (method: PaymentMethod) => void
}

function SortablePaymentMethodRow({ method, onToggle, onEdit, onDelete }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: method.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <TableRow ref={setNodeRef} style={style} {...attributes}>
      {/* Drag Handle */}
      <TableCell {...listeners} className="w-[40px] cursor-grab active:cursor-grabbing">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </TableCell>

      {/* Nombre */}
      <TableCell className="font-medium">{method.name}</TableCell>

      {/* Estado */}
      <TableCell>
        {method.active ? (
          <Badge variant="default" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Activo
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1">
            <XCircle className="h-3 w-3" />
            Inactivo
          </Badge>
        )}
      </TableCell>

      {/* Acciones */}
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => onToggle(method)}>
            {method.active ? 'Desactivar' : 'Activar'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onEdit(method)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(method)}
            disabled={method._count.payments > 0}
            title={
              method._count.payments > 0
                ? `No se puede eliminar (${method._count.payments} pagos asociados)`
                : ''
            }
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

export default function PaymentMethodsSettingsPage() {
  const { toast } = useToast()

  // Estado
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)

  // Dialogs
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)

  // Sensors para drag & drop (soporte mouse, touch y teclado)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Prevenir drag accidental
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // IDs para SortableContext
  const methodIds = useMemo(() => methods.map((m) => m.id), [methods])

  // Fetch data
  useEffect(() => {
    fetchMethods()
      .then(() => setLoading(false))
      .catch((error) => {
        console.error('Error loading data:', error)
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los métodos de pago',
          variant: 'destructive',
        })
        setLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchMethods = async () => {
    const response = await fetch('/api/payment-methods')
    const data = await response.json()
    setMethods(data.paymentMethods || [])
  }

  // Handler para drag & drop
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = methods.findIndex((m) => m.id === active.id)
    const newIndex = methods.findIndex((m) => m.id === over.id)

    // Update optimista de UI
    const reorderedMethods = arrayMove(methods, oldIndex, newIndex)
    setMethods(reorderedMethods)

    try {
      // Llamar API con nuevos IDs ordenados
      const response = await fetch('/api/payment-methods/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderedIds: reorderedMethods.map((m) => m.id),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al reordenar')
      }

      toast({
        title: 'Orden actualizado',
        description: data.message || 'El orden se actualizó correctamente',
      })
    } catch (error) {
      // Revertir en caso de error
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al actualizar el orden',
        variant: 'destructive',
      })
      // Refetch para restaurar orden correcto
      fetchMethods()
    }
  }

  // Handlers existentes
  const handleDelete = async () => {
    if (!selectedMethod) return

    try {
      const response = await fetch(`/api/payment-methods/${selectedMethod.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar el método de pago')
      }

      toast({
        title: 'Método eliminado',
        description: data.message || 'El método de pago se eliminó correctamente',
      })

      setIsDeleteDialogOpen(false)
      setSelectedMethod(null)
      fetchMethods()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al eliminar el método de pago',
        variant: 'destructive',
      })
    }
  }

  const handleToggleActive = async (method: PaymentMethod) => {
    try {
      const response = await fetch(`/api/payment-methods/${method.id}/toggle`, {
        method: 'PATCH',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al cambiar el estado')
      }

      toast({
        title: method.active ? 'Método desactivado' : 'Método activado',
        description: `El método "${method.name}" ahora está ${method.active ? 'desactivado' : 'activado'}`,
      })

      fetchMethods()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al cambiar el estado',
        variant: 'destructive',
      })
    }
  }

  const openEditDialog = (method: PaymentMethod) => {
    setSelectedMethod(method)
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (method: PaymentMethod) => {
    setSelectedMethod(method)
    setIsDeleteDialogOpen(true)
  }

  const handleDialogSuccess = () => {
    fetchMethods()
  }

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Métodos de Pago</CardTitle>
              <CardDescription>
                Configura los métodos de pago disponibles. Arrastra para cambiar el orden (el primer
                método activo será el predeterminado).
              </CardDescription>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Método
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {methods.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No hay métodos de pago configurados
                    </TableCell>
                  </TableRow>
                ) : (
                  <SortableContext items={methodIds} strategy={verticalListSortingStrategy}>
                    {methods.map((method) => (
                      <SortablePaymentMethodRow
                        key={method.id}
                        method={method}
                        onToggle={handleToggleActive}
                        onEdit={openEditDialog}
                        onDelete={openDeleteDialog}
                      />
                    ))}
                  </SortableContext>
                )}
              </TableBody>
            </Table>
          </DndContext>
        </CardContent>
      </Card>

      {/* Dialog Create */}
      <PaymentMethodDialog
        mode="create"
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleDialogSuccess}
      />

      {/* Dialog Edit */}
      {isEditDialogOpen && selectedMethod && (
        <PaymentMethodDialog
          mode="edit"
          method={selectedMethod}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSuccess={handleDialogSuccess}
        />
      )}

      {/* Dialog Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El método de pago &quot;{selectedMethod?.name}&quot;
              será eliminado permanentemente.
              {selectedMethod?._count && selectedMethod._count.payments > 0 && (
                <span className="mt-2 block text-destructive">
                  Este método tiene {selectedMethod._count.payments} pago(s) asociado(s).
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
