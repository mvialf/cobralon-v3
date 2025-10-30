# Seguridad - Gaps Críticos y Mejoras

## 🔒 Estado: AWARENESS

Este archivo documenta los gaps de seguridad identificados en el diagnóstico. **No todos requieren implementación inmediata**, pero es importante conocerlos para tomar decisiones informadas.

---

## 1. Sin Autenticación (MVP Aceptable, Producción NO)

### 📊 Estado Actual

**Evidencia:**

```typescript
// app/api/projects/route.ts
export async function GET(request: Request) {
  // ❌ Sin verificación de usuario
  // Cualquiera puede leer proyectos
  const projects = await db.project.findMany()
  return NextResponse.json({ projects })
}

export async function POST(request: Request) {
  // ❌ Sin verificación de usuario
  // Cualquiera puede crear proyectos
  const body = await request.json()
  const project = await db.project.create({ data: body })
  return NextResponse.json(project)
}
```

**Resultado:**

- ✅ **MVP:** Rápido de desarrollar, sin fricción
- ❌ **Producción:** Cualquiera con la URL puede acceder/modificar datos

### 🔥 Riesgos

1. **Acceso no autorizado**
   - Competidor accede a tus datos de clientes
   - Cliente malicioso modifica proyectos de otros clientes

2. **Sin auditoría**
   - ¿Quién creó este proyecto?
   - ¿Quién eliminó este pago?
   - No hay forma de saberlo

3. **Sin multi-tenancy**
   - Todos los clientes ven todos los proyectos
   - No puedes ofrecer SaaS (1 instancia, N empresas)

### 💡 Solución (Cuando Sea Necesario)

#### **Opción A: NextAuth.js (Recomendado)**

```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Validar contra tu DB
        const user = await db.user.findUnique({
          where: { email: credentials.email },
        })

        if (user && (await bcrypt.compare(credentials.password, user.passwordHash))) {
          return { id: user.id, email: user.email }
        }

        return null
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

**Proteger API routes:**

```typescript
// app/api/projects/route.ts
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'

export async function GET(request: Request) {
  // ✅ Verificar sesión
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ✅ Solo proyectos del usuario/organización
  const projects = await db.project.findMany({
    where: {
      organizationId: session.user.organizationId,
    },
  })

  return NextResponse.json({ projects })
}
```

**Proteger páginas:**

```typescript
// app/projects/page.tsx
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  return <div>Proyectos de {session.user.email}</div>
}
```

**Esfuerzo:** 2-3 días (incluyendo UI de login/signup)

---

#### **Opción B: Stack Auth (Más Rápido)**

- Pro: Setup en 15-30 minutos
- Pro: UI prebuilt
- Con: Vendor lock-in (servicio externo)
- Con: Costo mensual

Ver: [docs/template/guides/authentication-setup.md](../docs/template/guides/authentication-setup.md)

---

#### **Opción C: Clerk (Más Features)**

- Pro: UI profesional out-of-the-box
- Pro: Multi-tenancy incluido
- Pro: Social login fácil
- Con: Costo más alto
- Con: Vendor lock-in

---

### 📋 Cuándo Implementar

| Escenario                           | Recomendación                     | Urgencia |
| ----------------------------------- | --------------------------------- | -------- |
| Solo tú usas la app (internal tool) | Opcional (considera IP whitelist) | Baja     |
| 2-5 usuarios confiables             | Nice-to-have                      | Media    |
| >5 usuarios o datos sensibles       | **Obligatorio**                   | Alta     |
| Quieres ofrecer como SaaS           | **Obligatorio**                   | Crítica  |

---

## 2. Sin Rate Limiting (DoS Fácil)

### 📊 Estado Actual

```typescript
// app/api/projects/route.ts
export async function POST(request: Request) {
  // ❌ Sin rate limiting
  // Alguien puede hacer 10,000 requests/segundo
  const body = await request.json()
  const project = await db.project.create({ data: body })
  return NextResponse.json(project)
}
```

### 🔥 Riesgos

**Escenario 1: Spam accidental**

```bash
# Usuario tiene bug en su script
for i in {1..100000}; do
  curl -X POST http://tuapp.com/api/projects -d '{...}'
