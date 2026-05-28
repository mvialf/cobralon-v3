# ADR-005: MVP sin autenticacion

**Estado:** Superseded por [ADR-007: Better Auth](007-better-auth.md)

## Contexto original

El MVP inicial se lanzo sin autenticacion para priorizar validacion de flujos de cobranza y operacion interna. Esa decision fue razonable mientras el sistema era usado por pocas personas en un entorno controlado.

## Decision reemplazada

El proyecto ya no esta en ese estado. El codebase actual incluye:

- `lib/auth.ts` con Better Auth.
- `lib/auth-client.ts`.
- `app/api/auth/[...all]/route.ts`.
- `app/login/`.
- modelos Prisma `User`, `Session`, `Account` y `Verification`.
- soporte de roles `user` y `admin`.
- autorizacion por `allowedRoles` en `withApiHandler`.

## Consecuencia

No usar este ADR para decisiones actuales. Toda documentacion o implementacion nueva debe seguir [ADR-007](007-better-auth.md) y [../auth.md](../auth.md).
