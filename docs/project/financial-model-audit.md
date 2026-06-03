# Auditoria del Modelo Financiero

Fecha: 2026-06-02

## Alcance

Esta auditoria se enfoca en el nucleo cliente-proyecto-pago-credito-balance. No cubre
calendario, postventa ni import/export Excel. Import/export ya fue eliminado y no debe
volver a entrar como dependencia de este trabajo.

El objetivo no es redisenar todo Cobralon, sino separar complejidad necesaria de
complejidad accidental antes de una re-arquitectura financiera mas fuerte.

## Baseline Verificado

Comando ejecutado:

```bash
npm test -- --run lib/business-logic/__tests__ app/api/payments/__tests__/route.test.ts app/api/payments/[id]/__tests__/route.test.ts
```

Resultado:

- 11 archivos de test.
- 390 tests.
- 0 fallos.

Este baseline debe mantenerse verde antes y despues de cualquier refactor financiero.

## Fuente de Verdad Actual

### Proyecto

- `Project.totalAmount` representa el total facturado del proyecto.
- `Project.balance` sigue existiendo en Prisma como campo legacy/compatibilidad.
- La arquitectura vigente declara que nuevas lecturas financieras no deben usar
  `Project.balance` como autoridad.
- La deuda visible debe leerse desde `ProjectFinancials`.

### Balance y deuda

- `ProjectFinancials` es la vista SQL operativa para deuda visible.
- La vista agrega aplicaciones registradas en `project_applications`.
- Expone:
  - `appliedCashTotal`
  - `appliedCreditTotal`
  - `adjustmentTotal`
  - `settledTotal`
  - `rawBalance`
  - `balance`
  - `overpayment`
- `lib/business-logic/project-financials.ts` mapea la vista a DTOs usados por APIs.

### Pago

- `Payment` representa dinero nuevo recibido.
- `Payment.amount` no debe incluir credito aplicado.
- `PaymentAllocation` distribuye dinero nuevo entre uno o varios proyectos.
- `Payment.type = "Project"` representa pago 1:1.
- `Payment.type = "Customer"` representa pago 1:N, normalmente distribuido por FIFO.

### Aplicaciones a proyecto

- `ProjectApplication` registra la aplicacion efectiva que reduce deuda.
- Tipos actuales:
  - `CASH`
  - `CUSTOMER_CREDIT`
  - `ADJUSTMENT`
- La vista `ProjectFinancials` depende de esta tabla para separar efectivo, credito y
  ajustes sin inferirlo desde multiples tablas.

### Credito de cliente

- `CreditTransaction` es el ledger de credito.
- El saldo disponible del cliente se calcula desde el ledger con
  `lib/business-logic/credit-management.ts`.
- No se debe usar un campo cacheado de cliente como fuente de verdad.
- Todo movimiento de credito debe crear una fila en `CreditTransaction`.

### Ajustes

- `ProjectAdjustment` registra descuentos, condonaciones o ajustes administrativos.
- Cada ajuste crea tambien una `ProjectApplication` tipo `ADJUSTMENT`.
- La validacion usa `ProjectFinancials.balance` dentro de transaccion.

## Flujo de Pago

### Estado inicial auditado

Antes de la primera fase, `POST /api/payments` concentraba demasiadas responsabilidades:

1. Parseo y validacion del payload.
2. Normalizacion de `creditApplied`.
3. Queries de cliente, metodo de pago y proyectos.
4. Validaciones de tipo, cliente, moneda y suma de allocations.
5. Calculo de comisiones.
6. Generacion de cuotas.
7. Creacion de `Payment` y `PaymentAllocation`.
8. Lectura de `ProjectFinancials` dentro de transaccion.
9. Bloqueo y lectura de credito de cliente.
10. Creacion de `CreditTransaction` tipo `APPLIED`.
11. Creacion de `ProjectApplication` tipo `CASH` y `CUSTOMER_CREDIT`.
12. Deteccion de sobrepagos.
13. Creacion de `CreditTransaction` tipo `OVERPAYMENT`.
14. Logging y shaping de respuesta.

