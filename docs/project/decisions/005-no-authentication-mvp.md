# ADR-005: No Authentication System (MVP Phase)

## Estado

**Aceptado** | **Fecha:** 2025-10-25

## Quick Start (Cómo Actuar)

> **💡 TL;DR:** MVP NO tiene auth. Estrategia en 3 fases: MVP sin auth (validación) → Production con auth (escalar) → Enterprise (si crece).

**Estado actual:**
- ✅ Aplicación funcional completa (CRUD, pagos, cuotas)
- ✅ Deploy: Red interna O localhost
- ✅ Usuarios: 1-2 personas (dueño + asistente)
- ❌ NO autenticación
- ❌ NO accesible públicamente

**Próximos pasos (cuando escalar a producción):**

1. **Agregar autenticación:** Implementar [Template ADR-009 guía de auth](../../template/decisions/009-authentication-options.md)
   - Recomendado: NextAuth.js (10-15 hrs) O Stack Auth (5-10 hrs)

2. **Restricciones de seguridad:**
   ```typescript
   // middleware.ts
   export default withAuth(function middleware(req) {
     // Proteger todas las rutas
   })

   export const config = {
     matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
   }
   ```

3. **Migrar datos:** Sin impacto (schema DB no cambia)

**Archivos a modificar (futuro):**
- `app/middleware.ts` - Crear nuevo (protección de rutas)
- `app/api/[...resource]/route.ts` - Agregar auth checks
- `components/layout/app-sidebar.tsx` - Agregar user menu
- `prisma/schema.prisma` - Agregar models User, Session, etc. (si NextAuth)

---

## Contexto

El sistema Cobralon es una aplicación de gestión interna para una empresa de construcción que necesita:

- Gestionar clientes, proyectos y pagos
- Registrar asignaciones de pagos (1 proyecto o múltiples proyectos)
- Calcular balances de proyectos automáticamente
- Generar cuotas sin interés
- Configurar estados de proyecto personalizables

**Pregunta arquitectural:** ¿Debe el MVP incluir sistema de autenticación desde el primer día?

### Casos de Uso Reales

El sistema será usado por:

1. **Usuario único inicial:** Dueño de la empresa (1 persona)
2. **Contexto:** Oficina física con 1-2 computadoras
3. **Acceso:** Red local/interna (no expuesta públicamente)
4. **Datos:** No hay información sensible de terceros (solo datos propios del negocio)

### Requisitos de Negocio

- ✅ **MVP funcional:** Validar flujo de pagos, allocations, cuotas
- ✅ **Tiempo de desarrollo:** Minimizar time-to-market (evitar over-engineering)
- ✅ **Complejidad:** Priorizar features core sobre infraestructura
- ⚠️ **Seguridad:** Red interna reduce riesgo vs aplicación pública

### Alternativas Consideradas para Auth

Si decidiéramos implementar auth desde el MVP:

#### Opción A: NextAuth.js

- **Pros:** Open-source, control total, zero vendor lock-in
- **Contras:** Requiere 4 tablas Prisma adicionales, UI manual, 10-15 horas de setup
- **Costo de oportunidad:** Tiempo NO invertido en features core

#### Opción B: Clerk

- **Pros:** Setup rápido (2-3 horas), UI completa, admin dashboard
- **Contras:** Vendor lock-in alto, $25/mes después de free tier, overkill para MVP
- **Costo directo:** $300/año para negocio pequeño

#### Opción C: Stack Auth

- **Pros:** Integración con Neon, setup 5-10 horas, UI incluida
- **Contras:** Vendor lock-in medio, requiere API keys externas
- **Complejidad:** Dependencia adicional para validar MVP

## Decisión

**Lanzar el MVP SIN sistema de autenticación** con las siguientes condiciones:

### Estrategia de 3 Fases

