# Importacion y Exportacion Excel

Cobralon importa y exporta datos operativos via Excel.

## Entidades

| Entidad | Import | Export |
| --- | --- | --- |
| Clientes | `POST /api/customers/import` | `GET /api/customers/export` |
| Proyectos | `POST /api/projects/import` | `GET /api/projects/export` |
| Pagos | `POST /api/payments/import` | `GET /api/payments/export` |

## Implementacion

- Parseo y generacion: `lib/excel/`.
- Dialogs UI: `components/dialogs/*/import-*-dialog.tsx`.
- Pantalla de settings: `app/settings/import/page.tsx` y `app/settings/export/page.tsx`.

## Reglas

- Validar datos con schemas Zod antes de persistir.
- Preferir respuestas parciales con detalle de fila cuando hay errores recuperables.
- Para pagos importados, respetar metodos de pago, cuotas permitidas y saldos derivados desde `ProjectFinancials`.
- No actualizar saldos manualmente desde importacion; usar los mismos flujos financieros que los endpoints normales.
- Exportar credito de clientes calculado desde ledger, no desde cache legacy.

## Cobertura

Tests API existentes:

- `app/api/customers/import/__tests__/route.test.ts`
- `app/api/projects/import/__tests__/route.test.ts`
- `app/api/payments/import/__tests__/route.test.ts`

Cobertura UI parcial:

- `components/dialogs/payments/__tests__/import-payment-dialog.test.tsx`

Gaps vivos: ver [plans/import-tests-plan.md](plans/import-tests-plan.md).
