# Neon MCP Server (Opcional)

**Nivel:** Avanzado | **Requiere:** Claude Code

Esta guía es completamente **opcional**. El template funciona perfectamente sin Neon MCP.

---

## ¿Qué es Neon MCP?

El **Neon MCP Server** es una herramienta que permite a Claude Code interactuar con bases de datos Neon PostgreSQL usando lenguaje natural.

**Repositorio:** https://github.com/neondatabase/mcp-server-neon

---

## ¿Cuándo Usarlo?

### ✅ Útil Para:

- **Setup inicial de DB:** Manual: 15-20 min → Con MCP: 2 min
- **Migraciones riesgosas:** Probar en branch temporal antes de aplicar
- **Debug de performance:** Analizar queries lentas con lenguaje natural
- **Database branching:** Crear/manejar branches de DB fácilmente

### ❌ NO Reemplaza:

- **Prisma Client:** Sigue siendo tu ORM principal para queries
- **Desarrollo productivo:** Las queries en código siguen usando Prisma
- **Producción:** Solo para desarrollo/testing local

---

## Setup (5 minutos)

### Prerequisitos

- ✅ Claude Code instalado
- ✅ Cuenta Neon (gratuita en https://neon.tech)
- ✅ Node.js >= 18

### Paso 1: Agregar a .mcp.json

Edita `.mcp.json` en la raíz del proyecto y agrega:

```json
{
  "mcpServers": {
    "neon": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.neon.tech/mcp"]
    }
  }
}
```

### Paso 2: Habilitar en Claude Code

Edita `.claude/settings.local.json` y agrega `"neon"` a la lista:

```json
{
  "enabledMcpjsonServers": ["firebase", "shadcn", "playwright", "neon"]
}
```

### Paso 3: Reiniciar Claude Code

Reinicia Claude Code para que cargue el nuevo MCP server.

### Paso 4: Verificar

En Claude Code, escribe:

```
"Claude, ¿tienes acceso al Neon MCP?"
```

Si responde afirmativamente, está listo.

---

## Workflows Híbridos

### Opción A: Setup Manual (Completo Control)

```bash
# 1. Ir a neon.tech y crear proyecto manualmente
# 2. Copiar connection strings
# 3. Crear .env.local
# 4. npm run db:generate
# 5. npm run db:push
# 6. npm run db:seed
```

**Tiempo:** 15-20 minutos
**Ventaja:** Entiendes cada paso
**Cuándo:** Primera vez, aprendiendo

### Opción B: Setup Asistido (con Neon MCP)

En Claude Code:

```
"Claude, crea un proyecto Neon para este template:
- Nombre: mi-proyecto-saas
- Región: us-east-2
- Genera .env.local
- Ejecuta npm run db:generate && db:push && db:seed"
```

**Tiempo:** 2-3 minutos
**Ventaja:** Rápido
**Cuándo:** Proyectos nuevos frecuentes

---

## Ejemplos de Uso

### 1. Crear Proyecto Neon

```
Usuario: "Claude, crea proyecto Neon llamado 'blog-app' en us-east-2"

Claude:
✅ Proyecto creado
✅ Connection strings generadas
✅ ¿Actualizo tu .env.local?
```

### 2. Migración Segura

```
Usuario: "Necesito agregar tabla Comments con campos:
- id (UUID)
- content (Text)
- authorId (FK a User)
- createdAt (DateTime)

Hazlo en branch temporal primero"

Claude:
1. ✅ Crea branch DB: migration-comments-table
2. ✅ Actualiza schema.prisma
3. ✅ Ejecuta migración en branch temporal
4. ⚠️  "Prueba en localhost:3000, confirma si funciona"

Usuario: "Funciona, aplica a main"

Claude:
5. ✅ Merge a branch principal
6. ✅ Elimina branch temporal
```

### 3. Debug de Query Lenta

```
Usuario: "Esta query es lenta:
SELECT * FROM users WHERE email LIKE '%@gmail.com'
¿Qué está mal?"

Claude:
✅ Usa explain_sql_statement
✅ Problema: Full table scan (no usa índice)
✅ Sugerencia: Crear índice en columna email
✅ ¿Crear migración con índice?
```

### 4. Database Branching

```
Usuario: "Crea branch de DB para feature-payments"

Claude:
✅ Branch creado: feature-payments
✅ Connection string: postgresql://...feature-payments...
✅ ¿Actualizo .env.local para usar este branch?
```

---

## Herramientas Disponibles

El Neon MCP Server provee:

### Gestión de Proyectos

- `create_project` - Crear proyecto Neon
- `list_projects` - Listar proyectos existentes

### Database Branching

- `create_branch` - Crear branch de DB
- `delete_branch` - Eliminar branch
- `describe_branch` - Ver detalles

### Ejecución SQL

- `run_sql` - Ejecutar query individual
- `run_sql_transaction` - Ejecutar transacción
- `explain_sql_statement` - Analizar performance

### Migraciones Seguras

- `prepare_database_migration` - Crear y probar en branch temporal
- `complete_database_migration` - Aplicar a main

### Performance

- `prepare_query_tuning` - Identificar problemas
- `complete_query_tuning` - Aplicar optimizaciones

---

## Seguridad

⚠️ **IMPORTANTE:**

> El Neon MCP Server está diseñado solo para **desarrollo local**. No usar en producción.

**Razones:**

- Puede ejecutar operaciones destructivas (DELETE, DROP)
- No tiene control de acceso granular
- Diseñado para rapidez, no para seguridad productiva

---

## Workflow Recomendado

```
┌─────────────────────────────────────┐
│  Desarrollo Normal (Sin Neon MCP)  │
├─────────────────────────────────────┤
│  1. Editar schema.prisma           │
│  2. npm run db:push                 │
│  3. Desarrollar con Prisma Client   │
│  4. Usar Prisma Studio si necesitas │
└─────────────────────────────────────┘

        VS

┌─────────────────────────────────────┐
│  Con Neon MCP (Casos Específicos)  │
├─────────────────────────────────────┤
│  ✅ Setup inicial de proyecto       │
│  ✅ Migraciones complejas/riesgosas │
│  ✅ Debug de performance            │
│  ✅ Database branching frecuente    │
└─────────────────────────────────────┘
```

---

## FAQ

### ¿Es necesario usar Neon MCP?

**NO.** El template funciona perfectamente sin él. Es una herramienta de velocidad opcional.

### ¿Puedo usar Neon sin el MCP?

**SÍ.** Neon PostgreSQL funciona perfecto con Prisma directamente. El MCP solo agrega conveniencia.

### ¿Funciona con otras bases de datos?

**NO.** El Neon MCP solo funciona con Neon PostgreSQL. Para otras DBs, usa comandos manuales.

### ¿Costo?

- **Neon Free Tier:** 512MB storage, branches ilimitados
- **Neon MCP Server:** Gratuito (open source)

---

## Desinstalar

Si decidiste que no lo necesitas:

1. Edita `.mcp.json` y elimina la sección `"neon"`
2. Edita `.claude/settings.local.json` y quita `"neon"` de la lista
3. Reinicia Claude Code

---

## Recursos

- [Neon MCP Server (GitHub)](https://github.com/neondatabase/mcp-server-neon)
- [Neon Documentation](https://neon.tech/docs)
- [Database Branching Guide](https://neon.tech/docs/introduction/branching)

---

**Siguiente:** [Database Setup Manual](database-setup.md) | [Volver a Guías](../README.md)