```
┌─────────────────────────────────────────────────────────┐
│            FASE 1: MVP (Current Decision)               │
├─────────────────────────────────────────────────────────┤
│  - Sistema funcional completo (CRUD, pagos, cuotas)     │
│  - SIN autenticación                                    │
│  - Deploy: Red interna O localhost                     │
│  - Usuarios: 1-2 personas (dueño + asistente)          │
│  - Duración: 2-4 semanas de validación                 │
│  - Objetivo: Validar business logic y UX               │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│         FASE 2: Production (When Scaling)               │
├─────────────────────────────────────────────────────────┤
│  - Agregar autenticación (NextAuth.js recomendado)     │
│  - Deploy: Vercel con dominio público                  │
│  - Usuarios: 3-10 personas (equipo expandido)          │
│  - Triggers:                                            │
│    * Necesidad de acceso remoto                        │
│    * Más de 2 usuarios simultáneos                     │
│    * Exposición pública del sistema                    │
│  - Inversión: 10-15 horas de implementación            │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│        FASE 3: Enterprise (If Needed)                   │
├─────────────────────────────────────────────────────────┤
│  - Multi-tenancy (Organization model)                   │
│  - Row-Level Security (Neon RLS)                        │
│  - Audit logs completos                                │
│  - Permisos granulares (RBAC)                          │
│  - Triggers:                                            │
│    * >10 usuarios activos                              │
│    * Múltiples empresas usando el sistema              │
│    * Compliance requirements                           │
└─────────────────────────────────────────────────────────┘
```

### Justificación de la Decisión

#### 1. Validación de Negocio es Prioritaria

El mayor riesgo del MVP NO es la seguridad, es que **el producto no resuelva el problema real del usuario**.

**Sin auth (decisión tomada):**

- ✅ 100% del tiempo en features core (payments, allocations, cuotas)
- ✅ Validación rápida del flujo de negocio
- ✅ Iteración ágil sin overhead de auth

**Con auth desde MVP:**

- ⚠️ 30-40% del tiempo en infraestructura (auth setup, UI, testing)
- ⚠️ Validación retrasada 1-2 semanas
- ⚠️ Complejidad temprana innecesaria

#### 2. Contexto de Red Interna Reduce Riesgo

El sistema se ejecutará en:

- **Red local:** No expuesto a internet público inicialmente
- **Control físico:** Acceso limitado a 1-2 computadoras en oficina
- **Usuarios conocidos:** Dueño y asistente (confianza alta)

**Riesgo sin auth:**

- ❌ Acceso no autorizado: **Riesgo bajo** (red interna)
- ❌ Data breach: **Riesgo bajo** (no hay datos de terceros sensibles)
- ❌ Compliance: **No aplica** (sistema interno, no SaaS)

**Mitigación adicional:**

- ✅ Deploy inicial en `localhost` (cero exposición)
- ✅ Si deploy en LAN: Firewall corporativo como primera línea
- ✅ Neon PostgreSQL: Credentials NO en código (env vars)

#### 3. Reversibilidad Total

La decisión de NO incluir auth es **completamente reversible**:

**Costo de agregar auth POST-MVP:**

- ⏱️ **Tiempo:** 10-15 horas (NextAuth.js)
- 💰 **Costo:** $0 (NextAuth open-source) o $25/mes (Clerk)
- 🔧 **Breaking changes:** Mínimos (solo agregar middleware + protected routes)
- 📊 **Data migration:** NO requerida (users table es independiente)

**Ejemplo de migración:**

```typescript
// ANTES (MVP sin auth):
export default function ProjectsPage() {
  return <AppLayout>...</AppLayout>
}

// DESPUÉS (con auth):
export default async function ProjectsPage() {
  const session = await getServerSession()
  if (!session) redirect('/login')
  return <AppLayout>...</AppLayout>
}
```

**Pasos de migración (cuando sea necesario):**

1. Instalar NextAuth.js: `npm install next-auth`
2. Crear `app/api/auth/[...nextauth]/route.ts`
3. Agregar middleware: `middleware.ts` con protected routes
4. Crear páginas de login/signup
5. Wrap pages con session checks
6. **Total:** 10-15 horas, cero impacto en business logic existente

#### 4. Precedentes de la Industria

Muchos productos exitosos lanzaron MVPs sin auth:

- **Notion (v1):** Solo invite-only, sin signup público
- **Linear (alpha):** Whitelist manual, auth agregado después
- **Superhuman:** Invite system, auth mínima inicial

**Pattern común:**

1. MVP interno → Validar producto
2. Private beta → Agregar auth básico
3. Public launch → Auth robusto + seguridad enterprise

## Alternativas Consideradas

### Alternativa 1: NextAuth.js desde MVP

**Implementación:**

```typescript
// prisma/schema.prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  accounts      Account[]
  sessions      Session[]
}

model Account { /* ... */ }
model Session { /* ... */ }
model VerificationToken { /* ... */ }
```

