# Implementación: Street Opcional en Entidades, Obligatorio en Eventos

> **Status:** Pendiente | **Fecha:** 2026-02-17
> **Impacto:** Medium | **Alcance:** 6 formularios, 6 APIs, 1 componente compartido, 1 schema compartido

---

## 1. Contexto y Justificación

### El problema

Actualmente `street` (calle) es **obligatorio en todos los formularios** — tanto en entidades (proyecto, visita, postventa) como en eventos de calendario. Sin embargo, la calle no siempre se conoce al momento de crear la entidad.

### La regla de negocio propuesta

- **Entidad** (proyecto, visita, postventa) → `street` **opcional**. Solo región + comuna son obligatorios.
- **Evento** (de proyecto, de visita, de postventa) → `street` **obligatorio**. Alguien va físicamente al lugar y necesita la dirección exacta.

### Por qué tiene sentido

1. **Proyecto**: Entidad administrativa/financiera. En etapa temprana puede no conocerse la dirección exacta.
2. **Visita**: Prospecto que se registra. Puede no tener dirección confirmada todavía.
3. **Postventa**: Hereda dirección del proyecto. Si el proyecto no tenía calle, la postventa tampoco.
4. **Evento** (cualquiera): Implica desplazamiento físico. La dirección exacta es imprescindible para llegar.

### Sincronización automática (ya existe)

Las 3 APIs de eventos (`*-events-with-update`) ya **actualizan la entidad padre** cuando detectan cambios en los datos del formulario. Esto significa que cuando un usuario llena la calle al crear un evento, esa calle se propaga automáticamente a la entidad (proyecto/visita).

**Flujo resultante:**

```
Crear Proyecto (sin calle) → Crear Evento (con calle obligatoria) → Proyecto se actualiza con la calle
```

---

## 2. Archivos Afectados — Resumen

| # | Archivo | Tipo | Cambio |
|---|---------|------|--------|
| 1 | `prisma/schema.prisma` | DB | `street String` → `String?` en Project y Visit |
| 2 | `lib/validations/common/address-schema.ts` | Schema | Crear variantes con street opcional |
| 3 | `lib/validations/project-validations.ts` | Schema | Usar street opcional |
| 4 | `lib/validations/visit-validations.ts` | Schema | Usar street opcional |
| 5 | `lib/validations/aftersale-validations.ts` | Schema | Usar street opcional |
| 6 | `lib/validations/calendar-validations.ts` | Schema | **SIN CAMBIOS** (street obligatorio) |
| 7 | `lib/validations/visit-event-validations.ts` | Schema | **SIN CAMBIOS** (street obligatorio) |
| 8 | `lib/validations/aftersale-event-validations.ts` | Schema | **SIN CAMBIOS** (street obligatorio) |
| 9 | `components/forms/fields/address-fields.tsx` | Componente | Agregar prop `streetRequired` |
| 10 | `components/forms/projects/project-form.tsx` | Formulario | Pasar `streetRequired={false}` |
| 11 | `components/forms/visits/visit-form.tsx` | Formulario | Pasar `streetRequired={false}` |
| 12 | `components/forms/aftersales/aftersale-form.tsx` | Formulario | Pasar `streetRequired={false}` |
| 13 | `components/forms/calendar/project-event-form.tsx` | Formulario | **SIN CAMBIOS** (default `streetRequired={true}`) |
| 14 | `components/forms/calendar/visit-event-form.tsx` | Formulario | **SIN CAMBIOS** (default `streetRequired={true}`) |
| 15 | `components/forms/calendar/aftersale-event-form.tsx` | Formulario | **SIN CAMBIOS** (default `streetRequired={true}`) |
| 16 | `app/api/projects/route.ts` | API | Aceptar `street: null` en POST |
| 17 | `app/api/projects/[id]/route.ts` | API | Aceptar `street: null` en PUT |
| 18 | `app/api/visits/route.ts` | API | Aceptar `street: null` en POST |
| 19 | `app/api/visits/[id]/route.ts` | API | Aceptar `street: null` en PUT |
| 20 | `app/api/aftersales/route.ts` | API | Aceptar `street: null` en POST |
| 21 | `app/api/project-events-with-update/route.ts` | API | **SIN CAMBIOS** (street obligatorio) |
| 22 | `app/api/visit-events-with-update/route.ts` | API | **SIN CAMBIOS** (street obligatorio) |
| 23 | `app/api/aftersale-events-with-update/route.ts` | API | **SIN CAMBIOS** (street obligatorio) |
| 24 | Tests (varios) | Tests | Ajustar y agregar |

