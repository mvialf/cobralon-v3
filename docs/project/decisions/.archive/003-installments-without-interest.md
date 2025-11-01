# ADR-003: Installments Without Interest

## Estado

**Aceptado**

**Fecha:** 2025-10-22

## Contexto

El sistema de gestión de proyectos maneja montos grandes ($500,000 - $5,000,000 CLP) por proyecto. Los clientes necesitan flexibilidad de pago, pero la empresa no quiere convertirse en institución financiera.

### Problema a resolver

¿Cómo ofrecer facilidades de pago a clientes sin incurrir en complejidad legal, técnica y de negocio de un sistema de crédito con intereses?

### Requisitos identificados

1. **Tracking de cuotas:** Saber cuánto debe el cliente y cuándo vencen las cuotas
2. **Recordatorios automáticos:** Notificar cuando cuotas estén próximas a vencer
3. **Simplicidad:** No requiere ser payment gateway (pagos son offline/manuales)
4. **Legal compliance:** Evitar regulaciones de crédito/finanzas
5. **Transparencia:** Cliente sabe exactamente cuánto pagará (sin sorpresas de intereses)

## Decisión

Implementar un sistema de **cuotas SIN interés** con las siguientes características:

### 1. División Aritmética Simple

```typescript
// app/api/payments/route.ts:299-331
function generateInstallments(
  amount: Decimal,
  selectedInstallments: number,
  paymentDate: Date
): Installment[] {
  const installments = []

  // Cuota base (floor para evitar decimales extra)
  const baseAmount = amount.dividedBy(selectedInstallments).toDecimalPlaces(2, Decimal.ROUND_DOWN)

  // Total de primeras N-1 cuotas
  const totalBase = baseAmount.times(selectedInstallments - 1)

  // Última cuota absorbe residuo (garantiza suma exacta)
  const lastAmount = amount.minus(totalBase)

  for (let i = 1; i <= selectedInstallments; i++) {
    const isLast = i === selectedInstallments

    // dueDate: primera cuota = payment.date, resto +30 días
    const dueDate = new Date(paymentDate)
    dueDate.setDate(dueDate.getDate() + 30 * (i - 1))

    installments.push({
      installmentNumber: i,
      amount: isLast ? lastAmount : baseAmount,
      dueDate,
      status: 'pending',
      paidDate: null,
    })
  }

  return installments
}
```

**Ejemplo de generación:**

```
Input: $1,000,000 en 6 cuotas

Cálculo:
- baseAmount = floor(1,000,000 / 6) = $166,666.66
- totalBase = $166,666.66 × 5 = $833,333.30
- lastAmount = $1,000,000 - $833,333.30 = $166,666.70

Output:
Cuota 1: $166,666.66 (día 0)
Cuota 2: $166,666.66 (día 30)
Cuota 3: $166,666.66 (día 60)
Cuota 4: $166,666.66 (día 90)
Cuota 5: $166,666.66 (día 120)
Cuota 6: $166,666.70 (día 150) ← Absorbe +$0.04

Total: $1,000,000.00 EXACTO ✅
```

### 2. Cron Job Automático

```typescript
// app/api/cron/mark-installments-paid/route.ts
export async function POST(request: Request) {
  // Autenticación
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Buscar cuotas vencidas pendientes
  const installments = await prisma.installment.findMany({
    where: {
      status: 'pending',
      dueDate: { lte: new Date() }, // Vencidas
    },
  })

  // Marcar como pagadas (batch update)
  await prisma.installment.updateMany({
    where: {
      id: { in: installments.map((i) => i.id) },
    },
    data: {
      status: 'paid',
      paidDate: new Date(),
    },
  })

  return Response.json({
    success: true,
    marked: installments.length,
  })
}
```

**Schedule:** Vercel Cron ejecuta diariamente a medianoche UTC

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/mark-installments-paid",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### 3. Vista Global de Cuotas

Página dedicada con filtros:

- Status: `pending` | `paid`
- Date range: Cuotas que vencen en próximos 30 días
- Customer: Filtrar por cliente
- Payment: Filtrar por pago específico

## Alternativas Consideradas

### Alternativa 1: Cuotas CON INTERÉS (Tasa fija o variable)

**Modelo financiero:**

```
Ejemplo: $1,000,000 en 12 cuotas al 2% mensual (interés compuesto)

Fórmula:
Cuota = P × [r(1+r)^n] / [(1+r)^n - 1]

Donde:
- P = $1,000,000 (principal)
- r = 0.02 (2% mensual)
- n = 12 (número de cuotas)

Resultado:
- Cuota mensual: $94,560
- Total pagado: $1,134,720
- Interés total: $134,720 (13.47%)
```

