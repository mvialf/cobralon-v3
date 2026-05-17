import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}))

import { auth } from '@/lib/auth'
import { middleware } from './middleware'

const getSessionMock = vi.mocked(auth.api.getSession)

describe('middleware auth API responses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe responder JSON 401 para API sin sesión', async () => {
    getSessionMock.mockResolvedValue(null)

    const response = await middleware(new NextRequest('http://localhost:3000/api/users'))
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('No autorizado')
  })

  it('debe permitir endpoints públicos de Better Auth', async () => {
    const response = await middleware(new NextRequest('http://localhost:3000/api/auth/session'))

    expect(response.status).toBe(200)
    expect(getSessionMock).not.toHaveBeenCalled()
  })
})
