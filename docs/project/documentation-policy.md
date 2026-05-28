# Politica Documental

## Mantener

Mantener documentacion que describa:

- comportamiento actual del sistema;
- decisiones arquitecturales vigentes;
- decisiones reemplazadas que aun explican migraciones o trade-offs;
- planes pendientes con accion clara.

## Actualizar

Actualizar en el mismo cambio cuando se modifique:

- modelo Prisma;
- flujos financieros;
- auth o roles;
- contratos de API;
- import/export;
- calendario;
- reglas scoped en `docs/rules/`;
- instrucciones raiz en `AGENTS.md`.

## Eliminar

Eliminar documentacion que:

- pertenezca al template original y no a Cobralon;
- apunte a archivos inexistentes;
- describa campos o endpoints removidos;
- duplique planes ya implementados;
- mezcle backlog antiguo con estado operativo actual.

## Archivar

No crear archivos `.archive/` por defecto. Si una decision historica es necesaria, dejarla como ADR `Superseded` con resumen corto y enlace al ADR vigente.
