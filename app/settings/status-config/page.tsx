'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Calendar, Briefcase, Headphones } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatusConfigurationPage } from '@/components/settings/status-configuration-page'
import { VisitStatusDialog } from '@/components/dialogs/settings/visit-status-dialog'
import { ProjectStatusDialog } from '@/components/dialogs/settings/project-status-dialog'
import { AftersaleStatusDialog } from '@/components/dialogs/settings/aftersale-status-dialog'
import { entityConfigs, type EntityType } from '@/lib/validations/base-status-validations'
import type { VisitStatus } from '@/lib/validations/visit-status-validations'
import type { ProjectStatus } from '@/lib/validations/project-status-validations'
import type { AftersaleStatus } from '@/lib/validations/aftersale-status-validations'

// Configuración de tabs con iconos y dialogs
const tabConfig = {
  visit: {
    label: 'Visitas',
    icon: Calendar,
    DialogComponent: VisitStatusDialog,
  },
  project: {
    label: 'Proyectos',
    icon: Briefcase,
    DialogComponent: ProjectStatusDialog,
  },
  aftersale: {
    label: 'Postventa',
    icon: Headphones,
    DialogComponent: AftersaleStatusDialog,
  },
} as const

type StatusTab = keyof typeof tabConfig

export default function StatusConfigPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<StatusTab>('project')

  // Leer tab desde query params al montar
  useEffect(() => {
    const tab = searchParams.get('tab') as StatusTab
    if (tab && Object.keys(tabConfig).includes(tab)) {
      setActiveTab(tab)
    }
  }, [searchParams])

  // Actualizar URL cuando cambia el tab
  const handleTabChange = (value: string) => {
    const newTab = value as StatusTab
    setActiveTab(newTab)
    router.push(`/settings/status-config?tab=${newTab}`, { scroll: false })
  }

  // Renderizar el contenido del tab según el tipo
  const renderTabContent = (type: EntityType) => {
    switch (type) {
      case 'visit':
        return (
          <StatusConfigurationPage<VisitStatus>
            entityConfig={entityConfigs.visit}
            DialogComponent={VisitStatusDialog}
          />
        )
      case 'project':
        return (
          <StatusConfigurationPage<ProjectStatus>
            entityConfig={entityConfigs.project}
            DialogComponent={ProjectStatusDialog}
          />
        )
      case 'aftersale':
        return (
          <StatusConfigurationPage<AftersaleStatus>
            entityConfig={entityConfigs.aftersale}
            DialogComponent={AftersaleStatusDialog}
          />
        )
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Estados del Sistema</h2>
        <p className="text-muted-foreground">
          Configura los estados disponibles para visitas, proyectos y casos de postventa
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          {(Object.entries(tabConfig) as [StatusTab, (typeof tabConfig)[StatusTab]][]).map(
            ([key, config]) => {
              const Icon = config.icon
              return (
                <TabsTrigger key={key} value={key} className="gap-2">
                  <Icon className="h-4 w-4" />
                  {config.label}
                </TabsTrigger>
              )
            }
          )}
        </TabsList>

        {(Object.keys(tabConfig) as StatusTab[]).map((type) => (
          <TabsContent key={type} value={type}>
            {renderTabContent(type)}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
