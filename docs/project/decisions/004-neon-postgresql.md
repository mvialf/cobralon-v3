# ADR-004: Neon PostgreSQL as Database Provider

## Estado

**Aceptado**

**Fecha:** 2025-01-17

## Contexto

El proyecto requería un database provider para PostgreSQL con las siguientes necesidades:

### Requisitos del Proyecto

**Funcionales:**

- PostgreSQL real (no MySQL, no NoSQL)
- Foreign Keys obligatorias (integridad referencial crítica)
- 10 tablas relacionales con relaciones complejas (N:M, CASCADE, RESTRICT)
- Decimal precision para montos financieros
- Índices compuestos para performance

**No Funcionales:**

- Free tier para MVP (Budget: $0/mes ideal)
- Performance: <100ms queries (con 500-5000 proyectos esperados)
- DX: Setup rápido (<30 min desde cero a DB funcionando)
- Migraciones: Safe testing antes de aplicar a producción
- Portabilidad: Sin vendor lock-in (migración futura posible)

### Contexto del Template

El template ya incluía [ADR-008: Prisma + Neon](../../template/decisions/008-prisma-neon.md) que decidía:

- **ORM:** Prisma (vs Drizzle, raw SQL)
- **Database:** PostgreSQL (vs MySQL, MongoDB)
- **Provider sugerido:** Neon

Este ADR-004 del proyecto documenta: **¿Por qué efectivamente elegimos Neon para ESTE proyecto específico en lugar de otras alternativas reales evaluadas?**

## Decisión

Usar **Neon PostgreSQL** como database provider para el MVP y producción.

### Configuración Implementada

