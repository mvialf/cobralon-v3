import { notFound } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { PaymentSummaryCard } from '@/components/summarys/payment-summary-card'
import { ProjectPaymentsTable } from '@/components/tables/project-payments-table'

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>
}

async function getProject(id: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/projects/${id}`, {
      cache: 'no-store', // Always fetch fresh data
    })

    if (!response.ok) {
      return null
    }

    return response.json()
  } catch (error) {
    console.error('Error fetching project:', error)
    return null
  }
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params
  const project = await getProject(id)

  if (!project) {
    notFound()
  }

  return (
    <AppLayout
      pageTitle={`Proyecto ${project.projectNumber}`}
      pageDescription={project.projectName || project.customer.name}
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Proyectos', href: '/projects' },
        { label: project.projectNumber },
      ]}
    >
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Detalles</TabsTrigger>
          <TabsTrigger value="payments">Pagos</TabsTrigger>
        </TabsList>

        {/* Tab 1: Detalles del Proyecto */}
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Información General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Número de Proyecto */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Número de Proyecto</p>
                  <p className="text-lg font-semibold">{project.projectNumber}</p>
                </div>

                {/* Nombre del Proyecto */}
                {project.projectName && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Nombre del Proyecto</p>
                    <p className="text-lg font-semibold">{project.projectName}</p>
                  </div>
                )}

                {/* Cliente */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cliente</p>
                  <p className="text-lg font-semibold">{project.customer.name}</p>
                  <p className="text-sm text-muted-foreground">{project.customer.phone}</p>
                </div>

                {/* Estado */}
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

                {/* Fecha */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fecha</p>
                  <p className="text-lg">
                    {new Date(project.date).toLocaleDateString('es-CL', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>

                {/* Moneda */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Moneda</p>
                  <p className="text-lg font-semibold">{project.currency}</p>
                </div>
              </div>

              <Separator />

              {/* Dirección */}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Dirección</p>
                <p className="text-lg">
                  {project.street}
                  {project.apartment && `, ${project.apartment}`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {project.comuna}, {project.region}
                </p>
              </div>

              <Separator />

              {/* Financiero */}
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Subtotal</p>
                  <p className="text-lg font-semibold">
                    {new Intl.NumberFormat('es-CL', {
                      style: 'currency',
                      currency: project.currency,
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(project.subtotal)}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    IVA ({project.taxRate}%)
                  </p>
                  <p className="text-lg font-semibold">
                    {new Intl.NumberFormat('es-CL', {
                      style: 'currency',
                      currency: project.currency,
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(project.subtotal * (project.taxRate / 100))}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">
                    {new Intl.NumberFormat('es-CL', {
                      style: 'currency',
                      currency: project.currency,
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(project.total)}
                  </p>
                </div>
              </div>

              {/* Descripción */}
              {project.description && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Descripción</p>
                    <p className="text-base">{project.description}</p>
                  </div>
                </>
              )}

              {/* Ventanas y m² */}
              <Separator />
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cantidad de Ventanas</p>
                  <p className="text-lg font-semibold">{project.windowsCount}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Metros Cuadrados</p>
                  <p className="text-lg font-semibold">{project.squareMeters} m²</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Pagos */}
        <TabsContent value="payments" className="space-y-4">
          {/* Resumen de Pagos */}
          <PaymentSummaryCard
            projectId={project.id}
            customerId={project.customer.id}
            customerName={project.customer.name}
            totalAmount={project.totalAmount}
            currency={project.currency}
          />

          {/* Tabla de Pagos */}
          <ProjectPaymentsTable projectId={project.id} />
        </TabsContent>
      </Tabs>
    </AppLayout>
  )
}