Esa ruta media aproximadamente 906 lineas y era el principal riesgo tecnico del nucleo
financiero.

### Estado tras primera fase

`POST /api/payments` ahora actua como adaptador HTTP: valida con Zod, llama a
`lib/use-cases/payments/create-payment.ts` y devuelve la respuesta.

El caso de uso `createPayment` contiene la orquestacion financiera autoritativa:

- validaciones de cliente, proyectos, moneda y allocations;
- calculo de comisiones y cuotas;
- transaccion de pago, credito, applications y sobrepagos;
- lectura de `ProjectFinancials` y ledger de credito dentro de la transaccion cuando aplica.

## Complejidad Accidental Confirmada

### `creditApplied` duplicado

En el estado inicial, `creditApplied` existia en dos niveles:

- top-level del payload API;
- por allocation.

El codigo mantenia compatibilidad legacy moviendo credito top-level al primer allocation
cuando el pago era tipo `Project`. Esta compatibilidad aumentaba ruido en:

- `lib/validations/payment-validations.ts`
- `app/api/payments/route.ts`
- tests de validacion y pagos
- tipos de payload

Estado tras primera fase: `creditApplied` top-level fue eliminado del contrato API. El
schema rechaza ese campo para evitar que un cliente legacy pierda credito silenciosamente.
El credito aplicado debe enviarse solo en `allocations[].creditApplied`.

### `Project.balance` legacy

`Project.balance` sigue en el schema y en algunos comentarios/tests, aunque las lecturas
criticas ya usan `ProjectFinancials`.

Decision vigente: no eliminarlo del schema en la primera fase, pero prohibir su uso en
codigo nuevo y documentarlo como legacy. La eliminacion fisica queda para una fase futura
con migracion, auditoria de datos y aprobacion explicita.

### `POST /api/payments` como caso de uso implicito

En el estado inicial, la ruta de pagos no era solo una route HTTP; contenia un caso de uso
financiero completo. Esto dificultaba testear reglas sin mockear HTTP, logger, Prisma y
respuesta al mismo tiempo.

Estado tras primera fase: `createPayment` fue extraido como caso de uso interno y la route
quedo como adaptador HTTP.

### Firmas con ruido legacy

`validatePaymentApplicationSum` recibe `creditApplied`, pero actualmente valida solo que
la suma de allocations coincida con `Payment.amount`. Ese parametro ya no aporta a la
regla porque credito aplicado no es dinero nuevo.

Pendiente menor: simplificar la firma en una limpieza posterior, porque `creditApplied`
top-level ya fue eliminado del contrato API.

## Complejidad Necesaria

No todo lo complejo es accidental. Estas piezas deben preservarse:

- Backend/DB como autoridad final de balances.
- Frontend solo para previews y feedback inmediato.
- Transacciones Prisma para pagos, credito, allocations, applications y ajustes.
- `CreditTransaction` como ledger auditable.
- Validacion de credito disponible dentro de transaccion.
- FIFO ordenado por `createdAt ASC` para pagos a cliente.
- `ProjectFinancials` como lectura autoritativa inicial de deuda visible.
- Tests financieros focalizados antes de cada refactor.

## Decision Sobre Balances en Frontend

No conviene mover balances finales al frontend.

Lo que si puede vivir en frontend o funciones puras compartidas:

- preview de FIFO;
- preview de total aplicado;
- preview de credito restante;
- validaciones UX de suma y limites visibles;
- calculos deterministas sin Prisma, React, Request ni Response.

Lo que debe seguir en backend/DB:

- validacion autoritativa de credito disponible;
- lectura fresca de `ProjectFinancials`;
- deteccion de sobrepagos;
- creacion de ledgers;
- persistencia de allocations y applications;
- balances finales mostrados despues de guardar.

## Evaluacion de `ProjectApplication`

`ProjectApplication` agrega una capa adicional, pero hoy tiene una justificacion tecnica:
`ProjectFinancials` puede sumar deuda saldada por origen sin inferir desde
`PaymentAllocation`, `CreditTransaction` y `ProjectAdjustment` por separado.

