import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DashboardFollowUpList, type DashboardFollowUpProject } from '../dashboard-follow-up-list'

vi.mock('react-use-measure', () => ({
  default: () => [vi.fn(), { height: 104 }],
}))

const projects: DashboardFollowUpProject[] = [
  {
    id: 'project-1',
    projectNumber: '001',
    projectName: 'Cocina',
    customerName: 'Cliente Uno',
    totalAmount: 120000,
    balance: 60000,
  },
  {
    id: 'project-2',
    projectNumber: '002',
    projectName: 'Closet',
    customerName: 'Cliente Dos',
    totalAmount: 90000,
    balance: 45000,
  },
  {
    id: 'project-3',
    projectNumber: '003',
    projectName: 'Baño',
    customerName: 'Cliente Tres',
    totalAmount: 70000,
    balance: 35000,
  },
]

describe('DashboardFollowUpList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('muestra solo los proyectos en seguimiento que caben en la tarjeta', () => {
    render(<DashboardFollowUpList projects={projects} gridArea="c" />)

    expect(screen.getByText('Seguimiento')).toBeInTheDocument()
    expect(screen.getByText('P - 001 - Cocina')).toBeInTheDocument()
    expect(screen.getByText('P - 002 - Closet')).toBeInTheDocument()
    expect(screen.queryByText('P - 003 - Baño')).not.toBeInTheDocument()
  })

  it('muestra estado vacío cuando no hay proyectos en seguimiento', () => {
    render(<DashboardFollowUpList projects={[]} gridArea="c" />)

    expect(screen.getByText('Sin proyectos en seguimiento')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ver todos los proyectos/i })).toHaveAttribute(
      'href',
      '/projects'
    )
  })
})
