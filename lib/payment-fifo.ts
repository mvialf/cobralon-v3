import { calculateProjectBalance } from './validations/payment-validations'

// Re-exportar calculateProjectBalance para uso en otros componentes
export { calculateProjectBalance }

/**
 * Type para proyecto con balance pendiente
 */
export type ProjectWithBalance = {
  id: string
  projectNumber: string
  projectName: string | null
  totalAmount: number | null
  currency: string
  createdAt: Date
  paymentAllocations?: Array<{
    allocatedAmount: number
    payment?: { status: string }
  }>
}

/**
 * Type para el resultado de distribución FIFO
 */
export type FIFOAllocation = {
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
 * @param totalAmount - Monto total del pago a distribuir
 * @param projects - Array de proyectos con balance pendiente
 * @returns Array de allocations calculadas automáticamente (FIFO)
 *
 * @example
 * const projects = [
 *   { id: '1', totalAmount: 500, createdAt: new Date('2024-06-01'), allocations: [{allocatedAmount: 200}] }, // Balance: 300
 *   { id: '2', totalAmount: 400, createdAt: new Date('2024-08-01'), allocations: [] }, // Balance: 400
 * ]
 * const allocations = calculateFIFO(500, projects)
 * // Resultado: [
 * //   { projectId: '1', allocatedAmount: 300, isFullyPaid: true },   // Cierra proyecto 1
 * //   { projectId: '2', allocatedAmount: 200, isFullyPaid: false },  // Abono a proyecto 2
 * // ]
 */
export function calculateFIFO(
  totalAmount: number,
  projects: ProjectWithBalance[]
): FIFOAllocation[] {
  // Ordenar proyectos por fecha de creación (más antiguo primero)
  const sorted = [...projects].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

  const allocations: FIFOAllocation[] = []
  let remaining = totalAmount

  for (const project of sorted) {
    if (remaining <= 0) break

    // Calcular balance del proyecto
    const { balance } = calculateProjectBalance({
      totalAmount: project.totalAmount,
      allocations: project.paymentAllocations,
    })

    // Si el proyecto ya está pagado completamente, skip
    if (balance <= 0) continue

    // Asignar el menor entre lo que queda por asignar y el balance del proyecto
    const allocated = Math.min(balance, remaining)

    allocations.push({
      projectId: project.id,
      projectNumber: project.projectNumber,
      projectName: project.projectName,
      balance,
      allocatedAmount: allocated,
      isFullyPaid: allocated >= balance,
    })

    remaining -= allocated
  }

  return allocations
}

/**
 * Valida que la suma de allocations manuales sea igual al monto total
 *
 * @param totalAmount - Monto total del pago
 * @param allocations - Array de allocations manuales
 * @returns true si la suma coincide (con tolerancia de 0.01 para decimales)
 */
export function validateAllocationsSum(
  totalAmount: number,
  allocations: Array<{ allocatedAmount: number }>
): boolean {
  const sum = allocations.reduce((acc, a) => acc + a.allocatedAmount, 0)
  return Math.abs(sum - totalAmount) < 0.01
}

/**
 * Filtra proyectos que tienen balance pendiente (para FIFO)
 *
 * @param projects - Array de proyectos del cliente
 * @returns Solo proyectos con balance > 0
 */
export function filterProjectsWithBalance(projects: ProjectWithBalance[]): ProjectWithBalance[] {
  return projects.filter((project) => {
    const { balance } = calculateProjectBalance({
      totalAmount: project.totalAmount,
      allocations: project.paymentAllocations,
    })
    return balance > 0
  })
}

/**
 * Obtiene el total de balance pendiente de un array de proyectos
 *
 * @param projects - Array de proyectos
 * @returns Suma total de balances pendientes
 */
export function getTotalPendingBalance(projects: ProjectWithBalance[]): number {
  return projects.reduce((sum, project) => {
    const { balance } = calculateProjectBalance({
      totalAmount: project.totalAmount,
      allocations: project.paymentAllocations,
    })
    return sum + Math.max(0, balance)
  }, 0)
}
