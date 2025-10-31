# Modelo de Datos

Sistema completo de entidades relacionales para gestión de proyectos, clientes y pagos.

---

## 📚 Contenido

### 1. [ER Diagram](er-diagram.md)

Diagrama ASCII completo con 10 modelos:
- Customer
- Project + ProjectStatus + BadgeColor
- Payment + PaymentAllocation + Installment + PaymentMethod

**Tamaño:** ~175 líneas de diagrama visual

---

### 2. [Customer & Project Systems](customer-project-systems.md)

**Modelos principales:**
- `Customer` - Clientes con múltiples proyectos
- `Project` - Proyectos con montos y estados
- `ProjectStatus` - Estados configurables (drag & drop)
- `BadgeColor` - 7 colores predefinidos para badges

**Relaciones:**
- Customer 1:N Project (CASCADE)
- Project N:1 ProjectStatus (RESTRICT)
- ProjectStatus N:1 BadgeColor

---

### 3. [Payment Systems](payment-systems.md)

**Modelos principales:**
- `Payment` - Pagos con tipo "Project" o "Customer"
- `PaymentAllocation` - Tabla intermedia N:M (Payment ↔ Project)
- `Installment` - Cuotas sin interés con fechas
- `PaymentMethod` - Métodos configurables (Efectivo, Transferencia, etc.)

**Relaciones:**
- Payment 1:N PaymentAllocation (CASCADE)
- Payment 1:N Installment (CASCADE)
- Payment N:1 PaymentMethod

---

### 4. [Relationships](relationships.md)

Tabla completa de relaciones clave con políticas de eliminación:

| Relación | Tipo | onDelete | Razón |
|----------|------|----------|-------|
| Customer → Project | 1:N | CASCADE | Eliminar cliente elimina proyectos |
| Payment → Allocation | 1:N | CASCADE | Coherencia de datos |
| Project → Status | N:1 | RESTRICT | No eliminar si hay proyectos activos |

---

## Métricas del Modelo

- **Modelos totales:** 10 entidades principales
- **Relaciones:** 7 relaciones principales documentadas
- **Índices:** 16 índices (8 simples + 8 compuestos)
- **Constraints:** UNIQUE, FK, CHECK (en Prisma schema)

---

## Ver También

- [Prisma Schema](../../../../prisma/schema.prisma) - Definición completa de modelos
- [Seed Data](../../../../prisma/seed.ts) - Datos iniciales
- [APIs](../06-apis/) - Endpoints que usan estos modelos
- [Decisiones Técnicas](../05-technical-decisions/) - Por qué estas decisiones

---

**Última actualización:** 2025-10-30
