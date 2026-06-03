# Legacy Project Balance Reconciliation

Fecha: 2026-06-03

## Resultado

`npm run audit:important-data` reporto:

- `0 critical`
- `18 warning` en `legacy-project-balance-differs-from-financials`

Reporte local generado:

- `backups/audit-important-data-2026-06-03T10:32:23.747Z.json`

El reporte de `backups/` no debe commitearse.

## Warning Actual

`legacy-project-balance-differs-from-financials` reporta diferencias entre
`Project.balance` legacy y `ProjectFinancials.balance`.

| projectId | projectNumber | legacyBalance | derivedBalance | difference | decision |
| --- | --- | ---: | ---: | ---: | --- |
| `1aa68376-0242-4fca-9ff9-872f9de2e7b1` | 20083 | 2924050 | 0 | 2924050 | Pendiente de inspeccion |
| `102346e4-9ca9-43cc-b0ba-314cac362521` | 20488 | 0 | 2800000 | -2800000 | Pendiente de inspeccion |
| `d66c9195-c032-4e61-911b-8ce3b74ee961` | 20201 | 2490600 | 0 | 2490600 | Pendiente de inspeccion |
| `c065482d-4323-4c47-be5c-5b1e97be6b0b` | 20474 | 0 | 1497972 | -1497972 | Pendiente de inspeccion |
| `cd60c136-907e-424b-9681-26752e0330ca` | 18741 | 0 | 1190000 | -1190000 | Pendiente de inspeccion |
| `c3f91ba4-86ae-4ea3-b31b-dbd2104d6ef3` | 17637 | 826300 | 0 | 826300 | Pendiente de inspeccion |
| `42f11e96-a135-4a7c-8626-8e12ebf88496` | 20262 | 720900 | 0 | 720900 | Pendiente de inspeccion |
| `237e2eb0-05aa-4138-b1fa-f43e86ddf57c` | 19820 | 690500 | 0 | 690500 | Pendiente de inspeccion |
| `ff15b8ea-de29-4242-b835-6485cad76df4` | 20705 | 0 | 618800 | -618800 | Pendiente de inspeccion |
| `bb301e39-b4c0-44b2-a8c7-0abd87f4825a` | 20692 | 0 | 575226 | -575226 | Pendiente de inspeccion |
| `58d83f59-b8fa-4210-a61f-3d9582779692` | 20565 | 0 | 547400 | -547400 | Pendiente de inspeccion |
| `07d08e24-85c2-41a7-98b6-e29f59d96332` | 20802 | 0 | 481950 | -481950 | Pendiente de inspeccion |
| `ace5db0c-ed6a-475c-ba2d-a069041d42c6` | 20160 | 462600 | 0 | 462600 | Pendiente de inspeccion |
| `4f61585d-f853-48df-8e1c-dcd53e0a65f8` | 20596 | 0 | 407100 | -407100 | Pendiente de inspeccion |
| `0e39f736-2394-494d-9cf3-8e623ceb75c4` | 18366 | 214950 | 0 | 214950 | Pendiente de inspeccion |
| `1e5bb6b6-6991-49c4-843b-f51e82f20602` | 20360 | 204680 | 0 | 204680 | Pendiente de inspeccion |
| `318553f1-7383-4de9-baa1-5e8ffb09240f` | 19922 | 94050 | 0 | 94050 | Pendiente de inspeccion |
| `023193b0-808c-424e-9e87-9a3f0cac3d00` | 19805 | 0 | 49623 | -49623 | Pendiente de inspeccion |

## Decision

No se ejecuta correccion de datos en esta fase.

`ProjectFinancials` sigue siendo la fuente autoritativa de deuda visible y
`Project.balance` permanece como campo legacy/compatibilidad.

## Regla De Decision Para Una Fase Posterior

- Si `ProjectFinancials`, `PaymentAllocation`, `project_applications`,
  `project_adjustments` y `credit_transactions` son consistentes, reconciliar solo
  `Project.balance` para IDs concretos en una fase aprobada.
- Si falta una application, adjustment o credit transaction, corregir primero la fuente.
- No ejecutar backfill masivo.
