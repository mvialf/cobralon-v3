import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ProjectWhereInput } from '@/types/api'
import { matchesProjectState, ProjectStateFilter } from '@/lib/business-logic/project-state'
import { generateProjectsExcelBuffer } from '@/lib/excel/project-exporter'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { anyFieldMatchesSearch } from '@/lib/utils/normalize'

/**
 * Zod schema for projectState validation
 */
const projectStateSchema = z.enum(['Activo', 'Finalizado', 'all']).default('all')

/**
 * GET /api/projects/export
 *
 * Exporta proyectos a un archivo Excel
 *
 * Query params (opcionales):
 *   - search: buscar por nombre de proyecto, número o cliente
 *   - customerId: filtrar por cliente específico
 *   - projectState: "Activo", "Finalizado", "all" (default: "all")
 *
 * Returns: archivo Excel (.xlsx)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const customerId = searchParams.get('customerId') || ''

  // Validar y parsear projectState con Zod (null se trata como undefined para aplicar default)
  const projectStateResult = projectStateSchema.safeParse(
    searchParams.get('projectState') ?? undefined
  )
  if (!projectStateResult.success) {
    return NextResponse.json(
      { error: 'projectState debe ser "Activo", "Finalizado" o "all"' },
      { status: 400 }
    )
  }
  const projectState = projectStateResult.data

  logger.info(
    {
      search: search || undefined,
      customerId: customerId || undefined,
      projectState,
    },
    'Project export requested'
  )

  try {
    // Construir filtro de búsqueda base (solo filtros de DB)
    const where: ProjectWhereInput = {}

    if (customerId) {
      where.customerId = customerId
    }

    // NOTA: La búsqueda se aplica en memoria con normalización (ignora acentos/tildes)

    // Pre-filtro server-side por projectStatus.isFinal (solo para "Finalizado")
    if (projectState === 'Finalizado') {
      where.projectStatus = { isFinal: true }
    }

    // Obtener TODOS los proyectos (sin paginación)
    const allProjects = await prisma.project.findMany({
      relationLoadStrategy: 'join',
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: {
            name: true,
          },
        },
        projectStatus: {
          select: {
            name: true,
            isFinal: true,
          },
        },
      },
    })

    // Aplicar filtros: búsqueda normalizada + projectState
    const filteredProjects = allProjects.filter((project) => {
      // Filtro por projectState
      const matchesState = matchesProjectState(
        Number(project.balance),
        project.projectStatus?.isFinal,
        projectState as ProjectStateFilter
      )

      if (!matchesState) return false

      // Filtro de búsqueda normalizada (ignora acentos/tildes)
      // "jose" encontrará "José", "nunoa" encontrará "Ñuñoa"
      if (search) {
        return anyFieldMatchesSearch(
          [
            project.projectNumber,
            project.projectName,
            project.customer?.name,
            project.projectStatus?.name,
          ],
          search
        )
      }

      return true
    })

    logger.info(
      { totalFetched: allProjects.length, totalFiltered: filteredProjects.length },
      'Projects fetched for export'
    )

    // Si no hay proyectos, retornar error amigable
    if (filteredProjects.length === 0) {
      return NextResponse.json({ error: 'No hay proyectos para exportar' }, { status: 404 })
    }

    // Generar Excel buffer
    const excelBuffer = await generateProjectsExcelBuffer(filteredProjects)

    // Nombre del archivo con fecha
    const filename = `proyectos-${new Date().toISOString().split('T')[0]}.xlsx`

    logger.info({ filename, records: filteredProjects.length }, 'Excel file generated successfully')

    // Retornar como archivo descargable (convertir a Blob para compatibilidad)
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    return new Response(blob, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    logger.error({ err: error }, 'Error exporting projects')
    return NextResponse.json({ error: 'Error al exportar proyectos' }, { status: 500 })
  }
}
