import type { Prisma } from '@prisma/client'
import type { Logger } from 'pino'
import { BusinessError } from '@/lib/api-handler'
import { getRegionByCodigo } from '@/lib/regiones-chile'
import type { CreateProjectEventWithProjectUpdateInput } from '@/lib/validations/calendar-validations'
import type { CreateVisitEventWithUpdateInput } from '@/lib/validations/visit-event-validations'
import type { CreateAftersaleEventWithUpdateInput } from '@/lib/validations/aftersale-event-validations'

type TransactionClient = Prisma.TransactionClient

function normalizeRegion(region: string): string {
  return getRegionByCodigo(region)?.nombre || region
}

export async function createProjectEventWithProjectUpdate(
  tx: TransactionClient,
  body: CreateProjectEventWithProjectUpdateInput,
  logger: Logger
) {
  const currentProject = await tx.project.findUnique({
    where: { id: body.projectId },
    select: {
      id: true,
      phone: true,
      street: true,
      apartment: true,
      comuna: true,
      region: true,
      windowsCount: true,
      squareMeters: true,
      description: true,
      projectStatus: {
        select: {
          isFinal: true,
        },
      },
    },
  })

  if (!currentProject) {
    throw new BusinessError('Proyecto no encontrado', 404)
  }

  if (currentProject.projectStatus?.isFinal) {
    throw new BusinessError('No se pueden crear eventos para proyectos finalizados', 400)
  }

  const hasChanges =
    currentProject.phone !== body.phone ||
    currentProject.street !== body.street ||
    currentProject.apartment !== body.apartment ||
    currentProject.comuna !== body.comuna ||
    currentProject.region !== body.region ||
    currentProject.windowsCount !== body.windowsCount ||
    currentProject.squareMeters.toString() !== body.squareMeters.toString() ||
    currentProject.description !== body.description

  if (hasChanges) {
    await tx.project.update({
      where: { id: body.projectId },
      data: {
        phone: body.phone,
        street: body.street,
        apartment: body.apartment,
        comuna: body.comuna,
        region: body.region,
        windowsCount: body.windowsCount,
        squareMeters: body.squareMeters,
        description: body.description,
      },
    })

    logger.info(
      {
        projectId: body.projectId,
        changedFields: {
          phone: currentProject.phone !== body.phone,
          street: currentProject.street !== body.street,
          apartment: currentProject.apartment !== body.apartment,
          comuna: currentProject.comuna !== body.comuna,
          region: currentProject.region !== body.region,
          windowsCount: currentProject.windowsCount !== body.windowsCount,
          squareMeters: currentProject.squareMeters.toString() !== body.squareMeters.toString(),
          description: currentProject.description !== body.description,
        },
      },
      'Project data updated during event creation'
    )
  }

  const existingEvent = await tx.projectEvent.findFirst({
    where: {
      projectId: body.projectId,
      scheduledDate: body.scheduledDate,
    },
  })

  if (existingEvent) {
    throw new BusinessError('Ya existe un evento para este proyecto en esta fecha', 400)
  }

  const event = await tx.projectEvent.create({
    data: {
      projectId: body.projectId,
      scheduledDate: body.scheduledDate,
      tasks: body.tasks || [],
      ...(body.teamTagIds &&
        body.teamTagIds.length > 0 && {
          teamTags: {
            connect: body.teamTagIds.map((id) => ({ id })),
          },
        }),
    },
    include: {
      project: {
        include: {
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
          projectStatus: {
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
      },
      teamTags: {
        include: {
          color: true,
        },
      },
    },
  })

  return { event, projectUpdated: hasChanges }
}

export async function createVisitEventWithVisitUpdate(
  tx: TransactionClient,
  body: CreateVisitEventWithUpdateInput,
  logger: Logger
) {
  const regionNombre = normalizeRegion(body.region)
  const currentVisit = await tx.visit.findUnique({
    where: { id: body.visitId },
    select: {
      id: true,
      name: true,
      phone: true,
      street: true,
      apartment: true,
      comuna: true,
      region: true,
      observations: true,
      visitStatusId: true,
      visitStatus: {
        select: {
          isFinal: true,
        },
      },
    },
  })

  if (!currentVisit) {
    throw new BusinessError('Visita no encontrada', 404)
  }

  if (currentVisit.visitStatus?.isFinal) {
    throw new BusinessError('No se pueden crear eventos para visitas finalizadas', 400)
  }

  const hasVisitChanges =
    currentVisit.visitStatusId !== body.visitStatusId ||
    currentVisit.name !== body.name ||
    currentVisit.phone !== (body.phone || null) ||
    currentVisit.observations !== (body.observations || null) ||
    currentVisit.street !== body.street ||
    currentVisit.apartment !== (body.apartment || null) ||
    currentVisit.comuna !== body.comuna ||
    currentVisit.region !== regionNombre

  if (hasVisitChanges) {
    await tx.visit.update({
      where: { id: body.visitId },
      data: {
        visitStatusId: body.visitStatusId,
        name: body.name,
        phone: body.phone || null,
        observations: body.observations || null,
        street: body.street,
        apartment: body.apartment || null,
        comuna: body.comuna,
        region: regionNombre,
      },
    })

    logger.info(
      {
        visitId: body.visitId,
        changedFields: {
          visitStatusId: currentVisit.visitStatusId !== body.visitStatusId,
          name: currentVisit.name !== body.name,
          phone: currentVisit.phone !== (body.phone || null),
          observations: currentVisit.observations !== (body.observations || null),
          street: currentVisit.street !== body.street,
          apartment: currentVisit.apartment !== (body.apartment || null),
          comuna: currentVisit.comuna !== body.comuna,
          region: currentVisit.region !== regionNombre,
        },
      },
      'Visit updated'
    )
  }

  const existingEvent = await tx.visitEvent.findFirst({
    where: {
      visitId: body.visitId,
      scheduledDate: body.scheduledDate,
    },
  })

  if (existingEvent) {
    throw new BusinessError('Ya existe un evento para esta visita en esta fecha', 400)
  }

  const event = await tx.visitEvent.create({
    data: {
      visitId: body.visitId,
      scheduledDate: body.scheduledDate,
      ...(body.teamTagIds &&
        body.teamTagIds.length > 0 && {
          teamTags: {
            connect: body.teamTagIds.map((id) => ({ id })),
          },
        }),
    },
    include: {
      visit: {
        include: {
          visitStatus: {
            include: {
              color: {
                select: {
                  bgClass: true,
                  textClass: true,
                },
              },
            },
          },
        },
      },
      teamTags: {
        include: {
          color: true,
        },
      },
    },
  })

  return { event, visitUpdated: hasVisitChanges }
}

export async function createAftersaleEventWithRelatedUpdates(
  tx: TransactionClient,
  body: CreateAftersaleEventWithUpdateInput,
  logger: Logger
) {
  const regionNombre = normalizeRegion(body.region)
  const currentAftersale = await tx.aftersale.findUnique({
    where: { id: body.aftersaleId },
    select: {
      id: true,
      projectId: true,
      aftersaleStatusId: true,
      contactPhone: true,
      description: true,
      tasks: true,
      aftersaleStatus: {
        select: {
          isFinal: true,
        },
      },
      project: {
        select: {
          id: true,
          street: true,
          apartment: true,
          comuna: true,
          region: true,
        },
      },
    },
  })

  if (!currentAftersale) {
    throw new BusinessError('Postventa no encontrada', 404)
  }

  if (currentAftersale.aftersaleStatus?.isFinal) {
    throw new BusinessError('No se pueden crear eventos para postventas finalizadas', 400)
  }

  const hasAftersaleChanges =
    currentAftersale.aftersaleStatusId !== body.aftersaleStatusId ||
    currentAftersale.contactPhone !== body.contactPhone ||
    currentAftersale.description !== body.description ||
    JSON.stringify(currentAftersale.tasks) !== JSON.stringify(body.tasks || [])

  const hasProjectChanges =
    currentAftersale.project.street !== body.street ||
    currentAftersale.project.apartment !== body.apartment ||
    currentAftersale.project.comuna !== body.comuna ||
    currentAftersale.project.region !== regionNombre

  if (hasAftersaleChanges) {
    await tx.aftersale.update({
      where: { id: body.aftersaleId },
      data: {
        aftersaleStatusId: body.aftersaleStatusId,
        contactPhone: body.contactPhone,
        description: body.description,
        tasks: body.tasks || [],
      },
    })

    logger.info(
      {
        aftersaleId: body.aftersaleId,
        changedFields: {
          aftersaleStatusId: currentAftersale.aftersaleStatusId !== body.aftersaleStatusId,
          contactPhone: currentAftersale.contactPhone !== body.contactPhone,
          description: currentAftersale.description !== body.description,
          tasks: JSON.stringify(currentAftersale.tasks) !== JSON.stringify(body.tasks || []),
        },
      },
      'Aftersale updated'
    )
  }

  if (hasProjectChanges) {
    await tx.project.update({
      where: { id: currentAftersale.projectId },
      data: {
        street: body.street,
        apartment: body.apartment,
        comuna: body.comuna,
        region: regionNombre,
      },
    })

    logger.info(
      {
        projectId: currentAftersale.projectId,
        changedFields: {
          street: currentAftersale.project.street !== body.street,
          apartment: currentAftersale.project.apartment !== body.apartment,
          comuna: currentAftersale.project.comuna !== body.comuna,
          region: currentAftersale.project.region !== regionNombre,
        },
      },
      'Project address updated'
    )
  }

  const existingEvent = await tx.aftersaleEvent.findFirst({
    where: {
      aftersaleId: body.aftersaleId,
      scheduledDate: body.scheduledDate,
    },
  })

  if (existingEvent) {
    throw new BusinessError('Ya existe un evento para esta postventa en esta fecha', 400)
  }

  const event = await tx.aftersaleEvent.create({
    data: {
      aftersaleId: body.aftersaleId,
      scheduledDate: body.scheduledDate,
      ...(body.teamTagIds &&
        body.teamTagIds.length > 0 && {
          teamTags: {
            connect: body.teamTagIds.map((id) => ({ id })),
          },
        }),
    },
    include: {
      aftersale: {
        include: {
          project: {
            include: {
              customer: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          aftersaleStatus: {
            include: {
              color: {
                select: {
                  bgClass: true,
                  textClass: true,
                },
              },
            },
          },
        },
      },
      teamTags: {
        include: {
          color: true,
        },
      },
    },
  })

  return {
    event,
    aftersaleUpdated: hasAftersaleChanges,
    projectUpdated: hasProjectChanges,
  }
}
