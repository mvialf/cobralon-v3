'use client'

import { useEffect, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface ViewProjectDetailsSheetProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ProjectDetails {
  id: string
  projectNumber: string
  projectName: string | null
  date: string
  currency: string
  street: string
  apartment: string | null
  comuna: string
  region: string
  subtotal: number
  taxRate: number
  total: number
  totalAmount: number | null
  description: string | null
  windowsCount: number
  squareMeters: number
  customer: {
    id: string
    name: string
    phone: string
  }
  projectStatus: {
    id: string
    name: string
    color: {
      bgClass: string
    }
  } | null
}

/**
 * Sheet lateral para visualizar detalles completos de un proyecto
 */
export function ViewProjectDetailsSheet({
  projectId,
  open,
  onOpenChange,
}: ViewProjectDetailsSheetProps) {
  const [project, setProject] = useState<ProjectDetails | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open && projectId) {
      fetchProject()
    }
  }, [open, projectId])

  const fetchProject = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/projects/${projectId}`)

      if (!response.ok) {
        throw new Error('Error al cargar proyecto')
      }

      const data = await response.json()
      setProject(data)
    } catch (error) {
      console.error('Error fetching project:', error)
    } finally {
      setIsLoading(false)
    }
  }

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
      month: 'long',
      day: 'numeric',
    })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isLoading ? 'Cargando...' : `Proyecto ${project?.projectNumber || ''}`}
          </SheetTitle>
          <SheetDescription>
            {project?.projectName || project?.customer.name || 'Detalles del proyecto'}
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-6 py-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : project ? (
          <div className="space-y-6 py-6">
            {/* Información General */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                Información General
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <DataField label="Número de Proyecto" value={project.projectNumber} />
                {project.projectName && (
                  <DataField label="Nombre del Proyecto" value={project.projectName} />
                )}
                <DataField label="Cliente" value={project.customer.name} />
                <DataField label="Teléfono" value={project.customer.phone} />

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Estado</p>
                  {project.projectStatus ? (
                    <StatusBadge
                      bgClass={project.projectStatus.color.bgClass}
                      label={project.projectStatus.name}
                    />
                  ) : (
                    <Badge variant="outline">Sin estado</Badge>
                  )}
                </div>

                <DataField label="Fecha" value={formatDate(project.date)} />
                <DataField label="Moneda" value={project.currency} />
              </div>
            </div>

            <Separator />

            {/* Dirección */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Dirección</h3>
              <p className="text-base">
                {project.street}
                {project.apartment && `, ${project.apartment}`}
              </p>
              <p className="text-sm text-muted-foreground">
                {project.comuna}, {project.region}
              </p>
            </div>

            <Separator />

            {/* Financiero */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                Detalles Financieros
              </h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <DataField
                  label="Subtotal"
                  value={formatCurrency(project.subtotal, project.currency)}
                />
                <DataField
                  label={`IVA (${project.taxRate}%)`}
                  value={formatCurrency(
                    project.subtotal * (project.taxRate / 100),
                    project.currency
                  )}
                />
                <DataField
                  label="Total"
                  value={formatCurrency(project.total, project.currency)}
                  className="text-lg font-bold"
                />
              </div>
            </div>

            {project.description && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">Descripción</h3>
                  <p className="text-base">{project.description}</p>
                </div>
              </>
            )}

            <Separator />

            {/* Detalles Adicionales */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                Detalles Adicionales
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <DataField label="Cantidad de Ventanas" value={project.windowsCount} />
                <DataField label="Metros Cuadrados" value={`${project.squareMeters} m²`} />
              </div>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

/**
 * Componente helper para mostrar un campo de datos
 */
function DataField({
  label,
  value,
  className = '',
}: {
  label: string
  value: React.ReactNode
  className?: string
}) {
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className={cn('text-base', className)}>{value}</p>
    </div>
  )
}