done
```

**Resultado:**

- 100,000 proyectos basura en DB
- DB llena → app deja de funcionar
- Costos de Neon explotan

**Escenario 2: Ataque DoS intencional**

- Atacante hace 10,000 requests/seg
- DB se satura
- App deja de funcionar para todos

### 💡 Solución

#### **Opción A: Vercel Edge Config (Si estás en Vercel)**

```typescript
// middleware.ts (CREAR)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'), // 10 requests / 10 segundos
  analytics: true,
})

export async function middleware(request: NextRequest) {
  // Solo rate limit en API routes
  if (!request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // Identificar por IP
  const ip = request.ip ?? '127.0.0.1'
  const { success, pending, limit, reset, remaining } = await ratelimit.limit(ip)

  if (!success) {
    return NextResponse.json(
      {
        error: 'Too many requests',
        limit,
        remaining,
        reset: new Date(reset),
      },
      { status: 429 }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
```

**Dependencias:**

```bash
npm install @upstash/ratelimit @upstash/redis
```

**Setup Upstash:**

1. Crear cuenta gratis en upstash.com
2. Crear Redis database
3. Copiar `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` a `.env`

**Esfuerzo:** 1-2 horas

---

#### **Opción B: Redis Local (Sin Vercel)**

```typescript
// lib/rate-limiter.ts (CREAR)
import { Redis } from 'ioredis'

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

export async function checkRateLimit(
  identifier: string, // IP, user ID, etc.
  maxRequests: number = 10,
  windowSeconds: number = 10
): Promise<{ allowed: boolean; remaining: number }> {
  const key = `ratelimit:${identifier}`
  const now = Date.now()
  const windowStart = now - windowSeconds * 1000

  // 1. Eliminar requests antiguos
  await redis.zremrangebyscore(key, 0, windowStart)

  // 2. Contar requests en ventana actual
  const count = await redis.zcard(key)

  if (count >= maxRequests) {
    return { allowed: false, remaining: 0 }
  }

  // 3. Agregar nuevo request
  await redis.zadd(key, now, `${now}`)
  await redis.expire(key, windowSeconds)

  return { allowed: true, remaining: maxRequests - count - 1 }
}
```

**Uso:**

```typescript
// app/api/projects/route.ts
import { checkRateLimit } from '@/lib/rate-limiter'

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'

  const { allowed, remaining } = await checkRateLimit(ip, 10, 10)

  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests', remaining: 0 }, { status: 429 })
  }

  // ... resto del endpoint
}
```

**Esfuerzo:** 3-4 horas (incluyendo setup de Redis)

---

### 📋 Cuándo Implementar

| Escenario                  | Recomendación   | Urgencia |
| -------------------------- | --------------- | -------- |
| App interna (1-5 usuarios) | Opcional        | Baja     |
| App con usuarios externos  | Recomendado     | Media    |
| App pública sin auth       | **Obligatorio** | Alta     |
| API expuesta a terceros    | **Obligatorio** | Crítica  |

---

## 3. Sin Protección CSRF (Bajo Riesgo con JWT)

### 📊 Estado Actual

- No hay tokens CSRF
- Cookies de sesión NO están configuradas

**Riesgo:**

- **Con session cookies:** Alto (ataque CSRF posible)
- **Con JWT en headers:** Bajo (CSRF no funciona)
- **Estado actual (sin auth):** N/A

### 💡 Solución (Solo Si Usas Session Cookies)

Si implementas NextAuth con session cookies:

```typescript
// next.config.mjs
export default {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}
```

NextAuth ya incluye protección CSRF por defecto.

---

## 4. Sin Validación de Input en Depth

### 📊 Estado Actual

**Validaciones presentes:**

- ✅ Zod en frontend
- ⚠️ Validación manual en backend (no usa Zod)
- ❌ Sin sanitización de strings

**Riesgos:**

1. **SQL Injection:** Bajo (Prisma protege)
2. **XSS:** Medio (si no sanitizas HTML)
3. **Command Injection:** N/A (no ejecutas comandos)

### 💡 Solución

#### **1. Usar Zod en Backend (Ya Cubierto en P2)**

Ver: `P2-Technical-Debt.md` → Sección "Validaciones Zod No Usadas"

#### **2. Sanitizar HTML (Si Permites Rich Text)**

```typescript
import DOMPurify from 'isomorphic-dompurify'

// app/api/projects/route.ts
const sanitized = {
  ...validated,
  description: DOMPurify.sanitize(validated.description),
}
```

**Solo necesario si:** Permites que usuarios ingresen HTML (rich text editors)

---

## 5. Secrets Expuestos (Cuidado con .env)

### 📊 Estado Actual

**Archivo `.env`:**

```bash
DATABASE_URL="postgresql://..."  # ⚠️ Contiene credenciales
CRON_SECRET="..."                # ⚠️ Secret
```

**Riesgos:**

1. ❌ Si `.env` se commitea a Git → credenciales públicas
2. ❌ Si log incluye DATABASE_URL → credenciales en logs

### 💡 Solución

#### **1. Verificar .gitignore**

```bash
# .gitignore (VERIFICAR)
.env
.env.local
.env.production
```

```bash
# Verificar que no se haya commiteado
git log --all --full-history -- ".env"

# Si aparece algo, eliminar del historial:
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all
```

#### **2. Usar Vercel Environment Variables**

En Vercel Dashboard:

1. Settings → Environment Variables
2. Agregar `DATABASE_URL`, `CRON_SECRET`, etc.
3. **NO committear .env**

#### **3. Logs seguros**

```typescript
// lib/logger.ts (MEJORADO)
export class Logger {
  static error(message: string, error: Error, context?: LogContext) {
    // ✅ Sanitizar context (remover secrets)
    const sanitizedContext = this.sanitize(context)

    const logEntry = {
      // ... resto igual
      context: sanitizedContext,
    }

    console.error(JSON.stringify(logEntry))
  }

  private static sanitize(obj: any): any {
    if (!obj) return obj

    const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'DATABASE_URL']

    const sanitized = { ...obj }

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))) {
        sanitized[key] = '[REDACTED]'
      }
    }

    return sanitized
  }
}
```

---

## 🎯 Priorización de Seguridad

### Implementar AHORA (Antes de Producción)

| Gap                | Impacto | Esfuerzo | Acción                        |
| ------------------ | ------- | -------- | ----------------------------- |
| Rate limiting      | Alto    | 2 hrs    | Implementar con Upstash       |
| Validación backend | Alto    | 3 hrs    | Usar Zod schemas (ver P2)     |
| .env en .gitignore | Crítico | 5 min    | Verificar y limpiar historial |

### Implementar PRONTO (Cuando Escales)

| Gap                  | Impacto | Esfuerzo | Acción                     |
| -------------------- | ------- | -------- | -------------------------- |
| Autenticación        | Alto    | 2-3 días | NextAuth o Stack Auth      |
| Logging estructurado | Medio   | 1 día    | Logger + contexto (ver P2) |

### Opcional (Nice-to-Have)

| Gap                | Impacto | Esfuerzo | Acción                        |
| ------------------ | ------- | -------- | ----------------------------- |
| CSRF (con cookies) | Bajo    | N/A      | NextAuth lo incluye           |
| Sanitización HTML  | Bajo    | 1 hr     | DOMPurify (si usas rich text) |
| Security headers   | Bajo    | 30 min   | next.config headers           |

---

## 📖 Recursos

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/security)
- [Prisma Security](https://www.prisma.io/docs/guides/security)
- [NextAuth.js](https://next-auth.js.org/)
- [Upstash Rate Limiting](https://upstash.com/docs/redis/features/ratelimiting)

---

**Nota Final:**

La seguridad es un **proceso continuo**, no un estado binario. Prioriza según tu contexto:

- ✅ **MVP privado:** Seguridad básica suficiente
- ⚠️ **Beta con usuarios:** Rate limiting + validaciones
- 🔒 **Producción pública:** Auth + rate limiting + monitoring
- 🏢 **SaaS multi-tenant:** Todo lo anterior + auditoría + compliance
