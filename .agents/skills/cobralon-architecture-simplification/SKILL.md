---
name: cobralon-architecture-simplification
description: Usar para refactors grandes en Cobralon, sospecha de sobreingenieria, API routes gordas, duplicacion frontend/backend, calculos financieros dificiles de ubicar, exceso de capas o separacion confusa de responsabilidades.
---

# Cobralon Architecture Simplification

Usa esta skill cuando el problema huela a complejidad accidental. Cuestiona capas, abstracciones y duplicacion antes de agregar otra pieza. Reduce superficie, protege invariantes reales y deja cada responsabilidad donde pueda verificarse.

## Criterio rector

Cuestiona complejidad accidental, reduce capas y protege invariantes reales. No optimices para una arquitectura ideal: optimiza para claridad, trazabilidad y seguridad de negocio.

## Cuando usarla

- Refactors grandes o cambios que atraviesan frontend, API, business logic y DB.
- API routes gordas con validacion, calculo, persistencia, auditoria y formato de respuesta mezclados.
- Duplicacion de calculos entre UI, hooks, services, API routes o jobs.
- Calculos financieros dificiles de ubicar o razonar.
- Exceso de services, helpers, adapters o capas pasamanos.
- Separacion de responsabilidades discutible entre frontend, backend, funciones compartidas y DB.

## Cuando NO usarla

- Cambios pequenos y locales sin riesgo arquitectonico.
- Ajustes visuales, copy, estados de UI o componentes aislados.
- Bugs financieros concretos: usa tambien `cobralon-financial-logic`.
- Tests de API o E2E: usa las skills de testing correspondientes.
- Optimizaciones de performance sin evidencia o medicion.

## Checklist principal

1. Reduce capas: elimina wrappers que solo reenvian parametros o esconden flujo.
2. Separa calculo puro de persistencia: extrae reglas deterministas sin Prisma, Request, Response ni React.
3. Elimina duplicacion: una regla de negocio debe tener una fuente canonica y consumidores delgados.
4. Mantiene invariantes financieras: autoridad en backend, transacciones atomicas y auditoria visible.
5. Evita optimizaciones prematuras: no agregues cache, colas, vistas materializadas o abstracciones si el problema no las exige.

## Matriz de responsabilidades

| Capa | Responsabilidad |
|------|-----------------|
| Frontend | Previews, validaciones UX, totales visibles y feedback inmediato. No es autoridad financiera. |
| Shared pure functions | Calculos deterministas sin Prisma, React, Request, Response, fechas implicitas ni efectos secundarios. |
| Backend | Autoridad de negocio, validacion final, transacciones, concurrencia, permisos, auditoria y side effects. |
| DB/views | Balances derivados o materializados, constraints e indices. No esconder reglas mutables dificiles de testear. |

## Procedimiento

1. Nombra la regla de negocio que se quiere simplificar y donde vive hoy.
2. Dibuja el flujo actual en una lista corta: UI -> API -> business logic -> DB -> respuesta.
3. Marca duplicacion, capas pasamanos, efectos secundarios y autoridad ambigua.
4. Propone el menor cambio que mueva calculo puro a funciones testeables y deje persistencia en backend.
5. Mantiene compatibilidad externa salvo que el usuario apruebe cambiar contrato.
6. Verifica con tests enfocados en reglas, transacciones e integracion critica.

## Senales de alerta

- Un helper necesita Prisma y tambien formatea datos para UI.
- La UI recalcula un total que el backend persiste con otra formula.
- Un API route hace parsing, calculo financiero, writes multiples y shaping complejo en el mismo bloque.
- Una nueva capa no reduce duplicacion ni aclara ownership.
- La explicacion de donde vive una regla depende de conocer historia oral del proyecto.