---

## 3. Cambios Detallados

### 3.1. Prisma Schema (`prisma/schema.prisma`)

**Modelo Project** (línea 163):

```diff
- street              String
+ street              String?
```

**Modelo Visit** (línea 368):

```diff
- street        String        // Calle
+ street        String?       // Calle (opcional, se completa al agendar evento)
```

**Modelo Aftersale**: No tiene campo `street` propio (hereda del Project asociado). Sin cambios.

**Modelos de eventos** (ProjectEvent, VisitEvent, AftersaleEvent): No almacenan `street`. Sin cambios.

**Migración requerida:**

```bash
npx prisma migrate dev --name optional-street-entities
```

> **Nota sobre datos existentes:** Los 90 proyectos importados y todas las visitas existentes ya tienen `street` con valor. La migración `String` → `String?` no rompe datos existentes — solo permite `null` para registros nuevos.

---

### 3.2. Schema de Validación Compartido (`lib/validations/common/address-schema.ts`)

**Estado actual:**

```typescript
// Línea 6-10
export const addressFieldsSchema = {
  street: z.string().min(1, 'La calle es obligatoria'),
  comuna: z.string().min(1, 'La comuna es obligatoria'),
  region: z.string().min(1, 'La región es obligatoria'),
}
```

**Cambio propuesto:**

Crear un schema base **sin street** y dos variantes (con street obligatorio / opcional):

```typescript
/**
 * Campos de ubicación base (siempre obligatorios)
 */
const locationFieldsSchema = {
  comuna: z.string().min(1, 'La comuna es obligatoria'),
  region: z.string().min(1, 'La región es obligatoria'),
}

/**
 * Dirección con street OBLIGATORIO (para eventos de calendario)
 * Usado en: calendar-validations, visit-event-validations, aftersale-event-validations
 */
export const addressFieldsSchema = {
  street: z.string().min(1, 'La calle es obligatoria'),
  ...locationFieldsSchema,
}

/**
 * Dirección con street OPCIONAL (para entidades)
 * Usado en: project-validations, visit-validations, aftersale-validations
 *
 * Justificación: Al crear una entidad puede no conocerse la calle exacta.
 * Se completa obligatoriamente al agendar un evento (trabajo de campo).
 */
export const addressFieldsOptionalStreetSchema = {
  street: z.string().optional().default(''),
  ...locationFieldsSchema,
}
```

**Variantes compuestas con apartment — crear las que faltan:**

```typescript
/**
 * Entidad + apartment opcional (para proyecto y visita forms)
 * Usado en: project-validations, visit-validations
 */
export const addressOptionalStreetWithOptionalApartmentSchema = {
  ...addressFieldsOptionalStreetSchema,
  apartment: z.string().optional(),
}

/**
 * Entidad + apartment nullable y opcional (para aftersale form)
 * Usado en: aftersale-validations
 */
export const addressOptionalStreetWithNullableApartmentSchema = {
  ...addressFieldsOptionalStreetSchema,
  apartment: z.string().nullable().optional(),
}
```

**Variantes existentes (sin cambios)** — siguen usando `addressFieldsSchema` (street obligatorio):

```typescript
// SIN CAMBIOS - Eventos siguen con street obligatorio
export const addressWithOptionalApartmentSchema = { ... }        // No se usa en eventos
export const addressWithNullableApartmentSchema = { ... }        // visit-event-validations
export const addressWithNullableOnlyApartmentSchema = { ... }    // calendar-validations, aftersale-event-validations
```

**Archivo completo resultante:**

```typescript
import { z } from 'zod'

// --- Base ---

const locationFieldsSchema = {
  comuna: z.string().min(1, 'La comuna es obligatoria'),
  region: z.string().min(1, 'La región es obligatoria'),
}

// --- Street OBLIGATORIO (eventos) ---

export const addressFieldsSchema = {
  street: z.string().min(1, 'La calle es obligatoria'),
  ...locationFieldsSchema,
}

export const addressWithOptionalApartmentSchema = {
  ...addressFieldsSchema,
  apartment: z.string().optional(),
}

export const addressWithNullableApartmentSchema = {
  ...addressFieldsSchema,
  apartment: z.string().nullable().optional(),
}

export const addressWithNullableOnlyApartmentSchema = {
  ...addressFieldsSchema,
  apartment: z.string().nullable(),
}

// --- Street OPCIONAL (entidades) ---

export const addressFieldsOptionalStreetSchema = {
  street: z.string().optional().default(''),
  ...locationFieldsSchema,
}

export const addressOptionalStreetWithOptionalApartmentSchema = {
  ...addressFieldsOptionalStreetSchema,
  apartment: z.string().optional(),
}

export const addressOptionalStreetWithNullableApartmentSchema = {
  ...addressFieldsOptionalStreetSchema,
  apartment: z.string().nullable().optional(),
}
```

