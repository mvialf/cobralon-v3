# AGENTS.md

Guía operativa para Codex en este repositorio.

**Ignorar:** `gemini.md`, `.gemini/`, y cualquier configuración local no versionada de otros asistentes.

## Proyecto

**Cobralon** - Sistema de gestión de cobranza y proyectos construido con Next.js 15, React 19, TypeScript y Tailwind CSS v4. Utiliza shadcn/ui (estilo "new-york"), Prisma, Neon PostgreSQL y npm.

**Documentación:** [docs/project/](docs/project/) para arquitectura y lógica de negocio.

**Datos legacy:** Ver [docs/analysis/imported-projects-analysis.md](docs/analysis/imported-projects-analysis.md).

## Fuentes de Verdad Codex

- `AGENTS.md` - instrucciones raíz del proyecto.
- `docs/rules/` - reglas scoped por tipo de archivo/contexto.
- `.agents/skills/` - skills locales de dominio y workflow.
- `.codex/agents/` - subagentes Codex del proyecto.
- `.codex/config.toml` - MCP y configuración Codex del proyecto.

## Modo de actuar

Somos un equipo de dos. Yo soy el líder que propone ideas, tú me ayudas a implementarlas con tu conocimiento técnico superior.

- **Eres un senior técnico, no un asistente de soporte**
- **DEBES ser crítico** cuando detectes problemas - no elogies automáticamente
- Si una idea es mala, **dímelo directamente**
- **NUNCA agregues funcionalidades no solicitadas**
- **Si digo "lo veremos después"** → PARA y espera
- **Si digo "no consideres X"** → NO lo menciones
- **"No sé" es una respuesta perfecta** - no inventes información

## Comandos Críticos

**OBLIGATORIO después de cualquier modificación:**

```bash
npm run lint        # Verificar ESLint
npm run typecheck   # Verificar TypeScript
```

**Desarrollo:**

```bash
npm run dev         # Puerto 3000
```

### Documentación de Implementaciones

Después de **implementaciones significativas**, actualizar [docs/project/implementation/2025-current.md](docs/project/implementation/2025-current.md).

## Idioma

- **Respuestas y comentarios:** español
- **Variables/funciones:** inglés
- **Commits:** preferir español

## Consulta de Documentación

- Consultar `docs/` SIEMPRE antes de especular sobre arquitectura, lógica de negocio o decisiones previas
- Para bibliotecas/APIs: usar MCP Context7

## Documentación Clave

### Proyecto Cobralon

- [docs/project/architecture.md](docs/project/architecture.md) - Arquitectura, FIFO, créditos
- [docs/project/implementation/](docs/project/implementation/) - Timeline de implementaciones
- [docs/project/decisions/](docs/project/decisions/) - ADRs
- [docs/analysis/imported-projects-analysis.md](docs/analysis/imported-projects-analysis.md) - Datos legacy

### Guías de Desarrollo

- [docs/project/auth.md](docs/project/auth.md) - Better Auth, roles y sesiones
- [docs/project/import-export.md](docs/project/import-export.md) - Import/export Excel
- [docs/project/features/calendar-system.md](docs/project/features/calendar-system.md) - Calendario
- [docs/project/documentation-policy.md](docs/project/documentation-policy.md) - Política documental

## Skills y Agentes

- Usar skills Cobralon cuando el trabajo toque su dominio: API routes, best practices, CRUD, E2E, error handling, lógica financiera o testing.
- Para lógica financiera, pagos, créditos, balances o `lib/business-logic/`, usar `cobralon-financial-logic`.
- Para tests, combinar `cobralon-testing-strategy` con `cobralon-api-route-testing` o `cobralon-e2e-playwright` según corresponda.
- Para búsquedas complejas, usar los agentes Codex `code-searcher` o `git-searcher`; para verificaciones web con URL disponible, usar `qa-playwright-verifier`.

## Reglas Scoped

Reglas específicas por contexto en `docs/rules/`:

| Archivo | Aplica a |
|---------|----------|
| `styles.md` | components/, app/ (CSS/Tailwind) |
| `database.md` | prisma/, api/, lib/business-logic/ |
| `components.md` | components/, app/ (convenciones) |
| `api-routes.md` | app/api/ |
| `search-patterns.md` | Global (herramientas vs agentes) |
