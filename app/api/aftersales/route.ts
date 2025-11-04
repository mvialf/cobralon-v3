import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { todoListOptionalSchema } from '@/lib/validations/todo-validations'

/**
 * Schema de validación para crear Aftersale
 */
const createAftersaleSchema = z.object({
  projectId: z.string().uuid('Project ID inválido'),
  aftersaleStatusId: z.string().uuid('Status ID inválido'),
  contactPhone: z
    .string()
    .min(1, 'El teléfono de contacto es obligatorio')
    .regex(/^\+56[2-9]\d{8}$/, 'Formato inválido. Debe ser un teléfono chileno válido'),
  description: z
    .string()
    .min(1, 'La descripción es obligatoria')
    .max(1000, 'Máximo 1000 caracteres'),
  reportedAt: z.string().datetime('Fecha inválida'),
  tasks: todoListOptionalSchema, // Lista de tareas para resolver el caso
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

    // Validación: proyecto existe
    const project = await prisma.project.findUnique({
      where: { id: validatedData.projectId },
      include: {
        projectStatus: {
          select: {
            isFinal: true,
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'El proyecto seleccionado no existe' }, { status: 404 })
    }

    // Validación opcional: verificar que el proyecto esté finalizado
    // (puede comentarse si se permite crear casos de postventa en cualquier estado)
    if (!project.projectStatus?.isFinal) {
      return NextResponse.json(
        { error: 'Solo se pueden crear casos de postventa para proyectos finalizados' },
        { status: 400 }
      )
    }

    // Validación: estado existe y está activo
    const status = await prisma.aftersaleStatus.findUnique({
      where: { id: validatedData.aftersaleStatusId },
    })

    if (!status) {
      return NextResponse.json({ error: 'El estado seleccionado no existe' }, { status: 404 })
    }

    if (!status.isActive) {
      return NextResponse.json({ error: 'El estado seleccionado no está activo' }, { status: 400 })
    }

    // Crear el caso de postventa
    const aftersale = await prisma.aftersale.create({
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

    return NextResponse.json({ aftersale }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }

    console.error('Error creating aftersale:', error)
    return NextResponse.json({ error: 'Error al crear el caso de postventa' }, { status: 500 })
  }
}
