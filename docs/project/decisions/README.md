# ADRs del Proyecto

Este directorio contiene los **Architecture Decision Records (ADRs)** específicos de **este proyecto**.

## Diferencia: Template ADRs vs Project ADRs

### Template ADRs ([docs/template/decisions/](../../template/decisions/))

Decisiones sobre el **framework/template** en sí:

- Por qué Next.js 14
- Por qué Tailwind CSS v4
- Por qué shadcn/ui
- Por qué este sistema de layout

### Project ADRs ([docs/project/decisions/](.))

Decisiones sobre **TU proyecto específico**:

- Por qué NextAuth vs Clerk (auth)
- Por qué PostgreSQL vs MongoDB (database)
- Por qué Stripe vs PayPal (payments)
- Por qué AWS S3 vs Cloudinary (storage)
- etc.

---

## ADRs de Este Proyecto

| ADR                  | Título | Estado | Fecha |
| -------------------- | ------ | ------ | ----- |
| (Vacío inicialmente) | -      | -      | -     |

Agrega tus ADRs aquí a medida que tomes decisiones arquitecturales.

---

## Template de ADR

Copia este template para crear nuevos ADRs:

```markdown
# ADR-XXX: Título Descriptivo

## Estado

Propuesto | Aceptado | Deprecado

**Fecha:** YYYY-MM-DD

## Contexto

¿Qué problema o necesidad motivó esta decisión?

## Decisión

¿Qué decidimos hacer?

## Alternativas Consideradas

### Alternativa 1: [Nombre]

- **Pros:** ...
- **Contras:** ...
- **Por qué NO:** ...

### Alternativa 2: [Nombre]

- **Pros:** ...
- **Contras:** ...
- **Por qué NO:** ...

## Consecuencias

### Positivas ✅

- Beneficio 1
- Beneficio 2

### Negativas / Trade-offs ⚠️

- Trade-off 1 (y mitigación)
- Trade-off 2

## Implementación

- **Commits:** `hash1`, `hash2`
- **Archivos:** `path/file.ts`
- **Docs:** [Link a implementation.md](../implementation.md)

## Referencias

- Link a issue/PR
- Documentación oficial
- Artículos influyentes
```

---

## Cómo Crear un ADR

### Paso 1: Crear Archivo

```bash
touch docs/project/decisions/001-mi-decision.md
```

### Paso 2: Copiar Template

Copia el template de arriba.

### Paso 3: Completar Secciones

Documenta:

- Contexto claro
- Alternativas REALMENTE consideradas
- Por qué NO cada alternativa
- Consecuencias honestas (pros y contras)

### Paso 4: Referenciar en Implementation Log

Cuando implementes, agrega entrada en [implementation.md](../implementation.md) referenciando este ADR.

---

## Ejemplos de ADRs de Proyectos Reales

### Para Autenticación

- `001-nextauth-vs-clerk.md`
- `002-session-strategy.md`

### Para Database

- `003-prisma-vs-drizzle.md`
- `004-postgres-vs-mongodb.md`

### Para Payments

- `005-stripe-vs-paypal.md`

### Para Storage

- `006-s3-vs-cloudinary.md`

### Para Email

- `007-sendgrid-vs-resend.md`

---

**Ver guía completa:** [Template ADRs README](../../template/decisions/README.md)