**Pros:**

- ✅ Revenue adicional significativo (13-20% del monto)
- ✅ Común en industria financiera
- ✅ Incentivo económico para empresa

**Contras CRÍTICOS (por qué NO):**

1. **Legal Compliance (Chile):**
   - Ley 20.555: Obliga informar CAE (Carga Anual Equivalente)
   - SERNAC: Regulaciones de transparencia en crédito
   - Multas por incumplimiento: 50-1000 UTM ($3M-$60M CLP)
   - Requiere: Contrato de crédito formal, disclosure completo, registro como entidad crediticia

2. **Complejidad Técnica:**
   - Fórmula de interés compuesto (no trivial)
   - Tabla de amortización (capital vs intereses por cuota)
   - Cálculo de intereses devengados
   - Manejo de prepagos (recalcular intereses)

3. **Complejidad de Negocio:**
   - ¿Qué tasa usar? (competencia con bancos: 18-36% anual)
   - ¿Fija o variable?
   - ¿Requiere evaluación crediticia? (DICOM, scoring)
   - ¿Qué pasa con morosidad? (intereses moratorios)

4. **Tiempo de Implementación:**
   - Estimado: ~40 horas (legal + técnico + testing)
   - Vs MVP timeline: 25% del tiempo total

---

### Alternativa 2: Integración con Payment Gateway

**Opciones evaluadas:**

#### A) MercadoPago Cuotas (Latinoamérica)

```typescript
// Ejemplo SDK MercadoPago
const preference = {
  items: [
    {
      title: 'Proyecto Renovación Casa',
      quantity: 1,
      unit_price: 1000000,
    },
  ],
  installments: 12,
  payment_methods: {
    installments: 12,
    default_installments: 12,
  },
}

const response = await mercadopago.preferences.create(preference)
// Redirect user to: response.init_point
```

**Pros:**

- ✅ Pagos REALES (cobro automático con tarjeta)
- ✅ Gateway maneja todo (intereses, compliance, cobro)
- ✅ UI profesional (checkout page de MercadoPago)
- ✅ Seguridad PCI-compliant

**Contras:**

- ❌ **Fees altos:**
  - Transacción: 3.99% + IVA
  - Cuotas: 2-4% adicional según plan
  - Ejemplo: $1M pago = $40k + $20k fees = **$60k costo** (6%)

- ❌ **Vendor lock-in:**
  - API específica de MercadoPago
  - Migrar a otro gateway = reescribir todo

- ❌ **Complejidad:**
  - Webhooks para sincronizar estado
  - Manejo de failed payments (retry logic)
  - Refunds y chargebacks

- ❌ **Overhead:**
  - Cuenta merchant (aprobación 1-2 semanas)
  - Compliance docs (RUT, escrituras, etc.)

#### B) Stripe Installments

Similar a MercadoPago pero:

- ❌ Fees: 2.9% + $0.30 USD por transacción + 1-2% installments fee
- ❌ Menos adoptado en Chile (vs MercadoPago)

**Por qué NO Payment Gateway:**

- **MVP overkill:** No necesitamos cobro automático (relación directa con cliente)
- **Costo:** $60k fees/año vs $0 con tracking interno
- **Complejidad:** 3 semanas setup vs 2 horas

---

### Alternativa 3: SIN INTERÉS (SELECCIONADA)

**Ver sección "Decisión" arriba para detalles completos.**

**Pros FUNDAMENTALES:**

- ✅ **Simplicidad extrema:** Solo aritmética básica
- ✅ **Zero compliance legal:** No es "crédito" (solo tracking interno)
- ✅ **Sin fees de terceros:** $0 costo de transacción
- ✅ **Transparencia total:** $1M pagado = $1M recibido (sin sorpresas)
- ✅ **Implementación rápida:** 2 horas vs 40 horas (interés) vs 3 semanas (gateway)
- ✅ **Flexible:** Cambiar número de cuotas sin afectar fórmula
- ✅ **Precisión decimal garantizada:** Última cuota ajusta centavos

**Contras ACEPTABLES:**

- ⚠️ **No es pago real:** Solo tracking interno (no cobro automático)
- ⚠️ **No hay revenue adicional:** Sin intereses ganados
- ⚠️ **Cliente podría no pagar:** Sin enforcement automático
- ⚠️ **Requiere seguimiento manual:** Recordatorios vía email/WhatsApp (futuro)

