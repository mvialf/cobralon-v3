# Mejoras Propuestas - Cobralon

Documento generado: 2025-11-25

Este documento contiene las mejoras identificadas durante el análisis del codebase, organizadas por prioridad e impacto.

---

## Resumen Ejecutivo

| Categoría       | Total | Completadas | Pendientes |
| --------------- | ----- | ----------- | ---------- |
| Críticas        | 3     | 3           | 0          |
| Alta Prioridad  | 6     | 1           | 5          |
| Media Prioridad | 6     | 0           | 6          |
| Nice-to-Have    | 6     | 0           | 6          |

---

## Críticas (Bloquean escalabilidad/performance)

### 1. ✅ N+1 Queries en APIs

**Estado:** Completado (2025-11-25)

**Problema:** Queries con `include` sin `relationLoadStrategy: 'join'` causaban N+1 queries.

**Archivos corregidos:**

- `app/api/aftersales/route.ts` - Agregado `relationLoadStrategy: 'join'`
- `app/api/calendar-events/route.ts` - Agregado en 3 queries (projectEvents, aftersaleEvents, visitEvents)

**Impacto:** 100 registros = 201 queries → 1 query (~100x mejora)

---

### 2. ✅ Forms No Reutilizan Hooks de Query

**Estado:** Completado (2025-11-25)

**Problema:** `visit-form.tsx` y `aftersale-form.tsx` hacían fetch manual cuando ya existían hooks de React Query.

**Solución:** Refactorizado para usar `useVisitStatuses()` y `useAftersaleStatuses()`.

**Beneficios:**

- -33 líneas de código
- Caché compartido (5 min stale time)
- Retry automático
- Estado compartido entre componentes

---

### 3. ✅ UninstallTags sin Relación M:M

**Estado:** Completado (2025-11-25)

**Problema:** `Project.uninstallTagIds` era un `String[]` en lugar de relación Prisma M:M.

**Solución implementada:**

**Archivos modificados:**

- `prisma/schema.prisma` - Nuevo modelo `ProjectUninstallTag` + relaciones M:M
- `app/api/projects/route.ts` - Transacción para crear relaciones al crear proyecto
- `app/api/projects/[id]/route.ts` - Transacción para actualizar relaciones al editar
- `app/api/calendar-events/route.ts` - Usa relación M:M directamente (elimina workaround)
- `components/forms/calendar/project-event-form.tsx` - Extrae IDs desde relación
- `scripts/migrate-uninstall-tags.ts` - Script de migración de datos (no ejecutado, sin datos)

**Beneficios:**

- ✅ Integridad referencial (CASCADE en delete)
- ✅ JOINs nativos de DB (`relationLoadStrategy: 'join'`)
- ✅ Eliminado workaround manual de lookup de tags en calendar-events
- ✅ APIs aceptan `uninstallTagIds[]` y crean relaciones automáticamente

**Nota:** El campo legacy `uninstallTagIds` se mantiene temporalmente mapeado a `uninstall_tag_ids_legacy` para compatibilidad. Puede eliminarse en una futura limpieza.

---

## Alta Prioridad (Deuda técnica significativa)

### 4. Business Logic Mezclada en API Routes

**Estado:** Pendiente
**Prioridad:** Alta
**Esfuerzo:** 6-8 horas

**Problema:** `/api/payments/route.ts` tiene 600+ líneas con lógica de negocio mezclada.

**Lógica a extraer:**

| Función                 | Destino                              | Líneas aprox |
| ----------------------- | ------------------------------------ | ------------ |
| Cálculo de installments | `lib/business-logic/installments.ts` | 40           |
| Distribución FIFO       | Ya existe en `payment-fifo.ts`       | -            |
| Sobrepago → crédito     | `lib/business-logic/overpayment.ts`  | 50           |

**Ejemplo de extracción:**

