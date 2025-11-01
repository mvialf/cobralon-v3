# Patrón: Composición de Secciones de Formularios

**Problema:** Múltiples formularios comparten secciones similares (métodos de pago, búsqueda de clientes, campos financieros) → Duplicación masiva de código, mantenimiento fragmentado, bugs repetidos.

**Solución:** Extraer secciones completas a sub-componentes reutilizables que se integran con React Hook Form mediante el patrón `control`.

---

## Cuándo Aplicar Este Patrón

### ✅ SÍ extraer cuando:

- **Sección usada en 2+ formularios**

  ```typescript
  // ❌ ANTES: Duplicado en PaymentToProjectForm y PaymentToCustomerForm
  // 82 líneas × 2 formularios = 164 líneas de código duplicado

  // Método de pago + cuotas (82 líneas)
  <FormField control={control} name="paymentMethodId">...</FormField>
  {selectedMethod?.hasInstallments && (
    <FormField control={control} name="selectedInstallments">...</FormField>
  )}
  ```

- **Sección >20 líneas con lógica propia**

  ```typescript
  // ❌ Campo de búsqueda de cliente: 70+ líneas en cada formulario
  // Incluye: queries, debounce, estado, callbacks
  ```

- **Tiene queries internas (React Query)**

  ```typescript
  // Búsqueda server-side con debounce
  const { data } = useQuery({
    queryKey: ['customers-search', debouncedSearch],
    queryFn: async () => await fetch('/api/customers?search=...'),
  })
  ```

- **Tiene estado encapsulado complejo**
  ```typescript
  // Estado interno: búsqueda, debounce, selección
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [selected, setSelected] = useState<Customer | null>(null)
  ```

### ❌ NO extraigas cuando:

- **Sección <10 líneas** - Keep inline
- **Usada solo 1 vez** - No hay reuso
- **Sin lógica interna** - Solo UI simple

---

## Patrón Técnico: Tres Tipos de Sub-Componentes

### 1. Campos Relacionados con Lógica Condicional

**Ejemplo:** PaymentMethodFields (método + cuotas)

```typescript
// components/forms/payment-method-fields.tsx
interface PaymentMethodFieldsProps {
  control: Control<any> // ← Integración con React Hook Form
  paymentMethods: PaymentMethod[]
  loading?: boolean
  onPaymentMethodChange?: (methodId: string) => void // ← Callback para comunicación
}

export function PaymentMethodFields({
  control,
  paymentMethods,
  loading,
  onPaymentMethodChange,
}: PaymentMethodFieldsProps) {
  // Watch payment method para mostrar/ocultar cuotas
  const watchedMethodId = useWatch({ control, name: 'paymentMethodId' })

  const selectedMethod = React.useMemo(
    () => paymentMethods.find((m) => m.id === watchedMethodId),
    [paymentMethods, watchedMethodId]
  )

  return (
    <div className="space-y-4">
      {/* Método de Pago */}
      <FormField
        control={control}
        name="paymentMethodId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Método de Pago *</FormLabel>
            <Select
              onValueChange={(value) => {
                field.onChange(value)
                onPaymentMethodChange?.(value) // ← Notificar al padre
              }}
              value={field.value}
            >
              {/* ... SelectTrigger, SelectContent ... */}
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Cuotas (condicional) */}
      {selectedMethod?.hasInstallments && (
        <FormField
          control={control}
          name="selectedInstallments"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número de Cuotas</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(value === '1' ? null : Number(value))}
                value={field.value?.toString() || '1'}
              >
                {/* ... opciones de cuotas ... */}
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  )
}
```

**Características:**

- ✅ **Lógica interna:** `useWatch` para mostrar/ocultar cuotas
- ✅ **Callback pattern:** `onPaymentMethodChange` para comunicación con parent
- ✅ **Estado encapsulado:** `useMemo` para método seleccionado
- ✅ **82 líneas** → Reutilizable en 2+ formularios

**Uso en formulario:**

```typescript
// components/forms/payments/payment-to-project-form.tsx
import { PaymentMethodFields } from '@/components/forms/fields/payment-method-fields'

export function PaymentToProjectForm() {
  const form = useForm({...})

  const handlePaymentMethodChange = (methodId: string) => {
    // Parent puede resetear cuotas si cambia el método
    const method = paymentMethods.find(m => m.id === methodId)
    if (!method?.hasInstallments) {
      form.setValue('selectedInstallments', null)
    }
  }

  return (
    <Form {...form}>
      {/* ... otros campos ... */}

      <PaymentMethodFields
        control={form.control}  {/* ← Pasar control */}
        paymentMethods={paymentMethodsData || []}
        loading={loadingPaymentMethods}
        onPaymentMethodChange={handlePaymentMethodChange}
      />

      {/* ... más campos ... */}
    </Form>
  )
}
```

