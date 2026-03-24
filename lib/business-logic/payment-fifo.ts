/**
 * Lógica de negocio para distribución FIFO de pagos
 *
 * Implementa el principio contable First-In-First-Out (FIFO):
 * Los proyectos más antiguos se pagan primero.
 *
 * @module business-logic/payment-fifo
 */

import { FINANCIAL } from '../constants/financial-constants'

/**
 * Type para proyecto con balance pendiente (usado en FIFO)
 *
 * Usa `balance` pre-calculado en vez de recalcularlo desde allocations.
 * Esto permite que el API compute el balance una sola vez y el frontend
 * lo use directamente.
 */
export interface ProjectWithBalance {
  id: string
  projectNumber: string
  projectName: string | null
  balance: number
  createdAt: Date
}

/**
 * Type para el resultado de distribución FIFO
 */
export interface FIFOAllocation {
  projectId: string
  projectNumber: string
  projectName: string | null
  balance: number
  allocatedAmount: number
  isFullyPaid: boolean
}

/**
 * Calcula la distribución FIFO de un pago entre proyectos con balance pendiente
 *
 * Implementa el principio contable First-In-First-Out (FIFO):
 * - Ordena proyectos por fecha de creación (más antiguo primero)
 * - Distribuye el monto total empezando por el proyecto más viejo
 * - Cada proyecto recibe el mínimo entre su balance y el monto restante
 *
 * @param totalAmount - Monto total del pago a distribuir
 * @param projects - Array de proyectos con balance pendiente
 * @returns Array de allocations con detalle de distribución
 *
 * @example
 * ```ts
 * const projects = [
 *   { id: 'P3', projectNumber: '003', projectName: null, balance: 200000, createdAt: new Date('2025-03-01') },
 *   { id: 'P1', projectNumber: '001', projectName: null, balance: 300000, createdAt: new Date('2025-01-01') },
 *   { id: 'P2', projectNumber: '002', projectName: null, balance: 400000, createdAt: new Date('2025-02-01') },
 * ]
 *
 * // Pago de $500,000 a distribuir
 * const allocations = calculateFIFO(500000, projects)
 *
 * // Resultado (ordenado por fecha):
 * // [
 * //   { projectId: 'P1', balance: 300000, allocatedAmount: 300000, isFullyPaid: true },
 * //   { projectId: 'P2', balance: 400000, allocatedAmount: 200000, isFullyPaid: false }
 * // ]
 * // P3 no recibe pago porque se acabó el dinero
 * ```
 *
 * @example Edge cases
 * ```ts
 * // Caso 1: Monto mayor que todos los balances
 * calculateFIFO(2000000, projects)
 * // => Todos los proyectos quedan en balance 0, sobra dinero
 *
 * // Caso 2: Proyecto ya pagado (balance = 0)
 * calculateFIFO(100000, [{ ...project, balance: 0 }])
 * // => Skip automático
 *
 * // Caso 3: Sin proyectos
 * calculateFIFO(100000, [])
 * // => Array vacío []
 * ```
 *
 * @see {@link docs/project/analysis/frontend-calculations.md#2} - Análisis exhaustivo
 */
export function calculateFIFO(
  totalAmount: number,
  projects: ProjectWithBalance[]
): FIFOAllocation[] {
  // 1. Ordenar proyectos por fecha de creación (más antiguo primero)
  const sorted = [...projects].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

  const allocations: FIFOAllocation[] = []
  let remaining = totalAmount

  // 2. Iterar proyectos ordenados
  for (const project of sorted) {
    if (remaining <= 0) break

    // 3. Si el proyecto ya está pagado completamente, skip
    if (project.balance <= 0) continue

    // 4. Asignar el menor entre lo que queda y el balance del proyecto
    const allocated = Math.min(project.balance, remaining)

    allocations.push({
      projectId: project.id,
      projectNumber: project.projectNumber,
      projectName: project.projectName,
      balance: project.balance,
      allocatedAmount: allocated,
      isFullyPaid: allocated >= project.balance,
    })

    remaining -= allocated
  }

  return allocations
}

/**
 * Valida que la suma de allocations manuales sea exactamente igual al monto total
 *
 * Usa tolerancia de centavos para evitar problemas de punto flotante.
 * Ver {@link FINANCIAL.TOLERANCE} para el valor de tolerancia.
 *
 * @param totalAmount - Monto total esperado del pago
 * @param allocations - Array de allocations manuales
 * @returns true si la suma coincide (dentro de la tolerancia)
 *
 * @example
 * ```ts
 * // Caso 1: Suma exacta
 * validateAllocationsSum(1000, [
 *   { allocatedAmount: 600 },
 *   { allocatedAmount: 400 }
 * ])
 * // => true (suma = 1000)
 *
 * // Caso 2: Diferencia dentro de tolerancia
 * validateAllocationsSum(1000, [
 *   { allocatedAmount: 600.01 },
 *   { allocatedAmount: 399.99 }
 * ])
 * // => true (suma = 1000.00, diferencia = 0)
 *
 * // Caso 3: Diferencia significativa
 * validateAllocationsSum(1000, [
 *   { allocatedAmount: 600 },
 *   { allocatedAmount: 350 }
 * ])
 * // => false (suma = 950, diferencia = 50)
 * ```
 *
 * @see {@link docs/project/analysis/frontend-calculations.md#6} - Análisis exhaustivo
 */
export function validateAllocationsSum(
  totalAmount: number,
  allocations: Array<{ allocatedAmount: number }>
): boolean {
  const sum = allocations.reduce((acc, a) => acc + a.allocatedAmount, 0)
  return Math.abs(sum - totalAmount) < FINANCIAL.TOLERANCE
}

/**
 * Filtra proyectos que tienen balance pendiente (para FIFO)
 *
 * Útil para obtener solo proyectos elegibles para FIFO antes de calcular distribución.
 *
 * @param projects - Array de proyectos del cliente
 * @returns Solo proyectos con balance > 0
 *
 * @example
 * ```ts
 * const allProjects = [
 *   { ...p1, balance: 500 },   // pendiente
 *   { ...p2, balance: 0 },     // pagado
 *   { ...p3, balance: 1200 },  // pendiente
 * ]
 *
 * const eligible = filterProjectsWithBalance(allProjects)
 * // => [p1, p3] (solo con balance > 0)
 * ```
 */
export function filterProjectsWithBalance(projects: ProjectWithBalance[]): ProjectWithBalance[] {
  return projects.filter((project) => project.balance > 0)
}
