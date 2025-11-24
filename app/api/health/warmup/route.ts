/**
 * Database Warmup API Route
 *
 * Endpoint para despertar la base de datos manualmente.
 * Útil para:
 * - Health checks
 * - Warmup antes de operaciones críticas
 * - Monitoreo de status
 */

import { warmupDatabase, isDatabaseActive } from '@/lib/db/warmup'
import { NextResponse } from 'next/server'

export async function GET() {
  const startTime = Date.now()

  try {
    // Intentar despertar la base de datos
    const success = await warmupDatabase()

    if (!success) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Failed to connect to database',
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      )
    }

    const latency = Date.now() - startTime
    const isActive = await isDatabaseActive()

    return NextResponse.json({
      status: 'ok',
      message: 'Database is active',
      latency: `${latency}ms`,
      coldStart: latency > 1000, // Cold start si toma más de 1 segundo
      isActive,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
