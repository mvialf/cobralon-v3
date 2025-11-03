'use client'

import { useCallback, useEffect, useState } from 'react'
import { Phone, AlertCircle, Calendar } from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { ProjectNameSummary } from '@/components/summarys/project-name-summary'
import { AddressProjectSummary } from '@/components/summarys/address-project-summary'
import { cn } from '@/lib/utils'
import { formatDate, formatCurrency } from '@/lib/format'
import { useConfiguration } from '@/hooks/use-configuration'

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
  const [error, setError] = useState<string | null>(null)
  const { configuration } = useConfiguration()

  const fetchProject = useCallback(async () => {
    // Validar projectId
    if (!projectId || projectId.trim() === '') {
      console.error('ProjectId inválido:', projectId)
      setError('ID de proyecto inválido')
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch(`/api/projects/${projectId}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setProject(data)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido al cargar proyecto'
      console.error('Error fetching project:', error)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    if (open && projectId) {
      fetchProject()
    } else if (open && !projectId) {
      setError('No se proporcionó ID de proyecto')
    }
  }, [open, projectId, fetchProject])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full px-6 md overflow-y-auto">
        {/* Mensaje de error */}
        {error && (
          <Alert variant="destructive" className="my-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error al cargar proyecto</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Header del proyecto */}
        {isLoading ? (
          <div className="text-sm text-muted-foreground py-4">Cargando...</div>
        ) : (
          project && (
            <ProjectNameSummary
              projectId={project.id}
              projectNumber={project.projectNumber}
              customerName={project.customer.name}
              projectName={project.projectName}
              className="py-4"
            />
          )
        )}

        {/* Contenido del proyecto */}
        {isLoading ? (
          <div className="space-y-4 ">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : project ? (
          <div className="space-y-4 ">
            {/* Información General */}
            <div>
              <div className="grid gap-4 place-items-center sm:grid-cols-3 mb-3">
                <DataField
                  className="place-items-center"
                  inline
                  label={<Phone className="h-4 w-4" />}
                  value={project.customer.phone}
                  valueClassName="text-xs"
                />

                <DataField
                  className="place-items-center"
                  inline
                  label={<Calendar className="h-4 w-4" />}
                  value={formatDate(project.date, 'short', configuration.locale)}
                  valueClassName="text-xs"
                />

                <div>
                  {project.projectStatus ? (
                    <StatusBadge
                      className="items-center"
                      bgClass={project.projectStatus.color.bgClass}
                      label={project.projectStatus.name}
                    />
                  ) : (
                    <Badge variant="outline">Sin estado</Badge>
                  )}
                </div>
              </div>
              {/* Dirección */}
              <AddressProjectSummary
                street={project.street}
                apartment={project.apartment}
                comuna={project.comuna}
                region={project.region}
              />
            </div>

            {/* Financiero */}
            <Card className="py-2 px-2">
              <CardContent className="">
                <div className="grid place-content-between justify-items-center sm:grid-cols-3">
                  <DataField
                    label="Subtotal"
                    value={formatCurrency(project.subtotal, project.currency)}
                    valueClassName="text-sm"
                  />
                  <DataField
                    label={`IVA (${project.taxRate}%)`}
                    value={formatCurrency(
                      project.subtotal * (project.taxRate / 100),
                      project.currency
                    )}
                    valueClassName="text-sm"
                  />
                  <DataField
                    label="Total"
                    value={formatCurrency(project.total, project.currency)}
                    valueClassName="text-sm"
                  />
                </div>
              </CardContent>
            </Card>

            {project.description && (
              <>
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">Descripción</h3>
                  <p className="text-base">{project.description}</p>
                </div>
              </>
            )}

            {/* Detalles Adicionales */}
            <div>
              <div className="grid gap-4 sm:grid-cols-2">
                <DataField label="Elementos" value={project.windowsCount} />
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
  inline = false,
  valueClassName = '',
}: {
  label: React.ReactNode
  value: React.ReactNode
  className?: string
  inline?: boolean
  valueClassName?: string
}) {
  return (
    <div className={cn(inline && 'flex flex-row items-center gap-3', className)}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn('text-base', valueClassName)}>{value}</p>
    </div>
  )
}
