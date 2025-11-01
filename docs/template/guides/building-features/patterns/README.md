# Patterns - Guías Paso a Paso

Los 4 patrones más comunes en SaaS que cubren el 80% de los casos de uso.

## 📚 Los 4 Patterns

### 1. [Read-Only Data Display](1-read-only-data-display.md)

**Cuándo usar:**

- Mostrando lista de items desde database
- No edición inline
- Opcional: sorting, filtering, pagination

**Ejemplos:**

- Lista de productos
- Tabla de órdenes
- Dashboard con métricas

**Stack:**

- Server Component (fetching)
- Client Component (rendering)
- Opcional: Transformer (si >10 líneas)

---

### 2. [CRUD Operations](2-crud-operations.md)

**Cuándo usar:**

- Creating new records
- Editing existing records
- Form con validación
- Submission a database

**Ejemplos:**

- Create product
- Edit user profile
- Add team member

**Stack:**

- Validation Schema (Zod)
- Form Component (React Hook Form)
- API Route (Next.js)
- Dialog Wrapper (shadcn/ui)

---

### 3. [Modal/Dialog Interactions](3-modal-dialog-interactions.md)

**Cuándo usar:**

- Confirmaciones (delete, cancel)
- Forms pequeños (quick create)
- Detalles adicionales (view more)
- Actions destructivas

**Ejemplos:**

- Confirm delete
- Quick add note
- View order details

**Stack:**

- Dialog Component (shadcn/ui)
- Trigger Component (Button, MenuItem)
- Content (Form o Display)

---

### 4. [Complex Relations (N:M)](4-complex-relations-nm.md)

**Cuándo usar:**

- Many-to-many relationships
- Allocation/assignment scenarios
- Join tables con data adicional
- Aggregations complejas

**Ejemplos:**

- Order con OrderItems (Order ← OrderItem → Product)
- Project con Payments vía Allocations
- User con Roles vía UserRole

**Stack:**

- Server Component (fetch with includes)
- Transformer (calculate aggregates)
- Client Component (display)

---

## 🎯 Decision Tree

```
Need to build a feature?
    ↓
Is it just displaying data?
    ├─ Yes → Pattern 1: Read-Only Display
    └─ No → Needs user input?
           ├─ Yes → Pattern 2: CRUD Operations
           └─ No → Is it a confirmation/view?
                  ├─ Yes → Pattern 3: Modal/Dialog
                  └─ No → Complex relations?
                         └─ Yes → Pattern 4: N:M Relations
```

---

## 🚀 Cómo usar estos patterns

1. **Identifica tu caso de uso** - Usa el decision tree
2. **Lee el pattern completo** - Step-by-step examples
3. **Implementa** - Copy-paste y adapta
4. **Testea** - Cada pattern incluye testing strategy

---

## 📊 Comparativa Rápida

| Pattern   | Complejidad | Tiempo estimado | Archivos necesarios |
| --------- | ----------- | --------------- | ------------------- |
| Pattern 1 | Baja        | 15-30 min       | 2-3 archivos        |
| Pattern 2 | Media       | 1-2 horas       | 4-6 archivos        |
| Pattern 3 | Baja-Media  | 30-45 min       | 2-3 archivos        |
| Pattern 4 | Alta        | 2-4 horas       | 5-8 archivos        |

---

## 🔗 Related

- [Core Principles](../core-principles/) - Principios aplicados en estos patterns
- [Decision Framework](../decision-framework/) - Ayuda a elegir el pattern correcto
- [Common Pitfalls](../common-pitfalls/) - Errores comunes al implementar patterns

---

**Next Steps:** Elige el pattern que necesites e impleméntalo paso a paso.
