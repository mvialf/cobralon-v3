'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

  // Handlers
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
            <CardTitle>Métodos de Pago</CardTitle>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Método
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {methods.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No hay métodos de pago configurados
                  </TableCell>
                </TableRow>
              ) : (
                methods.map((method) => (
                  <TableRow key={method.id}>
                    <TableCell className="font-medium">{method.name}</TableCell>
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
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(method)}
                        >
                          {method.active ? 'Desactivar' : 'Activar'}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(method)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(method)}
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
                ))
              )}
            </TableBody>
          </Table>
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
