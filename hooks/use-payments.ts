import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import type { Payment } from '@/app/payments/columns'

/**
 * Hook para manejar el estado y fetching de pagos
 *
 * @returns {Object} Estado y funciones de pagos
 * @returns {Payment[]} payments - Lista de pagos
 * @returns {boolean} isLoading - Estado de carga
 * @returns {Function} fetchPayments - Función para recargar pagos
 * @returns {Array} uniquePaymentMethods - Métodos de pago únicos para filtros
 *
 * @example
 * ```tsx
 * const { payments, isLoading, fetchPayments, uniquePaymentMethods } = usePayments()
 * ```
 */
export function usePayments() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchPayments = async () => {
    try {
      setIsLoading(true)

      // Fetch con límite alto para paginación client-side
      const response = await fetch('/api/payments?limit=1000')
      if (!response.ok) throw new Error('Error al cargar pagos')

      const data = await response.json()
      setPayments(data.payments)
    } catch (error) {
      console.error('Error fetching payments:', error)
      toast.error('Error al cargar pagos')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [])

  // Obtener métodos de pago únicos para filtro
  const uniquePaymentMethods = useMemo(() => {
    const methods = new Set(payments.map((p) => p.paymentMethod.name))
    return Array.from(methods).map((method) => ({
      label: method,
      value: method,
    }))
  }, [payments])

  return {
    payments,
    isLoading,
    fetchPayments,
    uniquePaymentMethods,
  }
}
