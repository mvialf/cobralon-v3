'use client'

import { use } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { useVisit } from '@/hooks/queries/use-visits'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/format'
import { Calendar, MapPin, Phone, User, FileText, Clock } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface VisitDetailPageProps {
  params: Promise<{ id: string }>
}

export default function VisitDetailPage({ params }: VisitDetailPageProps) {
  const { id } = use(params)
  const { data: visit, isLoading, error } = useVisit(id)

  if (isLoading) {
    return (
      <AppLayout
        pageTitle="Detalle de Visita"
        breadcrumbs={[
          { label: 'Inicio', href: '/' },
          { label: 'Visitas', href: '/visits' },
          { label: 'Detalle' },
        ]}
      >
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    )
  }

  if (error || !visit) {
    return (
      <AppLayout
        pageTitle="Visita no encontrada"
        breadcrumbs={[
          { label: 'Inicio', href: '/' },
          { label: 'Visitas', href: '/visits' },
          { label: 'Error' },
        ]}
      >
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No se pudo cargar la información de la visita.
            </p>
          </CardContent>
        </Card>
      </AppLayout>
    )
  }

  return (
    <AppLayout
      pageTitle={`Visita: ${visit.name}`}
      pageDescription={`Solicitada el ${formatDate(visit.date, 'long')}`}
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Visitas', href: '/visits' },
        { label: visit.name },
      ]}
    >
      <div className="space-y-6">
        {/* Estado y Fecha */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Información General</CardTitle>
                <CardDescription>Datos principales de la visita</CardDescription>
              </div>
              <Badge
                className={visit.visitStatus.color.bgClass}
                style={{
                  color: visit.visitStatus.color.textClass === 'text-white' ? 'white' : 'black',
                }}
              >
                {visit.visitStatus.name}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Nombre */}
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Nombre</p>
                  <p className="text-base">{visit.name}</p>
                </div>
              </div>

              {/* Teléfono */}
              {visit.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Teléfono</p>
                    <p className="text-base">{visit.phone}</p>
                  </div>
                </div>
              )}

              {/* Fecha de Solicitud */}
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fecha de Solicitud</p>
                  <p className="text-base">{formatDate(visit.date, 'long')}</p>
                </div>
              </div>

              {/* Fecha de Creación */}
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Creada el</p>
                  <p className="text-base">{formatDate(visit.createdAt, 'short')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dirección */}
        <Card>
          <CardHeader>
            <CardTitle>Dirección</CardTitle>
            <CardDescription>Ubicación de la visita</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-base">
                  {visit.street}
                  {visit.apartment && `, ${visit.apartment}`}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {visit.comuna}, {visit.region}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Observaciones */}
        {visit.observations && (
          <Card>
            <CardHeader>
              <CardTitle>Observaciones</CardTitle>
              <CardDescription>Notas adicionales sobre la visita</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-base whitespace-pre-wrap">{visit.observations}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}
