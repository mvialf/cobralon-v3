# Decisiones Técnicas - Calendar System

Este documento captura las decisiones técnicas clave y sus justificaciones (estilo ADR).

---

## TD-001: 3 Tablas Separadas vs 1 Tabla Polimórfica

**Fecha:** 2025-11-13

### Decisión

Usar **3 tablas separadas**: `ProjectEvent`, `AftersaleEvent`, `VisitEvent`.

### Alternativa

Tabla polimórfica única:

```prisma
model CalendarEvent {
  id         String @id
  entityType String // "project" | "aftersale" | "visit"
  entityId   String
  // ...
}
```

### Justificación

#### ✅ A favor de 3 tablas separadas:

1. **Type Safety**: Prisma genera tipos específicos, evitando casts
2. **Foreign Keys**: Relaciones directas con `ON DELETE CASCADE`
3. **Queries más simples**: No necesita filtrar por `entityType`
4. **Performance**: Índices específicos por tabla
5. **Extensibilidad**: Fácil agregar campos específicos (ej: `ProjectEvent.technicianId`)

#### ⚠️ En contra:

1. **Duplicación de código**: API routes muy similares (mitigado con copy-paste)
2. **Más archivos**: 3x routes, hooks, forms (aceptable, <100 líneas c/u)

### Consecuencias

- ✅ Mejor DX (autocomplete, type safety)
- ✅ Queries más rápidas (sin filtros extra)
- ⚠️ Más código a mantener (pero simétrico)

---

## TD-002: Sobrescribir vs Snapshot de Datos

**Fecha:** 2025-11-13

### Decisión

**Sobrescribir datos del Project** directamente (NO snapshot).

### Contexto

Al editar `address`, `phone`, `status` desde un evento, ¿qué hacer?

**Opción A:** Sobrescribir `Project.address` (todos los eventos ven cambio)
**Opción B:** Guardar `ProjectEvent.address` como override (snapshot)

### Justificación

#### Elegimos Opción A porque:

1. **Simplicidad**: No duplicar datos, single source of truth
2. **Consistencia**: Cambio de estado se refleja en TODOS los eventos
3. **Menos storage**: No almacenar snapshots redundantes
4. **UX esperada**: Usuario espera que editar "teléfono" lo cambie en el proyecto

#### Trade-off:

- ⚠️ No hay historial de cambios (ej: "address era X el 13/11")
- **Mitigación:** Para auditoría, agregar tabla `audit_log` en Fase Futura

### Consecuencias

- ✅ Modelo de datos más simple
- ✅ Queries más rápidas (no joins a override tables)
- ⚠️ Sin historial de cambios (aceptable para MVP)

---

## TD-003: Auto-Save vs Confirmation en Drag & Drop

**Fecha:** 2025-11-13

### Decisión

**Auto-save** inmediato sin confirmación.

### Alternativa

Mostrar dialog de confirmación:

```
"¿Mover evento a 15 de Noviembre?"
[Cancelar] [Confirmar]
```

### Justificación

#### A favor de auto-save:

1. **UX moderna**: Apps como Google Calendar, Notion auto-guardan
2. **Menos friction**: 1 acción (drag) vs 3 acciones (drag + click confirmar)
3. **Optimistic updates**: Parece instantáneo
4. **Rollback en error**: Si falla, vuelve a posición original automáticamente

#### En contra:

- ⚠️ Usuario podría arrastrar por accidente
- **Mitigación:** Toasts de error son claros, easy undo (re-arrastrar)

### Consecuencias

- ✅ UX fluida y rápida
- ✅ Menos clicks del usuario
- ⚠️ Requiere implementar rollback robusto (ya incluido)

---

## TD-004: Vista por Defecto = Week

**Fecha:** 2025-11-13

### Decisión

**WeekView** es la vista por defecto (NO Month).

### Alternativa

MonthView como default (más común en calendarios).

### Justificación

#### A favor de Week:

1. **Más espacio vertical**: Cards pueden crecer (altura dinámica)
2. **Menos scroll**: 7 días visibles vs 35-42 días
3. **Foco en próximos eventos**: Semana actual es lo más relevante
4. **Mejor para planning diario**: Técnicos ven su semana de trabajo

