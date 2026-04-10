'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, CheckCircle, XCircle } from 'lucide-react'
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
import { toast } from 'sonner'
import { AdjustmentReasonDialog } from '@/components/dialogs/settings/adjustment-reason-dialog'
import type { AdjustmentReason } from '@/lib/validations/adjustment-reason-validations'

function WarningLevelBadge({ level }: { level: string }) {
  switch (level) {
    case 'critical':
      return <Badge variant="destructive">Critico</Badge>
    case 'caution':
      return <Badge variant="warning">Precaucion</Badge>
    default:
      return <Badge variant="secondary">Ninguno</Badge>
  }
}

export default function AdjustmentReasonsSettingsPage() {
  const [reasons, setReasons] = useState<AdjustmentReason[]>([])
  const [loading, setLoading] = useState(true)

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedReason, setSelectedReason] = useState<AdjustmentReason | null>(null)

  useEffect(() => {
    fetchReasons()
      .then(() => setLoading(false))
      .catch((error) => {
        console.error('Error loading data:', error)
        toast.error('No se pudieron cargar las razones de ajuste')
        setLoading(false)
      })
  }, [])

  const fetchReasons = async () => {
    const response = await fetch('/api/adjustment-reasons')
    const data = await response.json()
    setReasons(data.adjustmentReasons || [])
  }

  const handleDelete = async () => {
    if (!selectedReason) return

    try {
      const response = await fetch(`/api/adjustment-reasons/${selectedReason.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar')
      }

      toast.success(data.message || 'Razón eliminada correctamente')
      setIsDeleteDialogOpen(false)
      setSelectedReason(null)
      fetchReasons()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar')
    }
  }

  const handleDialogSuccess = () => {
    fetchReasons()
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
              <CardTitle>Razones de Ajuste</CardTitle>
              <CardDescription>
                Configura las razones disponibles al aplicar ajustes a proyectos. El nivel de
                advertencia indica el impacto en el historial del cliente.
              </CardDescription>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Razon
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Nivel de Advertencia</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reasons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No hay razones de ajuste configuradas
                  </TableCell>
                </TableRow>
              ) : (
                reasons.map((reason) => (
                  <TableRow key={reason.id}>
                    <TableCell className="font-medium">{reason.name}</TableCell>
                    <TableCell>
                      <WarningLevelBadge level={reason.warningLevel} />
                    </TableCell>
                    <TableCell>
                      {reason.isActive ? (
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
                          onClick={() => {
                            setSelectedReason(reason)
                            setIsEditDialogOpen(true)
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedReason(reason)
                            setIsDeleteDialogOpen(true)
                          }}
                          disabled={reason._count.adjustments > 0}
                          title={
                            reason._count.adjustments > 0
                              ? `No se puede eliminar (${reason._count.adjustments} ajustes asociados)`
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
      <AdjustmentReasonDialog
        mode="create"
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleDialogSuccess}
      />

      {/* Dialog Edit */}
      {isEditDialogOpen && selectedReason && (
        <AdjustmentReasonDialog
          mode="edit"
          reason={selectedReason}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSuccess={handleDialogSuccess}
        />
      )}

      {/* Dialog Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar razon de ajuste?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. La razon &quot;{selectedReason?.name}&quot; sera
              eliminada permanentemente.
              {selectedReason?._count && selectedReason._count.adjustments > 0 && (
                <span className="mt-2 block text-destructive">
                  Esta razon tiene {selectedReason._count.adjustments} ajuste(s) asociado(s).
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
