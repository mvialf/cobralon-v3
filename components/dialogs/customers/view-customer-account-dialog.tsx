'use client'

import { useCallback, useEffect, useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Label } from '@/components/ui/label'
import { PercentageInput } from '@/components/ui/percentage-input'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { CaptureDialog } from '@/components/custom/capture-dialog'
import { CustomerAccountSummaryCard } from '@/components/summarys/customer-account-summary-card'
import { CustomerAccountProjectsTable } from '@/components/tables/customer-account-projects-table'
import { CustomerAccountPaymentsTable } from '@/components/tables/customer-account-payments-table'
import {
  consolidateCustomerPayments,
  calculateAccountSummary,
  calculatePaymentRequest,
  filterProjectsWithPendingBalance,
  type RequestMode,
  type SelectedProject,
} from '@/lib/transformers/customer-account-transformers'
import type { PaymentFromAPI } from '@/lib/types/payment.types'
import { formatCurrency, formatDate } from '@/lib/format'
import { AlertCircle, Zap } from 'lucide-react'

interface ViewCustomerAccountDialogProps {
  customerId: string
  customerName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface CustomerAccountData {
  customer: { id: string; name: string }
  projects: SelectedProject[]
}

/**
 * Dialog para generar estado de cuenta de cliente (multi-proyecto)
 *
 * Dos modos:
 * 1. Selección de proyectos: Lista con checkboxes + botón "Auto pendientes"
 * 2. Estado de cuenta: CaptureDialog con resumen y tablas
 */
export function ViewCustomerAccountDialog({
  customerId,
  customerName,
  open,
  onOpenChange,
}: ViewCustomerAccountDialogProps) {
  // Estado de datos
  const [accountData, setAccountData] = useState<CustomerAccountData | null>(null)
  const [payments, setPayments] = useState<PaymentFromAPI[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingPayments, setIsLoadingPayments] = useState(false)

  // Estado de selección
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set())
  const [requestMode, setRequestMode] = useState<RequestMode>('full')
  const [requestPercentage, setRequestPercentage] = useState(30)
  const [fixedRequestAmount, setFixedRequestAmount] = useState<number | null>(null)

  // Estado de modo (selección vs capture)
  const [showCapture, setShowCapture] = useState(false)

