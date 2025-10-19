# ADR-008: Prisma ORM + Neon PostgreSQL

## Estado

**Aceptado**

**Fecha:** 2025-01-17

## Contexto

El template necesitaba una solución de base de datos que sea:

- **Type-safe**: Integración perfecta con TypeScript strict mode
- **Serverless-friendly**: Compatible con Next.js App Router y Vercel
- **Sin vendor lock-in**: Capacidad de migrar a otras soluciones
- **DX excelente**: Productividad alta para desarrolladores
- **Flexible**: Cada proyecto puede usar su propia instancia de DB

Consideraciones específicas para un **template reutilizable**:

- NO incluir credenciales en el código
- NO aplicar migraciones pre-configuradas
- Estructura lista para usar pero no acoplada
- Documentación clara para setup rápido

## Decisión

Usar **Prisma 6.7.0** como ORM + **Neon PostgreSQL** como database hosting recomendado.

### Configuración del Template

**Incluido en el template:**

- ✅ `prisma/schema.prisma` - Schema base personalizable
- ✅ `lib/db.ts` - Prisma Client singleton
- ✅ `prisma/seed.ts` - Template de seed data
- ✅ `.env.example` - Plantilla de variables de entorno
- ✅ API routes de ejemplo (`/api/users`)
- ✅ Scripts npm (`db:generate`, `db:push`, etc.)
- ✅ Documentación completa de setup

**NO incluido:**

- ❌ `.env.local` con credenciales (cada usuario crea el suyo)
- ❌ Migraciones aplicadas (cada proyecto genera las suyas)
- ❌ Prisma Client generado (se genera con `npm run db:generate`)
- ❌ Cuenta Neon específica (cada usuario crea la suya)

## Alternativas Consideradas

### Alternativa 1: Supabase

**Pros:**

- Auth + DB + Storage en un solo servicio
- Setup ultra rápido (<30 min)
- Realtime subscriptions built-in
- Free tier generoso (500MB)

**Contras:**

- **Vendor lock-in alto**: SDK de Supabase en todo el código
- Type-safety inferior a Prisma
- Migrar a otra solución requiere reescribir queries
- RLS (Row Level Security) complica uso con Prisma

**Por qué NO:**

- Template debe minimizar vendor lock-in
- Prisma ofrece mejor type-safety
- Supabase es "all-in-one" pero este template prefiere "best-of-breed"

### Alternativa 2: Drizzle ORM

**Pros:**

- Más ligero que Prisma (~50% menor bundle)
- SQL-like API (más familiar para devs SQL)
- Mejor performance en queries complejas
- Type-safe como Prisma

**Contras:**

- Ecosistema más pequeño (menos recursos, ejemplos)
- Prisma Studio no disponible (GUI)
- Migrations menos maduras
- Comunidad menor (menos soluciones a problemas comunes)

**Por qué NO:**

- Para un template, preferimos lo más conocido
- Prisma tiene mejor DX para principiantes
- Ecosistema más maduro y documentación superior

### Alternativa 3: Prisma + Supabase PostgreSQL

**Pros:**

- Type-safety de Prisma + infraestructura de Supabase
- Evita SDK de Supabase para queries
- Auth y Storage de Supabase disponibles si se necesitan

**Contras:**

- Dos sistemas en paralelo (Prisma + Supabase SDK)
- Row Level Security (RLS) difícil de integrar con Prisma
- Complejidad adicional sin beneficio claro

**Por qué NO:**

- Complejidad innecesaria para un template base
- RLS con Prisma requiere workarounds complejos

### Alternativa 4: PlanetScale

**Pros:**

- Database branching como Git
- Serverless MySQL compatible con Prisma
- Excelente DX

**Contras:**

- **Free tier eliminado** en 2024 (ahora $39/mes mínimo)
- MySQL en lugar de PostgreSQL (menos features)
- Menos flexible que Neon

**Por qué NO:**

- Sin free tier viable para templates/MVPs
- PostgreSQL es más estándar para SaaS moderno

### Alternativa 5: Railway PostgreSQL

**Pros:**

- PostgreSQL estándar
- Deploy de full-stack app integrado
- Free tier de $5/mes en créditos

**Contras:**

- Free tier limitado y puede agotarse
- Menos features que Neon (sin branching)
- Más enfocado en hosting completo vs solo DB

**Por qué NO:**

