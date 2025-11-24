/**
 * Tests para Database Warmup Utilities
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { warmupDatabase, isDatabaseActive, keepDatabaseAlive } from '../warmup'
import { prisma } from '@/lib/db'

// Mock de Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}))

describe('warmupDatabase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe retornar true cuando la conexión es exitosa', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([])

    const result = await warmupDatabase()

    expect(result).toBe(true)
    expect(prisma.$queryRaw).toHaveBeenCalledWith(['SELECT 1'])
  })

  it('debe retornar false cuando la conexión falla', async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error('Connection failed'))

    const result = await warmupDatabase()

    expect(result).toBe(false)
  })

  it('debe loggear error cuando falla', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error('DB Error'))

    await warmupDatabase()

    expect(consoleErrorSpy).toHaveBeenCalledWith('Database warmup failed:', expect.any(Error))
    consoleErrorSpy.mockRestore()
  })
})

describe('isDatabaseActive', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe retornar true cuando la DB responde rápido', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([])

    const result = await isDatabaseActive(2000)

    expect(result).toBe(true)
  })

  it('debe retornar false cuando la DB no responde', async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error('Timeout'))

    const result = await isDatabaseActive(100)

    expect(result).toBe(false)
  })
})

describe('keepDatabaseAlive', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('debe ejecutar pings periódicos', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([])

    const cleanup = keepDatabaseAlive(1000)

    // Avanzar tiempo para disparar 3 pings
    await vi.advanceTimersByTimeAsync(3000)

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(3)

    cleanup()
  })

  it('debe detenerse cuando se llama a cleanup', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([])

    const cleanup = keepDatabaseAlive(1000)

    // 2 pings
    await vi.advanceTimersByTimeAsync(2000)
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2)

    // Detener
    cleanup()

    // No más pings después de cleanup
    await vi.advanceTimersByTimeAsync(2000)
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2)
  })

  it('debe usar intervalo por defecto de 4 minutos', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([])

    const cleanup = keepDatabaseAlive()

    // Avanzar 4 minutos - 1 segundo (no debería hacer ping)
    await vi.advanceTimersByTimeAsync(4 * 60 * 1000 - 1000)
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(0)

    // Avanzar 1 segundo más (debería hacer ping)
    await vi.advanceTimersByTimeAsync(1000)
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1)

    cleanup()
  })

  it('debe loggear errores cuando el ping falla', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('Connection lost'))

    const cleanup = keepDatabaseAlive(1000)

    await vi.advanceTimersByTimeAsync(1000)

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Database keepalive ping failed:',
      expect.any(Error)
    )

    cleanup()
    consoleErrorSpy.mockRestore()
  })

  it('debe loggear debug cuando cleanup es llamado', () => {
    const consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})

    const cleanup = keepDatabaseAlive()
    cleanup()

    expect(consoleDebugSpy).toHaveBeenCalledWith('Database keepalive stopped')

    consoleDebugSpy.mockRestore()
  })
})
