'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Row } from '@tanstack/react-table'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/data-table/data-table'
import { AftersaleDialog } from '@/components/dialogs/aftersales/aftersale-dialog'
import { createColumns } from './columns'
import type { Aftersale } from '@/lib/validations/aftersale-validations'

export default function AftersalesPage() {
  const [aftersales, setAftersales] = useState<Aftersale[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const fetchAftersales = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/aftersales')
      const data = await response.json()
      setAftersales(data.aftersales || [])
    } catch (error) {
      console.error('Error fetching aftersales:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAftersales()
  }, [])

  const handleAftersaleUpdated = () => {
    fetchAftersales()
  }

  const columns = createColumns({
    onAftersaleUpdated: handleAftersaleUpdated,
  })

  // Función de filtrado global: busca en projectNumber, customer.name y description
  const globalFilterFn = (row: Row<Aftersale>, _columnId: string, filterValue: string) => {
    const aftersale = row.original
    const searchValue = filterValue.toLowerCase()

    // Buscar en número de proyecto
    if (aftersale.project.projectNumber.toLowerCase().includes(searchValue)) {
      return true
    }

    // Buscar en nombre del cliente
    if (aftersale.project.customer.name.toLowerCase().includes(searchValue)) {
      return true
    }

    // Buscar en nombre del proyecto (si existe)
    if (
      aftersale.project.projectName &&
      aftersale.project.projectName.toLowerCase().includes(searchValue)
    ) {
      return true
    }

    // Buscar en descripción
    if (aftersale.description.toLowerCase().includes(searchValue)) {
      return true
    }

    return false
  }

  return (
    <AppLayout
      pageTitle="Postventas"
      pageDescription="Gestiona los casos de postventa de proyectos finalizados"
      breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Postventas' }]}
      action={
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Caso
        </Button>
      }
    >
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Cargando casos de postventa...</div>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={aftersales}
            searchKey="search"
            searchPlaceholder="Buscar por proyecto, cliente o descripción..."
            globalFilterFn={globalFilterFn}
            meta={{
              handleStatusChange: undefined,
            }}
          />
        )}
      </div>

      {/* Create Dialog */}
      <AftersaleDialog
        mode="create"
        onSuccess={() => {
          fetchAftersales()
          setIsCreateDialogOpen(false)
        }}
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </AppLayout>
  )
}