No se recomienda eliminarla en la primera fase.

Antes de removerla o fusionarla conceptualmente con otra entidad, hay que responder con
datos:

- cuantas lecturas dependen de separar `CASH`, `CUSTOMER_CREDIT` y `ADJUSTMENT`;
- si `ProjectFinancials` puede mantener la misma semantica con joins directos;
- si se puede auditar una aplicacion de credito sin perder trazabilidad;
- si la simplificacion reduce codigo real o solo mueve complejidad a SQL.

Decision inicial: mantener `ProjectApplication`, pero documentar mejor su responsabilidad
y aislar su escritura dentro del caso de uso de pagos.

## ProjectApplication Decision Matrix

### Evidencia de escritura

- Pagos crean `ProjectApplication` tipo `CASH` y `CUSTOMER_CREDIT` desde
  `lib/use-cases/payments/create-payment.ts`.
- Ajustes crean `ProjectApplication` tipo `ADJUSTMENT` desde
  `app/api/projects/[id]/adjustments/route.ts`.
- Los tests de pagos y ajustes verifican estas escrituras como efectos observables.

### Evidencia de lectura

- Las lecturas operativas no consultan `ProjectApplication` directamente.
- `ProjectFinancials` agrega `appliedCashTotal`, `appliedCreditTotal`, `adjustmentTotal` y
  `settledTotal` desde `project_applications`.
- Listados, estado de cuenta y detalles de proyecto consumen esos totales desde
  `ProjectFinancials`.

### Keep For Now

Mantener `ProjectApplication` en esta fase porque:

- `ProjectFinancials` necesita distinguir `CASH`, `CUSTOMER_CREDIT` y `ADJUSTMENT`.
- Removerla exige redisenar la vista SQL y coordinar pagos, credito y ajustes en la misma
  migracion.
- La extraccion de `createPayment` ya redujo complejidad sin tocar el modelo de datos.

### Future Simplification Candidate

Reevaluar `ProjectApplication` solo si:

- hay evidencia de que la separacion por origen ya no aporta reportes ni auditoria;
- se puede expresar la misma semantica desde `PaymentAllocation`, `CreditTransaction` y
  `ProjectAdjustment` sin SQL mas fragil;
- se puede migrar con tests que protejan efectivo, credito, ajustes, sobrepagos y reversas.

Decision vigente: no eliminar `ProjectApplication` en la primera fase.

## Riesgos Prioritarios

1. Cambiar pagos sin baseline verde.
2. Aceptar balances calculados por el cliente como verdad.
3. Eliminar `ProjectApplication` antes de adelgazar `POST /api/payments`.
4. Eliminar `Project.balance` del schema sin auditoria de datos legacy.
5. Reintroducir compatibilidad top-level `creditApplied` en clientes o routes nuevas.
6. Refactorizar pagos sin tests de reversa de credito y sobrepago.

## Estado De Simplificaciones

Completado en la primera fase:

- Registrar ADR de simplificacion financiera.
- Extraer calculo puro de snapshot de balance de proyecto.
- Eliminar `creditApplied` top-level del contrato API.
- Extraer `createPayment` como caso de uso financiero.
- Mantener `ProjectApplication` durante esa extraccion.

Pendiente para fases posteriores:

- Re-evaluar `ProjectApplication` solo con evidencia nueva y el caso de uso ya aislado.
- Planificar la eliminacion fisica de `Project.balance` despues de una auditoria de datos.
- Diagnosticar warnings legacy con una ejecucion actual de `npm run audit:important-data`.

## Criterio de Exito

Una mejora global debe lograr:

- menos logica financiera inline en API routes;
- una sola semantica para credito aplicado;
- balances derivados desde una fuente clara;
- previews frontend consistentes con funciones puras;
- transacciones y ledger intactos;
- tests financieros verdes antes y despues;
- menos necesidad de conocer historia oral para entender un pago.