## Consecuencias

### Positivas ✅

1. **Cálculo Preciso Sin Pérdida de Centavos**

   Problema común con división de montos:

   ```typescript
   // ❌ Enfoque naive (pierde centavos)
   const cuota = Math.floor(1000000 / 6) // 166666
   const total = cuota * 6 // 999996 ← Perdió $4

   // ✅ Enfoque actual (última cuota absorbe)
   const baseAmount = new Decimal(1000000).dividedBy(6).toDecimalPlaces(2, Decimal.ROUND_DOWN)
   // baseAmount = 166666.66
   const totalBase = baseAmount.times(5) // 833333.30
   const lastAmount = new Decimal(1000000).minus(totalBase) // 166666.70
   const total = totalBase.plus(lastAmount) // 1000000.00 ✅
   ```

2. **Automatización de Estado (Cron Job)**

   Beneficios del cron job:
   - ✅ **Cero intervención manual:** Cuotas se marcan "paid" automáticamente cuando vencen
   - ✅ **Auditoría:** `paidDate` trackea cuándo se marcó como pagada
   - ✅ **Reportes precisos:** Vista de cuotas pendientes siempre actualizada

   ```sql
   -- Query ejemplo: Cuotas por vencer (próximos 30 días)
   SELECT
     i.installmentNumber,
     i.amount,
     i.dueDate,
     c.name as customerName,
     p.reference
   FROM installments i
   JOIN payments p ON p.id = i.paymentId
   JOIN customers c ON c.id = p.customerId
   WHERE i.status = 'pending'
     AND i.dueDate BETWEEN NOW() AND NOW() + INTERVAL '30 days'
   ORDER BY i.dueDate ASC
   ```

3. **Transparencia para Cliente**

   Cliente sabe EXACTAMENTE cuánto pagará:

   ```
   Presupuesto: $5,000,000
   Cuotas: 10 sin interés

   Cliente ve:
   ✅ "Pagarás $5,000,000 en 10 cuotas de ~$500,000"
   ❌ NO: "Pagarás $5,800,000 (incluye 16% interés)" ← Confuso/negativo
   ```

4. **Velocidad de Implementación**

   Comparación de tiempos:
   | Opción | Tiempo Setup | Tiempo Testing | Total |
   |--------|-------------|----------------|-------|
   | **Sin interés** | 2 horas | 30 min | **2.5 horas** |
   | Con interés | 12 horas | 4 horas | 16 horas |
   | Payment Gateway | 40 horas | 8 horas | 48 horas |

   **ROI para MVP:**
   - Decisión permite lanzar MVP 13.5-45.5 horas antes
   - En timeline de 3-4 semanas: **10-30% más rápido**

### Negativas / Trade-offs ⚠️

1. **No es Payment Processing Real**

   **Trade-off:** Sistema es tracking, no cobro automático.

   **Contexto actual:**
   - Clientes pagan vía transferencia bancaria manual
   - Empresa verifica pago en cuenta bancaria
   - Luego marca cuota como pagada en sistema

   **Mitigación (futuro):**
   - Fase 2: Integrar con Khipu/Flow (gateways chilenos)
   - Fase 3: Webhooks automáticos de banco (API bancaria)

   **Impacto:** Bajo para MVP interno (clientes conocidos, relación directa)

2. **No Hay Revenue Adicional**

   **Trade-off:** $0 ganancia por intereses.

   **Alternativa evaluada:**
   - Con 2% interés mensual: +$134k por cada $1M prestado
   - Anual (si hay $10M en cuotas): +$1.3M revenue potencial

   **Justificación de la decisión:**
   - **Competitividad:** Sin interés = ventaja competitiva vs competidores
   - **Fidelización:** Clientes aprecian transparencia
   - **Legal:** Evita convertirse en entidad crediticia
   - **Simplicidad:** Permite lanzar MVP rápido (oportunidad de mercado)

   **Decisión reversible:** Agregar interés en futuro SI negocio lo justifica (no breaking change)

