import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { chilePhoneSchema } from '@/lib/validations/common'
import { todoListOptionalSchema } from '@/lib/validations/todo-validations'
import { getRegionByCodigo } from '@/lib/regiones-chile'

/**
 * Schema de validación para crear Aftersale
 * Incluye campos de dirección del proyecto (editables desde aftersale)
 */
const createAftersaleSchema = z.object({
  projectId: z.string().uuid('Project ID inválido'),
  aftersaleStatusId: z.string().uuid('Status ID inválido'),
  contactPhone: chilePhoneSchema,
  description: z.string().max(1000, 'Máximo 1000 caracteres').optional().default(''),
  reportedAt: z.string().datetime('Fecha inválida'),
  tasks: todoListOptionalSchema, // Lista de tareas para resolver el caso
  // Campos de dirección del proyecto
  street: z.string().min(1, 'La calle es obligatoria'),
  apartment: z.string().nullable().optional(),
  comuna: z.string().min(1, 'La comuna es obligatoria'),
  region: z.string().min(1, 'La región es obligatoria'),
})

/**
 * GET /api/aftersales
 *
 * Obtiene todos los casos de postventa con información de proyecto y estado
 *
 * Response:
 * ```json
 * {
 *   "aftersales": [
 *     {
 *       "id": "uuid",
 *       "description": "...",
 *       "reportedAt": "2024-01-15T10:00:00Z",
 *       "project": {
 *         "projectNumber": "2024-089",
 *         "projectName": "...",
 *         "customer": { "name": "..." }
 *       },
 *       "aftersaleStatus": {
 *         "name": "Abierto",
 *         "color": { "bgClass": "...", "textClass": "..." }
 *       }
 *     }
 *   ]
 * }
 * ```
 */
export async function GET() {
  try {
    const aftersales = await prisma.aftersale.findMany({
      relationLoadStrategy: 'join', // Evita N+1 queries
      orderBy: {
        reportedAt: 'desc', // Más recientes primero
      },
      include: {
        project: {
          select: {
            id: true,
            projectNumber: true,
            projectName: true,
            customer: {
              select: {
                name: true,
              },
            },
          },
        },
        aftersaleStatus: {
          select: {
            id: true,
            name: true,
            color: {
              select: {
                bgClass: true,
                textClass: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json({ aftersales })
  } catch (error) {
    console.error('Error fetching aftersales:', error)
    return NextResponse.json({ error: 'Error al obtener los casos de postventa' }, { status: 500 })
  }
}

/**
 * POST /api/aftersales
 *
 * Crea un nuevo caso de postventa
 *
 * Body:
 * ```json
 * {
 *   "projectId": "uuid",
 *   "aftersaleStatusId": "uuid",
 *   "description": "Problema con ventana...",
 *   "reportedAt": "2024-01-15T10:00:00Z"
 * }
 * ```
 *
 * Validaciones:
 * - El proyecto debe existir
 * - El estado debe existir y estar activo
 * - La descripción no puede estar vacía
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validatedData = createAftersaleSchema.parse(body)

    // Validaciones en paralelo: proyecto existe, estado existe
    const [project, status] = await Promise.all([
      prisma.project.findUnique({
        where: { id: validatedData.projectId },
        include: {
          projectStatus: {
            select: {
              isFinal: true,
            },
          },
        },
      }),
      prisma.aftersaleStatus.findUnique({
        where: { id: validatedData.aftersaleStatusId },
      }),
    ])

    if (!project) {
      return NextResponse.json({ error: 'El proyecto seleccionado no existe' }, { status: 404 })
    }

    // Validación: verificar que el proyecto esté finalizado
    if (!project.projectStatus?.isFinal) {
      return NextResponse.json(
        { error: 'Solo se pueden crear casos de postventa para proyectos finalizados' },
        { status: 400 }
      )
    }

    if (!status) {
      return NextResponse.json({ error: 'El estado seleccionado no existe' }, { status: 404 })
    }

    if (!status.isActive) {
      return NextResponse.json({ error: 'El estado seleccionado no está activo' }, { status: 400 })
    }

    // Convertir código de región a nombre para guardar en proyecto
    const regionData = getRegionByCodigo(validatedData.region)
    const regionNombre = regionData?.nombre || validatedData.region

    // Usar transacción para crear aftersale y actualizar proyecto
    const result = await prisma.$transaction(async (tx) => {
      // 1. Actualizar el proyecto con la nueva dirección
      await tx.project.update({
        where: { id: validatedData.projectId },
        data: {
          street: validatedData.street,
          apartment: validatedData.apartment,
          comuna: validatedData.comuna,
          region: regionNombre,
        },
      })

      // 2. Crear el caso de postventa
      const aftersale = await tx.aftersale.create({
        data: {
          projectId: validatedData.projectId,
          aftersaleStatusId: validatedData.aftersaleStatusId,
          contactPhone: validatedData.contactPhone,
          description: validatedData.description,
          reportedAt: new Date(validatedData.reportedAt),
          tasks: validatedData.tasks || [], // Incluir tareas (default vacío)
        },
        include: {
          project: {
            select: {
              projectNumber: true,
              projectName: true,
              customer: {
                select: {
                  name: true,
                },
              },
            },
          },
          aftersaleStatus: {
            select: {
              name: true,
              color: {
                select: {
                  bgClass: true,
                  textClass: true,
                },
              },
            },
          },
        },
      })

      return aftersale
    })

    return NextResponse.json({ aftersale: result }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }

    console.error('Error creating aftersale:', error)
    return NextResponse.json({ error: 'Error al crear el caso de postventa' }, { status: 500 })
  }
}
