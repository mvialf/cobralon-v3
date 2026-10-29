import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
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

describe('Ordenamiento por destacado de proyectos', () => {
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
          return Response.json({ projectStatuses: [] })
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
              projectName: `Resultado página ${page}`,
              date: '2026-10-01T12:00:00.000Z',
              projectStatus: null,
              totalAmount: 1000,
              totalPaid: 0,
              balance: 1000,
              percentPaid: 0,
              flagStatus: 'flagged',
              flaggedAt: '2026-10-01T12:00:00.000Z',
              customer: { id: 'customer-1', name: 'Cliente', phone: '+56912345678' },
            },
          ],
          pagination: { page, limit: 50, total: 84, totalPages: 2 },
        }
        return Response.json(response)
      })
    )
  })

  afterEach(() => {
    queryClient.clear()
    vi.unstubAllGlobals()
  })

  it.each([
    ['Asc', 'asc'],
    ['Desc', 'desc'],
  ])('debe ordenar por destacado en %s y volver a la primera página', async (label, order) => {
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={queryClient}>
        <ConfigurationProvider>
          <ProjectsPageClient />
        </ConfigurationProvider>
      </QueryClientProvider>
    )
    await screen.findByText('Resultado página 1')
    await user.click(screen.getByRole('button', { name: 'Ir a la página siguiente' }))
    await screen.findByText('Resultado página 2')

    await user.click(screen.getByRole('button', { name: 'Destacado' }))
    await user.click(screen.getByRole('menuitem', { name: label }))

    await screen.findByText('Resultado página 1')
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument()
    await waitFor(() => {
      expect(
        requests.some(
          (params) =>
            params.get('sortBy') === 'flagStatus' &&
            params.get('sortOrder') === order &&
            params.get('page') === '1'
        )
      ).toBe(true)
    })
  })
})
