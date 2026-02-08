/**
 * Mock automático de logger-middleware para tests.
 *
 * Uso: vi.mock('@/lib/logger-middleware')
 *
 * Vitest detecta este archivo automáticamente por convención __mocks__/
 * y reemplaza withLogging con un passthrough que inyecta un mock logger.
 */

import { vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn().mockReturnThis(),
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const withLogging = (handler: (...args: any[]) => any) => {
  return async (request: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    const mockContext = context || { params: Promise.resolve({}) }
    return handler(request, mockLogger, mockContext)
  }
}
