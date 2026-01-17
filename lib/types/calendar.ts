import type {
  ProjectEvent,
  Project,
  Customer,
  ProjectStatus,
  BadgeColor,
  UninstallTag,
  AftersaleEvent,
  Aftersale,
  AftersaleStatus,
  VisitEvent,
  Visit,
  VisitStatus,
  TeamTag,
} from '@prisma/client'
import type { TodoItem } from '@/hooks/use-todo-list'

// Tipo unificado para eventos en UI
export type CalendarEventType = 'project' | 'aftersale' | 'visit'

// ============================================================================
// PROJECT EVENT TYPES
// ============================================================================

// TeamTag con color para uso en eventos
export type TeamTagWithColor = TeamTag & {
  color: BadgeColor
}

// ProjectEvent con relaciones completas
export type ProjectEventWithRelations = ProjectEvent & {
  project: Project & {
    customer: Customer
    projectStatus:
      | (ProjectStatus & {
          color: BadgeColor
        })
      | null
    uninstallTags: Array<
      UninstallTag & {
        color: BadgeColor
      }
    >
  }
  teamTags: TeamTagWithColor[] // Integrantes asignados al evento
}

// Input types para crear/actualizar project events
export interface CreateProjectEventInput {
  projectId: string
  scheduledDate: Date
}

export interface UpdateProjectEventInput {
  scheduledDate?: Date
  teamTagIds?: string[] | null
  tasks?: TodoItem[]
}

// ============================================================================
// AFTERSALE EVENT TYPES
// ============================================================================

// AftersaleEvent con relaciones completas
export type AftersaleEventWithRelations = AftersaleEvent & {
  aftersale: Aftersale & {
    project: Project & {
      customer: Customer
    }
    aftersaleStatus: AftersaleStatus & {
      color: BadgeColor
    }
  }
  teamTags: TeamTagWithColor[] // Integrantes asignados al evento
}

// Input types para crear/actualizar aftersale events
export interface CreateAftersaleEventInput {
  aftersaleId: string
  scheduledDate: Date
  notes?: string | null
}

export interface UpdateAftersaleEventInput {
  scheduledDate?: Date
  notes?: string | null
  teamTagIds?: string[] | null
}

// ============================================================================
// VISIT EVENT TYPES
// ============================================================================

// VisitEvent con relaciones completas
export type VisitEventWithRelations = VisitEvent & {
  visit: Visit & {
    visitStatus: VisitStatus & {
      color: BadgeColor
    }
  }
  teamTags: TeamTagWithColor[] // Integrantes asignados al evento
}

// Input types para crear/actualizar visit events
export interface CreateVisitEventInput {
  visitId: string
  scheduledDate: Date
  notes?: string | null
}

export interface UpdateVisitEventInput {
  scheduledDate?: Date
  notes?: string | null
  teamTagIds?: string[] | null
}

// ============================================================================
// CALENDAR EVENT UNION TYPE (Discriminated Union)
// ============================================================================

// Tipo discriminado unión para eventos del calendario
export type CalendarEvent =
  | {
      type: 'project'
      data: ProjectEventWithRelations
    }
  | {
      type: 'aftersale'
      data: AftersaleEventWithRelations
    }
  | {
      type: 'visit'
      data: VisitEventWithRelations
    }

// ============================================================================
// QUERY PARAMS
// ============================================================================

// Query params para rango de fechas
export interface CalendarQueryParams {
  start: Date
  end: Date
}

// ============================================================================
// REACT QUERY TYPES (para optimistic updates)
// ============================================================================

/**
 * Estructura de datos retornada por calendar-events queries
 * Usado para tipar getQueriesData y setQueriesData
 */
export interface CalendarEventsQueryData {
  events: CalendarEvent[]
}
