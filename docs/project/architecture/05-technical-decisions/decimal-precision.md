# Decisión: Decimal(12,2) para Montos

Tipo `Decimal` de Prisma con precisión 12,2 para todos los montos financieros.

---

## Contexto

Necesitábamos un tipo de dato para montos que:
- Sea exacto (sin errores de redondeo)
- Soporte múltiples monedas (CLP, USD, EUR)
- Sea suficiente para proyectos de construcción

---

## Decisión

```prisma
model Project {
  subtotal    Decimal @db.Decimal(12, 2)
  total       Decimal @db.Decimal(12, 2)
  totalAmount Decimal? @db.Decimal(12, 2)
}

model Payment {
  amount Decimal @db.Decimal(12, 2)
}
```

**Precisión:** 12 dígitos totales, 2 decimales
**Rango:** -999,999,999,999.99 a 999,999,999,999.99

---

## Alternativas Consideradas

### Alternativa 1: Float / Double

```prisma
amount Float
```

**Pros:**
- ✅ Nativo en todos los lenguajes
- ✅ Rápido en operaciones

**Contras:**
- ❌ **Errores de redondeo** (0.1 + 0.2 ≠ 0.3)
- ❌ Problemas en operaciones financieras

**Por qué NO:** Inaceptable en finanzas.

**Ejemplo del problema:**
```javascript
0.1 + 0.2 // 0.30000000000000004 ❌
```

---

### Alternativa 2: Int (Centavos)

```prisma
amountCents Int // Monto en centavos
```

**Pros:**
- ✅ Exacto (sin decimales)
- ✅ Rápido en operaciones

**Contras:**
- ❌ **Complicado formateo** (dividir/100 siempre)
- ❌ Validaciones más complejas
- ❌ Menos legible en DB

**Por qué NO:** Complejidad innecesaria.

---

## Razones

### 1. ✅ Exactitud

Sin errores de punto flotante:

```typescript
// Decimal (exacto)
1000.10 + 500.20 === 1500.30 // ✅ Siempre correcto

// Float (inexacto)
1000.10 + 500.20 === 1500.2999999999999 // ❌ Error
```

### 2. ✅ Standard Financiero

2 decimales suficiente para:
- **CLP** (pesos chilenos) - Normalmente sin decimales
- **USD** (dólares) - 2 decimales
- **EUR** (euros) - 2 decimales

### 3. ✅ Rango Suficiente

12 dígitos = hasta **$999,999,999,999.99**

Para proyectos de construcción en Chile:
- Proyecto pequeño: $1,000,000 CLP
- Proyecto grande: $500,000,000 CLP
- Mega proyecto: $10,000,000,000 CLP ✅ Dentro del rango

### 4. ✅ Prisma Support

Mapea nativamente a `DECIMAL` de PostgreSQL:

```sql
CREATE TABLE projects (
  total DECIMAL(12, 2) -- Tipo nativo PostgreSQL
);
```

---

## Constantes

```typescript
// lib/constants/financial-constants.ts
export const FINANCIAL = {
  DECIMAL_PRECISION: 0.01, // 2 decimales
  TOLERANCE: 0.01, // Para comparaciones
  MIN_AMOUNT: 0.01,
  MAX_AMOUNT: 999_999_999_999.99,
}
```

---

## Uso

### Validación (Zod)

```typescript
import { FINANCIAL } from '@/lib/constants'

const amountSchema = z.number()
  .min(FINANCIAL.MIN_AMOUNT)
  .max(FINANCIAL.MAX_AMOUNT)
  .refine(
    (val) => Math.abs(val - Math.round(val * 100) / 100) < 0.001,
    'Amount must have max 2 decimal places'
  )
```

### Comparación con Tolerancia

```typescript
function amountsMatch(a: number, b: number): boolean {
  return Math.abs(a - b) <= FINANCIAL.TOLERANCE
}

// Uso
if (amountsMatch(totalAllocated, paymentAmount)) {
  // ✅ Correcto
}
```

---

## Ver También

- [Financial Constants](../03-layers/business-logic.md#constants) - Constantes centralizadas
- [Payment Validations](../03-layers/business-logic.md#validaciones-zod-schemas) - Validaciones

**Última actualización:** 2025-10-30
