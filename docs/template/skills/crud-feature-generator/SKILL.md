---
name: crud-feature-generator
description: Generate complete CRUD features for projects based on this SaaS template, following established architectural patterns. This skill should be used when creating a new entity with create/read/update/delete operations, or when terms like "crear CRUD", "nueva entidad", "agregar modelo", or "feature completa" are mentioned. Generates 7 files - Prisma model, Zod validation, Form component, Dialog, API routes, DataTable columns, and Page component - all following the template's documented patterns in docs/template/guides/building-features/.
---

# CRUD Feature Generator

Generate complete CRUD features following the architectural patterns established in this SaaS template.

## Overview

This skill automates the creation of a complete CRUD feature (Create, Read, Update, Delete) by generating 7 necessary files following the exact patterns of the template. Each generated feature is consistent with the template-based architecture documented in `docs/template/`.

**Automatically generates:**
1. Prisma Schema model
2. Zod validation schema
3. Form component (React Hook Form + Zod)
4. Dialog component (shadcn/ui)
5. API routes (GET + POST with withLogging)
6. DataTable columns (TanStack Table)
7. Page component (AppLayout + DataTable)

## Workflow Decision Tree

Use this decision tree to determine when and how to use this skill:

```
Does the user want to create a new entity/model/feature?
├─ YES → Does it need complete CRUD (create, list, edit, delete)?
│  ├─ YES → Use this skill (CRUD Feature Generator)
│  │  └─ Follow "Workflow: Generate Complete CRUD Feature"
│  │
│  └─ NO → Does it only need some files?
│     ├─ Only form → Generate manually using patterns.md as reference
│     ├─ Only API → Generate manually using patterns.md as reference
│     └─ Other → Ask user which files are needed
│
└─ NO → Do not use this skill
```

## Workflow: Generate Complete CRUD Feature

### Step 1: Gather Requirements

Ask the user for the following information (use AskUserQuestion tool if appropriate):

**Required information:**
- Entity name (singular, in Spanish) - Example: "Product", "Category", "Invoice"
- Entity name (plural, in Spanish) - Example: "Products", "Categories", "Invoices"
- Fields with types:
  - Field name (camelCase)
  - Field type (string, number, boolean, date, etc.)
  - Required vs Optional
  - Validation rules (min length, email, etc.)

**Optional information:**
- Relations to other entities (if any)
- Custom validations (regex, custom rules)
- Special field types (currency, phone, address, etc.)

**Example conversation:**

```
Assistant: "Voy a crear un feature CRUD completo para [Entity]. Necesito la siguiente información:

1. ¿Nombre de la entidad (singular y plural)? Ejemplo: Product/Products
2. ¿Qué campos debe tener? Para cada campo necesito:
   - Nombre del campo
   - Tipo (texto, número, email, teléfono, etc.)
   - ¿Es obligatorio u opcional?
   - Validaciones especiales

Ejemplo de respuesta:
- name: texto, obligatorio, mínimo 2 caracteres
- email: email, opcional
- phone: teléfono, obligatorio"
```

### Step 2: Generate All Files

Generate the 7 files in this order (respecting dependencies):

#### 2.1 Prisma Schema Model

**File:** `prisma/schema.prisma`

**Action:** Add new model to the schema file using Edit tool.

**Pattern:**
```prisma
model EntityName {
  id        String   @id @default(cuid())
  field1    String
  field2    String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([field1])
}
```

**Important:**
- Use exact capitalization from user (Product, not product)
- Add `@@index([field])` for searchable fields
- Optional fields use `?`
- Always include `id`, `createdAt`, `updatedAt`

#### 2.2 Zod Validation Schema

**File:** `lib/validations/{entity}-validations.ts`

**Use Write tool** to create new file.

**Template from references/patterns.md (section 2):**
```typescript
import { z } from 'zod'

/**
 * Schema de validación para {entity}
 */
export const {entity}Schema = z.object({
  field1: z.string().min(2, 'El field1 debe tener al menos 2 caracteres'),
  field2: z.string().email('Correo electrónico inválido').optional().or(z.literal('')),
})

export type {Entity}FormData = z.infer<typeof {entity}Schema>
```