---

### 3.3. Schema de Proyecto (`lib/validations/project-validations.ts`)

**Cambio en import** (línea 2):

```diff
- import { chilePhoneSchema, addressWithOptionalApartmentSchema } from './common'
+ import { chilePhoneSchema, addressOptionalStreetWithOptionalApartmentSchema } from './common'
```

**Cambio en schema base** (línea 24):

```diff
  // Dirección del proyecto
- ...addressWithOptionalApartmentSchema,
+ ...addressOptionalStreetWithOptionalApartmentSchema,
```

**Cambio en type `CreateProjectAPIPayload`** (línea 102):

```diff
- street: string
+ street?: string
```

**Cambio en helper `projectFormToPayload`** (línea 155):

```diff
  street: values.street,
```

Sin cambios necesarios — `values.street` será `string | undefined`, y el API lo recibirá como tal.

Pero para consistencia con la DB (que guarda `null`, no `undefined`), considerar:

```diff
- street: values.street,
+ street: values.street || null,
```

---

### 3.4. Schema de Visita (`lib/validations/visit-validations.ts`)

**Cambio en import** (línea 2):

```diff
- import { optionalChilePhoneSchema, addressWithOptionalApartmentSchema } from './common'
+ import { optionalChilePhoneSchema, addressOptionalStreetWithOptionalApartmentSchema } from './common'
```

**Cambio en schema base** (línea 15):

```diff
- ...addressWithOptionalApartmentSchema,
+ ...addressOptionalStreetWithOptionalApartmentSchema,
```

**Cambio en `createVisitApiSchema`** (línea 58):

```diff
- ...addressWithOptionalApartmentSchema,
+ ...addressOptionalStreetWithOptionalApartmentSchema,
```

**Cambio en type `CreateVisitAPIPayload`** (línea 83):

```diff
- street: string
+ street?: string
```

**Cambio en type `Visit`** (línea 105):

```diff
- street: string
+ street: string | null
```

**Cambio en helper `formValuesToPayload`** (línea 134):

```diff
- street: values.street,
+ street: values.street || null,
```

**Cambio en helper `visitToFormValues`** (línea 152):

```diff
- street: visit.street,
+ street: visit.street || undefined,
```

---

### 3.5. Schema de Postventa (`lib/validations/aftersale-validations.ts`)

**Cambio en import** (línea 3):

```diff
- import { chilePhoneSchema, addressWithNullableApartmentSchema } from './common'
+ import { chilePhoneSchema, addressOptionalStreetWithNullableApartmentSchema } from './common'
```

**Cambio en `aftersaleSchema`** (línea 26):

```diff
- ...addressWithNullableApartmentSchema,
+ ...addressOptionalStreetWithNullableApartmentSchema,
```

**Cambio en `createAftersaleApiSchema`** (línea 45):

```diff
- ...addressWithNullableApartmentSchema,
+ ...addressOptionalStreetWithNullableApartmentSchema,
```

**Cambio en type `Aftersale`** (línea 82):

```diff
- street: string
+ street: string | null
```

**Cambio en type `CreateAftersalePayload`** (línea 108):

```diff
- street: string
+ street?: string
```

**Cambio en helper `formValuesToPayload`** (línea 131):

```diff
- street: values.street,
+ street: values.street || null,
```

**Cambio en helper `aftersaleToFormValues`** (línea 150):

```diff
- street: aftersale.project.street,
+ street: aftersale.project.street || undefined,
```

---

### 3.6. Schemas de Eventos — SIN CAMBIOS

Estos archivos **NO se modifican**. `street` permanece obligatorio:

| Archivo | Schema usado | Street |
|---------|-------------|--------|
| `calendar-validations.ts` (línea 81) | `addressWithNullableOnlyApartmentSchema` | **Obligatorio** |
| `visit-event-validations.ts` (línea 31) | `addressWithNullableApartmentSchema` | **Obligatorio** |
| `aftersale-event-validations.ts` (línea 32) | `addressWithNullableOnlyApartmentSchema` | **Obligatorio** |

---

