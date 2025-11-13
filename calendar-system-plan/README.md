# Sistema de Calendario - Plan de Implementación

**Proyecto:** Cobralon
**Fecha inicio planificación:** 2025-11-13
**Versión:** 1.0

---

## 📋 Índice de Documentación

Este directorio contiene la planificación completa del sistema de calendario para gestión de eventos de Proyectos, Postventas y Visitas.

### Documentos Principales

1. **[01-architecture-overview.md](01-architecture-overview.md)**
   Visión arquitectural high-level del sistema. Componentes principales, flujo de datos y decisiones de diseño.

2. **[02-data-model.md](02-data-model.md)**
   Schemas de Prisma completos para ProjectEvent, AftersaleEvent y VisitEvent. Relaciones, índices y validaciones.

3. **[03-component-structure.md](03-component-structure.md)**
   Árbol completo de componentes React a crear. Props, estructura de carpetas y jerarquía.

4. **[04-api-routes.md](04-api-routes.md)**
   Endpoints de API necesarios. Request/Response schemas, validaciones y manejo de errores.

5. **[05-user-flows.md](05-user-flows.md)**
   Diagramas de flujos de usuario. Desde crear evento hasta editar y eliminar.

6. **[06-implementation-phases.md](06-implementation-phases.md)**
   Roadmap de desarrollo en fases. Qué implementar primero y dependencias entre tareas.

7. **[07-technical-decisions.md](07-technical-decisions.md)**
   Decisiones técnicas clave y justificaciones. ADR-style documentation.

8. **[08-testing-strategy.md](08-testing-strategy.md)**
   Plan de testing: unit tests, integration tests y E2E tests.

9. **[09-future-enhancements.md](09-future-enhancements.md)**
   Features para fases futuras (Fase 2, 3, etc.).

---

## 🎯 Objetivo del Sistema

Crear un sistema de calendario multi-vista que permita:

- ✅ **Visualizar eventos** de Proyectos, Postventas y Visitas en calendario
- ✅ **Crear eventos** vinculados a entidades existentes
- ✅ **Editar datos** de proyectos/postventas/visitas desde eventos
- ✅ **Cambiar estados** de entidades desde calendario
- ✅ **Drag & Drop** para reprogramar eventos (cambiar fecha)
- ✅ **Múltiples vistas**: Week (principal), Month, Agenda

---

## 🏗️ Principios de Diseño

1. **Vincular, no duplicar**: Eventos vinculan a entidades existentes (no crean copias)
2. **Edición directa**: Cambios en eventos actualizan la entidad original
3. **Sin horas**: Calendario trabaja solo con fechas (todos los eventos "all-day")
4. **1:N simplificado**: Un Project puede tener múltiples eventos, pero cada evento es independiente
5. **Estados compartidos**: Evento usa estado de la entidad vinculada

---

## 🚀 Quick Start

### Orden de Lectura Recomendado

**Para entender el sistema:**
1. Architecture Overview (01)
2. User Flows (05)
3. Component Structure (03)

**Para implementar:**
1. Data Model (02) → Migración Prisma
2. API Routes (04) → Crear endpoints
3. Components (03) → UI y lógica
4. Implementation Phases (06) → Seguir roadmap

---

## 📊 Estado Actual

- **Fase:** Fases 1-4 COMPLETADAS ✅ + Fase 5 EN PROGRESO 🚧 (~33%)
- **Implementación:**
  - ProjectEvents: Sistema completo funcional ✅
  - AftersaleEvents: Backend completo (DB + API) ✅
  - VisitEvents: Backend completo (DB + API) ✅
  - UI pendiente: Forms, Cards, Dialogs, Integration ⏳
- **Fecha última actualización:** 2025-11-13
- **Pendiente:** Fase 5 (UI + Integration) + Fase 6 (Polish)

---

## 🔗 Referencias al Código Existente

- **Formularios similares**: `components/forms/projects/project-form.tsx`
- **Combobox pattern**: `components/forms/fields/customer-combobox.tsx`
- **Status management**: Tablas `ProjectStatus`, `AftersaleStatus`, `VisitStatus`
- **Dialog pattern**: `components/dialogs/projects/project-dialog.tsx`
- **Card components**: `components/summarys/project-name-summary.tsx`

---

## ⚠️ Notas Importantes

- Sistema diseñado para **Fase 1** (MVP funcional)
- Features avanzadas documentadas en `09-future-enhancements.md`
- Seguir patrones existentes del template (React Hook Form + Zod + shadcn/ui)
- Priorizar DX y mantenibilidad sobre features complejas

---

**Última actualización:** 2025-11-13 (Implementación Fases 1-4 completada)
