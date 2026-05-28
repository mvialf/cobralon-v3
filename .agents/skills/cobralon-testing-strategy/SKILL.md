---
name: cobralon-testing-strategy
description: Usar para decidir o implementar tests en Cobralon con Vitest, React Testing Library, API route tests, Prisma mocks, Playwright E2E, factories, fixtures Excel, coverage o comandos de test no-watch. Cubre convenciones reales del repo y cuándo combinar con skills de API, E2E o lógica financiera.
---

<!-- USAR CUANDO: escribir tests nuevos, mockear Prisma, crear fixtures de datos,
debuggear tests E2E, decidir qué tipo de test escribir, configurar coverage.

Cubre: Vitest patterns del proyecto, Playwright auth setup,
factories de Customer/Project/Payment, mocking de Prisma client,
coverage strategy (qué medir y qué ignorar). -->

# Testing Strategy de Cobralon

## Qué tipo de test para qué

| Tipo | Objetivo | Herramienta | Ubicación |
|------|----------|-------------|-----------|
| Unit | Lógica pura sin DB | Vitest | `**/__tests__/*.test.ts` junto al módulo |
| Unit (hooks) | React Query hooks | Vitest + RTL | `hooks/queries/__tests__/` |
| Unit (components) | Componentes UI | Vitest + RTL | `components/**/__tests__/` |
| API route | Endpoints con Prisma mockeado | Vitest | `app/api/**/__tests__/route.test.ts` |
| E2E | Flujos críticos de usuario | Playwright | `tests/e2e/*.spec.ts` |

## Comandos

```bash
npm test                              # Watch mode interactivo
npm test -- --run                     # Todos los unit tests sin watch
npm test -- --run lib/business-logic/ # Solo business logic sin watch
npm run test:coverage                 # Cobertura con v8
npm run test:e2e                      # Todos los E2E
npm run test:e2e:ui                   # UI mode (debug visual)
npm run test:e2e:debug                # Debug con inspector
npm run test:e2e:report               # Ver último reporte HTML
```

## Convenciones

- **Archivos:** `__tests__/nombre.test.ts` junto al módulo
- **Naming:** `describe('módulo')` → `it('debe comportamiento')`
- **Setup:** `beforeEach` con `vi.clearAllMocks()`
- **Assertions async:** `await waitFor(() => expect(...))` para React Query

## Coverage targets

| Área | Target | Justificación |
|------|--------|---------------|
| `lib/business-logic/` | 80% | Lógica financiera crítica |
| `app/api/` | 60% | Validaciones y error handling |
| `hooks/queries/` | 50% | Mutations con side effects |
| `components/ui/` | Bajo | Solo componentes complejos |

## Configuración clave

- **Vitest:** jsdom environment, `vitest.setup.ts` con mocks de APIs del browser
- **Playwright:** workers=1 (evitar race conditions), Chromium + Firefox
- **Auth E2E:** Storage state guardado en `.playwright/.auth/user.json`

## Detalles por tipo de test

- **Unit testing y mocking de Prisma:** [references/unit-testing.md](references/unit-testing.md)
- **E2E testing y auth setup:** [references/e2e-testing.md](references/e2e-testing.md)
- **Factories y fixtures de datos:** [references/test-factories.md](references/test-factories.md)

## Relación con otros skills y rules

| Recurso | Cubre | No duplicar |
|---------|-------|-------------|
| Skill `cobralon-financial-logic` | Invariantes financieros a testear | Reglas de negocio |
| `docs/rules/database.md` | Comandos Prisma | Estructura de mocks |
| Este skill | HOW-TO específico de Cobralon | Todo lo de arriba |
