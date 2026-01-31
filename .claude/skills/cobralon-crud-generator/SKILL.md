---
name: cobralon-crud-generator
description: |
  Genera features CRUD completas siguiendo los patrones establecidos en Cobralon.

  USAR CUANDO: necesitas crear una nueva entidad, generar CRUD, crear formulario con validación, o agregar nueva feature con tabla + formulario + API.

  Genera 7 archivos siguiendo la arquitectura del proyecto.
---

# CRUD Generator para Cobralon

## Archivos a Generar (7 total)

Para una entidad llamada `EntityName` (ej: `Product`, `Category`):

| # | Archivo | Path | Referencia real |
|---|---------|------|-----------------|
| 1 | Schema Zod | `lib/validations/entity-name-validations.ts` | `lib/validations/project-validations.ts` |
| 2 | Form | `components/forms/entity-name/entity-name-form.tsx` | `components/forms/projects/project-form.tsx` |
| 3 | Dialog | `components/dialogs/entity-name/entity-name-dialog.tsx` | `components/dialogs/projects/project-dialog.tsx` |
| 4 | API GET+POST | `app/api/entity-names/route.ts` | `app/api/projects/route.ts` |
| 5 | API GET/PUT/DELETE | `app/api/entity-names/[id]/route.ts` | `app/api/projects/[id]/route.ts` |
| 6 | Columns | `app/entity-names/columns.tsx` | `app/projects/columns.tsx` |
| 7 | Page | `app/entity-names/page.tsx` | `app/projects/page.tsx` |

**Templates de código completos:** [references/crud-templates.md](references/crud-templates.md)
**Templates avanzados (N:M, facets, cascade):** [references/advanced-templates.md](references/advanced-templates.md)

## Naming Conventions

| Concepto | Formato | Ejemplo |
|----------|---------|---------|
| Entidad Prisma | PascalCase | `ProjectStatus` |
| Archivo validación | kebab-case | `project-status-validations.ts` |
| Carpeta form | kebab-case | `components/forms/project-status/` |
| API route | kebab-case plural | `app/api/project-statuses/` |
| Página | kebab-case plural | `app/project-statuses/page.tsx` |

## Checklist de Calidad

- [ ] Schema Prisma existe (o lo creé con `npm run db:push`)
- [ ] Validación Zod cubre todos los campos requeridos
- [ ] Form usa React Hook Form + zodResolver
- [ ] Dialog maneja estados de loading y error
- [ ] API routes validan input con Zod
- [ ] Columns tienen sorting habilitado
- [ ] Page usa Server Component para fetch
- [ ] Ejecuté `npm run lint && npm run typecheck`

## Agregar al Sidebar (Opcional)

Editar `components/layout/app-sidebar.tsx`:

```typescript
const navigationItems = [
  // ... items existentes
  {
    title: 'Entity Names',
    url: '/entity-names',
    icon: IconName, // de lucide-react
  },
]
```

## Relación con rules

- **API routes** (`api-routes.md`): validación Zod, códigos HTTP, transacciones
- **Componentes** (`components.md`): path aliases, Server Components First, shadcn/ui
- **Database** (`database.md`): comandos Prisma, transacciones financieras
