/**
 * Funciones para actualizar campos relacionados cuando se edita un evento del calendario
 *
 * Estas funciones se usan en los diálogos de edición para sincronizar:
 * - Datos del evento (scheduledDate, teamTagIds) - via mutation
 * - Datos de la entidad relacionada (Visit/Aftersale) - via fetch directo
 *
 * @see commit 51cfac5 - fix(calendar): guardar todos los campos al editar eventos
 */

import type { ProjectEventWithProjectUpdateFormValues } from '@/lib/validations/calendar-validations'
import type { VisitEventWithUpdateFormValues } from '@/lib/validations/visit-event-validations'
import type { AftersaleEventWithUpdateFormValues } from '@/lib/validations/aftersale-event-validations'

/**
 * Payload enviado al API de visits para actualizar campos
 */
export interface UpdateVisitFieldsPayload {
  name: string
  phone?: string
  observations?: string | null
  visitStatusId: string
  street: string
  apartment?: string | null
  comuna: string
  region: string
}

/**
 * Payload enviado al API de aftersales para actualizar campos
 */
export interface UpdateAftersaleFieldsPayload {
  aftersaleStatusId: string
  contactPhone: string
  description: string
  tasks?: Array<{ id: string; text: string; completed: boolean }>
  street: string
  apartment: string | null
  comuna: string
  region: string
}

/**
 * Extrae los campos de Visit desde los form values
 */
export function extractVisitFieldsPayload(
  data: VisitEventWithUpdateFormValues
): UpdateVisitFieldsPayload {
  return {
    name: data.name,
    phone: data.phone,
    observations: data.observations,
    visitStatusId: data.visitStatusId,
    street: data.street,
    apartment: data.apartment,
    comuna: data.comuna,
    region: data.region,
  }
}

/**
 * Extrae los campos de Aftersale desde los form values
 */
export function extractAftersaleFieldsPayload(
  data: AftersaleEventWithUpdateFormValues
): UpdateAftersaleFieldsPayload {
  return {
    aftersaleStatusId: data.aftersaleStatusId,
    contactPhone: data.contactPhone,
    description: data.description,
    tasks: data.tasks,
    street: data.street,
    apartment: data.apartment,
    comuna: data.comuna,
    region: data.region,
  }
}

/**
 * Actualiza los campos de la visita (name, phone, observations, status, dirección)
 * Se usa cuando se edita un evento para mantener sincronizados los datos de la visita
 *
 * @throws Error si la respuesta no es ok
 */
export async function updateVisitFields(
  visitId: string,
  data: VisitEventWithUpdateFormValues
): Promise<void> {
  const payload = extractVisitFieldsPayload(data)

  const response = await fetch(`/api/visits/${visitId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Error al actualizar datos de la visita')
  }
}

/**
 * Actualiza los campos del aftersale y proyecto (status, contactPhone, description, tasks, dirección)
 * Se usa cuando se edita un evento para mantener sincronizados los datos
 *
 * @throws Error si la respuesta no es ok
 */
export async function updateAftersaleFields(
  aftersaleId: string,
  data: AftersaleEventWithUpdateFormValues
): Promise<void> {
  const payload = extractAftersaleFieldsPayload(data)

  const response = await fetch(`/api/aftersales/${aftersaleId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Error al actualizar datos del aftersale')
  }
}

/**
 * Actualiza los campos del proyecto (uninstallTagIds, phone, dirección, etc.)
 * Se usa cuando se edita un evento para mantener sincronizados los datos del proyecto
 *
 * @throws Error si la respuesta no es ok
 */
export async function updateProjectFields(
  projectId: string,
  data: ProjectEventWithProjectUpdateFormValues
): Promise<void> {
  const response = await fetch(`/api/projects/${projectId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uninstallTagIds: data.uninstallTagIds || [],
      phone: data.phone,
      street: data.street,
      apartment: data.apartment,
      comuna: data.comuna,
      region: data.region,
      windowsCount: data.windowsCount,
      squareMeters: data.squareMeters,
      description: data.description,
      projectStatusId: data.projectStatusId,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Error al actualizar datos del proyecto')
  }
}