```typescript
// lib/business-logic/installments.ts
export interface InstallmentCalculation {
  installmentNumber: number
  amount: Decimal
  dueDate: Date
  status: string
}

export function calculateInstallments(
  totalAmount: number,
  numberOfInstallments: number,
  startDate: Date
): InstallmentCalculation[] {
  return Array.from({ length: numberOfInstallments }, (_, i) => {
    const installmentNumber = i + 1
    const isLastInstallment = installmentNumber === numberOfInstallments
    const baseAmount = Math.floor((totalAmount / numberOfInstallments) * 100) / 100
    const totalBase = baseAmount * (numberOfInstallments - 1)
    const lastAmount = totalAmount - totalBase

    const dueDate = new Date(startDate)
    dueDate.setMonth(dueDate.getMonth() + installmentNumber)

    return {
      installmentNumber,
      amount: new Decimal(isLastInstallment ? lastAmount : baseAmount),
      dueDate,
      status: 'pending',
    }
  })
}
```

---

### 5. Duplicación de Validaciones (Phone Regex)

**Estado:** Pendiente
**Prioridad:** Alta
**Esfuerzo:** 1-2 horas

**Problema:** La misma regex de teléfono está duplicada en 5 archivos.

**Archivos afectados:**

- `lib/validations/project-validations.ts`
- `lib/validations/customer-validations.ts`
- `lib/validations/visit-validations.ts`
- `lib/validations/aftersale-validations.ts`
- `lib/validations/payment-validations.ts`

**Solución:**

```typescript
// lib/validations/shared/phone.ts
import { z } from 'zod'
import { normalizePhone } from '@/lib/utils/phone'

export const PHONE_REGEX = /^\+56[2-9]\d{8}$/
export const PHONE_ERROR_MESSAGE = 'Formato inválido. Debe ser un teléfono chileno válido'

export const phoneSchema = z
  .string()
  .min(1, 'El teléfono es requerido')
  .transform((val) => normalizePhone(val))
  .refine((val) => PHONE_REGEX.test(val), PHONE_ERROR_MESSAGE)

export const optionalPhoneSchema = z
  .string()
  .optional()
  .transform((val) => (val ? normalizePhone(val) : undefined))
  .refine((val) => !val || PHONE_REGEX.test(val), PHONE_ERROR_MESSAGE)
```

---

### 6. Inconsistencia en Respuestas de API

**Estado:** Pendiente
**Prioridad:** Alta
**Esfuerzo:** 3-4 horas

**Problema:** Cada endpoint usa nombres diferentes para el array de datos.

```typescript
// Inconsistente actualmente:
{
  customers: []
} // /api/customers
{
  payments: []
} // /api/payments
{
  data: []
} // /api/visits
{
  aftersales: []
} // /api/aftersales (sin pagination)

// Algunos errores sin status code:
return NextResponse.json({ error: '...' }) // ← Retorna 200 OK!
```

**Solución:**

```typescript
// lib/api/response.ts
export interface ApiPaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ApiErrorResponse {
  error: string
  code?: string
  details?: unknown
}

export function createPaginatedResponse<T>(
  data: T[],
  pagination: { page: number; limit: number; total: number }
): ApiPaginatedResponse<T> {
  return {
    data,
    pagination: {
      ...pagination,
      totalPages: Math.ceil(pagination.total / pagination.limit),
    },
  }
}

export function createErrorResponse(
  error: string,
  status: number,
  code?: string,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  return NextResponse.json({ error, code, details }, { status })
}
```

---

### 7. Duplicación en Status Validations

**Estado:** Pendiente
**Prioridad:** Alta
**Esfuerzo:** 2-3 horas

**Problema:** Archivos casi idénticos con mismas funciones.

**Archivos afectados:**

- `lib/validations/project-status-validations.ts` (99 líneas)
- `lib/validations/visit-status-validations.ts` (99 líneas)
- `lib/validations/aftersale-status-validations.ts` (similar)

**Solución:** Ya existe `lib/validations/base-status-validations.ts`. Usarlo como template genérico.

---

### 8. FormRoot vs `<form>` Inconsistente

**Estado:** Pendiente
**Prioridad:** Alta
**Esfuerzo:** 1 hora

