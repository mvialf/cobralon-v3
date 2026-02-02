/**
 * Configuración Centralizada de Tipos de Eventos del Calendario
 *
 * Este archivo implementa el **Component Mapping Pattern** para escalar
 * edición/eliminación de eventos del calendario de forma type-safe.
 *
 * VENTAJAS:
 * - Agregar nuevo tipo de evento = agregar 1 entrada en este config
 * - Zero condicionales en código de UI
 * - Type-safe con discriminated union
 * - Configuración centralizada en un solo lugar
 *
 * ARQUITECTURA:
 * - Cada tipo de evento tiene su Dialog, Card y hooks de mutations
 * - EventCalendar usa esta config para renderizar dinámicamente
 * - Vistas (WeekView, MonthView) usan esta config para renderizar cards
 */

import type { ComponentType } from 'react'
import type { UseMutationResult } from '@tanstack/react-query'
import type { CalendarEventType } from '@/lib/types/calendar'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Configuración para cada tipo de evento
 *
 * NOTA: Usamos `any` para los componentes para evitar TypeScript gymnastics
 * con discriminated unions. En runtime, TypeScript garantiza type-safety
 * porque obtenemos el componente correcto basado en event.type.
 */
interface EventTypeConfig {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Dialog: ComponentType<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Card: ComponentType<any>

  // Hooks de mutations (retornan UseMutationResult)
  // Los hooks se instancian en el componente que los usa, aquí solo guardamos la función
  useDeleteMutation: () => UseMutationResult<void, Error, string, unknown>

  // Hook para actualizar fecha (drag & drop)
  useUpdateDateMutation: () => UseMutationResult<
    unknown,
    Error,
    { id: string; scheduledDate: Date },
    unknown
  >
}

// ============================================================================
// COMPONENT IMPORTS (Se importarán cuando existan)
// ============================================================================

import { ProjectEventDialog } from '@/components/dialogs/calendar/project-event-dialog'
import { ProjectEventCard } from '@/components/calendar/project-event-card'
import {
  useDeleteProjectEvent,
  useUpdateProjectEventDate,
} from '@/hooks/queries/use-project-events'

// Aftersale imports
import { AftersaleEventCard } from '@/components/calendar/cards/aftersale-event-card'
import { AftersaleEventDialog } from '@/components/dialogs/calendar/aftersale-event-dialog'
import {
  useDeleteAftersaleEvent,
  useUpdateAftersaleEventDate,
} from '@/hooks/queries/use-aftersale-events'

// Visit imports
import { VisitEventCard } from '@/components/calendar/cards/visit-event-card'
import { VisitEventDialog } from '@/components/dialogs/calendar/visit-event-dialog'
import { useDeleteVisitEvent, useUpdateVisitEventDate } from '@/hooks/queries/use-visit-events'

// ============================================================================
// EVENT TYPE REGISTRY (Configuración Centralizada)
// ============================================================================

/**
 * Registry de configuración para cada tipo de evento
 *
 * IMPORTANTE: Este es el ÚNICO lugar donde se define la configuración
 * para cada tipo de evento. Agregar nuevo tipo = agregar entrada aquí.
 */
export const EVENT_TYPE_REGISTRY = {
  project: {
    Dialog: ProjectEventDialog,
    Card: ProjectEventCard,
    useDeleteMutation: useDeleteProjectEvent,
    useUpdateDateMutation: useUpdateProjectEventDate,
  },

  aftersale: {
    Dialog: AftersaleEventDialog,
    Card: AftersaleEventCard,
    useDeleteMutation: useDeleteAftersaleEvent,
    useUpdateDateMutation: useUpdateAftersaleEventDate,
  },

  visit: {
    Dialog: VisitEventDialog,
    Card: VisitEventCard,
    useDeleteMutation: useDeleteVisitEvent,
    useUpdateDateMutation: useUpdateVisitEventDate,
  },
} as const satisfies Record<CalendarEventType, EventTypeConfig>

// ============================================================================
// HELPER FUNCTIONS (Type-safe getters)
// ============================================================================

/**
 * Obtiene la configuración para un tipo de evento
 * Type-safe con exhaustiveness checking
 */
export function getEventConfig(type: CalendarEventType): EventTypeConfig {
  return EVENT_TYPE_REGISTRY[type]
}

/**
 * Obtiene el Dialog component para un tipo de evento
 */
export function getEventDialog(type: CalendarEventType) {
  return EVENT_TYPE_REGISTRY[type].Dialog
}

/**
 * Obtiene el Card component para un tipo de evento
 */
export function getEventCard(type: CalendarEventType) {
  return EVENT_TYPE_REGISTRY[type].Card
}

/**
 * Obtiene el hook de delete mutation para un tipo de evento
 */
export function getDeleteMutationHook(type: CalendarEventType) {
  return EVENT_TYPE_REGISTRY[type].useDeleteMutation
}

/**
 * Obtiene el hook de update date mutation para un tipo de evento
 */
export function getUpdateDateMutationHook(type: CalendarEventType) {
  return EVENT_TYPE_REGISTRY[type].useUpdateDateMutation
}
