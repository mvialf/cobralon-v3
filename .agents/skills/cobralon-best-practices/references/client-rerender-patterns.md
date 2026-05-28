# Patrones de Re-render en Client Components

Optimizaciones para evitar re-renders innecesarios en componentes con `'use client'`.

---

## Estado derivado sin useEffect

**Impacto:** MEDIUM
**Aplica a:** `components/`, `app/*/page-client.tsx`
**Estado:** ⚠️ Pendiente

Valores que se calculan a partir de otros estados deben computarse durante el render, no en un `useEffect`.

### Incorrecto

```typescript
// ❌ useEffect para derivar un valor → causa render extra
function PaymentSummary({ allocations }: Props) {
  const [totalAllocated, setTotalAllocated] = useState(0)

  useEffect(() => {
    const sum = allocations.reduce((acc, a) => acc + a.allocatedAmount, 0)
    setTotalAllocated(sum)
  }, [allocations])

  return <span>Total: {formatCurrency(totalAllocated)}</span>
}
```

### Correcto

```typescript
// ✅ Valor derivado durante render — sin estado extra, sin re-render
function PaymentSummary({ allocations }: Props) {
  const totalAllocated = allocations.reduce((acc, a) => acc + a.allocatedAmount, 0)

  return <span>Total: {formatCurrency(totalAllocated)}</span>
}
```

**Regla:** Si un valor se puede calcular a partir de props o state existente, calcularlo inline. Solo usar `useMemo` si el cálculo es costoso (>1ms) y las dependencias cambian raramente.

```typescript
// Solo si el cálculo es costoso
const expensiveResult = useMemo(
  () => heavyComputation(data),
  [data]
)
```

## setState funcional

**Impacto:** MEDIUM
**Aplica a:** Componentes con state updates basados en el estado previo
**Estado:** ⚠️ Pendiente

Usar la forma funcional de `setState` cuando el nuevo valor depende del anterior. Evita bugs de closures stale y produce callbacks estables.

### Incorrecto

```typescript
// ❌ Depende del closure de count — puede causar bugs en batched updates
function Counter() {
  const [count, setCount] = useState(0)

  const increment = () => {
    setCount(count + 1)  // Si se llama 2 veces rápido, solo suma 1
  }
}
```

### Correcto

```typescript
// ✅ Forma funcional — siempre usa el valor más reciente
function Counter() {
  const [count, setCount] = useState(0)

  const increment = () => {
    setCount(prev => prev + 1)  // Siempre correcto, sin importar batching
  }
}
```

**Aplicación en Cobralon:** Toggles de estado en formularios, contadores de selección en DataTable, acumuladores en lógica de pago manual.

## Lazy state initialization

**Impacto:** MEDIUM
**Aplica a:** Componentes con estado inicial costoso
**Estado:** ⚠️ Pendiente

Cuando el valor inicial de un `useState` requiere cálculo, pasar una función en vez de ejecutarla directamente.

### Incorrecto

```typescript
// ❌ parseJson se ejecuta en CADA render, aunque useState solo use el resultado del primero
const [config, setConfig] = useState(parseJson(localStorage.getItem('config') || '{}'))
```

### Correcto

```typescript
// ✅ La función solo se ejecuta en el primer render
const [config, setConfig] = useState(() => parseJson(localStorage.getItem('config') || '{}'))
```

**Aplicación en Cobralon:** Inicialización de defaultValues en formularios que calculan valores a partir de datos serializados (ej: normalización de teléfonos, formateo de montos).

## useTransition para updates no-urgentes

**Impacto:** MEDIUM
**Aplica a:** DataTable filtering, búsqueda, tabs
**Estado:** ⚠️ Pendiente — no se usa en el proyecto

`useTransition` marca state updates como no-urgentes, permitiendo que React las interrumpa si hay interacciones más prioritarias. Ideal para filtrado de tablas.

### Incorrecto

```typescript
// ❌ Cada keystroke causa un re-render síncrono de toda la tabla
function DataTableToolbar({ onFilterChange }: Props) {
  const [filter, setFilter] = useState('')

  const handleChange = (value: string) => {
    setFilter(value)          // Actualiza el input
    onFilterChange(value)     // Re-filtra la tabla (costoso)
  }

  return <Input value={filter} onChange={e => handleChange(e.target.value)} />
}
```

### Correcto

```typescript
// ✅ El input responde inmediatamente, el filtrado se difiere
function DataTableToolbar({ onFilterChange }: Props) {
  const [filter, setFilter] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleChange = (value: string) => {
    setFilter(value)                      // Urgente: actualizar input
    startTransition(() => {
      onFilterChange(value)               // No-urgente: re-filtrar tabla
    })
  }

  return (
    <>
      <Input value={filter} onChange={e => handleChange(e.target.value)} />
      {isPending && <Spinner className="ml-2" />}
    </>
  )
}
```

**Candidatos en Cobralon:**
- Filtrado global en DataTable
- Búsqueda de clientes/proyectos
- Cambio de tabs en páginas de detalle

## Defer state reads

**Impacto:** MEDIUM
**Aplica a:** Componentes con estado que solo se usa en callbacks
**Estado:** ⚠️ Pendiente

No suscribirse a estado que solo se necesita dentro de event handlers. Usar `useRef` en su lugar para evitar re-renders.

### Incorrecto

```typescript
// ❌ Componente se re-renderiza cada vez que lastClickTime cambia
function TrackableButton({ onClick }: Props) {
  const [lastClickTime, setLastClickTime] = useState<number | null>(null)

  const handleClick = () => {
    const now = Date.now()
    if (lastClickTime && now - lastClickTime < 1000) return  // Debounce
    setLastClickTime(now)
    onClick()
  }

  return <Button onClick={handleClick}>Click</Button>
}
```

### Correcto

```typescript
// ✅ useRef no causa re-renders — el componente es estable
function TrackableButton({ onClick }: Props) {
  const lastClickTimeRef = useRef<number | null>(null)

  const handleClick = () => {
    const now = Date.now()
    if (lastClickTimeRef.current && now - lastClickTimeRef.current < 1000) return
    lastClickTimeRef.current = now
    onClick()
  }

  return <Button onClick={handleClick}>Click</Button>
}
```

**Regla:** Si un valor solo se lee/escribe dentro de callbacks y nunca se muestra en JSX, usar `useRef` en vez de `useState`.

## Dependencias primitivas en effects

**Impacto:** MEDIUM
**Aplica a:** Componentes con `useEffect`
**Estado:** ⚠️ Pendiente

Pasar valores primitivos (string, number) como dependencias de effects en lugar de objetos o arrays. Los objetos crean nuevas referencias en cada render.

### Incorrecto

```typescript
// ❌ customer es un objeto nuevo en cada render → effect se ejecuta siempre
function CustomerDetail({ customer }: { customer: Customer }) {
  useEffect(() => {
    fetchRelatedData(customer.id)
  }, [customer])  // ← Referencia cambia cada render
}
```

### Correcto

```typescript
// ✅ customer.id es un string primitivo — comparación por valor
function CustomerDetail({ customer }: { customer: Customer }) {
  useEffect(() => {
    fetchRelatedData(customer.id)
  }, [customer.id])  // ← Solo re-ejecuta si el ID cambia
}
```

**Regla:** En dependency arrays de `useEffect`, `useMemo`, `useCallback`, preferir propiedades primitivas sobre objetos completos.