**Problema:** Algunos forms usan `FormRoot`, otros `<form>` directo.

**Archivos afectados:**

- `components/forms/visits/visit-form.tsx` - Usa `<form>` (debería usar FormRoot)

**Solución:** Estandarizar todos los forms con `FormRoot`.

---

### 9. Índices Faltantes en Prisma

**Estado:** Pendiente
**Prioridad:** Alta
**Esfuerzo:** 30 minutos

**Problema:** Queries comunes sin índices compuestos.

**Agregar en `prisma/schema.prisma`:**

```prisma
model Payment {
  // ... campos existentes

  @@index([customerId])
  @@index([paymentMethodId])
  @@index([date])
  @@index([type])
  @@index([type, date(sort: Desc)])
  @@index([customerId, date(sort: Desc)])      // ← AGREGAR
  @@index([customerId, type, date(sort: Desc)]) // ← AGREGAR
}

model Installment {
  // ... campos existentes

  @@index([paymentId])
  @@index([status, dueDate])  // ← AGREGAR para CRON jobs
}
```

---

## Media Prioridad (Mejoras de calidad)

### 10. Componentes Muy Grandes

**Estado:** Pendiente
**Prioridad:** Media
**Esfuerzo:** 4-6 horas por componente

**Problema:** Forms con >300 líneas que deberían dividirse.

| Archivo                        | Líneas | Problema                          |
| ------------------------------ | ------ | --------------------------------- |
| `payment-to-customer-form.tsx` | 452    | FIFO + allocations + distribución |
| `project-event-form.tsx`       | 390    | Demasiada lógica de calendario    |
| `aftersale-event-form.tsx`     | 345    | Similar                           |

**Regla:** >300 líneas = necesita descomposición en sub-componentes.

---

### 11. Testing Gaps

**Estado:** Pendiente
**Prioridad:** Media
**Esfuerzo:** 20-30 horas total

**Cobertura actual:**

| Tipo            | Actual | Target |
| --------------- | ------ | ------ |
| Unit Tests      | 783    | 800+   |
| Component Tests | 2/19   | 25+    |
| Page Tests      | 0/22   | 22+    |
| E2E Coverage    | 40%    | 80%+   |

**Prioridades de testing:**

1. Component tests para dialogs de CRUD
2. E2E para flujos de edición y eliminación
3. E2E para calendario completo
4. E2E para configuración (settings)

---

### 12. 20 Warnings de TypeScript `any`

**Estado:** Pendiente
**Prioridad:** Media
**Esfuerzo:** 2-3 horas

**Archivos con warnings:**

- `app/aftersales/columns.tsx`
- `app/api/project-events/[id]/route.ts` (5 warnings)
- `app/api/visits/[id]/route.ts` (3 warnings)
- `app/payments/columns.tsx`
- `app/projects/page.tsx` (2 warnings)
- `app/visits/columns.tsx`
- `components/calendar/event-calendar.tsx` (3 warnings)

---

### 13. Sin Error Boundaries

**Estado:** Pendiente
**Prioridad:** Media
**Esfuerzo:** 2-3 horas

**Problema:** Si un componente crashea, toda la página falla sin fallback UI.

**Solución:**

```typescript
// components/error-boundary.tsx
'use client'

import { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-lg font-semibold mb-2">Algo salió mal</h2>
          <p className="text-muted-foreground mb-4">
            {this.state.error?.message || 'Error inesperado'}
          </p>
          <Button onClick={() => this.setState({ hasError: false })}>
            Intentar de nuevo
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
```

**Ubicación recomendada:** Agregar en `app-layout.tsx` alrededor de `children`.

---

### 14. Logging Inconsistente

**Estado:** Pendiente
**Prioridad:** Media
**Esfuerzo:** 2 horas

**Problema:** Algunos endpoints usan `logger` (estructurado), otros `console.error`.

**Archivos afectados:**