```env
# .env.local
DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

**Explanation:**

- `DATABASE_URL`: Pooled connection (para serverless, Next.js API routes)
- `DIRECT_URL`: Direct connection (para migrations, Prisma Studio)

### Features Utilizadas

1. **Database Branching** (killer feature para este proyecto)
2. **Autoscaling compute** (scale to zero en free tier)
3. **Connection pooling** (PgBouncer integrado)
4. **Free tier generoso** (512MB, unlimited branches)
5. **Zero vendor lock-in** (PostgreSQL estándar)

## Alternativas Consideradas

### Alternativa 1: Supabase (PostgreSQL + All-in-one)

**Features:**

- PostgreSQL real
- Auth integrado (Supabase Auth)
- Storage integrado (S3-like buckets)
- Realtime subscriptions (WebSockets)
- Row-level security (RLS) policies

**Pros:**

- ✅ All-in-one: DB + Auth + Storage en un solo provider
- ✅ UI bonita (dashboard, SQL editor intuitivo)
- ✅ Free tier generoso: 500MB DB + 2GB bandwidth
- ✅ Migraciones vía UI o CLI

**Contras CRÍTICOS (por qué NO):**

1. **Vendor lock-in ALTO:**

   ```typescript
   // ❌ Supabase Auth (no estándar)
   import { createClient } from '@supabase/supabase-js'
   const supabase = createClient(url, key)
   await supabase.auth.signIn({ email, password })

   // Migrar a NextAuth = reescribir todo auth logic
   ```

2. **Opinionated sobre Auth:**
   - Template decidió NO incluir auth por defecto ([ADR-009 template](../../template/decisions/009-authentication-options.md))
   - Supabase te empuja fuertemente a usar su Auth
   - Usar NextAuth con Supabase es friction constante

3. **Features no necesarias:**
   - Storage: No necesitamos (sin uploads de archivos en MVP)
   - Realtime: No necesitamos (no es chat/collaborative app)
   - RLS policies: Overhead de seguridad innecesario para MVP interno

4. **Performance limitations:**
   - Connection pooling limitado en free tier
   - No autoscaling compute (fixed instances)
   - Cold starts más lentos que Neon

**Score:** 53.5/100

- Vendor lock-in: -20 puntos
- Features innecesarias: -15 puntos
- Auth friction: -11.5 puntos

---

### Alternativa 2: PlanetScale (MySQL with Vitess)

**Features:**

- MySQL serverless
- Database branching (similar a Git)
- Zero-downtime schema changes
- Autoscaling horizontal (Vitess)

**Pros:**

- ✅ Branching workflow similar a Git
- ✅ Performance excelente (Vitess usado por YouTube)
- ✅ Free tier: 1 billion row reads/month

**Contras DEAL-BREAKER:**

1. **NO soporta Foreign Keys:**

   ```sql
   -- ❌ Esto falla en PlanetScale
   CREATE TABLE payment_allocations (
     payment_id UUID REFERENCES payments(id) ON DELETE CASCADE
   );

   -- Error: Foreign keys are not supported in Vitess
   ```

   **Impacto en este proyecto:**

   ```prisma
   // Relaciones críticas que NO funcionarían:

   // 1. Customer → Project (CASCADE)
   model Project {
     customerId String
     customer Customer @relation(...)  // ❌ No FK
   }
   // Problema: Borrar Customer no borra Projects automáticamente
   // Solución forzada: Manejo en application layer (bugs garantizados)

   // 2. Payment → PaymentAllocation (CASCADE)
   model PaymentAllocation {
     paymentId String
     payment Payment @relation(...)  // ❌ No FK
   }
   // Problema: Orphaned allocations si payment se elimina

   // 3. Project → ProjectStatus (RESTRICT)
   model Project {
     projectStatusId String
     projectStatus ProjectStatus @relation(...)  // ❌ No FK
   }
   // Problema: Puedes borrar ProjectStatus mientras hay Projects usándolo
   ```

2. **MySQL en lugar de PostgreSQL:**

   ```sql
   -- PostgreSQL (mejor para financials)
   amount DECIMAL(12,2)  -- Exacto

   -- MySQL DECIMAL
   amount DECIMAL(12,2)  -- Menos preciso en algunos casos
   ```

   - JSON handling inferior
   - Menos features avanzados (CTE, Window functions limitadas)

**Score:** 77.0/100 (alto, pero FKs son CRÍTICOS)

- No FKs: **DEAL-BREAKER** → Descalificado

---

### Alternativa 3: Railway (PostgreSQL managed)

**Features:**

- PostgreSQL real (sin restricciones)
- Deploy automático de Prisma migrations
- Integración con GitHub
- Variables de entorno automáticas
- Logs y metrics

**Pros:**

- ✅ Simple setup (1 click desde dashboard)
- ✅ Buen DX (railway.app UX moderna)
- ✅ PostgreSQL sin restricciones (FKs, extensions, todo funciona)
- ✅ Buen soporte

**Contras:**

1. **Pricing más caro:**

   ```
   Free tier: $5 credit/month
   - DB pequeña: ~$3-4/month
   - Free tier dura ~1-2 meses
   - Luego: $10-20/month para DB pequeña

   Vs Neon:
   - Free tier: Unlimited time (mientras <512MB)
   ```

2. **No database branching:**

   ```bash
   # ❌ Railway: No hay branches
   # Testing migration = aplicar directo a production DB (riesgoso)

   # ✅ Neon: Database branching
   neon branches create --name test-migration
   # Test en branch → Si falla, delete branch (main intacto)
   ```

3. **No autoscaling compute:**
   - Railway: Fixed size instance (siempre corriendo)
   - Neon: Scale to zero (ahorro en free tier)

4. **Menos features DB-específicos:**
   - Railway es hosting genérico (DB, app, Redis, todo)
   - Neon es especializado en PostgreSQL

**Score:** 49.5/100

- Costo: -20 puntos ($10-20/month vs $0)
- No branching: -25 puntos (feature killer)
- No autoscaling: -5.5 puntos

---

### Alternativa 4: AWS RDS PostgreSQL (Managed tradicional)

**Features:**

- PostgreSQL oficial (cualquier versión)
- Backups automáticos (point-in-time recovery)
- Multi-AZ availability (99.95% uptime)
- Read replicas
- Extensions ilimitadas

**Pros:**

- ✅ Production-grade (enterprise ready)
- ✅ Compliance (SOC2, HIPAA, ISO, etc.)
- ✅ Control total (versión PostgreSQL, extensions, tuning)
- ✅ Integración AWS (Lambda, S3, CloudWatch)

**Contras para MVP:**

1. **Costo ALTO:**

   ```
   db.t3.micro (2 vCPU, 1GB RAM):
   - Instance: $15/month
   - Storage (20GB): $2.30/month
   - Backup (20GB): $2/month
   - Total: ~$20/month mínimo

   Con production features:
   - Multi-AZ: +$15/month
   - Read replica: +$15/month
   - Total: ~$50-100/month

   Vs Neon free tier: $0/month
   ```

2. **Complejidad setup:**

   ```
   Pasos requeridos:
   1. Crear VPC
   2. Configurar security groups
   3. Setup IAM roles
   4. Crear DB instance
   5. Configurar backups
   6. Setup monitoring

   Tiempo: ~2 horas
   Vs Neon: 5 minutos (1-click)
   ```

3. **No free tier real:**
   - Solo 12 meses trial (750 horas/mes)
   - Después: pagar o migrar

4. **Overkill para MVP:**
   - Multi-AZ: No necesario para 14 proyectos actuales
   - Read replicas: No necesario (bajo tráfico)
   - Enterprise features: Overhead innecesario

**Score:** 46.5/100

- Costo: -30 puntos
- Complejidad: -15 puntos
- Overkill: -8 puntos

---

### Alternativa 5: NEON (SELECCIONADO)

**Features completas:**

1. **Database Branching (Killer feature)**

   ```bash
   # Workflow seguro para migrations

   # 1. Crear branch para testing
   neon branches create --name test-add-index --parent main

   # 2. Aplicar migration en branch
   DATABASE_URL=$BRANCH_URL npx prisma db push

   # 3. Testing
   DATABASE_URL=$BRANCH_URL npm run test:integration

   # 4. Si funciona: Aplicar a main
   DATABASE_URL=$MAIN_URL npx prisma db push

   # 5. Delete branch test
   neon branches delete test-add-index
   ```

   **Casos de uso reales en este proyecto:**
   - Testing índices compuestos (implementación #17)
   - Probar relationLoadStrategy: 'join' (fix N+1)
   - Feature branches (nuevos modelos Prisma)

2. **Zero Vendor Lock-in**

   ```typescript
   // ✅ PostgreSQL estándar (no Neon-specific SQL)
   // Migrar a Supabase/Railway/RDS:
   // 1. Dump DB: pg_dump
   // 2. Restore: pg_restore
   // 3. Cambiar connection string
   // 4. Done

   // Prisma migrations son portables
   // No hay Neon-specific code en application
   ```

3. **Autoscaling Compute**

   ```
   Free tier behavior:
   - DB hiberna después de 5 min inactividad
   - Cold start: ~100-300ms (aceptable para MVP)
   - Siguiente query: Fast (cálido)

   Ventaja:
   - Usa 0 compute cuando no hay tráfico
   - Free tier dura MUCHO más tiempo
   ```

4. **Connection Pooling Integrado**

   ```
   DATABASE_URL con ?pgbouncer=true
   → PgBouncer automático
   → Fix N+1 queries en Next.js serverless
   → Sin configuración manual
   ```

5. **Free Tier Generoso**

   ```
   Incluye:
   - 512MB storage (suficiente para 5000-10000 proyectos)
   - Unlimited branches (testing ilimitado gratis)
   - 3 proyectos Neon
   - Connection pooling
   - No credit card requerida

   Vs competencia:
   - Supabase: 500MB (similar, pero con vendor lock-in)
   - PlanetScale: Sin FKs (deal-breaker)
   - Railway: $5 credit/month (se acaba)
   - RDS: $20/month (sin free tier permanente)
   ```

6. **DX Premium**
   ```
   - Web UI moderna (SQL editor, metrics, branching)
   - Neon CLI (neon branches, neon projects, etc.)
   - Vercel integration (1-click setup)
   - MCP server (Claude puede gestionar DB vía MCP)
   ```

**Pricing:**

```
Free tier (actual):
- $0/month forever (mientras <512MB)
- 3 proyectos
- Unlimited branches

