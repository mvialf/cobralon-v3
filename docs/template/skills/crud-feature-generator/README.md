# CRUD Feature Generator - Template Skill

**Official skill for the SaaS Template** - Automatically generates complete CRUD features following documented architectural patterns.

## Overview

This skill automates the creation of CRUD features (Create, Read, Update, Delete) by generating 7 files that follow the exact patterns documented in the template:

1. ✅ **Prisma Schema model** - Database model
2. ✅ **Zod validation** - Type-safe validation schema
3. ✅ **Form component** - React Hook Form + Zod integration
4. ✅ **Dialog component** - shadcn/ui Dialog wrapper
5. ✅ **API routes** - GET + POST with logging middleware
6. ✅ **DataTable columns** - TanStack Table configuration
7. ✅ **Page component** - Complete page with AppLayout + DataTable

All generated code follows the patterns documented in [`docs/template/guides/building-features/`](../../guides/building-features/).

## Installation

### Option 1: Copy to Personal Skills (Recommended)

Copy this skill to your personal skills directory so it's available across all your projects:

```bash
cp -r docs/template/skills/crud-feature-generator ~/.claude/skills/
```

### Option 2: Use from Template (Project-Specific)

If you prefer to keep the skill within the project (for team sharing via Git):

```bash
cp -r docs/template/skills/crud-feature-generator .claude/skills/
```

**Note:** You may want to add `.claude/skills/crud-feature-generator/` to `.gitignore` if using Option 1 to avoid duplicating the skill in version control.

## Usage

Once installed, simply ask Claude Code to create a CRUD feature:

```
"Crea un CRUD para Product"
"Genera feature completa para Category con los campos name, description, active"
"Necesito CRUD de Invoice"
```

Claude will automatically:
1. Detect the request matches this skill
2. Ask for entity details (name, fields, types, validations)
3. Generate all 7 files following template patterns
4. Provide post-generation instructions

## Example Workflow

**User:** "Crea un CRUD para Product"

**Claude:**
```
Voy a crear un feature CRUD completo para Product. Necesito la siguiente información:

1. ¿Nombre de la entidad (singular y plural)? Ejemplo: Product/Products
2. ¿Qué campos debe tener? Para cada campo necesito:
   - Nombre del campo
   - Tipo (texto, número, email, teléfono, etc.)
   - ¿Es obligatorio u opcional?
   - Validaciones especiales

Ejemplo de respuesta:
- name: texto, obligatorio, mínimo 2 caracteres
- description: texto largo, opcional
- price: número (moneda), obligatorio
- inStock: boolean, obligatorio
```

**User:**
```
- name: texto, obligatorio, mínimo 2 caracteres
- description: texto largo, opcional
- price: moneda, obligatorio, mayor a 0
- inStock: boolean, default true
```

**Claude generates:**
1. ✅ `prisma/schema.prisma` (adds Product model)
2. ✅ `lib/validations/product-validations.ts`
3. ✅ `components/forms/product/product-form.tsx`
4. ✅ `components/dialogs/product/new-product-dialog.tsx`
5. ✅ `app/api/products/route.ts`
6. ✅ `app/products/columns.tsx`
7. ✅ `app/products/page.tsx`

**Claude provides next steps:**
```markdown
✅ Feature CRUD generado exitosamente para Product

**Siguientes pasos obligatorios:**

1. Actualizar base de datos:
   npm run db:generate
   npm run db:push

2. Agregar ruta al sidebar (opcional)
3. Verificar compilación: npm run typecheck && npm run lint
4. Probar en http://localhost:3000/products
```

## What Gets Generated

### File Structure

```
my-project/
├── prisma/
│   └── schema.prisma              # ← Product model added
│
├── lib/
│   └── validations/
│       └── product-validations.ts # ← NEW
│
├── components/
│   ├── forms/
│   │   └── product/
│   │       └── product-form.tsx   # ← NEW
│   └── dialogs/
│       └── product/
│           └── new-product-dialog.tsx # ← NEW
│
└── app/
    ├── api/
    │   └── products/
    │       └── route.ts            # ← NEW (GET + POST)
    └── products/
        ├── page.tsx                # ← NEW
        └── columns.tsx             # ← NEW
```

### Code Quality

All generated code includes:

- ✅ **TypeScript** - Fully typed with no `any`
- ✅ **Type-safe forms** - React Hook Form + Zod integration
- ✅ **Logging** - Structured logging with `withLogging` middleware
- ✅ **Error handling** - Proper HTTP status codes and error messages
- ✅ **Validation** - Both client-side (Zod) and server-side validation
- ✅ **Pagination** - Standardized pagination in API routes
- ✅ **Search** - Search functionality in GET endpoints
- ✅ **Sorting** - Sortable columns in DataTable
- ✅ **Responsive** - Mobile-friendly UI components

