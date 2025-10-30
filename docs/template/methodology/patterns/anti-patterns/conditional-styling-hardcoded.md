# Anti-Patrón: Conditional Styling Hardcodeado

## El Problema

Usar valores mágicos hardcodeados para aplicar estilos condicionales sin contexto de negocio ni configuración explícita.

## ❌ Incorrecto: Valores Mágicos

```tsx
// columns.tsx (DataTable)
{
  accessorKey: 'balance',
  header: 'Saldo',
  cell: ({ row }) => {
    const balance = row.original.balance
    const className =
      balance === 0
        ? 'text-success font-semibold'
        : balance > 2000000  // ← ¿Por qué 2,000,000? ¿Quién lo decide?
          ? 'text-destructive font-semibold'
          : ''
    return <span className={className}>{formatCurrency(balance)}</span>
  },
}
```

**Problemas:**

1. **Valores mágicos sin contexto**
   - ¿Por qué `2000000`? ¿CLP? ¿USD?
   - ¿Es un límite de riesgo? ¿Un threshold de negocio?
   - Cambiar este valor requiere editar código

2. **No es reutilizable**
   - Lógica duplicada en cada columna que necesite colores
   - Cada tabla define sus propios thresholds
   - Inconsistencia entre vistas

3. **Difícil de mantener**
   - Cambios de negocio requieren tocar código
   - No hay single source of truth
   - Imposible configurar por usuario/contexto

4. **Confunde a otros desarrolladores**
   - Al copiar-pegar, usan valores sin entender
   - No hay documentación de qué significan
   - Genera deuda técnica

## ✅ Correcto: Solo Formateo

Si no necesitas colores condicionales, **NO los agregues**:

```tsx
// ✅ CORRECTO: Simple y claro
{
  accessorKey: 'balance',
  header: 'Saldo',
  cell: ({ row }) => formatCurrency(row.original.balance),
  meta: {
    headerClassName: 'text-right',
    cellClassName: 'text-right',
  },
}
```

**Razón:** Usuarios pueden interpretar los números. No necesitan colores para todo.

## ✅ Correcto: Badge Configurable

Si realmente necesitas visualización con colores, usa un **componente reutilizable con configuración explícita**:

```tsx
// 1. Definir configuración de negocio
const BALANCE_THRESHOLDS = {
  PAID_OFF: 0,           // Verde: Pagado completamente
  HIGH_RISK: 2000000,    // Rojo: Riesgo alto (>2M CLP)
} as const

// 2. Componente reutilizable
function BalanceBadge({ balance, currency }: { balance: number; currency: string }) {
  const formatted = formatCurrency(balance, currency)

  if (balance === BALANCE_THRESHOLDS.PAID_OFF) {
    return <Badge variant="success">{formatted}</Badge>
  }

  if (balance > BALANCE_THRESHOLDS.HIGH_RISK) {
    return <Badge variant="destructive">{formatted}</Badge>
  }

  return <span className="font-medium">{formatted}</span>
}

// 3. Usar en columna
{
  accessorKey: 'balance',
  header: 'Saldo',
  cell: ({ row }) => (
    <BalanceBadge
      balance={row.original.balance}
      currency={row.original.currency}
    />
  ),
  meta: {
    headerClassName: 'text-right',
    cellClassName: 'text-right',
  },
}
```

**Ventajas:**

- ✅ Thresholds documentados con nombres descriptivos
- ✅ Componente reutilizable entre tablas
- ✅ Single source of truth
- ✅ Fácil cambiar valores desde configuración

## ✅ Correcto: Helper Function

Para lógica compleja, extrae a un helper:

```tsx
// lib/business-logic/balance-classification.ts
export const BALANCE_THRESHOLDS = {
  PAID_OFF: 0,
  LOW_RISK: 500000,
  MEDIUM_RISK: 1000000,
  HIGH_RISK: 2000000,
} as const

export type BalanceRisk = 'paid-off' | 'low' | 'medium' | 'high'

export function classifyBalanceRisk(balance: number): BalanceRisk {
  if (balance === BALANCE_THRESHOLDS.PAID_OFF) return 'paid-off'
  if (balance < BALANCE_THRESHOLDS.LOW_RISK) return 'low'
  if (balance < BALANCE_THRESHOLDS.MEDIUM_RISK) return 'medium'
  if (balance < BALANCE_THRESHOLDS.HIGH_RISK) return 'medium'
  return 'high'
}

export function getBalanceRiskVariant(risk: BalanceRisk): BadgeProps['variant'] {
  const variants = {
    'paid-off': 'success',
    'low': 'default',
    'medium': 'warning',
    'high': 'destructive',
  } as const

  return variants[risk]
}

// En columns.tsx
import { classifyBalanceRisk, getBalanceRiskVariant } from '@/lib/business-logic/balance-classification'

{
  accessorKey: 'balance',
  header: 'Saldo',
  cell: ({ row }) => {
    const balance = row.original.balance
    const risk = classifyBalanceRisk(balance)
    const variant = getBalanceRiskVariant(risk)

    return (
      <Badge variant={variant}>
        {formatCurrency(balance, row.original.currency)}
      </Badge>
    )
  },
}
```