- **Pros:**
  - ✅ Open-source, zero vendor lock-in
  - ✅ Control total sobre flujo de auth
  - ✅ Soporta múltiples providers (Google, GitHub, Email)
- **Contras:**
  - ❌ **10-15 horas de setup** (4 tablas Prisma + UI + testing)
  - ❌ UI debe construirse manualmente (login, signup, forgot password)
  - ❌ Debugging complejo (OAuth flows, session management)
  - ❌ **Overhead en MVP:** 30-40% del tiempo total
- **Por qué NO:**
  - Costo de oportunidad: 15 horas NO invertidas en validar business logic
  - Complejidad innecesaria para MVP con 1-2 usuarios internos
  - Migración POST-MVP es trivial (misma inversión de tiempo)

### Alternativa 2: Clerk desde MVP

- **Pros:**
  - ✅ Setup rápido (2-3 horas)
  - ✅ UI completa (login, signup, user management)
  - ✅ Admin dashboard robusto
  - ✅ Webhooks para sincronización
- **Contras:**
  - ❌ **Vendor lock-in alto** (API propietaria, difícil migrar)
  - ❌ **$25/mes** después de free tier (50 users) → $300/año
  - ❌ Overkill para MVP interno con 1-2 usuarios
  - ❌ Dependencia externa desde día 1
- **Por qué NO:**
  - Costo anual ($300) injustificado para MVP
  - Vendor lock-in contraproducente para validación
  - Features enterprise (SAML, MFA) irrelevantes para MVP

### Alternativa 3: Stack Auth desde MVP

- **Pros:**
  - ✅ Integración con Neon PostgreSQL
  - ✅ Setup 5-10 horas
  - ✅ UI incluida (React components)
- **Contras:**
  - ❌ **Vendor lock-in medio** (menos que Clerk, más que NextAuth)
  - ❌ Dependencia de API keys externas
  - ❌ Complejidad agregada para MVP simple
- **Por qué NO:**
  - Mismo overhead de tiempo que NextAuth pero con vendor lock-in
  - No justificado para contexto de red interna