  // Cargar datos del cliente y sus proyectos
  const fetchAccountData = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/customers/${customerId}/account`)

      if (!response.ok) {
        throw new Error('Error al cargar datos del cliente')
      }

      const data: CustomerAccountData = await response.json()
      setAccountData(data)

      // Pre-seleccionar todos los proyectos por defecto
      setSelectedProjectIds(new Set(data.projects.map((p) => p.id)))
    } catch (error) {
      console.error('Error fetching customer account:', error)
    } finally {
      setIsLoading(false)
    }
  }, [customerId])

  // Cargar pagos del cliente
  const fetchPayments = useCallback(async () => {
    try {
      setIsLoadingPayments(true)
      const response = await fetch(`/api/payments?customerId=${customerId}&limit=100`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Error response:', response.status, errorText)
        throw new Error(`Error al cargar pagos: ${response.status}`)
      }

      const data = await response.json()
      setPayments(data.payments || [])
    } catch (error) {
      console.error('Error fetching payments:', error)
      // No bloquear si falla la carga de pagos - mostrar lista vacía
      setPayments([])
    } finally {
      setIsLoadingPayments(false)
    }
  }, [customerId])

  // Cargar datos al abrir el dialog
  useEffect(() => {
    if (open && customerId) {
      fetchAccountData()
      fetchPayments()
    }
  }, [open, customerId, fetchAccountData, fetchPayments])

  // Reset al cerrar
  useEffect(() => {
    if (!open) {
      setShowCapture(false)
      setSelectedProjectIds(new Set())
      setRequestMode('full')
      setRequestPercentage(30)
      setFixedRequestAmount(null)
    }
  }, [open])

  // Proyectos seleccionados
  const selectedProjects = useMemo(() => {
    if (!accountData) return []
    return accountData.projects.filter((p) => selectedProjectIds.has(p.id))
  }, [accountData, selectedProjectIds])

  // Pagos consolidados
  const consolidatedPayments = useMemo(() => {
    if (selectedProjectIds.size === 0) return []
    return consolidateCustomerPayments(payments, Array.from(selectedProjectIds))
  }, [payments, selectedProjectIds])

  // Resumen calculado
  const summary = useMemo(() => {
    if (selectedProjects.length === 0) {
      return { totalProjects: 0, totalPaid: 0, balance: 0, currency: 'CLP' }
    }
    return calculateAccountSummary(selectedProjects, consolidatedPayments)
  }, [selectedProjects, consolidatedPayments])

  const paymentRequest = useMemo(() => {
    return calculatePaymentRequest(selectedProjects, {
      mode: requestMode,
      percentage: requestPercentage,
      fixedAmount: fixedRequestAmount ?? 0,
    })
  }, [selectedProjects, requestMode, requestPercentage, fixedRequestAmount])

  // Handlers
  const handleToggleProject = (projectId: string) => {
    setSelectedProjectIds((prev) => {
      const next = new Set(prev)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    if (!accountData) return
    setSelectedProjectIds(new Set(accountData.projects.map((p) => p.id)))
  }

  const handleSelectNone = () => {
    setSelectedProjectIds(new Set())
  }

  const handleAutoPending = () => {
    if (!accountData) return
    const pending = filterProjectsWithPendingBalance(accountData.projects)
    setSelectedProjectIds(new Set(pending.map((p) => p.id)))
  }

  const handleGenerateStatement = () => {
    if (!paymentRequest.isValid) return
    setShowCapture(true)
  }

  const handleCloseCapture = () => {
    setShowCapture(false)
  }

  // Render loading state
  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Estado de Cuenta</DialogTitle>
            <DialogDescription>Cargando datos del cliente...</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Render CaptureDialog (modo estado de cuenta)
  if (showCapture) {
    return (
      <CaptureDialog
        open={showCapture}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            handleCloseCapture()
          }
        }}
        title="Estado de Cuenta"
        className="max-w-3xl p-0 max-h-[90vh] overflow-y-auto gap-0"
        isLoading={isLoadingPayments}
        getFallbackText={() => {
          return `
ESTADO DE CUENTA
Cliente: ${customerName}
Fecha: ${formatDate(new Date(), 'short')}

Proyectos: ${formatCurrency(summary.totalProjects, summary.currency)}
Abonos: ${formatCurrency(summary.totalPaid, summary.currency)}
Saldo: ${formatCurrency(summary.balance, summary.currency)}
Monto solicitado: ${formatCurrency(paymentRequest.requestedTotal, summary.currency)}

Proyectos incluidos:
${paymentRequest.projects
  .map(
    (p) =>
      `- P-${p.projectNumber}: saldo ${formatCurrency(p.balance, summary.currency)} / solicitar ${formatCurrency(p.requestedAmount, summary.currency)}`
  )
  .join('\n')}
          `.trim()
        }}
      >
        <div className="text-xl font-semibold text-capture-foreground px-4 py-2">
          {/* Header */}
          <div className="px-4">
            <div className="flex items-center justify-between text-capture-foreground">
              <span className="whitespace-nowrap">ESTADO DE CUENTA</span>
              <span className="text-xs font-normal whitespace-nowrap">
                {formatDate(new Date(), 'short')}
              </span>
            </div>
          </div>

          {/* Nombre del cliente */}
          <div className="px-4 py-2 border-b border-t border-capture-border">
            <p className="text-lg font-medium text-capture-foreground">{customerName}</p>
          </div>

          {/* Contenido */}
          <div className="space-y-4 py-4 px-4">
            {/* Cards de resumen */}
            <CustomerAccountSummaryCard
              totalProjects={summary.totalProjects}
              totalPaid={summary.totalPaid}
              balance={summary.balance}
              requestedTotal={paymentRequest.requestedTotal}
              currency={summary.currency}
            />

            {/* Tabla de proyectos */}
            <CustomerAccountProjectsTable
              projects={paymentRequest.projects}
              currency={summary.currency}
            />

            {/* Tabla de pagos */}
            <CustomerAccountPaymentsTable
              payments={consolidatedPayments}
              currency={summary.currency}
            />
          </div>
        </div>
      </CaptureDialog>
    )
  }

  // Render modo selección de proyectos
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Estado de Cuenta</DialogTitle>
          <DialogDescription>
            Selecciona los proyectos a incluir en el estado de cuenta de{' '}
            <span className="font-medium">{customerName}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Lista de proyectos con checkboxes */}
        <div className="py-2">
          {/* Controles de selección */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                Todos
              </Button>
              <Button variant="outline" size="sm" onClick={handleSelectNone}>
                Ninguno
              </Button>
            </div>
            <Button variant="secondary" size="sm" onClick={handleAutoPending}>
              <Zap className="h-4 w-4 mr-1" />
              Auto pendientes
            </Button>
          </div>

          {/* Lista de proyectos */}
          <div className="border rounded-md max-h-64 overflow-y-auto">
            {accountData?.projects.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                Este cliente no tiene proyectos
              </div>
            ) : (
              <div className="divide-y">
                {accountData?.projects.map((project) => {
                  const isSelected = selectedProjectIds.has(project.id)
                  const isPaid = project.balance <= 0

                  return (
                    <label
                      key={project.id}
                      className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleProject(project.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">P-{project.projectNumber}</span>
                          {project.projectName && (
                            <span className="text-muted-foreground text-sm truncate">
                              {project.projectName}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{formatCurrency(project.totalAmount, project.currency)}</span>
                          {isPaid ? (
                            <span className="text-green-600 text-xs">(pagado)</span>
                          ) : (
                            <span className="text-orange-600 text-xs">
                              (saldo: {formatCurrency(project.balance, project.currency)})
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          {/* Configuración de solicitud */}
          {selectedProjectIds.size > 0 && (
            <div className="mt-3 space-y-3 rounded-md border p-3">
              <div className="space-y-2">
                <Label>Solicitar</Label>
                <ToggleGroup
                  type="single"
                  value={requestMode}
                  onValueChange={(value) => {
                    if (value) setRequestMode(value as RequestMode)
                  }}
                  variant="outline"
                  className="grid w-full grid-cols-3"
                >
                  <ToggleGroupItem value="full">Saldo total</ToggleGroupItem>
                  <ToggleGroupItem value="percentage">Porcentaje</ToggleGroupItem>
                  <ToggleGroupItem value="fixed">Monto fijo</ToggleGroupItem>
                </ToggleGroup>
              </div>

              {requestMode === 'percentage' && (
                <div className="space-y-2">
                  <Label htmlFor="request-percentage">Porcentaje</Label>
                  <PercentageInput
                    id="request-percentage"
                    value={requestPercentage}
                    onValueChange={(value) => setRequestPercentage(value ?? 0)}
                    min={1}
                    max={100}
                  />
                </div>
              )}

              {requestMode === 'fixed' && (
                <div className="space-y-2">
                  <Label htmlFor="fixed-request-amount">Monto fijo</Label>
                  <CurrencyInput
                    id="fixed-request-amount"
                    value={fixedRequestAmount}
                    onChange={setFixedRequestAmount}
                    currency={summary.currency}
                    min={0}
                  />
                </div>
              )}

              {paymentRequest.error && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>{paymentRequest.error}</span>
                </div>
              )}
            </div>
          )}

          {/* Resumen de selección */}
          {selectedProjectIds.size > 0 && (
            <div className="mt-3 p-3 bg-muted/50 rounded-md text-sm">
              <div className="flex justify-between">
                <span>Proyectos seleccionados:</span>
                <span className="font-medium">{selectedProjectIds.size}</span>
              </div>
              <div className="flex justify-between">
                <span>Total:</span>
                <span className="font-medium">
                  {formatCurrency(summary.totalProjects, summary.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Saldo pendiente:</span>
                <span className="font-medium">
                  {formatCurrency(summary.balance, summary.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Monto solicitado:</span>
                <span className="font-medium">
                  {formatCurrency(paymentRequest.requestedTotal, summary.currency)}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleGenerateStatement}
            disabled={selectedProjectIds.size === 0 || !paymentRequest.isValid}
          >
            Generar Estado de Cuenta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
