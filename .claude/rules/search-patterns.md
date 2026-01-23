---
paths: ["**/*"]
alwaysApply: true
---

# Patrones de Búsqueda de Código

## Búsquedas Simples (Herramientas Directas)

Usa herramientas directamente sin invocar agentes:

| Tarea | Herramienta |
|-------|-------------|
| Buscar texto literal | `Grep` tool |
| Encontrar archivo por nombre/patrón | `Glob` tool |
| Leer archivo conocido | `Read` tool |
| Ver cambios recientes | `Bash` con git |

**Ejemplo:** "Encuentra dónde se define Button" → `Grep pattern="Button"` directamente

## Búsquedas Complejas (Agentes)

Usa agentes cuando requiere **múltiples pasos** o **análisis contextual**:

### `code-searcher` agent

- Análisis de patrones de código
- Rastreo de dependencias ("¿Quién usa X?")
- Análisis de arquitectura
- Búsqueda de componentes similares

### `git-searcher` agent

- Historial de cambios ("¿Cuándo se modificó X?")
- Análisis de commits ("¿Por qué se cambió Y?")
- Git blame con contexto

## Criterio de Decisión

**Usar agente si:**
- Requiere >2 rondas de búsqueda
- Necesitas analizar contexto entre archivos
- La pregunta es "¿por qué?", "¿cuándo?" o "¿cómo evolucionó?"
- Necesitas seguir cadenas de dependencias

**Usar herramienta directa si:**
- Búsqueda de texto simple
- Encontrar archivos por nombre
- Leer contenido conocido
- Verificación rápida