**Ventajas:**

- ✅ Lógica testeable de forma aislada
- ✅ Documentación explícita de reglas de negocio
- ✅ Reutilizable en múltiples lugares (API, reportes, etc.)
- ✅ Fácil agregar nuevos niveles de riesgo

## Cuándo SÍ Usar Colores Condicionales

### Casos Válidos

1. **Estados con semántica clara**
   - ✅ Estado de pago: Pendiente (amarillo), Pagado (verde), Rechazado (rojo)
   - ✅ Prioridad: Alta (rojo), Media (amarillo), Baja (gris)
   - ✅ Stock: Sin stock (rojo), Poco stock (amarillo), En stock (verde)

2. **Con configuración explícita**
   - ✅ Thresholds definidos en constantes
   - ✅ Mapeo de estados a colores documentado
   - ✅ Componente reutilizable

### Casos Inválidos

- ❌ Valores numéricos con thresholds arbitrarios sin contexto
- ❌ Lógica inline que no se puede reutilizar
- ❌ "Colorear por colorear" sin agregar valor semántico

## Ejemplo: StatusBadge con Estados

```tsx
// components/ui/status-badge.tsx
const STATUS_CONFIG = {
  pending: { label: 'Pendiente', variant: 'warning' as const },
  paid: { label: 'Pagado', variant: 'success' as const },
  rejected: { label: 'Rechazado', variant: 'destructive' as const },
  draft: { label: 'Borrador', variant: 'default' as const },
} as const

type Status = keyof typeof STATUS_CONFIG

interface StatusBadgeProps {
  status: Status
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  return <Badge variant={config.variant}>{config.label}</Badge>
}

// Uso en columna
{
  accessorKey: 'status',
  header: 'Estado',
  cell: ({ row }) => <StatusBadge status={row.original.status} />,
}
```

**Ventajas:**

- ✅ Configuración centralizada
- ✅ Type-safe (TypeScript infiere tipos)
- ✅ Consistente en toda la app
- ✅ Fácil agregar nuevos estados

## Regla de Oro

> **Si necesitas agregar un comentario explicando por qué un número es importante, ese número no debe estar hardcodeado en el código.**

Muévelo a:

1. Una constante con nombre descriptivo
2. Una configuración de negocio
3. Una variable de entorno (si aplica)

## Testing de Lógica de Clasificación

```typescript
// lib/business-logic/__tests__/balance-classification.test.ts
import { describe, it, expect } from 'vitest'
import { classifyBalanceRisk, BALANCE_THRESHOLDS } from '../balance-classification'

describe('classifyBalanceRisk', () => {
  it('should classify paid-off balance', () => {
    expect(classifyBalanceRisk(0)).toBe('paid-off')
  })

  it('should classify high-risk balance', () => {
    expect(classifyBalanceRisk(2500000)).toBe('high')
  })

  it('should classify medium-risk balance', () => {
    expect(classifyBalanceRisk(1500000)).toBe('medium')
  })

  it('should classify low-risk balance', () => {
    expect(classifyBalanceRisk(300000)).toBe('low')
  })

  it('should use exact threshold values', () => {
    // Test boundaries
    expect(classifyBalanceRisk(BALANCE_THRESHOLDS.PAID_OFF)).toBe('paid-off')
    expect(classifyBalanceRisk(BALANCE_THRESHOLDS.LOW_RISK - 1)).toBe('low')
    expect(classifyBalanceRisk(BALANCE_THRESHOLDS.HIGH_RISK + 1)).toBe('high')
  })
})
```

## Referencias

- [Building Features Guide - Test What Matters](../../../guides/building-features/core-principles/4-test-what-matters.md)
- [Business Logic Extraction](business-logic-in-components.md)
- [Badge Component](../fundamentals/shadcn-ui.md)

---

[← Anterior: Estilos Inline Complejos](inline-complex-styles.md) | [Volver al índice](README.md)