**Validation types:**
- Required text: `z.string().min(1, 'El campo es requerido')`
- Optional text: `z.string().optional().or(z.literal(''))`
- Email: `z.string().email('Email inválido').optional().or(z.literal(''))`
- Number: `z.number().positive('Debe ser positivo')`
- Phone: `z.string().min(1, 'El teléfono es requerido')`

#### 2.3 Form Component

**File:** `components/forms/{entity}/{entity}-form.tsx`

**Use Write tool** to create new file (create directory if needed).

**Template:** See `references/patterns.md` section "3. Form Component Pattern"

**Customize:**
- Replace `{entity}` with actual entity name
- Replace `{Entity}` with capitalized entity name
- Add FormField for each field from user requirements
- Use correct input component:
  - Text → `<Input />`
  - Email → `<Input type="email" />`
  - Phone → `<PhoneInput />`
  - Number → `<CurrencyInput />` or `<Input type="number" />`
  - Long text → `<Textarea />`

#### 2.4 Dialog Component

**File:** `components/dialogs/{entity}/new-{entity}-dialog.tsx`

**Use Write tool** to create new file (create directory if needed).

**Template:** See `references/patterns.md` section "4. Dialog Component Pattern"

**Customize:**
- Replace `{entity}` with actual entity name
- Replace `{Entity}` with capitalized entity name
- Update DialogTitle and DialogDescription with meaningful text
- Import correct form component

#### 2.5 API Routes

**File:** `app/api/{entities}/route.ts`

**Use Write tool** to create new file (create directory if needed).

**Template:** See `references/patterns.md` section "5. API Routes Pattern"

**Customize:**
- Replace `{entity}` (singular) in Prisma queries
- Replace `{entities}` (plural) in response
- Update search fields in OR conditions
- Add proper validation for each required field
- Update logger messages with entity name

**Important:**
- Use `withLogging` middleware
- Return `{ entities, pagination }` from GET
- Return created entity from POST with status 201
- Handle errors with proper status codes

#### 2.6 DataTable Columns

**File:** `app/{entities}/columns.tsx`

**Use Write tool** to create new file (create directory if needed).

**Template:** See `references/patterns.md` section "6. DataTable Columns Pattern"

**Customize:**
- Replace `{Entity}` interface with actual entity name
- Add column for each displayable field
- Include `id` in interface but don't show it in table
- Add actions dropdown (Edit, Delete)

#### 2.7 Page Component

**File:** `app/{entities}/page.tsx`

**Use Write tool** to create new file (create directory if needed).

**Template:** See `references/patterns.md` section "7. Page Component Pattern"

**Customize:**
- Replace `{entities}` (plural) in URL, API calls, state
- Replace `{Entity}` in types
- Update pageTitle with user-friendly name (plural, capitalized)
- Update searchKey with main search field (usually `name` or first string field)
- Update breadcrumbs

### Step 3: Post-Generation Instructions

After generating all files, provide the user with these next steps:

```markdown
✅ Feature CRUD generado exitosamente para {Entity}

**Archivos creados:**
1. ✅ prisma/schema.prisma (model agregado)
2. ✅ lib/validations/{entity}-validations.ts
3. ✅ components/forms/{entity}/{entity}-form.tsx
4. ✅ components/dialogs/{entity}/new-{entity}-dialog.tsx
5. ✅ app/api/{entities}/route.ts
6. ✅ app/{entities}/columns.tsx
7. ✅ app/{entities}/page.tsx

**Siguientes pasos obligatorios:**

1. Actualizar base de datos:
   ```bash
   npm run db:generate
   npm run db:push
   ```

2. Agregar ruta al sidebar (opcional):
   ```typescript
   // components/layout/app-sidebar.tsx líneas 19-48
   {
     title: '{Entities}',
     href: '/{entities}',
     icon: Package, // cambiar al icono apropiado de lucide-react
   }
   ```

3. Verificar que compile sin errores:
   ```bash
   npm run typecheck
   npm run lint
   ```

4. Probar la feature:
   - Navegar a http://localhost:3000/{entities}
   - Hacer clic en "Nuevo {Entity}"
   - Llenar el formulario
   - Guardar y verificar que aparezca en la tabla
   - Probar search y sorting

**Listo!** El feature está completo y siguiendo todos los patrones del proyecto.
```

