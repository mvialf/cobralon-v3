# Estado de Tests de Importacion

**Estado:** parcialmente implementado
**Actualizado:** 2026-05-28

## Cobertura actual

### API routes

Existen tests para:

- `app/api/customers/import/__tests__/route.test.ts`
- `app/api/projects/import/__tests__/route.test.ts`
- `app/api/payments/import/__tests__/route.test.ts`

### UI

Existe cobertura parcial para:

- `components/dialogs/payments/__tests__/import-payment-dialog.test.tsx`

### Excel

El modulo `lib/excel/` mantiene tests unitarios para parseo/exportacion.

## Gaps pendientes

- Tests UI para `ImportCustomerDialog`.
- Tests UI para `ImportProjectDialog`.
- E2E de flujo completo de importacion con archivo fixture.
- Verificacion de errores parciales 207 desde UI.
- Cobertura de exportacion desde Settings si se vuelve flujo critico.

## Criterio para completar

Este plan se considera cerrado cuando:

- los tres dialogs de importacion tengan tests de estado upload, preview, success y error;
- exista al menos un E2E que suba fixture y confirme persistencia visible;
- los fixtures Excel esten versionados en `tests/fixtures/` o equivalente;
- la documentacion [../import-export.md](../import-export.md) refleje los limites reales.