**Reducción:** 82 líneas × 2 formularios = **164 líneas eliminadas**

---

### 2. Búsqueda Server-Side con Estado Complejo

**Ejemplo:** CustomerSearchField (búsqueda + selección de cliente)

```typescript
// components/forms/customer-search-field.tsx
interface CustomerSearchFieldProps {
  control: Control<any>
  preselectedCustomerId?: string // ← Modo pre-seleccionado (read-only)
  onCustomerSelect?: (customer: Customer | null) => void // ← Callback
}

export function CustomerSearchField({
  control,
  preselectedCustomerId,
  onCustomerSelect,
}: CustomerSearchFieldProps) {
  // Estado interno de búsqueda
  const [customerSearch, setCustomerSearch] = React.useState('')
  const debouncedSearch = useDebounce(customerSearch, 300)
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null)

  // Query 1: Cliente pre-seleccionado
  const { data: preselectedCustomer } = useQuery({
    queryKey: ['customer', preselectedCustomerId],
    queryFn: async () => {
      const res = await fetch(`/api/customers/${preselectedCustomerId}`)
      return res.json()
    },
    enabled: !!preselectedCustomerId,
  })

  // Query 2: Búsqueda server-side
  const { data: customersData, isLoading } = useQuery({
    queryKey: ['customers-search', debouncedSearch],
    queryFn: async () => {
      const res = await fetch(`/api/customers?search=${debouncedSearch}&limit=20`)
      const data = await res.json()
      return data.customers || []
    },
    enabled: !preselectedCustomerId && debouncedSearch.length >= 2,
  })

  // Effect: Auto-select cuando llega el cliente pre-seleccionado
  React.useEffect(() => {
    if (preselectedCustomerId && preselectedCustomer) {
      setSelectedCustomer(preselectedCustomer)
      onCustomerSelect?.(preselectedCustomer)
    }
  }, [preselectedCustomerId, preselectedCustomer, onCustomerSelect])

  // Callback cuando se selecciona del Combobox
  const handleCustomerChange = (customerId: string) => {
    const customer = customersData?.find((c: Customer) => c.id === customerId)
    setSelectedCustomer(customer || null)
    onCustomerSelect?.(customer || null)
  }

  return (
    <>
      {preselectedCustomerId ? (
        // Modo read-only: Mostrar CustomerNameSummary
        <div className="space-y-2">
          <FormLabel>Cliente</FormLabel>
          {selectedCustomer ? (
            <div className="rounded-lg border bg-muted/50 p-3">
              <CustomerNameSummary
                name={selectedCustomer.name}
                phone={selectedCustomer.phone!}
                email={selectedCustomer.email}
              />
            </div>
          ) : (
            <div>Cargando cliente...</div>
          )}
        </div>
      ) : (
        // Modo búsqueda: Combobox con server-side search
        <FormField
          control={control}
          name="customerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cliente *</FormLabel>
              <FormControl>
                <Combobox<Customer>
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value)
                    handleCustomerChange(value)
                  }}
                  options={customersData || []}
                  getOptionValue={(c) => c.id}
                  getOptionLabel={(c) => c.name}
                  placeholder="Buscar cliente..."
                  loading={isLoading}
                  onSearchChange={setCustomerSearch}
                  disableFiltering={true} // ← Server-side filtering
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </>
  )
}
```

**Características:**

- ✅ **2 queries internas:** Cliente pre-seleccionado + búsqueda
- ✅ **Estado complejo:** `customerSearch`, `debouncedSearch`, `selectedCustomer`
- ✅ **Lógica condicional:** Modo read-only vs búsqueda
- ✅ **157 líneas** → Encapsula toda la complejidad

**Reducción:** 157 líneas × 1 formulario (PaymentToCustomerForm) = **157 líneas eliminadas**

_(Nota: ProjectSearchField similar, otras 177 líneas eliminadas)_

---

### 3. Campos con Cálculo Automático

**Ejemplo:** ProjectFinancialFields (subtotal + impuesto → total calculado)