- `app/api/aftersales/route.ts` - Usa `console.error`
- `app/api/aftersale-events/route.ts` - Usa `console.error`
- `app/api/visit-events/route.ts` - Usa `console.error`

**Solución:** Migrar todos a usar `withLogging` middleware.

---

### 15. Manejo de Errores Incompleto

**Estado:** Pendiente
**Prioridad:** Media
**Esfuerzo:** 3-4 horas

**Problema:** Algunos catch blocks solo hacen `console.error` sin notificar al usuario.

**Ejemplo problemático:**

```typescript
.catch((err) => {
  console.error('Error fetching project details:', err)
  setHasProjectDetails(false)
  // ❌ Sin notificar al usuario con toast
})
```

**Solución:** Agregar `toast.error()` en todos los catch blocks de componentes.

---

## Nice-to-Have (Features nuevas)

### 16. Dashboard Analítico

**Estado:** Pendiente
**Prioridad:** Baja
**Valor de negocio:** Alto

**Descripción:** Gráficos de ingresos, proyectos por estado, métricas clave.

**Componentes sugeridos:**

- Card de ingresos mensuales (Recharts)
- Gráfico de proyectos por estado
- KPIs: Total clientes, proyectos activos, pagos pendientes

---

### 17. Search Global Unificado

**Estado:** Pendiente
**Prioridad:** Baja
**Valor de negocio:** Medio

**Descripción:** Barra de búsqueda global (Cmd+K) que busca en proyectos, clientes, aftersales.

**Implementación:** Usar `cmdk` (ya instalado).

---

### 18. Exportación PDF/Excel

**Estado:** Pendiente
**Prioridad:** Baja
**Valor de negocio:** Medio

**Descripción:** Reportes mensuales exportables.

**Librerías sugeridas:**

- PDF: `@react-pdf/renderer` o `jspdf`
- Excel: `xlsx` o `exceljs`

---

### 19. Notificaciones Real-time

**Estado:** Pendiente
**Prioridad:** Baja
**Valor de negocio:** Medio

**Descripción:** Alertas de cuotas vencidas, cambios de estado.

**Opciones:**

- WebSockets con Socket.io
- Server-Sent Events (SSE)
- Polling con React Query

---

### 20. PWA / Mobile

**Estado:** Pendiente
**Prioridad:** Baja
**Valor de negocio:** Bajo

**Descripción:** Mejor UX en dispositivos móviles, posibilidad de instalar como app.

---

### 21. Integraciones Externas

**Estado:** Pendiente
**Prioridad:** Baja
**Valor de negocio:** Variable

**Posibles integraciones:**

- Stripe/Transbank para pagos online
- WhatsApp Business API para notificaciones
- Email transaccional (Resend, SendGrid)

---

## Plan de Implementación Sugerido

### Semana 1: Performance y Críticos

- [x] N+1 queries (completado)
- [x] Hooks en forms (completado)
- [ ] Relación M:M UninstallTags
- [ ] Índices Prisma

### Semana 2: Deuda Técnica

- [ ] Extraer business logic (installments)
- [ ] Consolidar validaciones (phone)
- [ ] Estandarizar respuestas API

### Semana 3: Calidad de Código

- [ ] Descomponer forms grandes
- [ ] Eliminar warnings `any`
- [ ] Agregar Error Boundaries
- [ ] Estandarizar logging

### Semana 4: Testing

- [ ] Component tests para dialogs
- [ ] E2E para flujos faltantes
- [ ] Documentación de testing

---

## Métricas de Éxito

| Métrica                | Actual        | Target |
| ---------------------- | ------------- | ------ |
| Build time             | ~45s          | <30s   |
| Lighthouse Performance | ~75           | >90    |
| TypeScript warnings    | 20            | 0      |
| Test coverage          | ~35%          | >70%   |
| N+1 queries            | 0 (corregido) | 0      |

---

## Notas

- Este documento debe actualizarse a medida que se completen mejoras
- Las prioridades pueden ajustarse según necesidades del negocio
- Cada mejora completada debe documentarse en `docs/project/implementation/2025-current.md`
