/**
 * Lógica de negocio para distribución FIFO de pagos
 *
 * Implementa el principio contable First-In-First-Out (FIFO):
 * Los proyectos más antiguos se pagan primero.
 *
 * @module business-logic/payment-fifo
 */

// Re-exportada desde validaciones para mantener un único lugar de definición.
export { validateAllocationsSum } from '../validations/payment-business-rules'

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
