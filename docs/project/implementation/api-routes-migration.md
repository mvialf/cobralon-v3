# Migracion de API Routes a `withApiHandler` / `withLogging`

**Estado:** completada para routes aplicables.

## Objetivo

Estandarizar API routes con:

- logging estructurado Pino;
- validacion Zod;
- validacion UUID;
- manejo unificado de errores;
- soporte opcional de autorizacion por roles.

## Patron vigente

Usar `withApiHandler` cuando el endpoint tenga validacion, errores de negocio o autorizacion.

Usar `withLogging` o logger directo solo cuando el wrapper no encaje, por ejemplo:

- handlers delegados a librerias externas;
- health checks.

## Routes excluidas intencionalmente

| Route | Motivo |
| --- | --- |
| `app/api/auth/[...all]/route.ts` | Handler de Better Auth |
| `app/api/health/warmup/route.ts` | Health check simple |
| `app/api/test/cleanup/route.ts` | Solo soporte de tests/dev |

No existe route vigente `app/api/cron/mark-installments-paid/route.ts`.

## Estado de usuarios

`app/api/users/route.ts` ya no debe tratarse como scaffold de template. Es un endpoint administrativo con validacion y tests.

## Reglas para routes nuevas

- Validar input con schemas en `lib/validations/`.
- Usar `BusinessError` para errores esperados del dominio.
- Usar `allowedRoles` para endpoints administrativos.
- No capturar errores 500 para devolver mensajes genericos sin logging.
- Tests en `app/api/**/__tests__/route.test.ts` con mocks explicitos de Prisma y auth cuando corresponda.