## Supported Field Types

The skill supports generating forms with these field types:

| Field Type | Zod Validation | Form Component |
|-----------|---------------|----------------|
| Text | `z.string().min(2, '...')` | `<Input />` |
| Email | `z.string().email('...').optional()` | `<Input type="email" />` |
| Phone | `z.string().min(1, '...')` | `<PhoneInput />` |
| Number | `z.number().positive('...')` | `<Input type="number" />` |
| Currency | `z.number().positive('...')` | `<CurrencyInput />` |
| Long Text | `z.string().min(10, '...')` | `<Textarea />` |
| Boolean | `z.boolean().default(false)` | `<Checkbox />` |

See [`references/patterns.md`](references/patterns.md) for detailed code examples of each field type.

## Customization After Generation

The generated code is **fully owned by you** - modify freely:

- ✅ Add business logic to API routes
- ✅ Add custom validations to Zod schemas
- ✅ Extend forms with additional fields
- ✅ Customize table columns and actions
- ✅ Add relations to other entities
- ✅ Implement Update (PUT) and Delete (DELETE) operations

The skill generates the **boilerplate** - you add the **business logic**.

## Technical Details

### Architecture Patterns

This skill follows the patterns documented in:

- [**Building Features Guide**](../../guides/building-features/) - Complete methodology
- [**Code Patterns**](../../methodology/patterns/) - Recommended patterns
- [**Stack Documentation**](../../architecture/stack.md) - Technologies used

### Technologies Generated

Code generated uses:

- **Next.js 15** - App Router with Server Components
- **React 19** - Latest React features
- **TypeScript 5** - Strict mode enabled
- **Prisma 6** - Type-safe ORM
- **Zod 3** - Runtime validation
- **React Hook Form 7** - Form state management
- **TanStack Table 8** - DataTable implementation
- **shadcn/ui** - UI components
- **Tailwind CSS 4** - Styling

### Naming Conventions

Generated code follows these conventions:

- **Files:** kebab-case (`product-form.tsx`, `product-validations.ts`)
- **Components:** PascalCase (`ProductForm`, `NewProductDialog`)
- **Variables:** camelCase (`productSchema`, `handleSubmit`)
- **Types:** PascalCase (`ProductFormData`, `Product`)
- **URLs:** plural lowercase (`/products`, `/api/products`)

## Troubleshooting

### Skill not detected by Claude

**Cause:** Skill not installed or in wrong location

**Fix:**
```bash
# Verify skill is installed
ls ~/.claude/skills/crud-feature-generator/SKILL.md

# If missing, reinstall
cp -r docs/template/skills/crud-feature-generator ~/.claude/skills/
```

### Generated code has TypeScript errors

**Cause:** Missing dependencies or database not updated

**Fix:**
```bash
# Update Prisma
npm run db:generate
npm run db:push

# Check for errors
npm run typecheck
```

### API routes return 404

**Cause:** Route file in wrong location

**Fix:** Verify file exists at `app/api/{entities}/route.ts` (plural name)

## FAQ

**Q: Can I modify generated code?**
A: Yes! Generated code is fully yours. The skill creates boilerplate - you add business logic.

**Q: Does it support relations between entities?**
A: Yes, you can specify relations when describing fields. See [SKILL.md](SKILL.md#handle-relations-foreign-keys).

**Q: Can it generate Update and Delete operations?**
A: Currently generates Create and Read. You can add Update/Delete manually following the same patterns.

**Q: Does it work with other databases (MySQL, SQLite)?**
A: Yes! Prisma supports multiple databases. Just configure your `prisma/schema.prisma` datasource.

**Q: Can I customize the generated templates?**
A: The skill uses patterns from the template. To customize, fork the skill and modify `references/patterns.md`.

## Contributing

Found a bug or want to improve the skill?

1. This skill is part of the SaaS Template
2. Improvements should be contributed to the template repository
3. See `docs/template/` for contribution guidelines

## License

This skill is part of the SaaS Template and follows the same license.

## Related Documentation

- [Building Features Guide](../../guides/building-features/) - Complete methodology
- [Component Patterns](../../methodology/patterns/) - Code patterns
- [Testing Strategy](../../methodology/testing.md) - How to test generated code
- [Deployment](../../guides/) - Deploying your application

---

**Questions or issues?** See the main template documentation in [`docs/template/README.md`](../../README.md).