#### A favor de Month:

- ✅ Vista panorámica de mes completo
- **Mitigación:** Month view disponible, solo no es default

### Consecuencias

- ✅ UI principal optimizada para eventos de la semana
- ⚠️ Usuario debe cambiar manualmente a Month si quiere vista amplia

---

## TD-005: Sin Horas (All-Day Events)

**Fecha:** 2025-11-13

### Decisión

**Solo fechas**, sin time slots.

### Contexto

Shadcn example original tenía time slots de 15 min.

### Justificación

1. **Simplicidad**: Elimina complejidad de horarios
2. **Caso de uso real**: Instalaciones son "todo el día", no hora específica
3. **UI más limpia**: No necesita grid de horas (más espacio para info)
4. **Modelo de datos simple**: `scheduledDate @db.Date` (sin timestamp)

### Extensibilidad Futura

Si se necesita hora:

1. Agregar campo `startTime` y `endTime` opcionales
2. Mantener retrocompatibilidad (NULL = all-day)
3. UI puede mostrar time slots condicional

### Consecuencias

- ✅ Código más simple (~30% menos complejo)
- ✅ Drag & drop trivial (solo cambiar fecha)
- ⚠️ No soporta múltiples eventos con horarios específicos (aceptable)

---

## TD-006: Unified Fetch vs Separate Queries

**Fecha:** 2025-11-13

### Decisión

**Unified endpoint** `/api/calendar-events` que retorna los 3 tipos.

### Alternativa

3 queries separadas en cliente:

```typescript
const { data: projects } = useProjectEvents(start, end)
const { data: aftersales } = useAftersaleEvents(start, end)
const { data: visits } = useVisitEvents(start, end)
```

### Justificación

#### A favor de unified:

1. **1 request** vs 3 requests (mejor performance en network)
2. **Ordenamiento server-side**: API ordena por fecha una sola vez
3. **Menos hooks**: UI no necesita merge 3 arrays
4. **Menos cache keys**: 1 query en React Query vs 3

#### En contra:

- ⚠️ Endpoint más complejo (3 queries en paralelo)
- **Mitigación:** Promise.all hace queries en paralelo, no secuencial

### Consecuencias

- ✅ UI más simple (1 hook)
- ✅ Mejor performance (1 round-trip)
- ⚠️ Cache invalidation invalida los 3 tipos (aceptable, rara vez solo 1 cambia)

---

## TD-007: React Query vs SWR vs Apollo

**Fecha:** 2025-11-13

### Decisión

**TanStack React Query** (ya usado en proyecto).

### Alternativa

- SWR (vercel/swr)
- Apollo Client (si fuera GraphQL)

### Justificación

1. **Ya instalado**: Proyecto usa React Query en todo
2. **Consistencia**: Mismo patrón que otros módulos (Projects, Aftersales, etc.)
3. **Features robustas**: Optimistic updates, invalidations, devtools
4. **Comunidad activa**: Bien mantenido, docs excelentes

### Consecuencias

- ✅ Sin nueva dependencia
- ✅ Patterns familiares para el equipo

---

## TD-008: @dnd-kit vs react-dnd vs react-beautiful-dnd

**Fecha:** 2025-11-13

### Decisión

**@dnd-kit/core** (ya instalado).

### Alternativa

- react-dnd (más antiguo, API compleja)
- react-beautiful-dnd (Atlassian, deprecated)

### Justificación

1. **Ya instalado**: Usado en settings page del proyecto
2. **Modern API**: Hooks-based, TypeScript first-class
3. **Lightweight**: Sin dependencias pesadas
4. **Flexible**: Soporta calendario, listas, etc.
5. **Activamente mantenido**: Última release reciente

### Consecuencias

- ✅ Sin nueva dependencia
- ✅ API moderna y fácil de usar
- ✅ Performance excelente (usa CSS transforms)

---

## TD-009: Optimistic Updates Solo en Drag & Drop

**Fecha:** 2025-11-13

### Decisión

Solo drag & drop usa **optimistic updates**. Create/Edit/Delete esperan respuesta server.

### Justificación

#### Drag & Drop → Optimistic:

