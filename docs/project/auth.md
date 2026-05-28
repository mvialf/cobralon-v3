# Autenticacion

Cobralon usa Better Auth con adapter Prisma.

## Archivos

- `lib/auth.ts`: configuracion server.
- `lib/auth-client.ts`: cliente React.
- `app/api/auth/[...all]/route.ts`: handler Better Auth.
- `app/login/page.tsx` y `app/login/login-form.tsx`: UI de login.
- `lib/api-handler.ts`: integracion de roles en endpoints.

## Modelos

Prisma define:

- `User`
- `Session`
- `Account`
- `Verification`

`User.role` admite `user` y `admin`.

## Variables

La configuracion se carga desde `lib/env.ts`.

- `AUTH_SECRET`
- `NEXT_PUBLIC_APP_URL` para `AUTH_BASE_URL` cuando aplica
- `DATABASE_URL`
- `DIRECT_URL`

No documentar valores reales de secretos.

## Sesiones

La sesion dura 7 dias y se actualiza cada 24 horas. Las cookies usan prefijo `cobralon-auth`.

## Autorizacion

Las API routes pueden exigir roles mediante `withApiHandler` y `allowedRoles`.

Reglas:

- Usar `allowedRoles: ['admin']` para endpoints de administracion de usuarios o configuracion sensible.
- No consultar sesion en endpoints donde no hay control de acceso.
- La autorizacion no reemplaza validaciones de negocio.

## Tests

Para tests de endpoints protegidos:

- mockear `auth.api.getSession`;
- cubrir 401 sin sesion;
- cubrir 403 con rol insuficiente;
- cubrir success con rol permitido.

Ejemplos existentes:

- `lib/__tests__/api-handler.test.ts`
- `app/api/users/__tests__/route.test.ts`

## ADR

Ver [ADR-007](decisions/007-better-auth.md).