## Field Type Reference

Use this reference to generate correct form fields and validations. For complete examples, see `references/patterns.md` section "Field Type Reference".

### Common Field Types

| Type | Zod Validation | Form Component |
|------|---------------|----------------|
| Text | `z.string().min(2, '...')` | `<Input />` |
| Email | `z.string().email('...').optional()` | `<Input type="email" />` |
| Phone | `z.string().min(1, '...')` | `<PhoneInput />` |
| Number | `z.number().positive('...')` | `<Input type="number" />` |
| Currency | `z.number().positive('...')` | `<CurrencyInput />` |
| Long Text | `z.string().min(10, '...')` | `<Textarea />` |
| Boolean | `z.boolean().default(false)` | `<Checkbox />` |

**For detailed code examples of each field type, see [references/patterns.md](references/patterns.md).**

## Common Patterns & Edge Cases

### Handle Relations (Foreign Keys)

If the entity has relations to other entities:

**Prisma:**
```prisma
model Entity {
  id            String   @id @default(cuid())

  // Relation
  category      Category @relation(fields: [categoryId], references: [id])
  categoryId    String

  @@index([categoryId])
}
```

**Form:** Use `<Combobox />` or `<Select />` to select related entity
**API GET:** Include relation in query: `include: { category: true }`

### Handle Optional Fields

**Zod:**
```typescript
optionalField: z.string().optional().or(z.literal(''))
```

**Form default value:**
```typescript
defaultValues: {
  optionalField: defaultValues?.optionalField || '', // Important: empty string
}
```

### Handle Unique Fields (like email)

**API POST validation:**
```typescript
// Verificar si el email ya existe
const existingEntity = await prisma.entity.findFirst({
  where: { email },
})
if (existingEntity) {
  return NextResponse.json(
    { error: 'Ya existe un entity con ese email' },
    { status: 409 }
  )
}
```

## Resources

### Reference Documentation

See [references/patterns.md](references/patterns.md) for:
- Complete code patterns for all 7 files
- Field type reference with code examples
- Variations for different field types
- Checklist after generation

**Load this reference when:**
- User asks for specific field types
- You need to verify exact pattern syntax
- Handling edge cases (relations, unique fields, etc.)

### Related Template Documentation

- [Building Features Guide](../../guides/building-features/) - Complete methodology
- [Component Patterns](../../methodology/patterns/) - Code patterns and anti-patterns
- [Stack Documentation](../../architecture/stack.md) - Technologies used

## Validation Checklist

Before marking the feature as complete, verify:

- [ ] All 7 files created
- [ ] Entity name consistent across all files (singular vs plural)
- [ ] Zod schema matches form fields
- [ ] Form component imports correct validation
- [ ] Dialog imports correct form
- [ ] API routes use correct Prisma model name
- [ ] Columns interface matches API response
- [ ] Page uses correct plural name in URLs
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] No ESLint errors (`npm run lint`)

## Troubleshooting

### TypeScript error: Cannot find module '@/lib/validations/...'

**Cause:** File not created or wrong path
**Fix:** Verify file exists at exact path: `lib/validations/{entity}-validations.ts`

### Prisma error: Model not found

**Cause:** Database not updated after adding model
**Fix:** Run `npm run db:generate && npm run db:push`

### API returns 404

**Cause:** Route not created or wrong path
**Fix:** Verify file exists at: `app/api/{entities}/route.ts` (plural name)

### Table shows no data

**Cause:** API GET not returning data in correct format
**Fix:** Verify API returns `{ entities: [...], pagination: {...} }`

## Notes

- This skill generates **boilerplate code only** - business logic must be added manually
- Generated code follows template patterns - do not modify the structure
- All generated files are versioned in Git
- Use `npm run typecheck && npm run lint` frequently during development
- Reference `docs/template/guides/building-features/` for complete methodology