### Alternativa 4: Autenticación Custom (Basic Auth)

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const [user, pass] = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':')

  if (user !== 'admin' || pass !== process.env.ADMIN_PASSWORD) {
    return new Response('Unauthorized', { status: 401 })
  }
}
```

- **Pros:**
  - ✅ Implementación trivial (30 min)
  - ✅ Sin dependencias externas
  - ✅ Suficiente para red interna
- **Contras:**
  - ❌ **Anti-pattern:** Password en `.env` (riesgo de leak)
  - ❌ Sin logout, sin session management
  - ❌ No escalable (single password compartido)
  - ❌ UX pobre (browser popup)
- **Por qué NO:**
  - Si necesitas auth, mejor usar NextAuth (misma inversión de tiempo, mejor resultado)
  - Basic Auth es temporal y crea deuda técnica

### Alternativa 5: Auth desde MVP (cualquier solución)

**Escenario:** Implementar auth (NextAuth/Clerk/Stack) desde el primer día.

- **Pros:**
  - ✅ Sistema "production-ready" desde MVP
  - ✅ No hay migración posterior
  - ✅ Escalabilidad inmediata (agregar usuarios es trivial)
- **Contras CRÍTICOS:**
  - ❌ **30-40% del tiempo del MVP en infraestructura** (no en validación)
  - ❌ **Time-to-market retrasado:** 1-2 semanas adicionales
  - ❌ **Riesgo aumentado:** Validar producto + auth simultáneamente
  - ❌ **Over-engineering:** Features enterprise para MVP de 1-2 usuarios
- **Por qué NO:**
  - **Lean Startup principle:** "Build-Measure-Learn" cycle debe ser rápido
  - MVP debe validar **business logic**, no infraestructura
  - Auth es necesario cuando **escalas**, no cuando **validas**

**Análisis de riesgo:**

| Riesgo               | Sin Auth (MVP) | Con Auth (MVP) |
| -------------------- | -------------- | -------------- |
| **Validación lenta** | ✅ Bajo        | ❌ Alto        |
| **Over-engineering** | ✅ Bajo        | ❌ Alto        |
| **Time-to-market**   | ✅ 2-3 semanas | ⚠️ 4-5 semanas |
| **Acceso no autor.** | ⚠️ Medio       | ✅ Bajo        |
| **Cost ($)**         | ✅ $0          | ⚠️ $0-$300/año |
| **Reversibilidad**   | ✅ Total       | ❌ N/A         |

**Decisión:** El riesgo de validación lenta (over-engineering) es MAYOR que el riesgo de acceso no autorizado en red interna.

## Consecuencias

### Positivas ✅

1. **Time-to-Market Acelerado**
   - **Beneficio:** MVP funcional en 2-3 semanas (vs 4-5 con auth)
   - **Cuantificado:** 33-40% reducción en tiempo de desarrollo inicial
   - **Impacto:** Validación temprana del producto con usuario real

2. **Foco 100% en Business Logic**
   - **Beneficio:** Todo el esfuerzo en features core (payments, allocations, cuotas)
   - **Evitado:** Debugging de OAuth flows, session management, UI de login
   - **ROI:** 15 horas ahorradas = 15 horas en validar flujos de negocio

3. **Complejidad Mínima del MVP**
   - **Beneficio:** Codebase simple, fácil de iterar
   - **Evitado:** 4 tablas Prisma adicionales (User, Account, Session, VerificationToken)
   - **Mantenibilidad:** Menos código = menos bugs, menos tests

4. **Zero Vendor Lock-in Inicial**
   - **Beneficio:** No dependemos de Clerk/Stack Auth desde día 1
   - **Flexibilidad:** Podemos evaluar opciones con datos reales de uso
   - **Ejemplo:** Si después necesitamos SAML (enterprise), evaluamos Clerk vs WorkOS

5. **Reducción de Riesgo de Over-Engineering**
   - **Beneficio:** No construimos features que quizás nunca necesitemos
   - **Principio:** YAGNI (You Ain't Gonna Need It)
   - **Ejemplo real:** Muchos MVPs nunca escalan a >10 usuarios (auth enterprise innecesario)

6. **Iteración Ágil sin Overhead**
   - **Beneficio:** Cambios en flujo de negocio sin tocar auth
   - **Velocidad:** Deploy rápido, sin preocuparnos por sessions/logout
   - **Testing:** E2E tests sin mock de auth

7. **Reversibilidad Total (No Burning Bridges)**
   - **Beneficio:** Decisión es completamente reversible sin breaking changes
   - **Costo de migración:** 10-15 horas (mismo que implementar desde MVP)
   - **Data migration:** NO requerida (users table es independiente)

### Negativas / Trade-offs ⚠️

1. **No Escalable a Múltiples Usuarios Sin Migración**
   - **Limitación:** MVP solo funciona para 1-2 usuarios internos
   - **Trigger para cambio:** Cuando >2 personas necesiten acceso
   - **Mitigación:**
     - ✅ Migración a NextAuth toma 10-15 horas (planificada)
     - ✅ Roadmap de 3 fases documenta cuándo agregar auth
     - ✅ Costo de migración es conocido y aceptable

2. **Sistema NO Puede Ser Público Sin Auth**
   - **Limitación:** MVP debe ejecutarse en red interna o localhost
   - **Trigger para cambio:** Si necesitamos deploy público (Vercel + dominio)
   - **Mitigación:**
     - ✅ Deploy inicial en localhost (cero exposición)
     - ✅ Si deploy en LAN: Firewall corporativo como primera línea
     - ✅ Cuando necesitemos público → Implementar auth (Fase 2)

3. **Ausencia de Audit Logs por Usuario**
   - **Limitación:** No podemos saber "quién hizo qué" (no hay concepto de users)
   - **Impacto:** Auditoría limitada a timestamps y datos modificados
   - **Mitigación:**
     - ⚠️ En MVP con 1-2 usuarios, auditoría detallada no es crítica
     - ✅ Timestamps de `createdAt`/`updatedAt` en todos los modelos (básico)
     - ✅ Cuando escale: Agregar `createdBy`/`updatedBy` FK a User (Fase 2)

   **Ejemplo de migración de audit logs:**

   ```typescript
   // ANTES (MVP sin auth):
   model Payment {
     id        String   @id
     amount    Decimal
     createdAt DateTime @default(now())
     // Sin userId
   }

   // DESPUÉS (con auth):
   model Payment {
     id        String   @id
     amount    Decimal
     createdBy String   // ← FK a User
     user      User     @relation(fields: [createdBy], references: [id])
     createdAt DateTime @default(now())
   }
   ```

   **Costo de migración:**
   - Schema change: Agregar `createdBy` nullable inicialmente
   - Data backfill: Asignar registros antiguos a "admin user" (10 min)
   - Código: Pasar `userId` en mutations (2-3 horas)

4. **Percepción de "No Production-Ready"**
   - **Limitación:** Stakeholders externos pueden ver falta de auth como "toy project"
   - **Impacto:** Si necesitamos mostrar a inversionistas/clientes, auth da credibilidad
   - **Mitigación:**
     - ✅ MVP es **interno**, no demo externo (no aplica inicialmente)
     - ✅ Si necesitamos demo: Implementar Basic Auth temporal (30 min)
     - ✅ Roadmap de 3 fases muestra plan de producción (documentación)

5. **Riesgo de Procrastinación en Implementar Auth**
   - **Limitación:** "Después agregamos auth" puede convertirse en deuda técnica permanente
   - **Impacto:** MVP crece sin auth, migración se vuelve más costosa
   - **Mitigación:**
     - ✅ **Triggers claros** documentados: >2 usuarios, deploy público, 4 semanas de validación
     - ✅ **Roadmap de 3 fases** hace explícito cuándo implementar
     - ✅ **Costo conocido:** 10-15 horas (no crece significativamente con features)
     - ✅ **Revisión periódica:** Cada 2 semanas evaluar si triggers se cumplieron

   **Ejemplo de trigger-based decision:**

   ```markdown
   Revisión semanal:

   - ✅ Semana 1: 1 usuario (dueño) → NO implementar auth
   - ✅ Semana 2: 1 usuario → NO implementar auth
   - ✅ Semana 3: 2 usuarios (dueño + asistente) → NO implementar auth (threshold: >2)
   - ⚠️ Semana 4: 3 usuarios (necesitan acceso remoto) → **IMPLEMENTAR AUTH**
   ```

## Implementación

### Fase 1: MVP Sin Auth (Actual)

**Estado:** ✅ Implementado

**Configuración:**

```env
# .env.local
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
# No auth env vars
```

**Deploy:**

- Localhost: `npm run dev` (puerto 3000)
- LAN (opcional): Vercel preview deployment con URL privada

**Seguridad básica:**

1. ✅ Database credentials en `.env` (NO en código)
2. ✅ `.env` en `.gitignore` (NO commitear secrets)
3. ✅ Neon PostgreSQL: Conexiones encriptadas (SSL automático)
4. ✅ Next.js: API routes con validación Zod (previene SQL injection)

**Usuarios:**

- Acceso: Cualquiera con acceso a `http://localhost:3000` o URL de LAN
- Limitación: 1-2 computadoras en oficina

