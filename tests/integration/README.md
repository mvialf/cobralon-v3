# Tests de integración

Estos tests corren contra una **base de datos Postgres real** (branch dedicado de
Neon), no contra mocks. Sirven para validar transacciones, race conditions,
constraints y triggers que los unit tests no pueden cubrir.

## Setup inicial

1. **Crear branch de Neon dedicado a tests**

   En el dashboard de Neon, crear un branch a partir del de desarrollo. El nombre
   del branch debe contener la palabra `test` (ej: `test-integration`). El setup
   verifica esto y aborta si el `DATABASE_URL` no parece de test, como
   salvaguarda contra correr `TRUNCATE` por error.

2. **Crear `.env.test` en la raíz del repo** (no se commitea)

   ```bash
   cp .env.example .env.test
   # Editar .env.test:
   # - DATABASE_URL → connection string del branch de test (con -pooler)
   # - DIRECT_URL   → connection string sin -pooler
   ```

3. **Aplicar migraciones al branch de test**

   ```bash
   DATABASE_URL="<url del branch de test>" \
   DIRECT_URL="<direct url del branch de test>" \
   npx prisma migrate deploy
   ```

   Esto crea todas las tablas. Sólo hace falta una vez por branch.

## Correr los tests

```bash
npm run test:integration                       # todo
npm run test:integration -- payments-create    # un solo archivo
npm run test:integration -- --reporter=verbose # con detalle
```

## Estructura

- `setup.ts` — hook global. Carga `.env.test`, valida que la URL sea de test,
  conecta y desconecta Prisma.
- `helpers/reset-db.ts` — `TRUNCATE` de todas las tablas de dominio. Llamarse en
  `beforeEach` de cada test.
- `helpers/factories.ts` — `createCustomer`, `createProject`, `createPaymentMethod`,
  `seedCreditBalance`, etc. Dependencias entre factories ya resueltas.
- `payments-create.test.ts` — flujos de POST /api/payments (caso normal,
  sobrepago, crédito aplicado, concurrencia).

## Patrón de test

```ts
import { beforeEach, describe, it, expect } from 'vitest'
import { resetDb } from './helpers/reset-db'
import { createCustomer, createProject, createProjectStatus, createPaymentMethod } from './helpers/factories'

describe('mi test', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('hace X', async () => {
    const status = await createProjectStatus()
    const customer = await createCustomer()
    const project = await createProject(customer.id, status.id, { totalAmount: 100000 })
    // ...
  })
})
```

## Por qué corre en serie

`vitest.config.integration.mts` fuerza `singleFork: true`. Tests en paralelo
pisarían el mismo schema (TRUNCATE concurrente). Para tests específicos de
**concurrencia** (ej: race conditions), usar `Promise.all` dentro de un solo
test — eso simula clientes concurrentes sin pelearse con otros tests.