```typescript
// components/forms/project-financial-fields.tsx
interface ProjectFinancialFieldsProps {
  control: Control<any>
  currency?: string
}

export function ProjectFinancialFields({ control, currency }: ProjectFinancialFieldsProps) {
  // Watch subtotal y taxRate para calcular total
  const subtotal = useWatch({ control, name: 'subtotal' })
  const taxRate = useWatch({ control, name: 'taxRate' })

  // Calcular total automáticamente usando business logic
  const total = React.useMemo(() => {
    if (!subtotal) return 0
    return calculateProjectTotal(subtotal, taxRate || 0)
  }, [subtotal, taxRate])

  return (
    <FormGrid columns={3}>
      {/* Subtotal (editable) */}
      <FormField
        control={control}
        name="subtotal"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Subtotal *</FormLabel>
            <FormControl>
              <CurrencyInput value={field.value} onChange={field.onChange} currency={currency} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Impuesto (editable) */}
      <FormField
        control={control}
        name="taxRate"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Impuesto</FormLabel>
            <FormControl>
              <PercentageInput
                value={field.value}
                onValueChange={(value) => field.onChange(value || 0)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Total (calculado automáticamente, read-only) */}
      <FormItem>
        <FormLabel>Total</FormLabel>
        <FormControl>
          <CurrencyInput
            value={total}
            onChange={() => {}}
            disabled
            className="bg-muted"
            currency={currency}
          />
        </FormControl>
      </FormItem>
    </FormGrid>
  )
}
```

**Características:**

- ✅ **Lógica de negocio:** `calculateProjectTotal` (business logic layer)
- ✅ **Cálculo reactivo:** `useWatch` + `useMemo`
- ✅ **UI semántica:** 3 campos en grid, total read-only
- ✅ **100 líneas** → Encapsula cálculos financieros

**Reducción:** 100 líneas × 1 formulario (ProjectForm) = **100 líneas eliminadas**

---

## Beneficios Cuantificados (Implementación Real)

### Antes (sin sub-componentes):

```
PaymentToProjectForm:  285 líneas
PaymentToCustomerForm: 625 líneas
ProjectForm:           472 líneas
────────────────────────────────
TOTAL:                1382 líneas
```

### Después (con 6 sub-componentes):

```
Sub-componentes:
  PaymentMethodFields:       127 líneas
  PaymentAmountDateFields:    80 líneas
  CustomerSearchField:       157 líneas
  ProjectSearchField:        189 líneas
  ProjectFinancialFields:    100 líneas
  ProjectDetailsFields:       98 líneas
  ──────────────────────────────
  Subtotal componentes:      751 líneas

Formularios refactorizados:
  PaymentToProjectForm:      155 líneas (-45.6%)
  PaymentToCustomerForm:     420 líneas (-32.8%)
  ProjectForm:               360 líneas (-23.7%)
  ──────────────────────────────
  Subtotal formularios:      935 líneas

────────────────────────────────
TOTAL NUEVO:                1686 líneas
```

### Análisis de Impacto:

- **Líneas brutas:** 1382 → 1686 = **+304 líneas** (+22%)
- **Pero código reutilizable:** 751 líneas en 6 componentes
- **Reducción neta en formularios:** -447 líneas (-32.4%)

**ROI real:**

- ✅ **1er reuso:** Break-even (compensas las +751 líneas nuevas)
- ✅ **2do reuso:** -447 líneas netas
- ✅ **3er+ reuso:** Cada nuevo formulario ahorra ~150-200 líneas

**Ejemplo proyección:**

Si agregas 3 formularios más que usen estos componentes:

```
Formularios nuevos sin componentes: ~450 líneas c/u × 3 = 1350 líneas
Con componentes: ~250 líneas c/u × 3 = 750 líneas
───────────────────────────────────────────────────────
AHORRO: 600 líneas (-44%)
```

### Otros Beneficios:

- ✅ **Mantenimiento centralizado:** Cambiar lógica de cuotas en 1 lugar (vs 2+)
- ✅ **Testing simplificado:** 6 componentes pequeños (vs lógica embebida en formularios)
- ✅ **Bugs reducidos:** Lógica de búsqueda con debounce en 1 lugar (vs duplicada)
- ✅ **Onboarding más rápido:** Nuevos devs entienden componentes pequeños

---

## Checklist: ¿Debo Extraer a Sub-Componente?

Antes de crear `components/forms/xxx-fields.tsx`, verifica:

- [ ] **¿Sección usada en 2+ formularios?**
- [ ] **¿Lógica >20 líneas?**
- [ ] **¿Tiene queries internas (React Query)?**
- [ ] **¿Tiene estado encapsulado (search, debounce, selected)?**
- [ ] **¿Incluye lógica condicional (mostrar/ocultar campos)?**
- [ ] **¿Cálculo automático reactivo (useWatch + useMemo)?**

**Si 2+ respuestas son SÍ → Extrae**

**Si todas son NO → Keep inline en el formulario**

---

## Patrón de Integración

### Props Interface Recomendada:

```typescript
interface XxxFieldsProps {
  control: Control<any> // ← SIEMPRE requerido
  // Props de configuración (opcionales)
  currency?: string
  placeholder?: string
  // Props de datos (arrays, objects)
  options?: Option[]
  // Props de estado externo
  loading?: boolean
  disabled?: boolean
  // Callbacks para comunicación con parent
  onValueChange?: (value: T) => void
  onSelect?: (item: T | null) => void
}
```