### Fase 2: Implementar Auth (Cuando Sea Necesario)

**Triggers para implementar:**

1. ✅ **>2 usuarios** necesitan acceso simultáneo
2. ✅ **Acceso remoto** requerido (fuera de oficina)
3. ✅ **Deploy público** (Vercel + dominio custom)
4. ✅ **4 semanas de validación** completadas (negocio probado)

**Plan de implementación (NextAuth.js recomendado):**

```bash
# 1. Instalar NextAuth (5 min)
npm install next-auth

# 2. Crear API route (15 min)
# app/api/auth/[...nextauth]/route.ts

# 3. Agregar modelos Prisma (10 min)
# User, Account, Session, VerificationToken

# 4. Crear páginas de auth (2-3 horas)
# app/login/page.tsx, app/signup/page.tsx

# 5. Proteger rutas (2-3 horas)
# middleware.ts con protected routes

# 6. Testing (2-3 horas)
# E2E tests de login/logout/signup

# TOTAL: 10-15 horas
```

**Schema Prisma (preparado para migración):**

```prisma
// Agregar cuando implementemos Fase 2:

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  password      String?   // Hash con bcrypt

  accounts      Account[]
  sessions      Session[]

  // Audit logs (FK desde otros modelos)
  createdPayments  Payment[]  @relation("createdBy")
  createdProjects  Project[]  @relation("createdBy")

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}
```

**Migración de datos:**

```typescript
// Script de migración (cuando implementemos Fase 2)
// scripts/migrate-to-auth.ts

async function migrateToAuth() {
  // 1. Crear usuario "admin" por defecto
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@cobralon.local',
      name: 'Administrador',
      emailVerified: new Date(),
    },
  })

  // 2. Backfill: Asignar todos los registros antiguos a admin
  await prisma.payment.updateMany({
    data: { createdBy: adminUser.id },
  })

  await prisma.project.updateMany({
    data: { createdBy: adminUser.id },
  })

  console.log('✅ Migración completa: Registros asignados a admin')
}
```

