'use client'

import { useState, useEffect, useMemo } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/data-table'
import { createColumns, type Installment } from './columns'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

export default function InstallmentsPage() {
  const [installments, setInstallments] = useState<Installment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchInstallments = async () => {
    try {
      setIsLoading(true)

      // Fetch con límite alto para paginación client-side
      const response = await fetch('/api/installments?limit=1000')
      if (!response.ok) throw new Error('Error al cargar cuotas')

      const data = await response.json()
      setInstallments(data.installments)
    } catch (error) {
      console.error('Error fetching installments:', error)
      toast.error('Error al cargar cuotas')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInstallments()
  }, [])

  const columns = useMemo(
    () =>
      createColumns({
        onInstallmentUpdated: fetchInstallments,
      }),
    []
  )

  // Obtener estadísticas
  const stats = useMemo(() => {
    const total = installments.length
    const pending = installments.filter((i) => i.status === 'pending').length
    const paid = installments.filter((i) => i.status === 'paid').length

    // Calcular montos totales
    const totalPending = installments
      .filter((i) => i.status === 'pending')
      .reduce((sum, i) => sum + i.amount, 0)

    const totalPaid = installments
      .filter((i) => i.status === 'paid')
      .reduce((sum, i) => sum + i.amount, 0)

    // Cuotas vencidas (pending y dueDate < hoy)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const overdue = installments.filter((i) => {
      if (i.status !== 'pending') return false
      const dueDate = new Date(i.dueDate)
      dueDate.setHours(0, 0, 0, 0)
      return dueDate < today
    }).length

    return {
      total,
      pending,
      paid,
      overdue,
      totalPending,
      totalPaid,
    }
  }, [installments])

  // Filtros para DataTable
  const statusOptions = [
    { label: 'Pendiente', value: 'pending' },
    { label: 'Pagado', value: 'paid' },
  ]

  return (
    <AppLayout
      pageTitle="Cuotas Comercio"
      pageDescription="Vista global de todas las cuotas de pagos en cuotas sin interés"
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Pagos', href: '/payments' },
        { label: 'Cuotas Comercio' },
      ]}
    >
      {/* Cards de estadísticas */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Cuotas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {new Intl.NumberFormat('es-CL', {
                style: 'currency',
                currency: 'CLP',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(stats.totalPending)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vencidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <p className="text-xs text-muted-foreground mt-1">Requieren atención</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pagadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {new Intl.NumberFormat('es-CL', {
                style: 'currency',
                currency: 'CLP',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(stats.totalPaid)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* DataTable */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Todas las Cuotas</CardTitle>
              <CardDescription>
                {installments.length > 0
                  ? `${installments.length} cuota${installments.length !== 1 ? 's' : ''} registrada${installments.length !== 1 ? 's' : ''}`
                  : 'No hay cuotas registradas'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={installments}
              searchKey="customerName"
              searchPlaceholder="Buscar por cliente..."
              filterableColumns={[
                {
                  id: 'status',
                  title: 'Estado',
                  options: statusOptions,
                },
              ]}
            />
          )}
        </CardContent>
      </Card>
    </AppLayout>
  )
}
