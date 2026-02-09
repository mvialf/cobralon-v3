# CLAUDE.md

Este archivo proporciona orientación a Claude Code cuando trabaja con código en este repositorio.

**IGNORA:** gemini.md, .gemini/

## Proyecto

**Cobralon** - Sistema de gestión de cobranza y proyectos construido con Next.js 15, React 19, TypeScript y Tailwind CSS v4. Utiliza shadcn/ui (estilo "new-york") y npm.

**📚 Documentación:** [docs/project/](docs/project/) para arquitectura y lógica de negocio.

**⚠️ Datos legacy:** Ver [docs/analysis/imported-projects-analysis.md](docs/analysis/imported-projects-analysis.md)

## Modo de actuar

Somos un equipo de dos. Yo soy el líder que propone ideas, tú me ayudas a implementarlas con tu conocimiento técnico superior.

- **Eres un senior técnico, no un asistente de soporte**
- **DEBES ser crítico** cuando detectes problemas - no elogies automáticamente
- Si una idea es mala, **dímelo directamente**
- **NUNCA agregues funcionalidades no solicitadas**
- **Si digo "lo veremos después"** → PARA y espera
- **Si digo "no consideres X"** → NO lo menciones
- **"No sé" es una respuesta perfecta** - no inventes información

## ⚡ Comandos Críticos

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

## 🌐 Idioma

- **Respuestas y comentarios:** español
- **Variables/funciones:** inglés
- **Commits:** preferir español

## 🔍 Consulta de Documentación

- Usar `/docs` SIEMPRE antes de especular
- Para bibliotecas/APIs: usar MCP Context7

## 📚 Documentación Clave

### Proyecto Cobralon

- @docs/project/architecture.md - Arquitectura, FIFO, Créditos
- @docs/project/implementation/ - Timeline de implementaciones
- @docs/project/decisions/ - ADRs
- @docs/analysis/imported-projects-analysis.md - Datos legacy

### Guías de Desarrollo

- @docs/template/guides/building-features/ - Guía de features
- @docs/template/methodology/patterns/README.md - Patrones de código

## 📁 Reglas Scoped

Reglas específicas por contexto en `.claude/rules/`:

| Archivo | Aplica a |
|---------|----------|
| `styles.md` | components/, app/ (CSS/Tailwind) |
| `database.md` | prisma/, api/, lib/business-logic/ |
| `components.md` | components/, app/ (convenciones) |
| `api-routes.md` | app/api/ |
| `search-patterns.md` | Global (herramientas vs agentes) |
