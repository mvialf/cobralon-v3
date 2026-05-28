# ADR-004: Neon PostgreSQL as Database Provider

## Estado

**Aceptado** | **Fecha:** 2025-01-17

## Decisión

Usar **Neon PostgreSQL** como database provider para Cobralon MVP y producción.

## Contexto

Cobralon requiere database provider para PostgreSQL con:

**Funcionales:**

- PostgreSQL real con Foreign Keys obligatorias (integridad referencial crítica)
- 10 tablas relacionales con relaciones N:M, CASCADE, RESTRICT
- Decimal precision para montos financieros

**No Funcionales:**

- Free tier para MVP ($0/mes ideal)
- Performance <100ms queries (500-5000 proyectos esperados)
- Setup rápido (<30 min)
- **Testing seguro de migrations** (killer requirement)
- Sin vendor lock-in

**Relacion historica:** Cobralon nacio desde un template que sugeria Prisma + Neon. Este ADR documenta por que esa eleccion sigue vigente para este proyecto.

## Alternativa Principal

**Supabase:** All-in-one (DB + Auth + Storage), UI bonita, free tier generoso (500MB).

**Por qué NO:**

1. **Vendor lock-in alto** - Empuja fuertemente a usar Supabase Auth, que no coincide con la implementacion actual en Better Auth
2. **Features innecesarias** - Storage/Realtime no needed para Cobralon MVP
3. **No database branching** - Sin testing seguro de migrations
4. **Migrar auth/datos** = Reescribir integraciones ya existentes

## Consecuencias

### Positivas ✅

1. **Database Branching = Testing Seguro (killer feature)**

   ```bash
   # Workflow usado en Implementación #17 (indices compuestos)
   neon branches create --name test-add-index
   DATABASE_URL=$BRANCH_URL npx prisma db push
   # Test → Si funciona: aplicar a main. Si falla: delete branch
   ```

2. **Zero vendor lock-in:** PostgreSQL estándar + Prisma portables. Migración futura = `pg_dump` + `pg_restore` + cambiar connection string.

3. **Free tier generoso:** $0/mes permanente (512MB, unlimited branches, 3 proyectos). Suficiente para ~5000 proyectos. Actual: 14 proyectos = ~5MB.

4. **Autoscaling compute:** Scale to zero después de 5 min inactividad. Free tier dura mucho más tiempo.

5. **DX premium:** Web UI moderna, Neon CLI, Vercel integration y MCP Neon cuando hay credenciales disponibles.

6. **Connection pooling integrado:** PgBouncer automático con `?pgbouncer=true` en connection string.

### Negativas ⚠️

1. **Compute sleep en free tier:** DB hiberna después de 5 min → Cold start ~100-300ms en primera query
   - **Mitigación:** Scale tier $19/mes (no sleep) O cron keep-alive cada 4 min
   - **Impacto actual:** Bajo (usuario solo nota delay en primera carga del día)

2. **Límite 3 proyectos Neon:** Free tier = 3 proyectos
   - **Para Cobralon:** 1 producción + 2 staging/dev + unlimited branches dentro de cada proyecto ✅
   - **Suficiente:** Sí, para MVP y año 1

## Quick Start

```bash
# 1. Setup Neon project (1-click en neon.tech)
# 2. Copiar connection strings
```

```env
# .env.local
DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

**DATABASE_URL:** Pooled connection (serverless, API routes)
**DIRECT_URL:** Direct connection (migrations, Prisma Studio)

```bash
# 3. Aplicar schema
npm run db:push

# 4. Seed data inicial
npm run db:seed

# 5. Abrir Prisma Studio
npm run db:studio
```

**Database Branching Workflow:**

```bash
# Testing migration seguro
neon branches create --name test-migration
DATABASE_URL=$BRANCH_URL npx prisma db push
# Test en branch → Si OK: aplicar a main
```

**Casos de uso reales en Cobralon:**

- Implementación #17: Testing índices compuestos (97% performance improvement)
- Probar `relationLoadStrategy: 'join'` (fix N+1 queries)
- Feature branches para nuevos modelos Prisma

## Referencias

- [Neon Database Branching](https://neon.tech/docs/introduction/branching)
- [Arquitectura Cobralon](../architecture.md)
- [Regla de base de datos](../../rules/database.md)

---

**Última actualización:** 2025-10-25
