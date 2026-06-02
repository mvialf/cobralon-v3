# Documentacion Cobralon

Esta carpeta contiene solo documentacion vigente del proyecto Cobralon.

## Indice

- [Proyecto](project/README.md): mapa tecnico y funcional.
- [Arquitectura](project/architecture.md): modelo de negocio, datos y flujos criticos.
- [Autenticacion](project/auth.md): Better Auth, roles y rutas protegidas.
- [Calendario](project/features/calendar-system.md): eventos de proyectos, postventas y visitas.
- [ADRs](project/decisions/README.md): decisiones de arquitectura del proyecto.
- [Backlog](project/backlog.md): trabajo pendiente documentado.
- [Rules](rules/): reglas scoped para Codex.
- [User journeys](user-journeys/README.md): flujos UI con referencias visuales.
- [Analisis legacy](analysis/imported-projects-analysis.md): estado de datos importados.

## Criterio de mantenimiento

- La documentacion debe describir el producto actual o una decision aun relevante.
- Los planes terminados se eliminan salvo que expliquen una decision que no este capturada en un ADR.
- No se mantiene documentacion del template SaaS original ni configuracion de otros asistentes.
- Si una implementacion cambia contratos de negocio, actualizar la documentacion del dominio afectado en el mismo cambio.

Ver [politica documental](project/documentation-policy.md) para el criterio completo.
