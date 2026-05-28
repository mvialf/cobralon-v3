# ADR-007: Better Auth

**Estado:** Accepted  
**Fecha:** 2026-05-28

## Contexto

Cobralon dejo de ser un MVP sin autenticacion. El sistema necesita sesiones de usuario, login email/password y capacidad de proteger endpoints administrativos sin introducir un proveedor externo con lock-in fuerte.

## Decision

Usar Better Auth con adapter Prisma y PostgreSQL.

Implementacion vigente:

- configuracion server en `lib/auth.ts`;
- cliente React en `lib/auth-client.ts`;
- handler Next.js en `app/api/auth/[...all]/route.ts`;
- UI de login en `app/login/`;
- tablas `user`, `session`, `account`, `verification`;
- campo `User.role` con valores `user` y `admin`;
- autorizacion en `lib/api-handler.ts` mediante `allowedRoles`.

## Reglas

- No crear handlers auth propios para login/logout/session.
- No guardar secretos de auth en codigo o docs.
- Las rutas administrativas deben declarar roles en `withApiHandler`.
- Las rutas publicas o internas que no requieran roles no deben consultar sesion innecesariamente.
- Los tests deben mockear `auth.api.getSession` cuando cubran autorizacion.

## Alternativas consideradas

- Mantener sin auth: ya no describe el producto actual.
- NextAuth/Auth.js: viable, pero implicaria migracion sin beneficio claro frente al setup existente.
- Clerk/Stack Auth: agregan dependencia externa y lock-in innecesario para el alcance actual.

## Consecuencias

- El proyecto tiene control local de usuarios y sesiones.
- La base de datos mantiene modelos auth junto con el resto del dominio.
- La autorizacion por rol queda centralizada en `withApiHandler`, pero no reemplaza validaciones de negocio por entidad.

## Documentacion relacionada

- [Autenticacion](../auth.md)
- [Arquitectura](../architecture.md)