### Patrón de Uso en Formulario:

```typescript
export function MyForm() {
  const form = useForm({...})

  // Callbacks para recibir eventos del sub-componente
  const handleCustomerSelect = (customer: Customer | null) => {
    // Parent puede hacer lógica adicional
    if (customer) {
      console.log('Cliente seleccionado:', customer.name)
    }
  }

  return (
    <Form {...form}>
      {/* Pasar control al sub-componente */}
      <CustomerSearchField
        control={form.control}
        onCustomerSelect={handleCustomerSelect}
      />

      {/* Sub-componente maneja FormField internamente */}
    </Form>
  )
}
```

---

## Ubicación y Convenciones

### Estructura de Directorios:

```
components/forms/
├── payments/
│   ├── payment-to-project-form.tsx    (formulario completo)
│   └── payment-to-customer-form.tsx   (formulario completo)
├── projects/
│   └── project-form.tsx               (formulario completo)
│
├── payment-method-fields.tsx          (sub-componente reutilizable)
├── payment-amount-date-fields.tsx     (sub-componente reutilizable)
├── customer-search-field.tsx          (sub-componente reutilizable)
├── project-search-field.tsx           (sub-componente reutilizable)
├── project-financial-fields.tsx       (sub-componente reutilizable)
└── project-details-fields.tsx         (sub-componente reutilizable)
```

### Convención de Nombres:

- **Formularios completos:** `[entidad]-[acción]-form.tsx`
  - Ejemplos: `payment-to-project-form.tsx`, `customer-create-form.tsx`
- **Sub-componentes:** `[entidad|acción]-[tipo]-fields.tsx`
  - Ejemplos: `payment-method-fields.tsx`, `customer-search-field.tsx`

---

## Common Mistakes

### ❌ Mistake 1: Extraer prematuramente

```typescript
// ❌ INCORRECTO: Extraer 2 campos simples sin lógica
export function NameEmailFields({ control }: Props) {
  return (
    <>
      <FormField control={control} name="name" {...} />
      <FormField control={control} name="email" {...} />
    </>
  )
}
```

**Fix:** Keep inline hasta que:

- Sección >20 líneas O
- Usada en 2+ formularios O
- Tiene lógica interna (queries, estado, cálculos)

---

### ❌ Mistake 2: Duplicar queries en parent y sub-componente

```typescript
// ❌ INCORRECTO: Parent hace query de clientes
export function MyForm() {
  const { data: customers } = useQuery(['customers'], fetchCustomers)

  return (
    <CustomerSearchField
      customers={customers} // ← Pasar como prop
    />
  )
}

// Y sub-componente también hace query (duplicado)
export function CustomerSearchField({ customers }: Props) {
  const { data: customersFromQuery } = useQuery(['customers'], fetchCustomers) // ← Duplicado!
  // ...
}
```

**Fix:** Query solo en el sub-componente (encapsulación completa):

```typescript
// ✅ CORRECTO: Query solo en sub-componente
export function MyForm() {
  return (
    <CustomerSearchField /> {/* ← Sin props de datos */}
  )
}

export function CustomerSearchField() {
  const { data: customers } = useQuery(['customers'], fetchCustomers) // ← Solo aquí
  // ...
}
```

---

### ❌ Mistake 3: No usar callbacks para comunicación

```typescript
// ❌ INCORRECTO: Parent intenta acceder a estado interno del sub-componente
export function MyForm() {
  const form = useForm()

  // ❌ No puedes acceder a `selectedCustomer` del sub-componente
  const customerId = form.watch('customerId')
  // ... pero quieres el objeto completo Customer, no solo el ID
}
```

**Fix:** Usar callback pattern:

```typescript
// ✅ CORRECTO: Sub-componente notifica al parent vía callback
export function MyForm() {
  const [customer, setCustomer] = useState<Customer | null>(null)

  return (
    <CustomerSearchField
      onCustomerSelect={(c) => setCustomer(c)} {/* ← Callback */}
    />
  )
}
```

---

## Referencias

- [Form Pattern](form-pattern.md) - Formularios completos como componentes
- [Extract When It Hurts](../../guides/building-features/core-principles/2-extract-when-it-hurts.md) - Principio de extracción
- [React Hook Form: useWatch](https://react-hook-form.com/docs/usewatch) - Observar campos para lógica condicional
- [React Query](https://tanstack.com/query/latest) - Queries en sub-componentes

---

**Implementación real:** Commits [fd8b5e9](../../../../.git/objects/fd/8b5e9) (crear 6 componentes) + [afae339](../../../../.git/objects/af/ae339) (integrar en formularios)

---

[← Anterior: Dialog Pattern](dialog-pattern.md) | [Volver al índice](../README.md) | [Siguiente: Wide Content Overflow →](wide-content-overflow.md)