- ✅ UX crítica: Debe sentirse instantáneo
- ✅ Operación simple: Solo cambiar fecha (bajo riesgo de conflicto)
- ✅ Easy rollback: Si falla, volver a posición original

#### Create/Edit/Delete → No optimistic:

- ⚠️ Operaciones complejas: Validaciones, actualizaciones de Project, duplicados
- ⚠️ Rollback difícil: Restaurar estado complejo es error-prone
- ✅ Loading spinner aceptable: Operaciones son explícitas (usuario hace click y espera)

### Consecuencias

- ✅ Balance entre UX y complejidad
- ⚠️ Create/Edit tienen ~1-2 seg delay (aceptable con loading states)

---

## TD-010: Validación Client-Side Y Server-Side

**Fecha:** 2025-11-13

### Decisión

**Validación duplicada**: Zod en cliente (React Hook Form) Y en servidor (API routes).

### Alternativa

Solo server-side (confiar en API).

### Justificación

#### A favor de duplicar:

1. **Security**: Never trust the client
2. **UX**: Client-side da feedback instantáneo (sin round-trip)
3. **DX**: Zod schemas reutilizables (mismo schema en ambos lados)

**Ejemplo:**

```typescript
// lib/validations/calendar-validations.ts
export const createProjectEventSchema = z.object({...})

// Client (React Hook Form)
const form = useForm({ resolver: zodResolver(createProjectEventSchema) })

// Server (API route)
const validation = createProjectEventSchema.safeParse(body)
```

### Consecuencias

- ✅ Seguridad robusta
- ✅ UX sin delays
- ⚠️ Pequeña duplicación de lógica (mitigado por Zod reusable)

---

## TD-011: No Incluir Authentication en Fase 1

**Fecha:** 2025-11-13

### Decisión

**Sin autenticación** en MVP (todos pueden ver/editar todo).

### Justificación

1. **Scope creep**: Auth agrega 5-10 horas más
2. **Uso interno**: App es para equipo interno (no público)
3. **Prioridad MVP**: Validar funcionalidad core primero
4. **Fácil agregar después**: NextAuth/Stack Auth pueden agregarse sin refactorizar mucho

### Fase Futura

```typescript
// middleware.ts (futuro)
import { auth } from '@/lib/auth'

export async function middleware(request: Request) {
  const session = await auth()
  if (!session) {
    return redirect('/login')
  }
}
```

### Consecuencias

- ✅ MVP más rápido (5-7 días vs 7-10 días)
- ⚠️ Sin control de permisos (aceptable para uso interno)

---

## TD-012: Filtrado por isFinal en Combobox

**Fecha:** 2025-11-13

### Decisión

Combobox **NO muestra entidades finalizadas** (`isFinal: true`).

### Justificación

1. **Reduce ruido**: Proyectos completados no necesitan más eventos
2. **Performance**: Menos items en dropdown
3. **UX**: Usuario no debe scrollear 100+ proyectos viejos

### Edge Case

Si usuario NECESITA crear evento para proyecto finalizado:

- Debe ir a `/projects/[id]` y cambiar estado primero
- Luego crear evento en calendario

### Consecuencias

- ✅ Combobox más rápido y limpio
- ⚠️ Edge case raro (aceptable, workaround existe)

---

## Resumen de Trade-offs Principales

| Decisión           | Pro              | Contra               | Mitigación            |
| ------------------ | ---------------- | -------------------- | --------------------- |
| 3 tablas separadas | Type safety, FKs | Más código           | Copy-paste adaptado   |
| Sobrescribir datos | Simplicidad      | Sin historial        | Audit log futuro      |
| Auto-save drag     | UX fluida        | Arrastrar accidental | Rollback robusto      |
| Week default       | Más espacio      | Vista reducida       | Month disponible      |
| Sin horas          | Más simple       | Menos flexible       | Extensible futuro     |
| Unified fetch      | 1 request        | Cache grande         | Invalidation granular |
| No auth Fase 1     | MVP rápido       | Sin permisos         | Agregar después       |

---

## Siguiente Paso

Revisar **[08-testing-strategy.md](08-testing-strategy.md)** para plan de testing completo.
