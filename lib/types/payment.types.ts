/**
 * Types para el sistema de pagos
 *
 * Separa tipos de API/Database de tipos de UI
 * para mejor type safety y reutilización
 */

// ============================================
// API / Database Types (lo que recibes del backend)
// ============================================

/**
 * Allocation tal como viene del API
 */
export interface AllocationFromAPI {
  id: string
  allocatedAmount: number
  project: {
    id: string
    projectNumber: string
    projectName: string | null
    currency: string
  }
}

/**
 * Payment tal como viene del API
 * Incluye todas las allocations del pago
 */
export interface PaymentFromAPI {
  id: string
  amount: number
  currency: string
  date: string // ISO string
  type: 'Project' | 'Customer'
  reference: string | null
  notes: string | null
  customer: {
    id: string
    name: string
    phone: string
  }
  paymentMethod: {
    id: string
    name: string
    icon: string | null
  }
  allocations: AllocationFromAPI[]
}

// ============================================
// UI Types (lo que los componentes necesitan)
// ============================================

/**
 * PaymentAllocation para renderizar en tabla
 *
 * Es una allocation específica "aplanada" con toda
 * la info del pago asociado (desnormalizada para UI)
 */
export interface PaymentAllocation {
  id: string
  allocatedAmount: number
  payment: {
    id: string
    amount: number
    currency: string
    date: string // ISO string
    type: 'Project' | 'Customer'
    notes: string | null
    paymentMethod: {
      id: string
      name: string
      icon: string | null
    }
    customer: {
      id: string
      name: string
    }
  }
}

// ============================================
// Transform Options
// ============================================

/**
 * Orden de sorting para fechas
 */
export type SortOrder = 'asc' | 'desc'

/**
 * Opciones para transformar pagos
 */
export interface TransformOptions {
  sortOrder?: SortOrder
  filterByType?: 'Project' | 'Customer'
}