### 3.7. Componente `AddressFields` (`components/forms/fields/address-fields.tsx`)

**Cambio en interface** (línea 13):

```diff
  interface AddressFieldsProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    control: Control<any>
    defaultRegion?: string
    disabled?: boolean
+   streetRequired?: boolean
  }
```

**Cambio en destructuring** (línea 24):

```diff
- export function AddressFields({ control, defaultRegion, disabled }: AddressFieldsProps) {
+ export function AddressFields({ control, defaultRegion, disabled, streetRequired = true }: AddressFieldsProps) {
```

**Cambio en label de calle** (línea 45):

```diff
- <FormLabel>Calle y numeración *</FormLabel>
+ <FormLabel>Calle y numeración{streetRequired ? ' *' : ''}</FormLabel>
```

> **Nota:** No se agregan otras props. El componente solo controla la presentación visual (asterisco). La validación real se maneja en el schema Zod de cada formulario.

---

### 3.8. Formularios de Entidades

#### Project Form (`components/forms/projects/project-form.tsx`, línea 312)

```diff
- <AddressFields control={form.control} defaultRegion={configuration.region} />
+ <AddressFields control={form.control} defaultRegion={configuration.region} streetRequired={false} />
```

#### Visit Form (`components/forms/visits/visit-form.tsx`, línea 144)

```diff
- <AddressFields control={form.control} />
+ <AddressFields control={form.control} streetRequired={false} />
```

#### Aftersale Form (`components/forms/aftersales/aftersale-form.tsx`, línea 211)

```diff
- <AddressFields control={form.control} disabled={!hasProjectDetails} />
+ <AddressFields control={form.control} disabled={!hasProjectDetails} streetRequired={false} />
```

---

### 3.9. Formularios de Eventos — SIN CAMBIOS

Estos formularios **NO se modifican**. Usan `AddressFields` sin la prop `streetRequired`, lo que resulta en el default `true`:

| Formulario | Archivo | Línea | Street |
|------------|---------|-------|--------|
| Evento de Proyecto | `project-event-form.tsx` | 311 | `streetRequired={true}` (default) |
| Evento de Visita | `visit-event-form.tsx` | 273 | `streetRequired={true}` (default) |
| Evento de Postventa | `aftersale-event-form.tsx` | 285 | `streetRequired={true}` (default) |

---

### 3.10. APIs de Entidades

#### POST `/api/projects` (`app/api/projects/route.ts`)

El cambio es indirecto — viene del schema de validación (`createProjectApiSchema`). El schema ahora acepta `street` como opcional.

En el `prisma.project.create`, si `body.street` es `undefined` o `''`, Prisma lo guardará como `null` (porque el campo es `String?`).

**Posible ajuste en la línea de creación:**

```diff
  data: {
    ...
-   street,
+   street: street || null,
    ...
  }
```

Esto normaliza `undefined` y `''` (string vacío del form) a `null` en la DB.

#### PUT `/api/projects/[id]` (`app/api/projects/[id]/route.ts`)

Ya usa `updateProjectApiSchema` que es `.partial()` de `createProjectApiSchema`. Street ya es opcional en updates. Sin cambio funcional.

#### POST `/api/visits` (`app/api/visits/route.ts`)

Mismo patrón que projects:

```diff
  data: {
    ...
-   street: body.street,
+   street: body.street || null,
    ...
  }
```

#### POST `/api/aftersales` (`app/api/aftersales/route.ts`)

Este actualiza el proyecto padre, no crea un aftersale con street propio.
**Línea 112** actualiza `project.street` con `body.street`:

```diff
  data: {
    ...
-   street: body.street,
+   street: body.street || null,
    ...
  }
```

---

### 3.11. APIs de Eventos — SIN CAMBIOS (con una observación)

Las 3 APIs de eventos no cambian su schema (street sigue obligatorio). Pero hay que verificar que la **comparación de cambios** funcione correctamente cuando `currentProject.street` es `null`:

#### `project-events-with-update/route.ts` (línea 56)

```typescript
currentProject.street !== body.street
```

Si `currentProject.street === null` y `body.street === "Av. Providencia 123"`:
- `null !== "Av. Providencia 123"` → `true` → **Actualiza el proyecto** ✅

Funciona correctamente. Sin cambios necesarios.

#### `visit-events-with-update/route.ts` (línea 64)

```typescript
currentVisit.street !== body.street
```

Mismo caso. `null !== "..." ` → `true` → **Actualiza la visita** ✅

