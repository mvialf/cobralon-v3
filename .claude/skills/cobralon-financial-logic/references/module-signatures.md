# Signatures de Módulos de Lógica Financiera

Signatures exportadas de los 9 módulos en `lib/business-logic/`.

## `payment-fifo.ts` — Distribución FIFO

```typescript
// Distribuye pago FIFO (más antiguo primero)
calculateFIFO(totalAmount: number, projects: ProjectWithBalance[]): FIFOAllocation[]

// Valida que suma de allocations = total (con tolerancia)
validateAllocationsSum(totalAmount: number, allocations: Array<{allocatedAmount: number}>): boolean

// Filtra proyectos con balance > 0
filterProjectsWithBalance(projects: ProjectWithBalance[]): ProjectWithBalance[]
```

## `credit-management.ts` — Distribución pago/crédito

```typescript
// Calcula distribución: cuánto al proyecto, cuánto a crédito
calculatePaymentDistribution(projectBalance, paymentAmount, creditApplied): ProcessPaymentWithCreditResult

// Máximo crédito aplicable = min(creditDisponible, balanceProyecto)
calculateMaxCreditApplication(customerCredit, projectBalance): number

// Valida si puede aplicar crédito
canApplyCredit(requestedAmount, customerCredit, projectBalance): CreditApplicationValidation
```

## `credit-eligibility.ts` — Elegibilidad de crédito

```typescript
interface CreditEligibilityCheck {
  eligible: boolean
  reason?: string
  maxApplicable: number
}

// Verifica si se puede aplicar crédito (cliente tiene crédito, proyecto tiene balance, mismo cliente)
checkCreditEligibility(customerCredit: number, projectBalance: number, paymentCustomerId: string, projectCustomerId: string): CreditEligibilityCheck

// Check simple para mostrar opción de crédito en UI
shouldShowCreditOption(customerCredit: number, projectBalance: number, paymentCustomerId: string, projectCustomerId: string): boolean

// Check para mostrar opción de devolución
shouldShowRefundOption(creditBalance: number): boolean

// Label legible para tipo de transacción de crédito
getCreditTransactionTypeLabel(type: 'OVERPAYMENT' | 'APPLIED' | 'REFUND' | 'WITHDRAWAL' | 'ADJUSTMENT'): string
```

## `project-state.ts` — Estado derivado

```typescript
// Estado derivado: "Activo" o "Finalizado"
// Finalizado = (isFinal === true) AND (balance === 0)
calculateProjectState(balance: number, isFinal: boolean): ProjectState
```

## `project-balance.ts` — Cálculo de balance

```typescript
interface ProjectBalanceResult {
  totalPaid: number
  balance: number
  percentPaid: number
  isFullyPaid: boolean
}

// LA FUNCIÓN MÁS IMPORTANTE: calcula balance financiero completo de un proyecto
calculateProjectBalance(project: ProjectWithAllocations): ProjectBalanceResult

// Suma balances pendientes (positivos) de múltiples proyectos
getTotalPendingBalance(projects: ProjectWithFullAllocations[]): number
```

## `totals.ts` — Validación de integridad

```typescript
// Total = Subtotal + (Subtotal × taxRate/100)
calculateProjectTotal(subtotal: number, taxRate: number): number

// Valida total contra cálculo esperado (tolerancia: 0.01)
validateProjectTotal(subtotal, taxRate, receivedTotal): boolean
```

## `installments.ts` — Lógica de cuotas

```typescript
interface CalculatedInstallment {
  installmentNumber: number
  amount: number
  dueDate: Date
}

// Divide pago en cuotas sin interés (1-12). Última cuota absorbe centavos.
calculateInstallments(amount: number, installments: number, paymentDate: Date): CalculatedInstallment[]

// Valida que suma de cuotas = total (con tolerancia)
validateInstallmentsSum(installments: CalculatedInstallment[], expectedTotal: number): boolean

// Total de cuotas pendientes
getTotalPendingInstallments(installments: Array<{ amount: number; status: string }>): number

// Genera datos de cuotas en formato Prisma create nested
generatePrismaInstallmentsCreate<T>(amount, selectedInstallments, paymentDate, DecimalClass): { create: [...] } | undefined
```

## `update-project-balance.ts` — Actualización de balance en DB

```typescript
type PrismaTransaction = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

// Actualiza balance de un proyecto en DB basándose en sus allocations
updateProjectBalance(projectId: string, tx?: PrismaTransaction): Promise<number>

// Actualiza balance de múltiples proyectos en batch
updateMultipleProjectBalances(projectIds: string[], tx?: PrismaTransaction): Promise<number>

// Verifica si balance en DB es consistente con allocations
verifyProjectBalance(projectId: string): Promise<boolean>

// Actualiza balance incluyendo ajustes: balance = totalAmount - totalPaid - totalAdjustments
updateProjectBalanceWithAdjustments(projectId: string, tx?: PrismaTransaction): Promise<number>
```

## `update-customer-credit-balance.ts` — Actualización de creditBalance desde ledger

```typescript
// Recalcula creditBalance como SUM(credit_transactions.amount), Math.max(0)
// Usar SIEMPRE dentro de $transaction después de crear/eliminar CreditTransaction
updateCustomerCreditBalance(customerId: string, tx?: PrismaTransaction): Promise<number>

// Verifica si creditBalance en DB es consistente con el ledger (tolerancia: FINANCIAL.TOLERANCE)
verifyCustomerCreditBalance(customerId: string): Promise<boolean>
```
