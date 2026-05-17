import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/logger-middleware')
vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}))
vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
  },
}))

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { GET, POST } from '../route'

const getSessionMock = vi.mocked(auth.api.getSession)

function adminSession() {
  return {
    user: { id: 'admin-1', name: 'Admin', email: 'admin@test.cl', role: 'admin' },
    session: { id: 'session-1', userId: 'admin-1' },
  } as never
}

async function callGET(url = 'http://localhost:3000/api/users') {
  return (GET as any)(new NextRequest(url), { params: Promise.resolve({}) })
}

async function callPOST(body: Record<string, unknown>) {
  return (POST as any)(
    new NextRequest('http://localhost:3000/api/users', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    }),
    { params: Promise.resolve({}) }
  )
}

describe('/api/users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getSessionMock.mockResolvedValue(adminSession())
  })

  describe('GET', () => {
    it('debe requerir sesión admin', async () => {
      getSessionMock.mockResolvedValue(null)

      const response = await callGET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('No autorizado')
      expect(prisma.user.findMany).not.toHaveBeenCalled()
    })

    it('debe aplicar select mínimo y paginación segura', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([])
      vi.mocked(prisma.user.count).mockResolvedValue(0)

      const response = await callGET('http://localhost:3000/api/users?limit=999&offset=-10')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.pagination).toEqual({
        total: 0,
        limit: 100,
        offset: 0,
        hasMore: false,
      })
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
        skip: 0,
      })
    })
  })

  describe('POST', () => {
    it('debe validar body con Zod', async () => {
      const response = await callPOST({ email: 'not-an-email', name: '' })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
      expect(prisma.user.create).not.toHaveBeenCalled()
    })

    it('debe crear usuario con select mínimo', async () => {
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: 'user-1',
        name: 'User Test',
        email: 'user@test.cl',
        role: 'user',
      } as never)

      const response = await callPOST({ email: 'USER@TEST.CL', name: ' User Test ' })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.email).toBe('user@test.cl')
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'user@test.cl',
          name: 'User Test',
          role: 'user',
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    })
  })
})