#### `aftersale-events-with-update/route.ts` (línea 73)

```typescript
currentAftersale.project.street !== body.street
```

Mismo caso. `null !== "..."` → `true` → **Actualiza el proyecto** ✅

---

## 4. Flujos de Usuario Resultantes

### 4.1. Crear proyecto sin calle → Agendar evento

```
1. Usuario crea proyecto:
   - Región: Metropolitana ✓
   - Comuna: Las Condes ✓
   - Calle: (vacío) — permitido
   → Proyecto guardado con street = null

2. Usuario agenda evento para ese proyecto:
   - Formulario autocompleta datos del proyecto
   - Calle aparece vacía — campo obligatorio (asterisco visible)
   - Usuario llena: "Av. Apoquindo 4500"
   - Envía formulario

3. API project-events-with-update:
   - Detecta street cambió: null → "Av. Apoquindo 4500"
   - Actualiza proyecto con la nueva calle
   - Crea evento
   → Proyecto ahora tiene street = "Av. Apoquindo 4500"
```

### 4.2. Crear proyecto con calle → Agendar evento

```
1. Usuario crea proyecto con todos los campos llenos
   → Sin cambios respecto al comportamiento actual

2. Usuario agenda evento
   - Todos los campos se autocomplentan, incluyendo calle
   - Puede editarlos si lo necesita
   → Funciona exactamente como hoy
```

### 4.3. Crear visita sin calle → Agendar evento de visita

```
1. Usuario crea visita:
   - Región + Comuna ✓
   - Calle: (vacío)
   → Visita guardada con street = null

2. Usuario agenda evento de visita:
   - Autocompleta datos, calle vacía
   - Usuario llena calle (obligatorio)
   → visit-events-with-update actualiza la visita con la calle
```

### 4.4. Crear postventa desde proyecto sin calle → Agendar evento

```
1. Proyecto tiene street = null
2. Usuario crea postventa:
   - Dirección se autocompleta desde proyecto
   - Calle vacía — permitido (la postventa no exige calle)
   → Postventa creada, proyecto sin cambios

3. Usuario agenda evento de postventa:
   - Calle vacía — campo obligatorio
   - Usuario llena calle
   → aftersale-events-with-update actualiza el PROYECTO con la calle
   → Beneficio colateral: futuros eventos/postventas de este proyecto ya tendrán calle
```

---

## 5. Tests

### 5.1. Tests a Modificar

#### `lib/validations/__tests__/common-schemas.test.ts`

**Test existente** (línea 211):

```typescript
it('street debe ser requerido', () => {
  const result = schema.safeParse({ ...validAddressBase, street: '' })
  expect(result.success).toBe(false)
})
```

**Acción:** Mantener para `addressFieldsSchema`. Agregar tests para `addressFieldsOptionalStreetSchema`.

**Tests nuevos a agregar:**

```typescript
describe('addressFieldsOptionalStreetSchema', () => {
  it('debe aceptar sin street', () => {
    const result = schema.safeParse({ comuna: 'Las Condes', region: '13' })
    expect(result.success).toBe(true)
  })

  it('debe aceptar con street vacío', () => {
    const result = schema.safeParse({ street: '', comuna: 'Las Condes', region: '13' })
    expect(result.success).toBe(true)
  })

  it('debe aceptar con street lleno', () => {
    const result = schema.safeParse({ street: 'Av. Providencia 123', comuna: 'Las Condes', region: '13' })
    expect(result.success).toBe(true)
  })

  it('comuna sigue siendo obligatorio', () => {
    const result = schema.safeParse({ region: '13' })
    expect(result.success).toBe(false)
  })

  it('region sigue siendo obligatorio', () => {
    const result = schema.safeParse({ comuna: 'Las Condes' })
    expect(result.success).toBe(false)
  })
})
```

#### `lib/validations/__tests__/project-validations.test.ts`

**Test existente** (línea 68-75):

```typescript
it('debe rechazar sin street', () => {
  const { street, ...input } = validInput
  const result = projectFormSchema.safeParse(input)
  expect(result.success).toBe(false)
  if (!result.success) {
    expect(result.error.issues[0].path).toContain('street')
  }
})
```

**Cambio:**

```typescript
it('debe aceptar sin street (opcional)', () => {
  const { street, ...input } = validInput
  const result = projectFormSchema.safeParse(input)
  expect(result.success).toBe(true)
})
```

**Test adicional:**

```typescript
it('debe aceptar con street lleno', () => {
  const result = projectFormSchema.safeParse(validInput) // validInput tiene street
  expect(result.success).toBe(true)
})
```

