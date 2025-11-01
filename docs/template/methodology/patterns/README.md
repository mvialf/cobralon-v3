# Patrones de Código y Anti-Patrones

Este directorio contiene los patrones de código recomendados y anti-patrones a evitar en proyectos basados en este template.

> **💡 Para workflow completo de implementación:** Ver [Building Features Guide](../../guides/building-features/)

> **Nota:** Esta es una guía base. Expándela según las convenciones de tu equipo.

## 📚 Navegación Rápida

### 🏗️ Patrones Fundamentales

Patrones básicos que debes aplicar en todo el proyecto:

1. [Server Components por Defecto](fundamentals/server-components-first.md) - Maximiza uso de Server Components
2. [Path Aliases](fundamentals/path-aliases.md) - Usa `@/` en lugar de rutas relativas
3. [Función cn()](fundamentals/cn-function.md) - Merge de clases condicionales
4. [Composición de Componentes](fundamentals/component-composition.md) - AppLayout y composición
5. [Componentes shadcn/ui](fundamentals/shadcn-ui.md) - Reutiliza en lugar de reinventar

### 🎨 Patrones de UI

Patrones específicos para componentes de interfaz:

6. [Patrón de Formularios](ui-patterns/form-pattern.md) - Formularios como componentes reutilizables
7. [Patrón de Diálogos](ui-patterns/dialog-pattern.md) - Diálogos encapsulados con lógica interna
8. [Composición de Secciones de Formularios](ui-patterns/form-field-composition.md) - ⭐ Sub-componentes reutilizables con React Hook Form
9. [Contenido Wide (Overflow)](ui-patterns/wide-content-overflow.md) - Manejo de scroll horizontal
10. [Capture Dialog](ui-patterns/capture-dialog.md) - ⚠️ Experimental: Copiar contenido como imagen
11. [Form + Dialog Asíncrono](ui-patterns/form-dialog-async-edit.md) - Patrón avanzado de edición

### ❌ Anti-Patrones

Errores comunes que debes evitar:

- [Índice de Anti-Patrones](anti-patterns/README.md) - Resumen de todos los anti-patrones
- [Client Components Innecesarios](anti-patterns/client-components-unnecessary.md)
- [Props Drilling Excesivo](anti-patterns/props-drilling.md)
- [Lógica de Negocio en Componentes](anti-patterns/business-logic-in-components.md)
- [Estilos Inline Complejos](anti-patterns/inline-complex-styles.md)
- [Conditional Styling Hardcodeado](anti-patterns/conditional-styling-hardcoded.md)

## 🎯 Contenido Pendiente

Esta documentación está en construcción continua. Se recomienda agregar:

- [ ] Patrones de hooks personalizados
- [ ] Manejo de estado (client vs server)
- [ ] Patrones de fetching de datos
- [ ] Manejo de errores
- [ ] Más anti-patrones comunes a evitar

## 📖 Cómo Usar Esta Documentación

### Para Nuevos Desarrolladores

1. Lee primero los **Patrones Fundamentales** (1-5)
2. Explora los **Patrones de UI** según necesites
3. Revisa el **Índice de Anti-Patrones** para evitar errores comunes

### Para Code Review

- Referencia patrones específicos en comentarios: `Ver docs/template/methodology/patterns/fundamentals/server-components-first.md`
- Usa los anti-patrones como checklist

### Para Extender la Documentación

1. Crea nuevo archivo en la carpeta apropiada
2. Actualiza este README.md con el link
3. Sigue el formato de documentos existentes

## 🔗 Referencias Relacionadas

- [Building Features Guide](../../guides/building-features/) - Guía completa de implementación
- [Code Patterns (archivo original)](../patterns.md) - ⚠️ Deprecado, usar carpeta `patterns/`
- [Architecture Overview](../../architecture/overview.md) - Visión arquitectural
- [Stack Tecnológico](../../architecture/stack.md) - Tecnologías usadas

---

**Última actualización:** 2025-11-01
