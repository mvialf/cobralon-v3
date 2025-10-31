# Diagrama Entidad-Relación

Diagrama completo del modelo de datos del proyecto Cobralon.

---

## Diagrama Completo

```
┌─────────────┐
│   User      │ (Template base - no usado actualmente)
└─────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     SISTEMA DE CLIENTES                      │
├─────────────────────────────────────────────────────────────┤
│  Customer                                                   │
│  ┣━ id: UUID (PK)                                           │
│  ┣━ name: String                                            │
│  ┣━ phone: String (obligatorio)                             │
│  ┣━ email: String? (opcional, unique)                       │
│  ┣━ createdAt / updatedAt                                   │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓│
│                                                           ┃│
│  Relationships:                                           ┃│
│  ├─→ projects: Project[] (1:N, onDelete: CASCADE)        ┃│
│  └─→ payments: Payment[] (1:N)                           ┃│
└───────────────────────────────────────────────────────────┛│
                                                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  SISTEMA DE PROYECTOS                        │
├─────────────────────────────────────────────────────────────┤
│  Project                                                    │
│  ┣━ id: UUID (PK)                                           │
│  ┣━ projectNumber: String (formato: "P 0001-2025")          │
│  ┣━ projectName: String?                                    │
│  ┣━ customerId: UUID (FK → Customer)                        │
│  ┣━ phone: String                                           │
│  ┣━ street, apartment, comuna, region: String               │
│  ┣━ projectStatusId: UUID? (FK → ProjectStatus)             │
│  ┣━ projectStatusLegacy: String (migración legacy)          │
│  ┣━ date: DateTime                                          │
│  ┣━ subtotal: Decimal(12,2)                                 │
│  ┣━ taxRate: Decimal(5,2) [default: 19%]                    │
│  ┣━ total: Decimal(12,2)                                    │
│  ┣━ windowsCount: Int                                       │
│  ┣━ squareMeters: Decimal(10,2)                             │
│  ┣━ description: String?                                    │
│  ┣━ currency: String [default: "CLP"]                       │
│  ┣━ totalAmount: Decimal(12,2)? (mismo valor que total)     │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓│
│                                                           ┃│
│  Relationships:                                           ┃│
│  ├─→ customer: Customer (FK)                              ┃│
│  ├─→ projectStatus: ProjectStatus? (FK, onDelete: RESTRICT)┃│
│  └─→ paymentAllocations: PaymentAllocation[] (1:N)       ┃│
│                                                           ┃│
│  Indexes:                                                 ┃│
│  ├─ [customerId]                                          ┃│
│  ├─ [projectNumber]                                       ┃│
│  ├─ [projectStatusId]                                     ┃│
│  ├─ [date]                                                ┃│
│  ├─ [customerId, projectStatusId] (composite)             ┃│
│  └─ [projectStatusId, date DESC] (composite)              ┃│
└───────────────────────────────────────────────────────────┛│
                                                              ↓
┌─────────────────────────────────────────────────────────────┐
│              SISTEMA DE ESTADOS DE PROYECTO                  │
├─────────────────────────────────────────────────────────────┤
│  ProjectStatus (Configurable desde UI)                     │
│  ┣━ id: UUID (PK)                                           │
│  ┣━ name: String (unique, ej: "En Proceso")                 │
│  ┣━ order: Int (para drag & drop)                           │
│  ┣━ colorId: UUID (FK → BadgeColor)                         │
│  ┣━ isInitial: Boolean (estado inicial)                     │
│  ┣━ isFinal: Boolean (estado final)                         │
│  ┣━ isActive: Boolean                                       │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓│
│                                                           ┃│
│  BadgeColor (7 colores predefinidos)                     ┃│
│  ┣━ id: UUID (PK)                                         ┃│
│  ┣━ name: String (ej: "Azul", "Verde")                    ┃│
│  ┣━ key: String (unique, ej: "blue", "green")             ┃│
│  ┣━ bgClass: String (ej: "bg-blue-500")                   │
│  ┣━ textClass: String (default: "text-white")             ┃│
│  ┗━ order: Int                                            ┃│
└───────────────────────────────────────────────────────────┛│
                                                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   SISTEMA DE PAGOS                           │
├─────────────────────────────────────────────────────────────┤
│  Payment                                                    │
│  ┣━ id: UUID (PK)                                           │
│  ┣━ type: String ("Project" | "Customer")                   │
│  ┣━ amount: Decimal(12,2)                                   │
│  ┣━ currency: String                                        │
│  ┣━ date: DateTime                                          │
│  ┣━ reference: String?                                      │
│  ┣━ notes: String?                                          │
│  ┣━ customerId: UUID (FK → Customer)                        │
│  ┣━ paymentMethodId: UUID (FK → PaymentMethod)              │
│  ┣━ selectedInstallments: Int? (número de cuotas)           │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓│
│                                                           ┃│
│  Relationships:                                           ┃│
│  ├─→ customer: Customer (FK)                              ┃│
│  ├─→ paymentMethod: PaymentMethod (FK)                    ┃│
│  ├─→ allocations: PaymentAllocation[] (1:N, CASCADE)      ┃│
│  └─→ installments: Installment[] (1:N, CASCADE)           ┃│
│                                                           ┃│
│  Indexes:                                                 ┃│
│  ├─ [customerId]                                          ┃│
│  ├─ [paymentMethodId]                                     ┃│
│  ├─ [date]                                                ┃│
│  ├─ [type]                                                ┃│
│  └─ [type, date DESC] (composite)                         ┃│
└───────────────────────────────────────────────────────────┛│
                                                              ↓
┌─────────────────────────────────────────────────────────────┐
│              SISTEMA DE ASIGNACIÓN DE PAGOS                  │
├─────────────────────────────────────────────────────────────┤
│  PaymentAllocation (Tabla intermedia N:M)                  │
│  ┣━ id: UUID (PK)                                           │
│  ┣━ paymentId: UUID (FK → Payment, CASCADE)                 │
│  ┣━ projectId: UUID (FK → Project)                          │
│  ┣━ allocatedAmount: Decimal(12,2)                          │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓│
│                                                           ┃│
│  Constraints:                                             ┃│
│  └─ UNIQUE(paymentId, projectId)                          ┃│
│                                                           ┃│
│  Indexes:                                                 ┃│
│  ├─ [paymentId]                                           ┃│
│  └─ [projectId]                                           ┃│
│                                                           ┃│
│  ⚠️ IMPORTANTE:                                            ┃│
│  - Un Payment puede tener múltiples allocations          ┃│
│  - La suma de allocations DEBE ser igual a payment.amount ┃│
│  - Validación business logic en frontend Y backend        ┃│
└───────────────────────────────────────────────────────────┛│
                                                              ↓
┌─────────────────────────────────────────────────────────────┐
│              SISTEMA DE CUOTAS (INSTALLMENTS)                │
├─────────────────────────────────────────────────────────────┤
│  Installment                                                │
│  ┣━ id: UUID (PK)                                           │
│  ┣━ paymentId: UUID (FK → Payment, CASCADE)                 │
│  ┣━ installmentNumber: Int (1, 2, 3...)                     │
│  ┣━ amount: Decimal(12,2)                                   │
│  ┣━ dueDate: DateTime                                       │
│  ┣━ paidDate: DateTime? (null = pendiente)                  │
│  ┣━ status: String ("pending" | "paid")                     │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓│
│                                                           ┃│
│  Indexes:                                                 ┃│
│  ├─ [paymentId]                                           ┃│
│  └─ [status, dueDate] (composite)                         ┃│
│                                                           ┃│
│  Business Logic:                                          ┃│
│  - Se crean automáticamente al crear Payment con cuotas  ┃│
│  - Primera cuota: dueDate = payment.date                 ┃│
│  - Siguientes: cada 30 días                              ┃│
│  - Última cuota absorbe centavos residuales              ┃│
│  - Cron job marca como "paid" cuando dueDate <= hoy      ┃│
└───────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 SISTEMA DE MÉTODOS DE PAGO                   │
├─────────────────────────────────────────────────────────────┤
│  PaymentMethod (Configurable desde UI)                     │
│  ┣━ id: UUID (PK)                                           │
│  ┣━ name: String (unique, ej: "Efectivo", "Transferencia")  │
│  ┣━ active: Boolean                                         │
│  ┣━ order: Int                                              │
│  ┣━ icon: String? (Lucide icon name)                        │
│  ┣━ hasInstallments: Boolean                                │
│  ┣━ maxInstallments: Int?                                   │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓│
│                                                           ┃│
│  Index:                                                   ┃│
│  └─ [active, order] (composite)                           ┃│
└───────────────────────────────────────────────────────────┘
```

---

## Ver También

- [Customer & Project Systems](customer-project-systems.md) - Detalle de Customer, Project, ProjectStatus
- [Payment Systems](payment-systems.md) - Detalle de Payment, Allocation, Installment
- [Relationships](relationships.md) - Tabla de relaciones con políticas

---

**Última actualización:** 2025-10-30
