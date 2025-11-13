import type { ProjectEvent, Project, Customer, ProjectStatus, BadgeColor } from '@prisma/client'

// Tipo unificado para eventos en UI
export type CalendarEventType = 'project' | 'aftersale' | 'visit'

// ProjectEvent con relaciones completas
export type ProjectEventWithRelations = ProjectEvent & {
  project: Project & {
    customer: Customer
    projectStatus:
      | (ProjectStatus & {
          color: BadgeColor
        })
      | null
  }
}

// Tipo discriminado unión para eventos del calendario
export type CalendarEvent = {
  type: 'project'
  data: ProjectEventWithRelations
}

// Input types para crear/actualizar eventos
export interface CreateProjectEventInput {
  projectId: string
  scheduledDate: Date
  notes?: string | null
}

export interface UpdateProjectEventInput {
  scheduledDate?: Date
  notes?: string | null
}

// Query params para rango de fechas
export interface CalendarQueryParams {
  start: Date
  end: Date
}