Scale tier (si creces):
- $19/month
- 10 proyectos
- Compute autoscaling mejorado
```

**Score:** 88.5/100 (ganador)

## Consecuencias

### Positivas ✅

1. **Database Branching = Testing Seguro**

   Implementaciones reales que usaron branching:

   ```bash
   # Implementación #17: Database optimization
   neon branches create --name test-composite-indexes

   # Agregar índices en branch
   @@index([customerId, projectStatusId])
   @@index([projectStatusId, date(sort: Desc)])

   # EXPLAIN ANALYZE en branch (no afecta main)
   # Resultado: 97% improvement (cache warm)

   # Aplicar a main con confianza
   ```

2. **Zero Vendor Lock-in**

   Migración futura (si necesaria):

   ```bash
   # Paso 1: Dump con pg_dump estándar
   pg_dump $NEON_URL > backup.sql

   # Paso 2: Restore a otro provider
   psql $NEW_PROVIDER_URL < backup.sql

   # Paso 3: Update .env.local
   DATABASE_URL="$NEW_PROVIDER_URL"

   # Paso 4: Prisma works sin cambios
   npx prisma generate
   ```

   **Sin cambios en código:** Prisma migrations son portables.

3. **Free Tier Permite MVP Completo**

   Proyección de uso:

   ```
   Proyectos actuales: 14
   Proyectos estimados año 1: 500
   DB size estimado: ~50MB (muy por debajo de 512MB limit)

   Conclusión: Free tier suficiente para todo año 1
   ```

4. **Performance con Autoscaling**

   Metrics actuales (con 14 proyectos):

   ```
   - Cold start: ~150ms (aceptable)
   - Warm queries: <10ms
   - Con relationLoadStrategy join: <5ms (fix N+1)

   Con 500 proyectos (estimado):
   - Queries seguirán <50ms (índices compuestos funcionan)
   ```

5. **DX: Neon MCP Integration**

   Ejemplo de uso:

   ```
   Usuario: "Claude, crea branch de testing para migration X"
   Claude (usa Neon MCP):
   1. neon branches create
   2. Ejecuta migration
   3. Valida con EXPLAIN ANALYZE
   4. Reporta resultados
   ```

   Ver: [docs/template/guides/neon-mcp-optional.md](../../template/guides/neon-mcp-optional.md)

### Negativas / Trade-offs ⚠️

1. **Preview Features Only in Branches**

   **Trade-off:** Algunas features de Neon solo funcionan en branches (no en main).

   **Ejemplo:**
   - Time-travel queries (experimental)
   - Schema diff visual

   **Impacto:** Bajo (features experimentales no críticas para proyecto)

2. **Compute Sleep en Free Tier**

   **Trade-off:** DB hiberna después de 5 min inactividad.

   ```
   Cold start sequence:
   1. Primera query después de sleep: ~100-300ms
   2. DB se calienta
   3. Siguientes queries: <10ms

   User experience:
   - Usuario nota delay solo en primera carga del día
   - Luego: performance normal
   ```

   **Mitigación (si molesta en futuro):**
   - Upgrade a Scale tier ($19/month) → No sleep
   - O: Cron job cada 4 min (keep-alive ping)

3. **Límite 3 Proyectos en Free Tier**

   **Trade-off:** Solo 3 proyectos Neon en free tier.

   **Para este proyecto:**
   - 1 proyecto: Production DB (main branch)
   - 2 proyectos: Staging, Dev (opcional)
   - Branches ilimitados DENTRO de cada proyecto ✅

   **Suficiente:** Sí, para MVP y año 1

4. **Relación con Template ADR-008**

   **Template ADR-008 decidió:** "Prisma + Neon recomendado a nivel framework"

   **Este ADR-004 decidió:** "Neon específicamente para este proyecto"

   **No son duplicados:**
   - Template: Decisión general de arquitectura
   - Proyecto: Evaluación específica con alternativas reales (Supabase, Railway, RDS)

## Referencias

### Código

- **Configuración:**
  - [.env.example](../../../.env.example) - Template con Neon connection strings
  - [prisma/schema.prisma:6-13](../../../prisma/schema.prisma#L6-L13) - Datasource config

- **Migrations:**
  - [prisma/migrations/](../../../prisma/migrations/) - Historial de migraciones

### Documentación

- [docs/template/decisions/008-prisma-neon.md](../../template/decisions/008-prisma-neon.md) - ADR del template (complementario)
- [docs/template/guides/database-setup.md](../../template/guides/database-setup.md) - Setup manual paso a paso
- [docs/project/implementation.md](../implementation.md) - Implementación #4: Database Layer

### External References

- [Neon Database Branching](https://neon.tech/docs/introduction/branching) - Documentación oficial
- [Neon vs Supabase](https://neon.tech/docs/reference/compatibility#neon-vs-supabase) - Comparación oficial
- [Prisma with Neon](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-neon) - Guía de integración

## Notas Adicionales

### ¿Cuándo Migrar a Scale Tier ($19/month)?

Triggers para upgrade:

- ✅ DB size > 400MB (cerca del límite de 512MB)
- ✅ Compute sleep afecta UX (usuarios se quejan de cold starts)
- ✅ Necesitas >3 proyectos Neon
- ✅ Más de 100 queries/segundo (autoscaling mejorado)

**Estimado:** Año 2-3 (cuando tengas 1000+ proyectos)

### ¿Cuándo Migrar a Otro Provider?

Escenarios de migración:

- Neon discontinúa servicio (unlikely)
- Pricing cambia drásticamente (10x+ aumento)
- Necesitas features enterprise de RDS (multi-AZ, compliance específico)

**Facilidad de migración:** Alta (PostgreSQL estándar + Prisma portable)

### Database Branching: Casos de Uso Adicionales

Más allá de testing migrations:

1. **Feature Development:**

   ```bash
   # Developer trabaja en feature de reportes
   neon branches create --name feature-reports
   # Agregar tabla Reports solo en branch
   # Testing completo
   # PR aprobado → Merge DB branch a main
   ```

2. **Debugging Production Issues:**

   ```bash
   # Producción tiene bug con data específica
   neon branches create --name debug-issue-123 --parent main
   # Branch tiene COPIA EXACTA de production data
   # Reproduce bug localmente (sin afectar producción)
   ```

3. **Training/Demo Environments:**
   ```bash
   # Crear branch para demos a clientes
   neon branches create --name demo-client-xyz
   # Cliente prueba sistema sin riesgo
   # Delete branch después de demo
   ```

---

**Última actualización:** 2025-10-25
