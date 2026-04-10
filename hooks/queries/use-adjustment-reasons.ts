import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createApiError, handleMutationError } from '@/lib/errors'
import type { AdjustmentReason } from '@/lib/validations/adjustment-reason-validations'

interface AdjustmentReasonsResponse {
  adjustmentReasons: AdjustmentReason[]
}

// ============================================================================
// QUERY
// ============================================================================

export function useAdjustmentReasons() {
  return useQuery<AdjustmentReason[]>({
    queryKey: ['adjustment-reasons'],
    queryFn: async () => {
      const response = await fetch('/api/adjustment-reasons')

      if (!response.ok) {
        throw new Error(
          `Error al cargar razones de ajuste: ${response.status} ${response.statusText}`
        )
      }

      const data: AdjustmentReasonsResponse = await response.json()
      return data.adjustmentReasons || []
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

// ============================================================================
// MUTATIONS
// ============================================================================

export function useCreateAdjustmentReason() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: Record<string, unknown>): Promise<AdjustmentReason> => {
      const response = await fetch('/api/adjustment-reasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw await createApiError(response, 'Error al crear razón de ajuste')
      }

      const data = await response.json()
      return data.adjustmentReason
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adjustment-reasons'] })
      toast.success('Razón de ajuste creada exitosamente')
    },
    onError: (error) => {
      handleMutationError(error, { 409: 'Ya existe una razón con ese nombre' })
    },
  })
}

export function useUpdateAdjustmentReason() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: { id: string } & Record<string, unknown>): Promise<AdjustmentReason> => {
      const response = await fetch(`/api/adjustment-reasons/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw await createApiError(response, 'Error al actualizar razón de ajuste')
      }

      const data = await response.json()
      return data.adjustmentReason
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adjustment-reasons'] })
      toast.success('Razón de ajuste actualizada exitosamente')
    },
    onError: (error) => {
      handleMutationError(error, { 409: 'Ya existe una razón con ese nombre' })
    },
  })
}

export function useDeleteAdjustmentReason() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`/api/adjustment-reasons/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw await createApiError(response, 'Error al eliminar razón de ajuste')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adjustment-reasons'] })
      toast.success('Razón de ajuste eliminada exitosamente')
    },
    onError: (error) => {
      handleMutationError(error, { 409: 'No se puede eliminar porque tiene ajustes asociados' })
    },
  })
}
