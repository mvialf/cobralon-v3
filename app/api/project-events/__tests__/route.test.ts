/**
 * Tests para app/api/project-events/route.ts (POST)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/logger-middleware')

vi.mock('@/lib/db', () => ({
  prisma: {
    $transaction: vi.fn(),
    project: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    projectEvent: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'
import { POST } from '../route'

const VALID_UUID = '00000000-0000-0000-0000-000000000001'

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/project-events', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

async function callPOST(body: Record<string, unknown>) {
  return (POST as any)(createRequest(body))
}

describe('POST /api/project-events', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback(prisma as never))
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: 'project-1',
      phone: '+56911111111',
      street: 'Calle antigua',
      apartment: null,
      comuna: 'Santiago',
      region: 'Región Metropolitana de Santiago',
      windowsCount: 2,
      squareMeters: { toString: () => '10' },
      description: null,
      projectStatus: { isFinal: false },
    } as never)
    vi.mocked(prisma.projectEvent.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.project.update).mockResolvedValue({ id: 'project-1' } as never)
    vi.mocked(prisma.projectEvent.create).mockResolvedValue({
      id: 'pe-new',
      projectId: VALID_UUID,
      scheduledDate: new Date('2025-01-15'),
      tasks: [],
      project: {
        customer: { id: 'customer-1', name: 'Cliente' },
        projectStatus: { id: 'status-1', name: 'Activo' },
      },
      teamTags: [],
    } as never)
  })

  it('debe crear evento con payload simple y devolver evento directo', async () => {
    const response = await callPOST({
      projectId: VALID_UUID,
      scheduledDate: '2025-01-15',
    })
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.id).toBe('pe-new')
    expect(data.event).toBeUndefined()
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('debe actualizar proyecto y crear evento con payload extendido', async () => {
    const response = await callPOST({
      projectId: VALID_UUID,
      scheduledDate: '2025-01-15',
      phone: '+56912345678',
      street: 'Calle nueva',
      apartment: null,
      comuna: 'Providencia',
      region: 'Región Metropolitana de Santiago',
      windowsCount: 4,
      squareMeters: 25,
      description: 'Nueva descripción',
      teamTagIds: ['00000000-0000-0000-0000-000000000010'],
    })
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.projectUpdated).toBe(true)
    expect(data.event.id).toBe('pe-new')
    expect(prisma.$transaction).toHaveBeenCalled()
    expect(prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: VALID_UUID },
        data: expect.objectContaining({
          phone: '+56912345678',
          street: 'Calle nueva',
          windowsCount: 4,
          squareMeters: 25,
        }),
      })
    )
    expect(prisma.projectEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: VALID_UUID,
          teamTags: {
            connect: [{ id: '00000000-0000-0000-0000-000000000010' }],
          },
        }),
      })
    )
  })

  it('debe crear evento sin actualizar proyecto cuando no hay cambios', async () => {
    const response = await callPOST({
      projectId: VALID_UUID,
      scheduledDate: '2025-01-15',
      phone: '+56911111111',
      street: 'Calle antigua',
      apartment: null,
      comuna: 'Santiago',
      region: 'Región Metropolitana de Santiago',
      windowsCount: 2,
      squareMeters: 10,
      description: null,
    })
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.projectUpdated).toBe(false)
    expect(prisma.project.update).not.toHaveBeenCalled()
  })

  it('debe rechazar evento duplicado en payload extendido', async () => {
    vi.mocked(prisma.projectEvent.findFirst).mockResolvedValue({
      id: 'existing',
      projectId: VALID_UUID,
      scheduledDate: new Date('2025-01-15'),
    } as never)

    const response = await callPOST({
      projectId: VALID_UUID,
      scheduledDate: '2025-01-15',
      phone: '+56911111111',
      street: 'Calle antigua',
      apartment: null,
      comuna: 'Santiago',
      region: 'Región Metropolitana de Santiago',
      windowsCount: 2,
      squareMeters: 10,
      description: null,
    })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Ya existe un evento para este proyecto en esta fecha')
  })
})
