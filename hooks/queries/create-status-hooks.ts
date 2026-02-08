import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createApiError, handleMutationError } from '@/lib/errors'

// Tipo base compartido por los 3 status
export interface StatusBase {
  id: string
  name: string
  isInitial?: boolean
  isFinal?: boolean
  color: { bgClass: string; textClass?: string }
}

interface StatusConfig {
  queryKey: string // 'project-statuses'
  endpoint: string // '/api/project-status'
  responseKey: string // 'projectStatuses' (plural, para GET list)
  responseSingularKey: string // 'projectStatus' (singular, para POST/PUT response)
  entityLabel: string // 'Estado de proyecto'
}

export function createStatusHooks<T extends StatusBase>(config: StatusConfig) {
  function useStatuses() {
    return useQuery<T[]>({
      queryKey: [config.queryKey],
      queryFn: async () => {
        const response = await fetch(config.endpoint)
        if (!response.ok) {
          throw new Error(`Error al cargar estados: ${response.status} ${response.statusText}`)
        }
        const data = await response.json()
        return data[config.responseKey] || []
      },
      staleTime: 30 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnMount: true,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    })
  }

  function useCreateStatus() {
    const queryClient = useQueryClient()

    return useMutation({
      mutationFn: async (payload: Record<string, unknown>): Promise<T> => {
        const response = await fetch(config.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          throw await createApiError(response, `Error al crear ${config.entityLabel.toLowerCase()}`)
        }

        const data = await response.json()
        return data[config.responseSingularKey]
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [config.queryKey] })
        toast.success(`${config.entityLabel} creado exitosamente`)
      },
      onError: (error) => {
        handleMutationError(error, { 409: 'Ya existe un estado con ese nombre' })
      },
    })
  }

  function useUpdateStatus() {
    const queryClient = useQueryClient()

    return useMutation({
      mutationFn: async ({
        id,
        ...payload
      }: { id: string } & Record<string, unknown>): Promise<T> => {
        const response = await fetch(`${config.endpoint}/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          throw await createApiError(
            response,
            `Error al actualizar ${config.entityLabel.toLowerCase()}`
          )
        }

        const data = await response.json()
        return data[config.responseSingularKey]
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [config.queryKey] })
        toast.success(`${config.entityLabel} actualizado exitosamente`)
      },
      onError: (error) => {
        handleMutationError(error, { 409: 'Ya existe un estado con ese nombre' })
      },
    })
  }

  function getInitialStatus(statuses: T[]): T | undefined {
    return statuses.find((s) => s.isInitial)
  }

  function getStatusById(statuses: T[], id: string): T | undefined {
    return statuses.find((s) => s.id === id)
  }

  return { useStatuses, useCreateStatus, useUpdateStatus, getInitialStatus, getStatusById }
}
