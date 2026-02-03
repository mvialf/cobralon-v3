# User Journeys - Documentación de Navegación

Planes de navegación por feature, basados en exploración real con Playwright MCP.
Sirven como referencia para escribir y mantener tests E2E.

## Estado de Exploración

| Feature | Estado | Spec E2E | Page Object | Navigation Plan |
|---------|--------|----------|-------------|-----------------|
| [Customers](customers/navigation-plan.md) | **Completado** | `customers.spec.ts` | `customers.page.ts` | [Ver](customers/navigation-plan.md) |
| [Payments 1:1](payments-1to1/navigation-plan.md) | **Completado** | `payment-to-customer.spec.ts` | `payments.page.ts` | [Ver](payments-1to1/navigation-plan.md) |
| [Payments 1:N](payments-1toN/navigation-plan.md) | Pendiente | `payments.spec.ts` | `payments.page.ts` | [Ver](payments-1toN/navigation-plan.md) |
| [Payment Methods](payment-methods/navigation-plan.md) | Pendiente | `payment-methods.spec.ts` | `payment-methods.page.ts` | [Ver](payment-methods/navigation-plan.md) |
| [Import Payments](import-payments/navigation-plan.md) | Pendiente | `import-payments.spec.ts` | - | [Ver](import-payments/navigation-plan.md) |
| [Aftersales](aftersales/navigation-plan.md) | Pendiente | `aftersales.spec.ts` | `aftersales.page.ts` | [Ver](aftersales/navigation-plan.md) |
| [Installments](installments/navigation-plan.md) | Pendiente | `installments.spec.ts` | `installments.page.ts` | [Ver](installments/navigation-plan.md) |
| [Visits](visits/navigation-plan.md) | Pendiente | `visits.spec.ts` | `visits.page.ts` | [Ver](visits/navigation-plan.md) |
| [Calendar](calendar/navigation-plan.md) | Pendiente | `calendar-event-edit.spec.ts` | `calendar.page.ts` | [Ver](calendar/navigation-plan.md) |
| [Critical Flow](critical-flow/navigation-plan.md) | Pendiente | `critical-flow.spec.ts` | - | [Ver](critical-flow/navigation-plan.md) |

## Estructura

```
docs/user-journeys/
├── README.md                          # Este archivo
├── reference/<feature>/               # Screenshots de referencia
└── <feature>/navigation-plan.md       # Plan de navegación documentado
```

## Uso

1. Cada `navigation-plan.md` documenta los pasos exactos para navegar una feature
2. Los screenshots en `reference/` sirven como referencia visual del estado esperado
3. Los selectores documentados se usan para escribir Page Objects y tests E2E
