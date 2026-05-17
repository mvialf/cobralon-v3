import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('@/lib/logger-middleware')
vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}))

import { auth } from '@/lib/auth'
import { z } from 'zod'
import { withApiHandler } from '../api-handler'

const getSessionMock = vi.mocked(auth.api.getSession)

function createRequest() {
  return new NextRequest('http://localhost:3000/api/protected')
}

async function callHandler(handler: ReturnType<typeof withApiHandler>) {
  return handler(createRequest(), { params: Promise.resolve({}) })
}

describe('withApiHandler RBAC', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe responder 401 JSON si falta sesión en una ruta protegida', async () => {
    getSessionMock.mockResolvedValue(null)

    const handler = withApiHandler(
      () => NextResponse.json({ ok: true }),
      { requiredRole: 'admin' }
    )

    const response = await callHandler(handler)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('No autorizado')
  })

  it('debe responder 403 JSON si la sesión no tiene un rol permitido', async () => {
    getSessionMock.mockResolvedValue({
      user: { id: 'user-1', name: 'User', email: 'user@test.cl', role: 'user' },
      session: { id: 'session-1', userId: 'user-1' },
    } as never)

    const handler = withApiHandler(
      () => NextResponse.json({ ok: true }),
      { requiredRole: 'admin' }
    )

    const response = await callHandler(handler)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Permisos insuficientes')
  })

  it('debe ejecutar el handler si requiredRoles incluye el rol de la sesión', async () => {
    getSessionMock.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.cl', role: 'admin' },
      session: { id: 'session-1', userId: 'admin-1' },
    } as never)

    const handlerSpy = vi.fn((_request, _logger, { session }) =>
      NextResponse.json({ userId: session?.user.id })
    )
    const handler = withApiHandler(handlerSpy, { requiredRoles: ['admin', 'manager'] })

    const response = await callHandler(handler)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.userId).toBe('admin-1')
    expect(handlerSpy).toHaveBeenCalledTimes(1)
  })

  it('no debe consultar sesión en rutas sin roles requeridos', async () => {
    const handler = withApiHandler(() => NextResponse.json({ ok: true }))

    const response = await callHandler(handler)

    expect(response.status).toBe(200)
    expect(getSessionMock).not.toHaveBeenCalled()
  })

  it('debe responder 400 para JSON malformado', async () => {
    const handler = withApiHandler(
      () => NextResponse.json({ ok: true }),
      { bodySchema: z.object({ name: z.string() }) }
    )
    const response = await handler(
      new NextRequest('http://localhost:3000/api/protected', {
        method: 'POST',
        body: '{bad-json',
      }),
      { params: Promise.resolve({}) }
    )
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('JSON inválido')
  })

  it('debe limitar detalles de errores Zod', async () => {
    const handler = withApiHandler(
      () => NextResponse.json({ ok: true }),
      {
        bodySchema: z.object({
          a: z.string(),
          b: z.string(),
          c: z.string(),
          d: z.string(),
          e: z.string(),
          f: z.string(),
        }),
      }
    )
    const response = await handler(
      new NextRequest('http://localhost:3000/api/protected', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({}) }
    )
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.details).toHaveLength(5)
    expect(data.totalErrors).toBe(6)
  })
})
