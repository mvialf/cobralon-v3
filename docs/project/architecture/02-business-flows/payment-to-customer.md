# Flujo: Pago a Cliente (1:N)

Flujo para registrar un pago de cliente que se distribuye entre MÚLTIPLES proyectos usando FIFO o asignación manual.

---

## Diagrama del Flujo

```
1. Usuario selecciona Cliente
   ↓
2. Sistema carga proyectos con balance > 0
   ↓
3. Usuario ingresa monto total del pago
   ↓
4. Usuario distribuye monto:
   Opción A: FIFO automático
   Opción B: Manual por proyecto
   ↓
5. Validación: SUM(allocations) === amount
   ↓
6. POST /api/payments (type: "Customer")
   ↓
7. Sistema crea Payment + Multiple PaymentAllocations
   ↓
8. Balance de cada proyecto se actualiza
```

---

## FIFO Allocation (Automática)

### Algoritmo

```typescript
// lib/business-logic/payment-fifo.ts
export function calculateFIFOAllocation(
  projects: ProjectWithBalance[],
  paymentAmount: number
): PaymentAllocation[] {
  const allocations: PaymentAllocation[] = []
  let remainingAmount = paymentAmount

  // Ordenar proyectos por fecha (más antiguos primero)
  const sortedProjects = [...projects].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  for (const project of sortedProjects) {
    if (remainingAmount <= 0) break

    const balance = calculateProjectBalance(project)
    if (balance <= 0) continue

    const allocatedAmount = Math.min(balance, remainingAmount)

    allocations.push({
      projectId: project.id,
      allocatedAmount,
    })

    remainingAmount -= allocatedAmount
  }

  return allocations
}
```

### Ejemplo FIFO

**Proyectos del cliente:**
```
P 0001-2025: Total $1,000,000, Pagado $500,000, Balance $500,000, Fecha: 2025-01-15
P 0002-2025: Total $800,000, Pagado $0, Balance $800,000, Fecha: 2025-02-20
P 0003-2025: Total $600,000, Pagado $100,000, Balance $500,000, Fecha: 2025-03-10
```

**Pago del cliente: $1,200,000**

**FIFO Allocation:**
```
1. P 0001-2025 (más antiguo): $500,000 (balance completo)
2. P 0002-2025: $700,000 (parcial de $800,000)
3. P 0003-2025: $0 (no alcanza)

Total asignado: $1,200,000 ✅
```

---

## Validaciones Backend

### 1. Tipo "Customer" → Múltiples Allocations

```typescript
if (type === 'Customer' && allocations.length < 1) {
  throw new Error('Payment tipo "Customer" debe tener al menos 1 allocation')
}
```

### 2. Suma de Allocations

```typescript
const totalAllocated = allocations.reduce((sum, a) => sum + a.allocatedAmount, 0)
const tolerance = 0.01

if (Math.abs(totalAllocated - amount) > tolerance) {
  throw new Error(`La suma de allocations (${totalAllocated}) no coincide con el monto (${amount})`)
}
```

### 3. Mismo Cliente

```typescript
const projects = await prisma.project.findMany({
  where: { id: { in: allocations.map(a => a.projectId) } },
  select: { id: true, customerId: true, currency: true }
})

const uniqueCustomers = new Set(projects.map(p => p.customerId))

if (uniqueCustomers.size > 1) {
  throw new Error('Todos los proyectos deben pertenecer al mismo cliente')
}
```

### 4. Misma Currency

```typescript
const uniqueCurrencies = new Set(projects.map(p => p.currency))

if (uniqueCurrencies.size > 1) {
  throw new Error('Todos los proyectos deben tener la misma moneda')
}
```

### 5. No Duplicados

```typescript
const uniqueProjectIds = new Set(allocations.map(a => a.projectId))

if (uniqueProjectIds.size !== allocations.length) {
  throw new Error('No puede haber projectIds duplicados en allocations')
}
```

---

## Componentes Involucrados

### Form Component

```typescript
// components/forms/payments/payment-to-customer-form.tsx
export function PaymentToCustomerForm() {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [projects, setProjects] = useState<ProjectWithBalance[]>([])
  const [allocations, setAllocations] = useState<AllocationInput[]>([])

  // Cargar proyectos del cliente con balance > 0
  useEffect(() => {
    if (selectedCustomer) {
      fetchCustomerProjects(selectedCustomer.id)
    }
  }, [selectedCustomer])

  function handleFIFOAllocation() {
    const fifoAllocations = calculateFIFOAllocation(projects, form.getValues('amount'))
    setAllocations(fifoAllocations)
  }

  function onSubmit(data) {
    const payload = {
      type: 'Customer',
      customerId: selectedCustomer.id,
      amount: data.amount,
      currency: projects[0].currency,
      allocations: allocations,
      // ... otros campos
    }

    fetch('/api/payments', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  return (
    <Form {...form}>
      <CustomerCombobox value={selectedCustomer} onChange={setSelectedCustomer} />
      <CurrencyInput name="amount" />
      <Button type="button" onClick={handleFIFOAllocation}>
        Asignar FIFO
      </Button>
      <AllocationTable allocations={allocations} onChange={setAllocations} />
      <Button type="submit">Registrar Pago</Button>
    </Form>
  )
}
```

---

## Ver También

- [Payment Model](../01-data-model/payment-systems.md#payment-pagos)
- [PaymentAllocation](../01-data-model/payment-systems.md#paymentallocation-asignaciones)
- [FIFO Business Logic](../../../../lib/business-logic/payment-fifo.ts)
- [Payments API](../06-apis/payments-api.md)
- [Payment to Project Flow](payment-to-project.md) - Flujo 1:1 alternativo

---

**Última actualización:** 2025-10-30
