# Test Factories y Fixtures

## Payload base válido (Payment)

Usado en `app/api/payments/__tests__/route.test.ts`:

```typescript
const validPayload = {
  type: 'Project',
  customerId: 'customer-1',
  amount: 100000,
  currency: 'CLP',
  date: '2024-01-15',
  paymentMethodId: 'pm-1',
  allocations: [{ projectId: 'project-1', allocatedAmount: 100000 }],
}
```

## Mocks por defecto en `beforeEach`

Patrón estándar para tests de API:

```typescript
beforeEach(() => {
  vi.clearAllMocks()

  // Customer básico
  vi.mocked(prisma.customer.findUnique).mockResolvedValue({
    id: 'customer-1',
    name: 'Test Customer',
    creditBalance: 0,
  } as never)

  // Payment method
  vi.mocked(prisma.paymentMethod.findUnique).mockResolvedValue({
    id: 'pm-1',
    name: 'Efectivo',
  } as never)

  // Proyecto con balance
  vi.mocked(prisma.project.findMany).mockResolvedValue([
    { id: 'project-1', customerId: 'customer-1', currency: 'CLP' },
  ] as never)

  vi.mocked(prisma.project.findUnique).mockResolvedValue({
    id: 'project-1',
    balance: 100000,
  } as never)
})
```

**Nota:** Usar `as never` para evitar errores de tipo con mocks parciales de Prisma.

## Factories para React Query hooks

```typescript
// Response mock para usePayments
const mockPaymentsResponse = {
  payments: [
    {
      id: 'payment-1',
      amount: 100000,
      currency: 'CLP',
      date: '2024-01-15',
      type: 'Project',
      customer: { id: 'c-1', name: 'Test Customer', phone: '+56912345678' },
      paymentMethod: { id: 'pm-1', name: 'Efectivo', icon: null },
      allocations: [
        {
          id: 'alloc-1',
          allocatedAmount: 100000,
          project: { id: 'p-1', projectNumber: '1001', projectName: null, totalAmount: 200000, currency: 'CLP' },
        },
      ],
    },
  ],
  pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
}

// Response mock para useCustomers
const mockCustomersResponse = {
  customers: [
    { id: 'c-1', name: 'Test Customer', email: 'test@test.com', phone: '+56912345678', creditBalance: 0 },
  ],
  pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
}
```

## Edge cases para testing financiero

```typescript
// Cliente con crédito existente
const customerWithCredit = {
  id: 'customer-credit',
  name: 'Customer Con Crédito',
  creditBalance: 50000,
}

// Proyecto con balance cero (ya pagado)
const fullyPaidProject = {
  id: 'project-paid',
  balance: 0,
  totalAmount: 100000,
  customerId: 'customer-1',
}

// Pago que genera crédito (excede deuda total)
const overpaymentPayload = {
  type: 'Customer',
  customerId: 'customer-1',
  amount: 200000,   // Excede balance total
  currency: 'CLP',
  date: '2024-01-15',
  paymentMethodId: 'pm-1',
  allocations: [{ projectId: 'project-1', allocatedAmount: 100000 }],
}

// Pago con cuotas
const installmentPayload = {
  ...validPayload,
  selectedInstallments: 3,
}
```

## Fixtures para Excel (E2E)

Generados con `tests/fixtures/generate-fixtures.ts`:

```bash
npx tsx tests/fixtures/generate-fixtures.ts
```

Archivos generados:
- `pagos-test.xlsx` — Pagos válidos
- `pagos-mixtos.xlsx` — Válidos + inválidos (testear errores parciales)
- `pagos-invalido.xlsx` — Solo inválidos
- `proyectos-test.xlsx` — Proyectos para importar
- `clientes-test.xlsx` — Clientes para importar

## Naming para E2E data

Usar siempre prefijos identificables para cleanup automático:

```typescript
// CORRECTO — se limpia automáticamente
const testCustomerName = 'E2E Test Customer Nuevo'
const testProjectName = 'E2E Test Project'

// INCORRECTO — no se limpiará
const testCustomerName = 'Juan Pérez'  // Podría ser dato real
```

Patrones registrados en `tests/e2e/helpers/cleanup.ts`:
- Customers: `E2E Test Customer`, `E2E Test No Email`, `Test MCP`
- Projects: `Test E2E Crítico`, `E2E Test Project`
- Aftersales: `E2E Test Aftersale`
