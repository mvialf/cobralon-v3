# Estrategia de Migración de Regiones

## Contexto

Migrar 89 proyectos que tienen nombres de regiones a códigos oficiales.

### Datos a Migrar

- **Total proyectos afectados**: 89
- **Conversiones**:
  - `"Región Metropolitana"` → `"13"` (87 proyectos)
  - `"Región de Valparaiso"` → `"05"` (1 proyecto)
  - `"Region de Antofagasta"` → `"02"` (1 proyecto)

## Arquitectura de Migración

### 1. Dry-Run Mode (Simulación)

**Objetivo**: Validar conversiones SIN modificar la base de datos

**Proceso**:

1. Leer todos los proyectos con `region` no-código
2. Aplicar `normalizeRegionValue()` a cada uno
3. Mostrar tabla de conversiones planificadas
4. Detectar y reportar errores (si alguna conversión falla)

**Output esperado**:

```
DRY RUN - CONVERSIONES PLANIFICADAS:
ID    | Región Actual          | Código Destino | Status
------|------------------------|----------------|-------
1234  | Región Metropolitana   | 13             | ✅ OK
5678  | Región de Valparaiso   | 05             | ✅ OK
```

### 2. Rollback Plan

**Opción elegida**: Backup de tabla `project` antes de migración

**Proceso**:

1. Exportar snapshot de tabla `project` a JSON
2. Guardar en `scripts/backups/project-backup-{timestamp}.json`
3. Script de reversión: `scripts/rollback-migration.ts`

**Comando de rollback**:

```bash
npx tsx scripts/rollback-migration.ts --backup=project-backup-20250122.json
```

### 3. Migración Real

**Proceso**:

1. **Pre-validación**:
   - Verificar que `normalizeRegionValue()` está disponible
   - Verificar conexión a DB

2. **Backup**:
   - Exportar snapshot completo
   - Confirmar backup exitoso

3. **Migración en batch**:
   - Batch size: 10 proyectos por transacción
   - Logging detallado de cada cambio
   - Pausa entre batches (opcional)

4. **Post-validación**:
   - Verificar CERO proyectos con nombres
   - Verificar TODOS tienen códigos válidos
   - Verificar relaciones (comunas) intactas

### 4. Logging

**Formato de log**:

```json
{
  "timestamp": "2025-01-22T10:30:00Z",
  "operation": "migrate_region",
  "project_id": "abc123",
  "old_value": "Región Metropolitana",
  "new_value": "13",
  "status": "success"
}
```

**Ubicación**: `scripts/logs/migration-{timestamp}.json`

## Ejecución

### Paso 1: Dry-Run

```bash
npx tsx scripts/migrate-regions.ts --dry-run
```

### Paso 2: Migración Real (con confirmación)

```bash
npx tsx scripts/migrate-regions.ts
# Solicitará confirmación interactiva
```

### Paso 3: Validación

```bash
npx tsx scripts/validate-migration.ts
```

### Paso 4 (si falla): Rollback

```bash
npx tsx scripts/rollback-migration.ts
```

## Safety Checks

- ✅ Dry-run obligatorio antes de migración real
- ✅ Backup automático antes de escribir
- ✅ Confirmación interactiva del usuario
- ✅ Logging detallado de cada operación
- ✅ Post-validación automática
- ✅ Script de rollback disponible

## Criterios de Éxito

- **0 proyectos** con nombres de regiones
- **90 proyectos** con códigos válidos
- **0 errores** en post-validación
- **Backup** disponible para rollback

## Criterios de Fallo (requiere rollback)

- Alguna conversión falla (retorna `null`)
- Post-validación detecta inconsistencias
- Errores de conexión a DB durante migración
- Timeout en operaciones

## Estimación de Tiempo

- Dry-run: 5 segundos
- Backup: 10 segundos
- Migración: 30 segundos (89 proyectos)
- Validación: 5 segundos

**Total**: ~1 minuto
