# Signatures de Modulos de Logica Financiera

Signatures exportadas por los modulos actuales en `lib/business-logic/`. Antes de usar una firma, confirmar el archivo real porque estas referencias resumen el contrato esperado.

## `project-financials.ts` - Balance derivado desde vista SQL

```typescript
interface ProjectFinancials {
  projectId: string
  allocatedTotal: number
  appliedCashTotal: number
  appliedCreditTotal: number
  adjustmentTotal: number
  settledTotal: number
  rawBalance: number
  balance: number
  overpayment: number
  totalPaid: number
  percentPaid: number
  hasDebt: boolean
}

getProjectFinancials(projectId: string, db?: typeof prisma | PrismaTransaction): Promise<ProjectFinancials | null>
getProjectsFinancials(projectIds: string[], db?: typeof prisma | PrismaTransaction): Promise<Map<string, ProjectFinancials>>
mapProjectFinancials(row: ProjectFinancialsRawRow): ProjectFinancials
```

Usar `ProjectFinancials` como fuente de balance derivado en endpoints que necesitan `balance`, `totalPaid`, `percentPaid`, overpayment o filtro por deuda.

## `payment-fifo.ts` - Distribucion FIFO

```typescript
calculateFIFO(totalAmount: number, projects: ProjectWithBalance[]): FIFOAllocation[]
validateAllocationsSum(totalAmount: number, allocations: Array<{ allocatedAmount: number }>): boolean
filterProjectsWithBalance(projects: ProjectWithBalance[]): ProjectWithBalance[]
```

FIFO siempre ordena deudas por `createdAt ASC` y usa `balance` ya calculado por el API o query.

## `credit-management.ts` - Ledger de credito

```typescript
getCustomerCreditBalance(customerId: string, db?: PrismaClient | PrismaTransaction): Promise<number>
getCustomerCreditBalanceDetails(customerId: string, db?: PrismaClient | PrismaTransaction): Promise<CustomerCreditBalance>
getCustomerCreditBalances(customerIds: string[], db?: PrismaClient | PrismaTransaction): Promise<Map<string, number>>
lockCustomerCreditBalance(customerId: string, db: PrismaTransaction): Promise<boolean>
```

`creditBalance` se calcula desde `CreditTransaction`. Dentro de transacciones financieras, pasar `tx` para leer un estado consistente.

## `credit-rules.ts` - Reglas puras de credito

```typescript
calculatePaymentDistribution(projectBalance, paymentAmount, creditApplied): ProcessPaymentWithCreditResult
calculateMaxCreditApplication(customerCredit, projectBalance): number
canApplyCredit(requestedAmount, customerCredit, projectBalance): CreditApplicationValidation
canRefundCredit(requestedAmount, customerCredit): CreditApplicationValidation
```

Usar para validaciones puras antes de persistir. Las mutaciones reales deben crear `CreditTransaction` dentro de `$transaction`.

## `credit-eligibility.ts` - Elegibilidad y labels

```typescript
checkCreditEligibility(customerCredit: number, projectBalance: number, paymentCustomerId: string, projectCustomerId: string): CreditEligibilityCheck
shouldShowCreditOption(customerCredit: number, projectBalance: number, paymentCustomerId: string, projectCustomerId: string): boolean
shouldShowRefundOption(creditBalance: number): boolean
getCreditTransactionTypeLabel(type: 'OVERPAYMENT' | 'APPLIED' | 'REFUND' | 'WITHDRAWAL' | 'ADJUSTMENT'): string
```

## `money.ts` - Decimal seguro

```typescript
money(value: MoneyInput): Decimal
moneyToNumber(value: MoneyInput): number
addMoney(...values: MoneyInput[]): Decimal
subtractMoney(a: MoneyInput, b: MoneyInput): Decimal
sumMoney(values: MoneyInput[]): Decimal
minMoney(a: MoneyInput, b: MoneyInput): Decimal
maxMoney(a: MoneyInput, b: MoneyInput): Decimal
equalsMoney(a: MoneyInput, b: MoneyInput, tolerance?: MoneyInput): boolean
greaterThanMoneyWithTolerance(a: MoneyInput, b: MoneyInput, tolerance?: MoneyInput): boolean
roundMoneyForCurrency(value: MoneyInput, currency?: string): Decimal
```

Evitar aritmetica directa con `number` cuando afecta dinero. Usar helpers de `money.ts` y constantes de `@/lib/constants/financial-constants`.

## `totals.ts` - Totales de proyecto

```typescript
calculateProjectTotal(subtotal: number, taxRate: number, currency?: string): number
calculateProjectTotalMoney(subtotal: number | Decimal, taxRate: number | Decimal, currency?: string): Decimal
validateProjectTotal(subtotal, taxRate, receivedTotal, currency?: string): boolean
```

## `installments.ts` - Cuotas

```typescript
calculateInstallments(amount: number, installments: number, paymentDate: Date): CalculatedInstallment[]
validateInstallmentsSum(installments: CalculatedInstallment[], expectedTotal: number): boolean
getTotalPendingInstallments(installments: Array<{ amount: number; status: string }>): number
generatePrismaInstallmentsCreate<T>(amount, selectedInstallments, paymentDate, DecimalClass): { create: [...] } | undefined
```

Las cuotas son informativas; no reemplazan FIFO ni `PaymentAllocation`.
