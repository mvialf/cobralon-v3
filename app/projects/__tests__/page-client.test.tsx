import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ProjectsPageClient } from '../page-client'
import type { ProjectsResponse } from '@/hooks/queries/use-projects'
import { ConfigurationProvider } from '@/lib/contexts/configuration-context'

vi.mock('@/components/layout/app-layout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}))

vi.mock('@/components/dialogs/projects/new-project-dialog', () => ({
  NewProjectDialog: () => null,
}))

vi.mock('../components/project-actions-cell', () => ({
  ProjectActionsCell: () => null,
}))

const statuses = [
  { id: 'pendiente', name: 'Pendiente', color: { bgClass: 'bg-primary' } },
  { id: 'instalado', name: 'Instalado', color: { bgClass: 'bg-secondary' } },
]

function getFilterButton(location: 'encabezado' | 'superior') {
  if (location === 'encabezado') {
    return screen.getByRole('button', { name: /^Filtrar estados/ })
  }
  return screen
    .getAllByRole('button', { name: /^Estado/ })
    .find((button) => button.getAttribute('aria-haspopup') === 'dialog')!
}

describe('Filtro de estado de proyectos', () => {
  let queryClient: QueryClient
  let requests: URLSearchParams[]

  beforeEach(() => {
    vi.clearAllMocks()
    requests = []
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string) => {
        const url = new URL(input, 'http://localhost')
        if (url.pathname === '/api/project-status') {
          return Response.json({ projectStatuses: statuses })
        }
        if (url.pathname !== '/api/projects') throw new Error(`URL inesperada: ${input}`)

        const params = url.searchParams
        requests.push(params)
        const page = Number(params.get('page'))
        const response: ProjectsResponse = {
          projects: [
            {
              id: 'project-1',
              projectNumber: '001',
              projectName: `Resultado ${params.get('statusIds') || 'todos'} página ${page}`,
              date: '2026-10-01T12:00:00.000Z',
              projectStatus: null,
              totalAmount: 1000,
              totalPaid: 0,
              balance: 1000,
              percentPaid: 0,
              flagStatus: 'none',
              flaggedAt: null,
              customer: { id: 'customer-1', name: 'Cliente', phone: '+56912345678' },
            },
          ],
          pagination: { page, limit: 50, total: 84, totalPages: 2 },
          facets: {
            projectStatus: [
              { value: 'pendiente', count: 73 },
              { value: 'instalado', count: 11 },
            ],
            projectState: [],
          },
        }
        return Response.json(response)
      })
    )
  })

  afterEach(() => {
    queryClient.clear()
    vi.unstubAllGlobals()
  })

  function renderPage() {
    render(
      <QueryClientProvider client={queryClient}>
        <ConfigurationProvider>
          <ProjectsPageClient />
        </ConfigurationProvider>
      </QueryClientProvider>
    )
    return screen.findByText('Resultado todos página 1')
  }

  it.each(['encabezado', 'superior'] as const)(
    'debe sincronizar la multiselección desde el filtro %s y volver a la primera página',
    async (location) => {
      const user = userEvent.setup()
      await renderPage()
      await user.click(screen.getByRole('button', { name: 'Ir a la página siguiente' }))
      await screen.findByText('Resultado todos página 2')

      await user.click(getFilterButton(location))
      await user.click(await screen.findByRole('option', { name: 'Pendiente 73' }))
      await screen.findByText('Resultado pendiente página 1')
      expect(screen.getByText('Página 1 de 2')).toBeInTheDocument()

      await user.click(screen.getByRole('option', { name: 'Instalado 11' }))
      await screen.findByText('Resultado pendiente,instalado página 1')
      await user.keyboard('{Escape}')

      for (const control of ['encabezado', 'superior'] as const) {
        expect(within(getFilterButton(control)).getByText('Pendiente')).toBeInTheDocument()
        expect(within(getFilterButton(control)).getByText('Instalado')).toBeInTheDocument()
      }

      await user.click(screen.getByRole('button', { name: 'Ir a la página siguiente' }))
      await screen.findByText('Resultado pendiente,instalado página 2')
      await user.click(getFilterButton(location === 'encabezado' ? 'superior' : 'encabezado'))
      await user.click(screen.getByRole('option', { name: 'Pendiente 73' }))
      await screen.findByText('Resultado instalado página 1')
      await user.keyboard('{Escape}')

      for (const control of ['encabezado', 'superior'] as const) {
        expect(within(getFilterButton(control)).queryByText('Pendiente')).not.toBeInTheDocument()
        expect(within(getFilterButton(control)).getByText('Instalado')).toBeInTheDocument()
      }
    }
  )

  it.each(['encabezado', 'superior', 'global'] as const)(
    'debe limpiar ambos controles desde %s y reiniciar la paginación',
    async (location) => {
      const user = userEvent.setup()
      await renderPage()
      await user.click(getFilterButton('superior'))
      await user.click(await screen.findByRole('option', { name: 'Pendiente 73' }))
      await screen.findByText('Resultado pendiente página 1')
      await user.keyboard('{Escape}')
      await user.click(screen.getByRole('button', { name: 'Ir a la página siguiente' }))
      await screen.findByText('Resultado pendiente página 2')

      if (location === 'global') {
        await user.click(screen.getByRole('button', { name: 'Limpiar' }))
      } else {
        await user.click(getFilterButton(location))
        await user.click(screen.getByRole('option', { name: 'Limpiar filtros' }))
        await user.keyboard('{Escape}')
      }

      await screen.findByText('Resultado todos página 1')
      expect(screen.getByText('Página 1 de 2')).toBeInTheDocument()
      for (const control of ['encabezado', 'superior'] as const) {
        expect(within(getFilterButton(control)).queryByText('Pendiente')).not.toBeInTheDocument()
      }
      expect(screen.queryByRole('button', { name: 'Limpiar' })).not.toBeInTheDocument()
    }
  )

  it('debe conservar la búsqueda, los contadores y el ordenamiento del encabezado', async () => {
    const user = userEvent.setup()
    await renderPage()
    await user.click(getFilterButton('encabezado'))
    await user.type(screen.getByPlaceholderText('Filtrar estados'), 'Instalado')
    expect(screen.queryByRole('option', { name: 'Pendiente 73' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('option', { name: 'Instalado 11' }))
    await screen.findByText('Resultado instalado página 1')
    await user.keyboard('{Escape}')

    const statusHeader = screen.getByRole('columnheader', { name: /^Estado Filtrar estados/ })
    for (const [label, order] of [
      ['Asc', 'asc'],
      ['Desc', 'desc'],
    ] as const) {
      await user.click(within(statusHeader).getByRole('button', { name: 'Estado' }))
      expect(screen.getByRole('menuitem', { name: 'Ocultar' })).toBeInTheDocument()
      await user.click(screen.getByRole('menuitem', { name: label }))
      await waitFor(() => {
        expect(
          requests.some(
            (params) =>
              params.get('statusIds') === 'instalado' &&
              params.get('sortBy') === 'projectStatus' &&
              params.get('sortOrder') === order &&
              params.get('page') === '1'
          )
        ).toBe(true)
      })
    }
  })
})
