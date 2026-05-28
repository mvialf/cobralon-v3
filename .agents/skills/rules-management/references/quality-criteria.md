# Criterios de Calidad para Scoped Rules

## Rúbrica de Evaluación (100 puntos)

### 1. Paths Correctos (15 pts)

| Pts | Criterio |
|-----|----------|
| 15 | Globs precisos, cubren exactamente los archivos relevantes |
| 10 | Globs correctos pero demasiado amplios o estrechos |
| 5 | Paths parcialmente incorrectos |
| 0 | Paths ausentes, incorrectos, o no matchean archivos existentes |

**Verificación:** ejecutar `Glob` con cada path y confirmar que retorna archivos esperados.

**Red flags:**
- `**/*` sin `alwaysApply: true`
- Paths que no matchean ningún archivo en el proyecto
- Paths que incluyen archivos irrelevantes (ej: tests en una rule de producción)

### 2. Ejemplos de Código (25 pts)

| Pts | Criterio |
|-----|----------|
| 25 | Ejemplos reales del proyecto, copy-paste ready, con contexto |
| 18 | Ejemplos correctos pero genéricos (no del proyecto) |
| 10 | Pocos ejemplos o incompletos |
| 0 | Sin ejemplos de código |

**Verificación:** comparar ejemplos contra código real del proyecto.

**Red flags:**
- Código que no compila o tiene errores de tipos
- Imports inexistentes
- Patrones que no se usan en el proyecto

### 3. Completitud (20 pts)

| Pts | Criterio |
|-----|----------|
| 20 | Cubre todos los patrones principales del dominio |
| 14 | Cubre la mayoría pero omite casos edge |
| 7 | Cubre solo lo básico |
| 0 | Muy incompleta o superficial |

**Verificación:** buscar patrones en archivos cubiertos por los paths y verificar que la rule los documenta.

### 4. Actualización (15 pts)

| Pts | Criterio |
|-----|----------|
| 15 | Refleja el estado actual del codebase |
| 10 | Mayormente actual, detalles menores desactualizados |
| 5 | Parcialmente desactualizada |
| 0 | Severamente desactualizada o contradice el código actual |

**Verificación:** confirmar que las funciones, imports y patrones referenciados existen.

**Red flags:**
- Referencias a archivos eliminados
- Imports de módulos renombrados
- Patrones deprecados que ya no se usan

### 5. Concisión (10 pts)

| Pts | Criterio |
|-----|----------|
| 10 | Denso y útil, cada línea aporta valor |
| 7 | Mayormente conciso, algo de filler |
| 3 | Verboso, explicaciones innecesarias |
| 0 | Excesivamente largo, duplica info disponible en otros lados |

**Límites recomendados:**
- Rule ideal: 40-100 líneas
- Máximo aceptable: 150 líneas
- Si supera 150: dividir o mover detalles a docs/skills

### 6. Accionabilidad (15 pts)

| Pts | Criterio |
|-----|----------|
| 15 | Instrucciones claras que Claude puede seguir directamente |
| 10 | Instrucciones útiles pero ambiguas en algunos casos |
| 5 | Más descriptivo que prescriptivo |
| 0 | Información teórica sin guía práctica |

**Bueno:** "Usar `withApiHandler` para POST/PUT/DELETE con `bodySchema`"
**Malo:** "Se recomienda considerar el uso de wrappers para los endpoints"

## Grades

| Grade | Score | Interpretación |
|-------|-------|----------------|
| A | 90-100 | Excelente, no requiere cambios |
| B | 70-89 | Buena, mejoras menores posibles |
| C | 50-69 | Aceptable, necesita mejoras |
| D | 30-49 | Insuficiente, requiere reescritura parcial |
| F | 0-29 | Crítica, reescribir completamente |

## Checklist de Problemas Comunes

- [ ] Paths no matchean archivos existentes
- [ ] Ejemplos de código desactualizados
- [ ] Duplica contenido de CLAUDE.md o skills
- [ ] Falta frontmatter YAML
- [ ] `alwaysApply: true` sin justificación
- [ ] Más de 150 líneas
- [ ] Referencias a archivos/funciones inexistentes
- [ ] Patrones que contradicen el código actual
- [ ] Sin ejemplos de código
- [ ] Instrucciones vagas o teóricas
