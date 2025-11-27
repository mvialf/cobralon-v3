/**
 * Tests para calendar-event-updates.ts
 *
 * Verifica las funciones añadidas en commit 51cfac5:
 * - updateVisitFields: Actualiza campos de Visit al editar evento
 * - updateAftersaleFields: Actualiza campos de Aftersale al editar evento
 * - extractVisitFieldsPayload: Extrae payload para API de visits
 * - extractAftersaleFieldsPayload: Extrae payload para API de aftersales
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  updateVisitFields,
  updateAftersaleFields,
  extractVisitFieldsPayload,
  extractAftersaleFieldsPayload,
  type UpdateVisitFieldsPayload,
  type UpdateAftersaleFieldsPayload,
} from '../calendar-event-updates'
import type { VisitEventWithUpdateFormValues } from '@/lib/validations/visit-event-validations'
import type { AftersaleEventWithUpdateFormValues } from '@/lib/validations/aftersale-event-validations'

// ============================================================================
// TEST DATA
// ============================================================================

const mockVisitFormData: VisitEventWithUpdateFormValues = {
  visitId: '123e4567-e89b-12d3-a456-426614174000',
  scheduledDate: '2025-11-28',
  visitStatusId: '123e4567-e89b-12d3-a456-426614174001',
  name: 'Juan Pérez',
  phone: '+56912345678',
  observations: 'Cliente solicita medición en la mañana',
  street: 'Av. Providencia 1234',
  apartment: 'Depto 501',
  comuna: 'Providencia',
  region: 'Metropolitana de Santiago',
  teamTagIds: ['tag-1', 'tag-2'],
}

const mockAftersaleFormData: AftersaleEventWithUpdateFormValues = {
  aftersaleId: '123e4567-e89b-12d3-a456-426614174002',
  scheduledDate: '2025-11-29',
  aftersaleStatusId: '123e4567-e89b-12d3-a456-426614174003',
  contactPhone: '+56987654321',
  description: 'Reparación de cortina en dormitorio',
  tasks: [
    { id: 'task-1', text: 'Revisar rieles', completed: false },
    { id: 'task-2', text: 'Ajustar cadena', completed: true },
  ],
  street: 'Los Leones 2000',
  apartment: null,
  comuna: 'Las Condes',
  region: 'Metropolitana de Santiago',
  teamTagIds: ['tag-3'],
}

// ============================================================================
// EXTRACT PAYLOAD TESTS
// ============================================================================

describe('extractVisitFieldsPayload', () => {
  it('debe extraer todos los campos correctamente', () => {
    const payload = extractVisitFieldsPayload(mockVisitFormData)

    expect(payload).toEqual({
      name: 'Juan Pérez',
      phone: '+56912345678',
      observations: 'Cliente solicita medición en la mañana',
      visitStatusId: '123e4567-e89b-12d3-a456-426614174001',
      street: 'Av. Providencia 1234',
      apartment: 'Depto 501',
      comuna: 'Providencia',
      region: 'Metropolitana de Santiago',
    })
  })

  it('debe excluir campos que no pertenecen al payload (visitId, scheduledDate, teamTagIds)', () => {
    const payload = extractVisitFieldsPayload(mockVisitFormData)

    // Estos campos NO deben estar en el payload porque se manejan por separado
    expect(payload).not.toHaveProperty('visitId')
    expect(payload).not.toHaveProperty('scheduledDate')
    expect(payload).not.toHaveProperty('teamTagIds')
  })

  it('debe manejar campos opcionales como undefined', () => {
    const dataWithOptionals: VisitEventWithUpdateFormValues = {
      ...mockVisitFormData,
      phone: undefined,
      observations: null,
      apartment: null,
    }

    const payload = extractVisitFieldsPayload(dataWithOptionals)

    expect(payload.phone).toBeUndefined()
    expect(payload.observations).toBeNull()
    expect(payload.apartment).toBeNull()
  })

  it('debe retornar el tipo correcto UpdateVisitFieldsPayload', () => {
    const payload = extractVisitFieldsPayload(mockVisitFormData)

    // Type assertion - si compila, el tipo es correcto
    const _typeCheck: UpdateVisitFieldsPayload = payload
    expect(_typeCheck).toBeDefined()
  })
})

describe('extractAftersaleFieldsPayload', () => {
  it('debe extraer todos los campos correctamente', () => {
    const payload = extractAftersaleFieldsPayload(mockAftersaleFormData)

    expect(payload).toEqual({
      aftersaleStatusId: '123e4567-e89b-12d3-a456-426614174003',
      contactPhone: '+56987654321',
      description: 'Reparación de cortina en dormitorio',
      tasks: [
        { id: 'task-1', text: 'Revisar rieles', completed: false },
        { id: 'task-2', text: 'Ajustar cadena', completed: true },
      ],
      street: 'Los Leones 2000',
      apartment: null,
      comuna: 'Las Condes',
      region: 'Metropolitana de Santiago',
    })
  })

  it('debe excluir campos que no pertenecen al payload (aftersaleId, scheduledDate, teamTagIds)', () => {
    const payload = extractAftersaleFieldsPayload(mockAftersaleFormData)

    expect(payload).not.toHaveProperty('aftersaleId')
    expect(payload).not.toHaveProperty('scheduledDate')
    expect(payload).not.toHaveProperty('teamTagIds')
  })

  it('debe manejar tasks como undefined', () => {
    const dataWithoutTasks: AftersaleEventWithUpdateFormValues = {
      ...mockAftersaleFormData,
      tasks: undefined,
    }

    const payload = extractAftersaleFieldsPayload(dataWithoutTasks)

    expect(payload.tasks).toBeUndefined()
  })

  it('debe manejar tasks como array vacío', () => {
    const dataWithEmptyTasks: AftersaleEventWithUpdateFormValues = {
      ...mockAftersaleFormData,
      tasks: [],
    }

    const payload = extractAftersaleFieldsPayload(dataWithEmptyTasks)

    expect(payload.tasks).toEqual([])
  })

  it('debe retornar el tipo correcto UpdateAftersaleFieldsPayload', () => {
    const payload = extractAftersaleFieldsPayload(mockAftersaleFormData)

    const _typeCheck: UpdateAftersaleFieldsPayload = payload
    expect(_typeCheck).toBeDefined()
  })
})

// ============================================================================
// UPDATE VISIT FIELDS TESTS
// ============================================================================

describe('updateVisitFields', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetAllMocks()
  })

  it('debe llamar a fetch con la URL correcta', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    })

    await updateVisitFields('visit-123', mockVisitFormData)

    expect(mockFetch).toHaveBeenCalledWith('/api/visits/visit-123', expect.any(Object))
  })

  it('debe usar método PUT', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    })

    await updateVisitFields('visit-123', mockVisitFormData)

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'PUT',
      })
    )
  })

  it('debe enviar Content-Type application/json', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    })

    await updateVisitFields('visit-123', mockVisitFormData)

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
      })
    )
  })

  it('debe enviar el body con los campos correctos (sin visitId, scheduledDate, teamTagIds)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    })

    await updateVisitFields('visit-123', mockVisitFormData)

    const callArgs = mockFetch.mock.calls[0]
    const bodyParsed = JSON.parse(callArgs[1].body)

    expect(bodyParsed).toEqual({
      name: 'Juan Pérez',
      phone: '+56912345678',
      observations: 'Cliente solicita medición en la mañana',
      visitStatusId: '123e4567-e89b-12d3-a456-426614174001',
      street: 'Av. Providencia 1234',
      apartment: 'Depto 501',
      comuna: 'Providencia',
      region: 'Metropolitana de Santiago',
    })

    // Verificar que NO incluye estos campos
    expect(bodyParsed).not.toHaveProperty('visitId')
    expect(bodyParsed).not.toHaveProperty('scheduledDate')
    expect(bodyParsed).not.toHaveProperty('teamTagIds')
  })

  it('debe resolver sin error cuando response.ok es true', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    })

    await expect(updateVisitFields('visit-123', mockVisitFormData)).resolves.toBeUndefined()
  })

  it('debe lanzar error con mensaje del API cuando response.ok es false', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Visit no encontrada' }),
    })

    await expect(updateVisitFields('visit-123', mockVisitFormData)).rejects.toThrow(
      'Visit no encontrada'
    )
  })

  it('debe lanzar error genérico cuando API no retorna mensaje de error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({}),
    })

    await expect(updateVisitFields('visit-123', mockVisitFormData)).rejects.toThrow(
      'Error al actualizar datos de la visita'
    )
  })
})

// ============================================================================
// UPDATE AFTERSALE FIELDS TESTS
// ============================================================================

describe('updateAftersaleFields', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetAllMocks()
  })

  it('debe llamar a fetch con la URL correcta', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    })

    await updateAftersaleFields('aftersale-456', mockAftersaleFormData)

    expect(mockFetch).toHaveBeenCalledWith('/api/aftersales/aftersale-456', expect.any(Object))
  })

  it('debe usar método PUT', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    })

    await updateAftersaleFields('aftersale-456', mockAftersaleFormData)

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'PUT',
      })
    )
  })

  it('debe enviar Content-Type application/json', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    })

    await updateAftersaleFields('aftersale-456', mockAftersaleFormData)

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
      })
    )
  })

  it('debe enviar el body con los campos correctos (sin aftersaleId, scheduledDate, teamTagIds)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    })

    await updateAftersaleFields('aftersale-456', mockAftersaleFormData)

    const callArgs = mockFetch.mock.calls[0]
    const bodyParsed = JSON.parse(callArgs[1].body)

    expect(bodyParsed).toEqual({
      aftersaleStatusId: '123e4567-e89b-12d3-a456-426614174003',
      contactPhone: '+56987654321',
      description: 'Reparación de cortina en dormitorio',
      tasks: [
        { id: 'task-1', text: 'Revisar rieles', completed: false },
        { id: 'task-2', text: 'Ajustar cadena', completed: true },
      ],
      street: 'Los Leones 2000',
      apartment: null,
      comuna: 'Las Condes',
      region: 'Metropolitana de Santiago',
    })

    // Verificar que NO incluye estos campos
    expect(bodyParsed).not.toHaveProperty('aftersaleId')
    expect(bodyParsed).not.toHaveProperty('scheduledDate')
    expect(bodyParsed).not.toHaveProperty('teamTagIds')
  })

  it('debe resolver sin error cuando response.ok es true', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    })

    await expect(
      updateAftersaleFields('aftersale-456', mockAftersaleFormData)
    ).resolves.toBeUndefined()
  })

  it('debe lanzar error con mensaje del API cuando response.ok es false', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Aftersale no encontrado' }),
    })

    await expect(updateAftersaleFields('aftersale-456', mockAftersaleFormData)).rejects.toThrow(
      'Aftersale no encontrado'
    )
  })

  it('debe lanzar error genérico cuando API no retorna mensaje de error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({}),
    })

    await expect(updateAftersaleFields('aftersale-456', mockAftersaleFormData)).rejects.toThrow(
      'Error al actualizar datos del aftersale'
    )
  })

  it('debe manejar tasks undefined correctamente', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    })

    const dataWithoutTasks: AftersaleEventWithUpdateFormValues = {
      ...mockAftersaleFormData,
      tasks: undefined,
    }

    await updateAftersaleFields('aftersale-456', dataWithoutTasks)

    const callArgs = mockFetch.mock.calls[0]
    const bodyParsed = JSON.parse(callArgs[1].body)

    expect(bodyParsed.tasks).toBeUndefined()
  })
})

// ============================================================================
// TYPE TESTS - Verificar que teamTagIds existe en los tipos (commit 51cfac5)
// ============================================================================

describe('Tipos UpdateEventInput (commit 51cfac5)', () => {
  it('VisitEventWithUpdateFormValues debe incluir teamTagIds', () => {
    // Este test verifica en tiempo de compilación que teamTagIds existe
    const data: VisitEventWithUpdateFormValues = {
      visitId: 'test',
      scheduledDate: '2025-01-01',
      visitStatusId: 'status-id',
      name: 'Test',
      street: 'Test St',
      comuna: 'Test',
      region: 'Test',
      teamTagIds: ['tag-1', 'tag-2'], // <-- Añadido en commit 51cfac5
    }

    expect(data.teamTagIds).toEqual(['tag-1', 'tag-2'])
  })

  it('AftersaleEventWithUpdateFormValues debe incluir teamTagIds', () => {
    const data: AftersaleEventWithUpdateFormValues = {
      aftersaleId: 'test',
      scheduledDate: '2025-01-01',
      aftersaleStatusId: 'status-id',
      contactPhone: '+56912345678',
      description: 'Test',
      street: 'Test St',
      apartment: null,
      comuna: 'Test',
      region: 'Test',
      teamTagIds: ['tag-3'], // <-- Añadido en commit 51cfac5
    }

    expect(data.teamTagIds).toEqual(['tag-3'])
  })

  it('teamTagIds puede ser null', () => {
    const visitData: VisitEventWithUpdateFormValues = {
      visitId: 'test',
      scheduledDate: '2025-01-01',
      visitStatusId: 'status-id',
      name: 'Test',
      street: 'Test St',
      comuna: 'Test',
      region: 'Test',
      teamTagIds: null,
    }

    const aftersaleData: AftersaleEventWithUpdateFormValues = {
      aftersaleId: 'test',
      scheduledDate: '2025-01-01',
      aftersaleStatusId: 'status-id',
      contactPhone: '+56912345678',
      description: 'Test',
      street: 'Test St',
      apartment: null,
      comuna: 'Test',
      region: 'Test',
      teamTagIds: null,
    }

    expect(visitData.teamTagIds).toBeNull()
    expect(aftersaleData.teamTagIds).toBeNull()
  })
})