- Neon tiene mejor free tier para solo DB
- Database branching de Neon es game changer

### Alternativa 6: Solo Prisma (sin recomendación de hosting)

**Pros:**

- Máxima flexibilidad (usuarios eligen su DB)
- Sin preferencias opinadas

**Contras:**

- Los usuarios del template necesitan investigar opciones
- Menos "batteries included"
- Experiencia inicial más lenta

**Por qué NO:**

- Template debe facilitar el inicio rápido
- Recomendar Neon no obliga a usarlo (solo es la guía por defecto)

## Consecuencias

### Positivas ✅

#### 1. **Type-Safety Máxima**

```typescript
// Prisma genera tipos automáticamente desde schema.prisma
const user = await prisma.user.findUnique({
  where: { id: '123' },
  select: { email: true, posts: { select: { title: true } } },
})

// TypeScript sabe exactamente:
user.email // ✅ string
user.posts // ✅ { title: string }[]
user.name // ❌ ERROR - no está en select
user.foo // ❌ ERROR - no existe en schema
```

**Beneficio:** Errores detectados en compile-time, no en runtime.

#### 2. **Developer Experience Superior**

```bash
# Workflow simple:
npm run db:generate  # Genera tipos TS
npm run db:push      # Aplica schema a DB
npm run db:studio    # GUI para ver datos
npm run db:seed      # Pobla DB con data de prueba

# Un comando hace todo:
npx prisma migrate dev --name add-posts
# → Crea migración
# → La aplica a DB
# → Regenera Prisma Client
```

#### 3. **Database Branching de Neon**

```bash
# Crear branch de DB para feature
neon branches create --name feature-payments

# Toda la DB copiada en branch aislado
# Cambios destructivos sin miedo
# Si funciona → merge
# Si no → delete branch
```

**Beneficio:** Como Git pero para tu database. Invaluable para development workflow.

#### 4. **Pay-As-You-Grow**

```
Hoy:      DB + ORM (Prisma + Neon free)
Semana 2: + Auth (NextAuth cuando necesites)
Mes 1:    + Storage (Cloudflare R2 cuando necesites)
Mes 2:    + Emails (Resend cuando necesites)
```

No pagas por features que no usas aún.

#### 5. **Bajo Vendor Lock-in**

- **Prisma**: Migrations son SQL portables
  - Migrar a Drizzle: Posible (requiere reescribir queries)
  - Migrar a SQL crudo: Migrations ya son SQL

- **Neon**: PostgreSQL estándar
  - Migrar a AWS RDS: `pg_dump` + `pg_restore`
  - Migrar a Supabase: Cambiar connection string
  - Migrar a Railway: Mismo proceso

#### 6. **Serverless-Optimized**

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")       // Pooled connection
  directUrl = env("DIRECT_URL")         // Direct connection
}
```

- **Pooled connection**: Para queries de la app (serverless functions)
- **Direct connection**: Para migraciones (evita pool limits)

**Beneficio:** Funciona perfectamente en Vercel, Netlify, AWS Lambda.

#### 7. **Ecosystem Maduro**

- Prisma Studio (GUI)
- Prisma Migrate (migrations)
- Prisma Client Extensions (plugins)
- Amplia comunidad y recursos

### Negativas / Trade-offs ⚠️

#### 1. **Cold Starts en Neon Free Tier**

**Problema:**

```
Compute suspende después de 5 min sin actividad
Primera query después de suspensión: ~500ms-1s
Queries subsecuentes: <10ms
```

**Mitigación:**

- Esperado en free tier (no es un bug)
- En producción: Plan Pro ($19/mes) con compute activo 24/7
- Para MVPs: Aceptable (UX no se degrada significativamente)

#### 2. **Bundle Size de Prisma**

**Problema:**

- Prisma Client genera ~1-2MB de código
- Puede ser problema en Vercel Edge Runtime

**Mitigación:**

- Para Edge: Usar `engineType = "client"` (sin Rust binaries)
- Para serverless normal: No es problema
- El template está configurado para serverless estándar

#### 3. **Curva de Aprendizaje del Schema**

**Problema:**

- Sintaxis específica de Prisma (no es SQL directo)
- Usuarios necesitan aprender DSL de Prisma

**Mitigación:**

- Documentación excelente
- Schema incluido en template es auto-explicativo
- Comentarios y ejemplos en `schema.prisma`

#### 4. **Queries Complejas Pueden Ser Torpes**

```typescript
// Queries muy complejas mejor con raw SQL:
const result = await prisma.$queryRaw`
  SELECT u.*, COUNT(p.id) as post_count
  FROM "User" u
  LEFT JOIN "Post" p ON p."authorId" = u.id
  GROUP BY u.id
  HAVING COUNT(p.id) > 5
`
// ⚠️ Pierdes type-safety parcialmente
```

**Mitigación:**

- La mayoría de queries SaaS son simples (CRUD)
- Para queries complejas: `$queryRaw` está disponible
- Considera views de DB para queries muy complejas

#### 5. **Neon Free Tier Limits**

```
✅ 512 MB storage
✅ 1 proyecto
✅ Branches ilimitados
✅ 191.9 horas compute/mes activas