**Código de ejemplo (protected page):**

```typescript
// app/projects/page.tsx (después de Fase 2)
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'

export default async function ProjectsPage() {
  const session = await getServerSession()

  if (!session) {
    redirect('/login')
  }

  return <AppLayout>{/* Contenido existente sin cambios */}</AppLayout>
}
```

### Fase 3: Enterprise Auth (Si Es Necesario)

**Triggers para implementar:**

1. ✅ **>10 usuarios** activos
2. ✅ **Múltiples empresas** usando el sistema (multi-tenancy)
3. ✅ **Compliance requirements** (SOC 2, GDPR, HIPAA)

**Features enterprise (fuera de scope del MVP):**

- Multi-tenancy con Organization model
- Row-Level Security (Neon RLS)
- RBAC (Role-Based Access Control)
- SAML SSO (Clerk WorkOS)
- Audit logs completos (quién, qué, cuándo, desde dónde)
- MFA (Multi-Factor Authentication)

**Costo estimado:** 40-60 horas de implementación (cuando sea necesario)

## Referencias

### Código

- **Template Auth Guide:** [docs/template/guides/authentication-setup.md](../../template/guides/authentication-setup.md)
- **Template ADR-009:** [docs/template/decisions/009-authentication-options.md](../../template/decisions/009-authentication-options.md)

### Documentación Externa

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Clerk Documentation](https://clerk.dev/docs)
- [Stack Auth Documentation](https://stack-auth.com/docs)

### Análisis de Riesgo

Ver `docs/project/architecture.md` para análisis completo de riesgos de seguridad en contexto de red interna.

## Notas Adicionales

### Cuándo NO Seguir Esta Decisión

Esta decisión (MVP sin auth) NO es apropiada si:

1. ❌ **Sistema será público desde día 1** (internet expuesto)
2. ❌ **Datos sensibles de terceros** (PII, health records, financial data de clientes)
3. ❌ **Compliance requirements** desde MVP (HIPAA, SOC 2, GDPR strict)
4. ❌ **Múltiples usuarios desde inicio** (>5 usuarios concurrentes)
5. ❌ **Stakeholders externos requieren demo** (inversionistas, clientes enterprise)

**En esos casos:** Implementar NextAuth.js desde MVP (10-15 horas de inversión inicial).

### Por Qué Esta Decisión Es Correcta para Cobralon

El contexto específico de Cobralon justifica esta decisión:

1. ✅ **Usuario único inicial:** Dueño de empresa (1 persona)
2. ✅ **Red interna:** Oficina física con control de acceso
3. ✅ **Sin datos de terceros:** Solo datos propios del negocio
4. ✅ **Validación prioritaria:** Business logic > infraestructura
5. ✅ **Reversibilidad:** Migración a NextAuth es trivial (10-15 horas)
6. ✅ **Roadmap claro:** 3 fases documentadas con triggers específicos

**Comparación con SaaS público:**

| Factor                 | Cobralon MVP                | SaaS Público        |
| ---------------------- | --------------------------- | ------------------- |
| **Usuarios iniciales** | 1-2 (internos)              | 10-1000+ (externos) |
| **Red**                | Local/LAN                   | Internet público    |
| **Datos**              | Propios del negocio         | De terceros (PII)   |
| **Compliance**         | No aplica                   | GDPR, SOC 2         |
| **Auth necesario**     | ⚠️ Post-validación (Fase 2) | ✅ Desde día 1      |

### Revisión Periódica

**Revisión cada 2 semanas:**

```markdown
Checklist de triggers:

- [ ] ¿Hay >2 usuarios activos?
- [ ] ¿Necesitamos acceso remoto (fuera de oficina)?
- [ ] ¿Deploy en dominio público (no localhost)?
- [ ] ¿Validación de negocio completa (4+ semanas)?

Si alguno es ✅ → **Implementar Fase 2 (NextAuth.js)**
```

**Decisión documentada en:**

- `docs/project/decisions/005-no-authentication-mvp.md` (este archivo)
- `docs/project/architecture.md` - Sección de seguridad
- Roadmap en `docs/project/implementation/2025-current.md`

---

**Última actualización:** 2025-10-25

**Próxima revisión:** 2025-11-08 (2 semanas)

**Responsable:** Equipo de desarrollo (1 persona actualmente)
