/**
 * API Endpoint para cleanup de datos de test E2E
 *
 * SOLO DISPONIBLE EN DESARROLLO (NODE_ENV !== 'production')
 *
 * Este endpoint permite a los tests E2E limpiar los datos que crean,
 * evitando que la BD se llene de datos de prueba.
 *
 * @example
 * DELETE /api/test/cleanup
 * Body: {
 *   table: 'Customer',
 *   patterns: ['E2E Test', 'Test MCP'],
 *   field: 'name' // opcional, default 'name'
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Tablas permitidas para cleanup (whitelist de seguridad)
const ALLOWED_TABLES = ['Customer', 'Project', 'Aftersale'] as const
type AllowedTable = (typeof ALLOWED_TABLES)[number]

// Campos por defecto para cada tabla
const DEFAULT_FIELDS: Record<AllowedTable, string> = {
  Customer: 'name',
  Project: 'projectName',
  Aftersale: 'description',
}

export async function DELETE(request: NextRequest) {
  // Bloquear en producción
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Cleanup endpoint not available in production' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const { table, patterns, field } = body as {
      table: string
      patterns: string[]
      field?: string
    }

    // Validar tabla
    if (!table || !ALLOWED_TABLES.includes(table as AllowedTable)) {
      return NextResponse.json(
        { error: `Invalid table. Allowed: ${ALLOWED_TABLES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validar patterns
    if (!patterns || !Array.isArray(patterns) || patterns.length === 0) {
      return NextResponse.json(
        { error: 'patterns must be a non-empty array of strings' },
        { status: 400 }
      )
    }

    const tableKey = table as AllowedTable
    const searchField = field || DEFAULT_FIELDS[tableKey]

    // Construir condición OR para todos los patrones
    const whereConditions = patterns.map((pattern) => ({
      [searchField]: { startsWith: pattern },
    }))

    let deleted = 0

    // Ejecutar delete según la tabla
    switch (tableKey) {
      case 'Customer':
        const customerResult = await prisma.customer.deleteMany({
          where: { OR: whereConditions },
        })
        deleted = customerResult.count
        break

      case 'Project':
        const projectResult = await prisma.project.deleteMany({
          where: { OR: whereConditions },
        })
        deleted = projectResult.count
        break

      case 'Aftersale':
        const aftersaleResult = await prisma.aftersale.deleteMany({
          where: { OR: whereConditions },
        })
        deleted = aftersaleResult.count
        break
    }

    return NextResponse.json({
      success: true,
      table: tableKey,
      patterns,
      field: searchField,
      deleted,
    })
  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json({ error: 'Cleanup failed', details: String(error) }, { status: 500 })
  }
}