#### `lib/validations/__tests__/visit-validations.test.ts`

**Test existente** (línea 48-53): Mismo patrón que project. Cambiar de "rechazar" a "aceptar".

**Test existente** (línea 513): `createVisitApiSchema` — mismo cambio.

#### `lib/validations/__tests__/aftersale-validations.test.ts`

Revisar si hay tests que validan street como obligatorio y ajustar.

#### `lib/validations/__tests__/calendar-validations.test.ts`

**Test existente** (línea 251):

```typescript
it('debe rechazar sin calle (street)', () => { ... })
```

**Acción:** **NO CAMBIAR**. Street sigue obligatorio en eventos. Este test debe seguir pasando.

### 5.2. Tests Nuevos Sugeridos

```typescript
// Test de integración conceptual: el flujo completo
describe('street optional → required flow', () => {
  it('proyecto sin street debe ser válido', () => {
    // projectFormSchema acepta sin street
  })

  it('evento con proyecto sin street debe exigir street', () => {
    // createProjectEventWithProjectUpdateSchema rechaza sin street
  })
})
```

---

## 6. Orden de Implementación

### Fase 1: Schema de Validación

1. Modificar `lib/validations/common/address-schema.ts` — crear variantes con street opcional
2. Modificar `lib/validations/project-validations.ts` — usar nuevo schema
3. Modificar `lib/validations/visit-validations.ts` — usar nuevo schema
4. Modificar `lib/validations/aftersale-validations.ts` — usar nuevo schema
5. Ejecutar `npm run typecheck` — verificar que no hay errores de tipos

### Fase 2: Base de Datos

6. Modificar `prisma/schema.prisma` — `street String?` en Project y Visit
7. Ejecutar `npx prisma migrate dev --name optional-street-entities`
8. Verificar migración exitosa

### Fase 3: Componente UI

9. Modificar `components/forms/fields/address-fields.tsx` — agregar prop `streetRequired`
10. Modificar `components/forms/projects/project-form.tsx` — pasar `streetRequired={false}`
11. Modificar `components/forms/visits/visit-form.tsx` — pasar `streetRequired={false}`
12. Modificar `components/forms/aftersales/aftersale-form.tsx` — pasar `streetRequired={false}`

### Fase 4: APIs

13. Revisar y ajustar normalización `street || null` en APIs de creación de entidades
14. Verificar que APIs de eventos no necesitan cambios

### Fase 5: Tests y Validación

15. Ajustar tests existentes
16. Agregar tests nuevos
17. Ejecutar `npm run lint && npm run typecheck`
18. Probar manualmente flujos descritos en sección 4

---

## 7. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| Queries que asumen `street` no null | Media | Buscar todas las referencias a `project.street` y `visit.street` en el codebase. Verificar que manejan `null`. |
| Listados/tablas que muestran street | Baja | Mostrar "-" o vacío si `street` es null. Verificar componentes de listado. |
| Exports/reportes que incluyen street | Baja | Verificar que capture-dialog y exports manejan null. |
| Datos legacy (90 proyectos) | Ninguna | Todos tienen `street` con valor. No se ven afectados. |

---

## 8. Decisiones de Diseño

### ¿Por qué `z.string().optional().default('')` y no `z.string().nullable()`?

En el **form schema** (Zod), usamos `.optional().default('')` porque:
- El input HTML siempre devuelve string (nunca null)
- `default('')` evita que el campo sea `undefined` en el form state
- En la **API**, normalizamos `'' → null` antes de guardar en DB

Si se prefiere consistencia con la DB desde el schema, se puede usar `.nullable().default(null)` y ajustar el defaultValue del form a `null`. Ambos enfoques son válidos. El elegido mantiene compatibilidad con el `<Input>` de React que espera strings.

### ¿Por qué no un `z.string().transform()`?

Se podría usar `z.string().optional().transform(v => v || null)` directamente en el schema. No se recomienda porque los schemas base (`address-schema.ts`) se reutilizan en múltiples contextos y un transform cambia el tipo inferido, lo que puede generar incompatibilidades con los types manuales existentes (`CreateProjectAPIPayload`, etc.).

### ¿Por qué `streetRequired` y no `required`?

La prop se llama `streetRequired` (no `required`) porque `AddressFields` tiene múltiples campos, y solo `street` cambia de obligatoriedad. `region` y `comuna` siguen siempre obligatorios. Una prop genérica `required` sería ambigua.
