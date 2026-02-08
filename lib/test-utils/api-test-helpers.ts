/**
 * Helpers compartidos para tests de API routes.
 *
 * Reemplaza los helpers locales callGET/callPOST/createRequest
 * que se repetían en cada test file.
 */

import { NextRequest } from 'next/server'

/**
 * Crea un NextRequest para testing.
 *
 * @example
 * createRequest('http://localhost:3000/api/project-status')
 * createRequest('http://localhost:3000/api/project-status', 'POST', { name: 'Test' })
 * createRequest('http://localhost:3000/api/project-status?includeInactive=true')
 */
export function createRequest(
  url: string,
  method?: string,
  body?: Record<string, unknown>
): NextRequest {
  const init: { method?: string; body?: string; headers?: Record<string, string> } = {}
  if (method) init.method = method
  if (body) {
    init.body = JSON.stringify(body)
    init.headers = { 'Content-Type': 'application/json' }
  }
  return new NextRequest(url, init)
}

/**
 * Llama un handler de API route con context mock.
 *
 * @example
 * callHandler(GET, request)
 * callHandler(PUT, request, { id: 'uuid-here' })
 */
export async function callHandler(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: any,
  request: NextRequest,
  params: Record<string, string> = {}
) {
  const context = { params: Promise.resolve(params) }
  return handler(request, context)
}