⚠️ Suficiente para:
- MVPs y prototipos
- 100-500 usuarios activos/mes
- Desarrollo local

❌ Insuficiente para:
- Apps con >1000 usuarios activos
- Data analytics pesados
- Background jobs constantes
```

**Mitigación:**

- Free tier cubre fase inicial
- Upgrade a Pro ($19/mes) es simple
- Migrar a otra DB es posible (PostgreSQL estándar)

## Implementación

### Archivos Creados

```
prisma/
├── schema.prisma          # Schema con User model base
├── seed.ts               # Template de seed data
└── migrations/.gitkeep   # Carpeta vacía

lib/
└── db.ts                 # Prisma Client singleton

app/api/
└── users/
    └── route.ts          # Ejemplo CRUD completo

.env.example              # Template de variables (sin credenciales)
docs/template/guides/
└── database-setup.md     # Guía paso a paso completa
```

### Scripts npm

```json
{
  "scripts": {
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:migrate:deploy": "prisma migrate deploy",
    "db:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts"
  }
}
```

### Dependencias

```json
{
  "dependencies": {
    "@prisma/client": "^6.7.0"
  },
  "devDependencies": {
    "prisma": "^6.7.0",
    "tsx": "^4.19.4"
  }
}
```

## Experiencia del Usuario Final

Cuando un usuario clona este template:

```bash
# 1. Instalar dependencias
npm install

# 2. Setup database (10-15 min siguiendo guía)
# - Crear cuenta Neon
# - Crear proyecto
# - Copiar connection strings
cp .env.example .env.local
# - Editar .env.local

# 3. Aplicar schema
npm run db:generate
npm run db:push

# 4. (Opcional) Seed data
npm run db:seed

# 5. Verificar
npm run db:studio  # Ver datos en GUI

# 6. Desarrollar
npm run dev
```

**Total: 15-20 minutos** desde clone hasta DB funcionando.

## Referencias

- [Prisma Documentation](https://www.prisma.io/docs)
- [Neon Documentation](https://neon.tech/docs)
- [Prisma + Neon Guide](https://neon.tech/docs/guides/prisma)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)
- [Neon Database Branching](https://neon.tech/docs/introduction/branching)

## Notas Adicionales

### Prisma vs Drizzle (Revisión Futura)

Drizzle ORM está ganando tracción en 2024-2025. Considerar para futuras versiones si:

- Bundle size se vuelve crítico
- La comunidad se consolida significativamente
- Las migrations maduran

Por ahora, Prisma es la opción más estable y documentada para un template.

### Alternative Database Hosts

Este template recomienda Neon pero funciona con cualquier PostgreSQL:

- **Supabase PostgreSQL**: Cambiar connection string
- **Railway**: Mismo proceso
- **AWS RDS**: Compatible (requiere VPC en caso de private subnet)
- **Vercel Postgres**: Compatible
- **Local PostgreSQL**: `postgresql://localhost:5432/mydb`

### Configuración para Producción

Antes de deploy a producción:

1. **Usa migraciones versionadas:**

   ```bash
   npm run db:migrate  # No db:push
   ```

2. **Configura connection pooling:**
   - Vercel/Netlify: Ya configurado con Neon pooler
   - Self-hosted: Considerar PgBouncer

3. **Habilita query logging:**

   ```typescript
   new PrismaClient({ log: ['query', 'error', 'warn'] })
   ```

4. **Monitoreo:**
   - Neon dashboard para métricas
   - Prisma Pulse (opcional) para observability

---

**Última actualización:** 2025-01-17
