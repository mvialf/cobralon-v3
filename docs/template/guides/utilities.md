# Utilities - Funciones de Formateo

Utilities genéricas incluidas en el template para formateo de datos comunes.

## 📍 Ubicación

[`lib/format.ts`](../../../lib/format.ts)

## 🎯 Overview

El template incluye funciones de formateo optimizadas basadas en la API nativa `Intl` de JavaScript:

- **Zero dependencies** - Solo JavaScript nativo
- **Type-safe** - TypeScript con JSDoc completo
- **Performance** - Intl API es extremadamente rápida
- **i18n ready** - Soporte para múltiples locales
- **Production-tested** - Validadas en proyectos reales

---

## formatCurrency()

Formatea un número como moneda con configuración específica por tipo de moneda.

### Signature

```typescript
formatCurrency(amount: number, currency: string = 'CLP'): string
```

### Parámetros

- `amount`: Monto a formatear
- `currency`: Código de moneda ISO 4217 (default: 'CLP')

### Monedas Soportadas

| Código | Moneda            | Decimales | Locale  |
| ------ | ----------------- | --------- | ------- |
| CLP    | Peso Chileno      | 0         | es-CL   |
| USD    | Dólar Americano   | 2         | en-US   |
| EUR    | Euro              | 2         | es-ES   |
| ARS    | Peso Argentino    | 2         | es-AR   |
| MXN    | Peso Mexicano     | 2         | es-MX   |

### Ejemplos

```typescript
import { formatCurrency } from '@/lib/format'

// Peso chileno (sin decimales)
formatCurrency(1234567, 'CLP') // "$1.234.567"

// Dólar americano
formatCurrency(1234.56, 'USD') // "$1,234.56"

// Euro
formatCurrency(1234.56, 'EUR') // "€1,234.56"

// Default (CLP)
formatCurrency(15000) // "$15.000"

// Valores negativos
formatCurrency(-500, 'USD') // "-$500.00"
```

### Agregar Nueva Moneda

```typescript
// Editar lib/format.ts:21-27
const currencyConfig: Record<string, { locale: string; decimals: number }> = {
  // ...existentes
  GBP: { locale: 'en-GB', decimals: 2 }, // ← Agregar aquí
}
```

---

## formatNumber()

Formatea un número con separadores de miles y decimales configurables.

### Signature

```typescript
formatNumber(num: number, decimals: number = 2): string
```

### Parámetros

- `num`: Número a formatear
- `decimals`: Cantidad de decimales (default: 2)

### Ejemplos

```typescript
import { formatNumber } from '@/lib/format'

// Con decimales (default: 2)
formatNumber(1234.567) // "1.234,57"

// Sin decimales
formatNumber(1234.567, 0) // "1.235"

// Decimales personalizados
formatNumber(1234.56789, 3) // "1.234,568"

// Números grandes
formatNumber(1000000) // "1.000.000,00"

// Valores negativos
formatNumber(-1234.56) // "-1.234,56"
```

### Locale

Actualmente usa locale `es-CL` (separador de miles: `.`, separador decimal: `,`).

**Para cambiar locale:**

```typescript
// Editar lib/format.ts:53
return new Intl.NumberFormat('en-US', {
  // ← Cambiar aquí
  minimumFractionDigits: decimals,
  maximumFractionDigits: decimals,
}).format(num)
```

---

## formatDate()

Formatea fechas con soporte para múltiples variantes y locales.

### Signature

```typescript
formatDate(
  dateString: string | Date,
  variant: 'short' | 'long' | 'full' = 'short',
  locale: string = 'es-CL'
): string
```

### Parámetros

- `dateString`: Fecha en formato ISO string o Date object
- `variant`: Variante de formato (default: 'short')
- `locale`: Locale para formateo (default: 'es-CL')

### Variantes

| Variant | es-CL                       | en-US                |
| ------- | --------------------------- | -------------------- |
| short   | `15/01/2025`                | `01/15/2025`         |
| long    | `15 de enero de 2025`       | `January 15, 2025`   |
| full    | `15 de enero de 2025, 14:30` | `January 15, 2025, 2:30 PM` |

### Ejemplos

```typescript
import { formatDate } from '@/lib/format'

const date = '2025-01-15T14:30:00'

// Formato corto (default)
formatDate(date) // "15-01-2025" (es-CL)

// Formato largo
formatDate(date, 'long') // "15 de enero de 2025"

// Formato completo con hora
formatDate(date, 'full') // "15 de enero de 2025, 14:30"

// Cambiar locale
formatDate(date, 'short', 'en-US') // "01/15/2025"
formatDate(date, 'long', 'en-US') // "January 15, 2025"

// Date object
const dateObj = new Date('2025-01-15')
formatDate(dateObj, 'short') // "15-01-2025"
```

### Locales Comunes

- `es-CL` - Español (Chile)
- `es-AR` - Español (Argentina)
- `es-MX` - Español (México)
- `en-US` - Inglés (Estados Unidos)
- `en-GB` - Inglés (Reino Unido)
- `pt-BR` - Portugués (Brasil)

---

## Testing

Tests completos incluidos en [`lib/__tests__/format.test.ts`](../../../lib/__tests__/format.test.ts).

```bash
# Ejecutar tests
npm test lib/__tests__/format.test.ts

# Coverage:
# - formatCurrency: 8 tests
# - formatNumber: 6 tests
# - formatDate: 10 tests
```

---

## Best Practices

### ✅ DO

```typescript
// Importar solo lo que necesitas
import { formatCurrency } from '@/lib/format'

// Especificar moneda cuando no sea default
const price = formatCurrency(amount, 'USD')

// Usar en componentes
export function ProductCard({ price, currency }: Props) {
  return <span>{formatCurrency(price, currency)}</span>
}
```

### ❌ DON'T

```typescript
// No reinventar formateo
const formatted = `$${price.toFixed(2)}` // ❌ Sin separadores, sin i18n

// No hardcodear formatos
const date = `${day}/${month}/${year}` // ❌ No respeta locales
```

---

## FAQ

### ¿Por qué usar Intl API en lugar de librerías?

- ✅ **Zero dependencies** - Reduce bundle size
- ✅ **Performance** - Implementación nativa optimizada
- ✅ **Mantenimiento** - Sin upgrades de librerías
- ✅ **Compatibilidad** - Soportado en todos los browsers modernos

### ¿Cómo cambiar locale default de 'es-CL'?

Edita directamente `lib/format.ts` y reemplaza `'es-CL'` por `'en-US'` (o tu locale preferido) en las funciones.

### ¿Puedo agregar más monedas?

Sí, edita `currencyConfig` en `lib/format.ts:21-27` y agrega la configuración.

---

## Referencias

- [Intl.NumberFormat (MDN)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat)
- [Intl.DateTimeFormat (MDN)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat)
- [ISO 4217 Currency Codes](https://en.wikipedia.org/wiki/ISO_4217)

---

**Última actualización:** 2025-11-02
