# ADR-008: Prisma ORM + Neon PostgreSQL

## Decisión

Usar **Prisma 6.7.0** como ORM + **Neon PostgreSQL** como database hosting recomendado.

## Contexto

Necesitábamos una solución de base de datos que sea:
- **Type-safe:** Integración perfecta con TypeScript strict mode
- **Serverless-friendly:** Compatible con Next.js App Router y Vercel
- **Sin vendor lock-in:** Capacidad de migrar a otras soluciones
- **DX excelente:** Productividad alta para desarrolladores

El template NO incluye credenciales ni migraciones aplicadas. Cada usuario configura su propia instancia de DB.

## Alternativa Principal

**Drizzle ORM:** Más ligero (~50% menor bundle size) y SQL-like API más familiar.

**Por qué NO:** Para un template, preferimos lo más conocido. Prisma tiene mejor DX para principiantes, ecosystem más maduro (Prisma Studio, migrations robustas) y documentación superior. Drizzle es excelente pero requiere más experiencia SQL.

## Consecuencias

### Beneficios ✅

1. **Type-safety máxima:** Prisma genera tipos TypeScript automáticamente desde `schema.prisma`. Errores detectados en compile-time, no runtime.

2. **DX superior:** `npm run db:studio` abre GUI para ver/editar datos sin SQL manual.

3. **Database branching:** Neon permite branches de DB como Git. Invaluable para testing destructivo sin miedo.

4. **Serverless-optimized:** Pooled connections + direct URL para migrations. Funciona perfectamente en Vercel/Netlify.

5. **Bajo vendor lock-in:**
   - Prisma: Migrations son SQL portables
   - Neon: PostgreSQL estándar (migrar a AWS RDS, Supabase, Railway es simple)

### Trade-offs ⚠️

1. **Bundle size mayor:** Prisma Client ~1-2MB (vs 50-100KB de Drizzle)
   - **Mitigación:** Para Edge Runtime usar `engineType = "client"` (sin Rust binaries)

2. **Neon free tier cold starts:** Primera query después de 5 min suspensión: ~500ms-1s
   - **Mitigación:** Plan Pro $19/mes con compute activo 24/7 en producción. Free tier OK para MVPs.

3. **Curva de aprendizaje:** Sintaxis específica de Prisma (no SQL directo)
   - **Mitigación:** Schema en template está comentado. Docs excelentes. Para queries complejas: `$queryRaw` disponible.

## Quick Start

```bash
# 1. Setup inicial (después de crear cuenta Neon)
cp .env.example .env.local
# Editar .env.local con connection strings de Neon

# 2. Generar Prisma Client
npm run db:generate

# 3. Aplicar schema a DB
npm run db:push

# 4. (Opcional) Seed data de prueba
npm run db:seed

# 5. Ver datos en GUI
npm run db:studio
```

```typescript
// Ejemplo de uso type-safe
import { prisma } from '@/lib/db'

// Prisma sabe exactamente qué campos existen
const user = await prisma.user.findUnique({
  where: { id: '123' },
  select: {
    email: true,
    posts: { select: { title: true } }
  }
})

// TypeScript infiere tipos automáticamente:
// user.email ✅ string
// user.posts ✅ { title: string }[]
// user.name ❌ ERROR - no está en select
```

## Referencias

- [Prisma Documentation](https://www.prisma.io/docs)
- [Neon Documentation](https://neon.tech/docs)
- [Database Setup Guide](../guides/database-setup.md) - Tutorial paso a paso
- [Neon MCP Guide](../guides/neon-mcp-optional.md) - Migraciones con IA (opcional)

---

**Última actualización:** 2025-01-17
