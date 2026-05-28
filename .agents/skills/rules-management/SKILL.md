---
name: rules-management
description: Audita, mejora y propone scoped rules (docs/rules/*.md) para un proyecto. Usa cuando el usuario pida auditar rules, mejorar reglas de contexto, crear nuevas rules, verificar cobertura de rules, o mencione "rules maintenance". Analiza rules existentes contra el codebase real y propone mejoras con aprobación del usuario.
---

# Rules Management

Gestión de archivos scoped rules (`docs/rules/*.md`). Auditar calidad, detectar gaps de cobertura, y proponer mejoras.

## Formato de una Rule

```markdown
---
paths: ["app/api/**/*.ts", "lib/db.ts"]
alwaysApply: false
---

# Título descriptivo

Contenido con patrones, ejemplos de código, y convenciones.
```

**Campos frontmatter:**
- `paths` (array): globs que activan la rule al editar/leer archivos que matcheen
- `alwaysApply` (boolean): si `true`, se carga siempre independiente del archivo

## Workflow

### Fase 1: Discovery

1. Leer todos los archivos en `docs/rules/`
2. Listar directorios principales del proyecto (`app/`, `lib/`, `components/`, `hooks/`, `prisma/`, `types/`)
3. Mapear qué paths del codebase están cubiertos por rules existentes

### Fase 2: Auditoría de Calidad

Evaluar cada rule contra los criterios en [quality-criteria.md](references/quality-criteria.md).

Generar reporte con formato:

```
## Reporte de Auditoría de Rules

### rule-name.md — Score: X/100 (Grade)

| Criterio | Pts | Máx | Notas |
|----------|-----|-----|-------|
| Paths correctos | X | 15 | ... |
| Ejemplos de código | X | 25 | ... |
| ...

**Problemas detectados:**
- [lista]

**Mejoras sugeridas:**
- [lista]
```

### Fase 3: Análisis de Cobertura

Identificar directorios/patrones de archivos **sin rules**:

1. Listar todos los directorios con >3 archivos del mismo tipo
2. Comparar contra paths cubiertos por rules existentes
3. Clasificar gaps por prioridad:
   - **Alta**: directorios con lógica de negocio o patrones repetitivos (lib/, validations/)
   - **Media**: directorios con convenciones específicas (hooks/, forms/)
   - **Baja**: directorios simples o poco editados (types/, config/)

Formato de salida:

```
## Cobertura de Rules

| Directorio | Archivos | Rule existente | Prioridad |
|-----------|----------|----------------|-----------|
| lib/validations/ | 21 | Ninguna | Alta |
| hooks/ | 10 | Ninguna | Media |
```

### Fase 4: Propuestas

Para cada gap de alta prioridad, proponer:

1. **Nombre** del archivo de rule
2. **Paths** que cubriría
3. **Contenido sugerido** (patrones extraídos del código real)
4. **Justificación** de por qué es necesaria

Mostrar propuestas al usuario y **esperar aprobación** antes de crear/editar.

### Fase 5: Aplicar Cambios

Solo tras aprobación explícita:
- Crear nuevas rules con Edit/Write
- Modificar rules existentes mostrando diff previo

## Principios

- **Extraer del código real**: los ejemplos en rules deben venir del codebase, no ser inventados
- **No duplicar skills**: si un skill ya cubre un dominio en detalle, la rule debe referenciar al skill, no duplicar contenido
- **Concisión**: una rule debe ser <150 líneas. Si necesita más, dividir o referenciar docs externos
- **Paths precisos**: usar globs específicos, no `**/*` salvo para rules verdaderamente globales
