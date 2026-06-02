# Proyecto Cobralon

Cobralon es un sistema de gestion de cobranza, proyectos, pagos, cuotas, postventas, visitas y calendario operativo. Esta documentacion describe el producto actual, no el template desde el que nacio.

## Fuentes principales

- [architecture.md](architecture.md): arquitectura de negocio y modelo financiero.
- [auth.md](auth.md): Better Auth, sesiones y roles.
- [features/calendar-system.md](features/calendar-system.md): calendario unificado.
- [payment-system.md](payment-system.md): detalles del sistema de pagos.
- [regional-config.md](regional-config.md): configuracion regional.
- [decisions/](decisions/): ADRs vigentes.
- [implementation/2025-current.md](implementation/2025-current.md): resumen de implementaciones relevantes.
- [plans/](plans/): planes activos o pendientes.

## Stack actual

- Next.js 15 con App Router y React 19.
- TypeScript, Tailwind CSS v4 y shadcn/ui estilo `new-york`.
- Prisma con PostgreSQL en Neon.
- Better Auth con email/password y adapter Prisma.
- TanStack Query para datos client-side.
- Vitest, React Testing Library y Playwright.
- Pino para logging estructurado en API routes.

## Dominios activos

- Clientes y credito calculado desde ledger.
- Proyectos, estados, postventas y visitas.
- Pagos 1:1 y 1:N con aplicacion FIFO.
- Cuotas informativas sin interes.
- Comisiones por metodo de pago.
- Ajustes de proyecto.
- Calendario con eventos de proyectos, postventas y visitas.

## Reglas de trabajo

- Antes de tocar dinero, revisar [architecture.md](architecture.md), [payment-system.md](payment-system.md) y usar el skill `cobralon-financial-logic`.
- Antes de cambiar endpoints, revisar [../rules/api-routes.md](../rules/api-routes.md).
- Despues de cambios significativos, actualizar [implementation/2025-current.md](implementation/2025-current.md).
- Despues de cualquier modificacion de codigo o docs, ejecutar `npm run lint` y `npm run typecheck`.