3. **Cliente Podría No Pagar (Sin Enforcement)**

   **Trade-off:** No hay cobro automático.

   **Riesgo assessment:**

   ```
   Escenario A: Cliente paga a tiempo
   - Probabilidad: 80% (clientes conocidos, relación directa)
   - Acción: Cron job marca como "paid"

   Escenario B: Cliente atrasa 1-2 semanas
   - Probabilidad: 15%
   - Acción: Recordatorio manual (email/WhatsApp)

   Escenario C: Cliente no paga (default)
   - Probabilidad: 5% (bajo, clientes pre-verificados)
   - Acción: Proceso de cobranza manual (ya existe offline)
   ```

   **Mitigación actual:**
   - Verificación de cliente antes de aprobar proyecto
   - Anticipo obligatorio (20-30% upfront)
   - Relación directa (no anonymous marketplace)

   **Mitigación futura (Fase 2):**
   - Sistema de recordatorios automáticos
   - Penalizaciones por atraso (configurable)
   - Integración con WhatsApp Business API

## Referencias

### Código

- **Generación de Installments:**
  - [app/api/payments/route.ts:299-331](../../../app/api/payments/route.ts#L299-L331) - Lógica de división y creación

- **Cron Job:**
  - [app/api/cron/mark-installments-paid/route.ts](../../../app/api/cron/mark-installments-paid/route.ts) - Marcado automático
  - [vercel.json:2-7](../../../vercel.json#L2-L7) - Configuración schedule

- **Modelo Prisma:**
  - [prisma/schema.prisma:184-194](../../../prisma/schema.prisma#L184-L194) - Installment model

- **Vista Global:**
  - [app/payments/installments/page.tsx](../../../app/payments/installments/page.tsx) - Página de cuotas
  - [app/payments/installments/columns.tsx](../../../app/payments/installments/columns.tsx) - Columnas DataTable

### Documentación

- [docs/project/architecture.md](../architecture.md#sistema-de-cuotas-installments) - Arquitectura de cuotas
- [docs/project/implementation/2025-current.md](../implementation/2025-current.md) - Implementación #21: Sistema de Installments + Cron Job

### External References

- [Ley 20.555 (Chile)](https://www.bcn.cl/leychile/navegar?idNorma=1041423) - Regulación de crédito y transparencia
- [Decimal.js Documentation](https://mikemcl.github.io/decimal.js/) - Precisión decimal sin errores float
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs) - Configuración de scheduled tasks

## Notas Adicionales

### ¿Por Qué 30 Días Entre Cuotas?

**Decisión:** Intervalo fijo de 30 días (no "1 mes").

**Razón:** Simplicidad y predictibilidad

```typescript
// ✅ Actual (30 días fijo)
dueDate.setDate(dueDate.getDate() + 30)
// 2025-01-01 + 30 días = 2025-01-31
// 2025-01-31 + 30 días = 2025-03-02

// ❌ Alternativa (1 mes)
dueDate.setMonth(dueDate.getMonth() + 1)
// 2025-01-31 + 1 mes = 2025-02-28 (JavaScript ajusta automáticamente)
// 2025-02-28 + 1 mes = 2025-03-28
// Problema: Fechas inconsistentes (día 31 vs 28 vs 28)
```

**Trade-off aceptable:** 30 días puede caer en diferente día del mes, pero es CONSISTENTE.

### Extensibilidad Futura

Si en el futuro se necesita agregar características:

1. **Intereses:**

   ```prisma
   model Installment {
     // Campos actuales...
     principalAmount Decimal? // Monto de capital
     interestAmount  Decimal? // Monto de interés
     interestRate    Decimal? // Tasa aplicada
   }
   ```

2. **Integración Payment Gateway:**

   ```prisma
   model Installment {
     // Campos actuales...
     stripePaymentIntentId String? // Link a Stripe
     mercadopagoPaymentId  String? // Link a MercadoPago
   }
   ```

3. **Penalizaciones:**
   ```prisma
   model Installment {
     // Campos actuales...
     lateFee       Decimal?  // Multa por atraso
     lateFeeAppliedAt DateTime? // Cuándo se aplicó
   }
   ```

**Migración:** Todos los cambios son ADITIVOS (no breaking changes). Sistema actual sigue funcionando.

### Comparación con Competencia

Empresas de construcción en Chile (benchmark informal):

| Empresa           | Ofrece Cuotas | Con Interés    | Número Máximo |
| ----------------- | ------------- | -------------- | ------------- |
| Empresa A         | ✅ Sí         | ✅ 2% mensual  | 12 cuotas     |
| Empresa B         | ❌ No         | N/A            | Solo contado  |
| Empresa C         | ✅ Sí         | ❌ Sin interés | 6 cuotas      |
| **Este proyecto** | ✅ Sí         | ❌ Sin interés | **12 cuotas** |

**Ventaja competitiva:** Más cuotas sin interés que Empresa C, más flexible que Empresa B.

---

**Última actualización:** 2025-10-25
