import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createApiError, handleMutationError } from '@/lib/errors'

export interface CommissionTier {
  id: string
  minInstallments: number | null
  maxInstallments: number | null
  percentageFee: number
  fixedFee: number
}

export interface PaymentMethod {
  id: string
  name: string
  icon: string | null
  active: boolean
  hasInstallments: boolean
  maxInstallments: number | null
  commissionTiers: CommissionTier[]
  order: number
}

interface PaymentMethodsResponse {
  paymentMethods: PaymentMethod[]
}

// ============================================================================
// QUERY
// ============================================================================

export function usePaymentMethods() {
  return useQuery<PaymentMethod[]>({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const response = await fetch('/api/payment-methods')

      if (!response.ok) {
        throw new Error(
          `Error al cargar métodos de pago: ${response.status} ${response.statusText}`
        )
      }

      const data: PaymentMethodsResponse = await response.json()
      return data.paymentMethods || []
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

// ============================================================================
// MUTATIONS
// ============================================================================

export function useCreatePaymentMethod() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: Record<string, unknown>): Promise<PaymentMethod> => {
      const response = await fetch('/api/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw await createApiError(response, 'Error al crear método de pago')
      }

      const data = await response.json()
      return data.paymentMethod
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] })
      toast.success('Método de pago creado exitosamente')
    },
    onError: (error) => {
      handleMutationError(error, { 409: 'Ya existe un método de pago con ese nombre' })
    },
  })
}

export function useUpdatePaymentMethod() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: { id: string } & Record<string, unknown>): Promise<PaymentMethod> => {
      const response = await fetch(`/api/payment-methods/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw await createApiError(response, 'Error al actualizar método de pago')
      }

      const data = await response.json()
      return data.paymentMethod
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] })
      toast.success('Método de pago actualizado exitosamente')
    },
    onError: (error) => {
      handleMutationError(error, { 409: 'Ya existe un método de pago con ese nombre' })
    },
  })
}
