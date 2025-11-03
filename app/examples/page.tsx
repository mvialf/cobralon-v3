'use client'

import Link from 'next/link'
import { ChevronDown, Phone, ArrowRight, Table, MessageSquare, Tags } from 'lucide-react'

import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const ejemplos = [
  {
    title: 'DataTable',
    description: 'Showcase completo del sistema de tablas avanzadas',
    href: '/examples/data-table',
    icon: Table,
    features: [
      'Sorting & Filtering',
      'Pagination',
      'Row Selection',
      'Custom Cell Rendering',
      '40 registros mock',
    ],
    color: 'text-purple-500',
  },
  {
    title: 'Regional Inputs',
    description: 'Inputs regionalizados para Chile (phone, RUT, currency)',
    href: '/examples/regional-inputs',
    icon: Phone,
    features: [
      'PhoneInput (E.164)',
      'RutInput con validación',
      'CurrencyInput multi-moneda',
      'Configuración regional',
      '17 ejemplos completos',
    ],
    color: 'text-green-500',
  },
  {
    title: 'Dialogs',
    description: 'Patrones de diálogos (form, project, scrollable, capture)',
    href: '/examples/dialogs',
    icon: MessageSquare,
    features: [
      'Form Dialog con ScrollArea',
      'Project Dialog (crear/editar)',
      'Scrollable con requireScroll',
      'Capture Dialog (screenshot)',
    ],
    color: 'text-orange-500',
  },
  {
    title: 'Combobox',
    description: 'Combobox con debounce y loading state',
    href: '/examples/combobox',
    icon: ChevronDown,
    features: ['Debounce 300ms', 'Loading state', 'Búsqueda dinámica', 'Barra de progreso'],
    color: 'text-blue-500',
  },
  {
    title: 'Team Tags',
    description: 'Sistema de tags con CRUD y BadgeColor',
    href: '/examples/team-tags',
    icon: Tags,
    features: [
      'useTeamTags hook',
      'TagSelector component',
      'CRUD operations',
      'BadgeColor integration',
    ],
    color: 'text-pink-500',
  },
]

export default function EjemplosPage() {
  return (
    <AppLayout
      pageTitle="Ejemplos de Componentes"
      breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Ejemplos' }]}
    >
      <div className="grid gap-6 md:grid-cols-2">
        {ejemplos.map((ejemplo) => {
          const Icon = ejemplo.icon
          return (
            <Link key={ejemplo.href} href={ejemplo.href} className="group">
              <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-lg bg-muted p-2 ${ejemplo.color}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {ejemplo.title}
                          <ArrowRight className="h-4 w-4 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
                        </CardTitle>
                        <CardDescription className="mt-1">{ejemplo.description}</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">Características:</p>
                    <div className="flex flex-wrap gap-2">
                      {ejemplo.features.map((feature) => (
                        <Badge key={feature} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Información adicional */}
      <Card className="mt-8 border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Sobre estos ejemplos</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Esta galería muestra componentes custom construidos sobre shadcn/ui. Cada ejemplo
            incluye código fuente, documentación y casos de uso reales. Los componentes son
            copy-paste friendly y siguen los patterns del template.
          </p>
        </CardContent>
      </Card>
    </AppLayout>
  )
}
