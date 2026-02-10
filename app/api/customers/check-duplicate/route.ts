import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { withLogging } from '@/lib/logger-middleware'

/**
 * GET /api/customers/check-duplicate?name=...&excludeId=...
 * Busca clientes con nombre similar (sin acentos, sin prefijos Sr./Sra.)
 *
 * Usa normalize_text() de PostgreSQL (ya existente) para comparación sin tildes.
 * Quita prefijos Sr./Sra. tanto del input como del nombre almacenado.
 *
 * @param name - Nombre a buscar (mínimo 4 caracteres)
 * @param excludeId - ID de cliente a excluir (para edición)
 * @returns Array de coincidencias { id, name, phone } (máximo 5)
 */
export const GET = withLogging(async (request, logger) => {
  try {
    const { searchParams } = new URL(request.url)
    const name = searchParams.get('name')?.trim()
    const excludeId = searchParams.get('excludeId')

    if (!name || name.length < 4) {
      return NextResponse.json({ customers: [] })
    }

    // Quitar prefijos Sr./Sra. antes de normalizar
    const cleanName = name.replace(/^(sra?\.\s*|sra?\s+)/i, '').trim()

    if (cleanName.length < 3) {
      return NextResponse.json({ customers: [] })
    }

    const excludeClause = excludeId ? Prisma.sql`AND id != ${excludeId}` : Prisma.empty

    const customers = await prisma.$queryRaw<Array<{ id: string; name: string; phone: string }>>`
      SELECT id, name, phone
      FROM "Customer"
      WHERE normalize_text(
        REGEXP_REPLACE(name, '^(Sra?\\.?\\s*)', '', 'i')
      ) LIKE normalize_text(${`%${cleanName}%`})
      ${excludeClause}
      ORDER BY name ASC
      LIMIT 5
    `

    return NextResponse.json({ customers })
  } catch (error) {
    logger.error({ err: error }, 'Error al buscar clientes duplicados')
    return NextResponse.json({ error: 'Error al buscar clientes duplicados' }, { status: 500 })
  }
})
