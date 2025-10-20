'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { Search, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface Payment {
  id: string
  amount: number
  currency: string
  date: string
  reference: string | null
  status: string
  customer: {
    id: string
    name: string
  }
  paymentMethod: {
    id: string
    name: string
  }
  allocations: Array<{
    id: string
    allocatedAmount: number
    project: {
      id: string
      projectNumber: string
      projectName: string | null
    }
  }>
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Filtros
  const [customerFilter, setCustomerFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const limit = 10

  const fetchPayments = async () => {
    try {
      setIsLoading(true)

      // Construir URL con query params
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })

      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter)
      }

      const response = await fetch(`/api/payments?${params.toString()}`)
      if (!response.ok) throw new Error('Error al cargar pagos')

      const data = await response.json()
      setPayments(data.payments)
      setTotalPages(data.pagination.totalPages)
      setTotal(data.pagination.total)
    } catch (error) {
      console.error('Error fetching payments:', error)
      toast.error('Error al cargar pagos')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [page, statusFilter])

  // Filtro de cliente (client-side, porque la API no tiene ese filtro directo)
  const filteredPayments = payments.filter((payment) => {
    if (!customerFilter) return true
    return payment.customer.name.toLowerCase().includes(customerFilter.toLowerCase())
  })

  const formatCurrency = (amount: number, currency: string) =>
    new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })

  return (
    <AppLayout
      pageTitle="Pagos"
      pageDescription="Lista completa de todos los pagos registrados"
      breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Pagos' }]}
    >
      <Card>
        <CardHeader>
          <CardTitle>Todos los Pagos</CardTitle>
          <CardDescription>
            {total > 0
              ? `${total} pago${total !== 1 ? 's' : ''} registrado${total !== 1 ? 's' : ''}`
              : 'No hay pagos registrados'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            {/* Buscar por cliente */}
            <div className="flex-1">
              <Label htmlFor="customerFilter">Buscar por Cliente</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="customerFilter"
                  placeholder="Nombre del cliente..."
                  value={customerFilter}
                  onChange={(e) => setCustomerFilter(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Filtro por estado */}
            <div className="w-full md:w-[200px]">
              <Label htmlFor="statusFilter">Estado</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="statusFilter">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ACTIVE">Activos</SelectItem>
                  <SelectItem value="CANCELLED">Anulados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Botón refrescar */}
            <Button variant="outline" size="icon" onClick={fetchPayments} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Tabla de Pagos */}
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">No se encontraron pagos</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Proyectos</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Referencia</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{formatDate(payment.date)}</TableCell>
                        <TableCell className="font-medium">{payment.customer.name}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {payment.allocations.map((alloc) => (
                              <div key={alloc.id} className="text-sm">
                                <span className="font-medium">{alloc.project.projectNumber}</span>
                                {alloc.project.projectName && (
                                  <span className="text-muted-foreground">
                                    {' '}
                                    - {alloc.project.projectName}
                                  </span>
                                )}
                                <span className="ml-2 text-xs text-muted-foreground">
                                  ({formatCurrency(alloc.allocatedAmount, payment.currency)})
                                </span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{payment.paymentMethod.name}</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(payment.amount, payment.currency)}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {payment.reference || <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell>
                          {payment.status === 'ACTIVE' ? (
                            <Badge variant="default" className="bg-green-600">
                              Activo
                            </Badge>
                          ) : (
                            <Badge variant="destructive">Anulado</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Página {page} de {totalPages}
                  </div>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            if (page > 1) setPage(page - 1)
                          }}
                          className={page === 1 ? 'pointer-events-none opacity-50' : ''}
                        />
                      </PaginationItem>

                      {/* Páginas */}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNumber = i + 1
                        return (
                          <PaginationItem key={pageNumber}>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault()
                                setPage(pageNumber)
                              }}
                              isActive={page === pageNumber}
                            >
                              {pageNumber}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      })}

                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            if (page < totalPages) setPage(page + 1)
                          }}
                          className={page === totalPages ? 'pointer-events-none opacity-50' : ''}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  )
}
