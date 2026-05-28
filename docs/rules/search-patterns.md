---
paths: ["**/*"]
alwaysApply: true
---

# Patrones de Búsqueda de Código

## Búsquedas Simples (Herramientas Directas)

Usa comandos directos sin invocar agentes:

| Tarea | Herramienta |
|-------|-------------|
| Buscar texto literal | `rg "texto"` |
| Buscar por regex | `rg -n "patrón"` |
| Encontrar archivo por nombre/patrón | `rg --files` |
| Leer fragmento de archivo | `sed -n '1,120p' archivo` |
| Leer con números de línea | `nl -ba archivo` |
| Ver cambios recientes | `git status --short`, `git diff`, `git log`, `git show` |

**Ejemplo:** "Encuentra dónde se define Button" -> `rg -n "Button"`

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
