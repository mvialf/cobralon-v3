# Authentication Setup Guide

Guía completa para implementar autenticación en tu proyecto basado en este template.

## 📋 Por Qué NO Incluimos Auth por Defecto

Este template **NO incluye autenticación preconfigurada** porque:

- ✅ Cada proyecto tiene requisitos diferentes (OAuth, email/password, magic links, etc.)
- ✅ Evitamos vendor lock-in innecesario
- ✅ Template permanece ligero y flexible
- ✅ Usuarios eligen la solución que mejor se adapte a su caso de uso

Esta guía te ayuda a implementar auth rápidamente con **3 opciones principales**.

---

## 🎯 Quick Comparison

| Feature                  | Stack Auth                      | NextAuth.js (v5)        | Clerk                       |
| ------------------------ | ------------------------------- | ----------------------- | --------------------------- |
| **Setup Time**           | 🚀 15-30 min                    | ⏱️ 2-3 horas            | 🚀 10-15 min                |
| **UI Components**        | ✅ Sí (`<SignIn />`, etc.)      | ❌ No (debes crearlos)  | ✅ Sí (completos)           |
| **Neon Integration**     | ✅ Nativa (MCP)                 | ⚠️ Manual (Prisma)      | ❌ No                       |
| **Database Tables**      | 1 tabla (sincronizada)          | 4 tablas obligatorias   | 0 (Clerk maneja)            |
| **Customización**        | ✅✅ Alta                        | ✅✅✅ Total              | ✅ Media                    |
| **Vendor Lock-in**       | ⚠️ Moderado                     | ✅ Ninguno              | ⚠️⚠️ Alto                   |
| **Madurez**              | ⚠️ ~2 años                      | ✅ 8+ años              | ✅ 5+ años                  |
| **Cost**                 | ✅ Gratis (generoso)            | ✅ 100% gratis          | ⚠️ Freemium ($25/mes base) |
| **OAuth Providers**      | 10+ (extensible)                | 20+ oficiales           | 20+ oficiales               |
| **Email/Password**       | ✅ Built-in                     | ✅ Manual               | ✅ Built-in                 |
| **Magic Links**          | ✅ Sí (Stack maneja emails)     | ✅ Sí (requiere SMTP)   | ✅ Sí                       |
| **2FA/MFA**              | ✅ Built-in                     | ⚠️ Manual               | ✅ Built-in                 |
| **Admin Dashboard**      | ✅ Sí (Stack console)           | ❌ No                   | ✅ Sí (completo)            |
| **Session Management**   | JWT + DB sync                   | JWT o Database          | Clerk maneja                |
| **Best For**             | Neon users, rapid development   | Full control, opensource| Speed, enterprise features  |

---

## 🥇 Opción A: Stack Auth (Recomendado)

### ¿Cuándo Elegir Stack Auth?

✅ **Elige Stack Auth si:**

- Ya usas **Neon** como database (integración nativa)
- Priorizas **velocidad de desarrollo** (días → minutos)
- Quieres componentes UI **pre-built** profesionales
- Necesitas **admin dashboard** para gestionar usuarios
- Quieres **2FA/MFA** sin implementarlo tú mismo

❌ **NO elijas Stack Auth si:**

- Necesitas customización extrema de UI (NextAuth es mejor)
- Prefieres evitar cualquier dependencia externa (NextAuth es mejor)
- Tu proyecto requiere auth muy específico no cubierto

### Setup en 4 Pasos

#### **Paso 1: Instalar Stack Auth**

```bash
npx @stackframe/init-stack . --no-browser
```

Este comando automáticamente:

- ✅ Agrega `@stackframe/stack` a `package.json`
- ✅ Crea `stack.ts` para configurar `StackServerApp`
- ✅ Envuelve root layout con `StackProvider` y `StackTheme`
- ✅ Crea `app/loading.tsx` (Suspense boundary)
- ✅ Crea `app/handler/[...stack]/page.tsx` (rutas de auth)

#### **Paso 2: Provisionar Neon Auth (Si Tienes Neon)**

Si ya configuraste Neon siguiendo [database-setup.md](database-setup.md):

**Opción A: Con Neon MCP (Automático)**

Si configuraste Neon MCP (ver [CLAUDE.md](../../../CLAUDE.md#configurar-neon-mcp-opcional)):

```
Usuario: "Claude, provisiona Neon Auth para mi proyecto"

Claude ejecuta automáticamente:
✅ Crea integración Stack Auth ↔ Neon
✅ Genera credentials (STACK_PROJECT_ID, etc.)
✅ Actualiza .env.local
✅ Configura tabla neon_auth.users (sincronizada)
```

**Opción B: Manual**

1. Visita [Neon Console](https://console.neon.tech)
2. Selecciona tu proyecto
3. Ve a "Integrations" → "Stack Auth"
4. Click "Enable Integration"
5. Copia las credenciales generadas

#### **Paso 3: Configurar Variables de Entorno**

Agrega a `.env.local`:

```bash
# Stack Auth Credentials (obtenidas en Paso 2)
NEXT_PUBLIC_STACK_PROJECT_ID="..."
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY="..."
STACK_SECRET_SERVER_KEY="..."

# Database (ya configurado si seguiste database-setup.md)
DATABASE_URL="..."
DIRECT_URL="..."
```

⚠️ **Importante:**
- Variables `NEXT_PUBLIC_*` son visibles en el cliente
- `STACK_SECRET_SERVER_KEY` es privada (solo servidor)

#### **Paso 4: Crear Página de Login**

```tsx
// app/login/page.tsx
import { SignIn } from '@stackframe/stack'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md">
        <SignIn />
      </div>
    </div>
  )
}
```

**Listo!** Ahora tienes:

- `/login` - Página de login con UI completa
- `/signup` - Página de registro
- `/handler/*` - Rutas automáticas de auth

### Uso en tu App

#### **Client Components:**

```tsx
"use client"
import { useUser } from "@stackframe/stack"

export function UserButton() {
  const user = useUser()

  if (!user) {
    return <a href="/login">Login</a>
  }

  return (
    <div>
      <p>Hola, {user.displayName}</p>
      <button onClick={() => user.signOut()}>Logout</button>
    </div>
  )
}
```

#### **Server Components:**

```tsx
import { stackServerApp } from "@/stack"

export default async function DashboardPage() {
  const user = await stackServerApp.getUser()

  if (!user) {
    redirect("/login")
  }

  return <div>Hola, {user.displayName}</div>
}
```

#### **Proteger Rutas (Middleware):**

```tsx
// middleware.ts
import { stackServerApp } from "@/stack"
import { NextResponse } from "next/server"

export async function middleware(request: NextRequest) {
  const user = await stackServerApp.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/dashboard/:path*',
}
```

### Componentes Disponibles

```tsx
import {
  SignIn,           // Login form completo
  SignUp,           // Signup form completo
  UserButton,       // Avatar + dropdown menu
  OAuthButtonGroup, // Botones OAuth (Google, GitHub, etc.)
  MagicLinkSignIn,  // Login sin password
  CredentialSignIn  // Email + password
} from "@stackframe/stack"
```

### Database Schema (Automático)

Stack Auth crea automáticamente:

```sql
-- Schema: neon_auth (creado automáticamente)
CREATE TABLE neon_auth.users (
  id UUID PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMP,
  -- Sincronizado con Stack Auth backend
)
```

**Nota:** Esta tabla es **read-only** desde tu app. Stack Auth la mantiene sincronizada.

### Referencias

- [Stack Auth Documentation](https://docs.stack-auth.com/)
- [Neon + Stack Auth Guide](https://neon.tech/docs/guides/stack-auth)
- [Stack Auth Examples](https://github.com/stack-auth/stack/tree/main/examples)

---

## 🔧 Opción B: NextAuth.js (v5 / Auth.js)

### ¿Cuándo Elegir NextAuth?

✅ **Elige NextAuth si:**

- Quieres **control total** sobre UI/UX de auth
- Prefieres **opensource puro** sin dependencias externas
- Necesitas **customización extrema** de flujos de auth
- Ya tienes experiencia con autenticación
- Tu app requiere lógica de auth muy específica

❌ **NO elijas NextAuth si:**

- Priorizas velocidad sobre control
- No quieres diseñar UI de login/signup
- Prefieres SaaS sobre self-hosted

### Setup en 7 Pasos

#### **Paso 1: Instalar NextAuth**

```bash
npm install next-auth@beta @auth/prisma-adapter
```

**Nota:** Usamos `@beta` para NextAuth v5 (compatible con Next.js 15).

#### **Paso 2: Actualizar Prisma Schema**

Agrega estos modelos a `prisma/schema.prisma`:

```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  password      String?   // Para credentials provider
  accounts      Account[]
  sessions      Session[]

  // Tus campos custom aquí
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

Aplica los cambios:

```bash
npm run db:push
```

#### **Paso 3: Crear Configuración de Auth**

```typescript
// auth.config.ts
import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"

export default {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const user = await db.user.findUnique({
          where: { email: credentials.email as string }
        })

        if (user && bcrypt.compareSync(credentials.password as string, user.password!)) {
          return user
        }

        return null
      }
    })
  ],
} satisfies NextAuthConfig
```

```typescript
// auth.ts
import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { db } from "@/lib/db"
import authConfig from "./auth.config"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  ...authConfig,
})
```

#### **Paso 4: Crear API Route**

```typescript
// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth"

export const { GET, POST } = handlers
```

#### **Paso 5: Configurar Variables de Entorno**

```bash
# .env.local

# NextAuth
NEXTAUTH_SECRET="genera-un-secret-aleatorio-aqui"
NEXTAUTH_URL="http://localhost:3000"

# OAuth Providers (opcional)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GITHUB_CLIENT_ID="..."
GITHUB_CLIENT_SECRET="..."
```

Generar secret:

```bash
openssl rand -base64 32
```

#### **Paso 6: Crear UI de Login**

```tsx
// app/login/page.tsx
"use client"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Iniciar Sesión</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* OAuth Buttons */}
          <Button
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            variant="outline"
            className="w-full"
          >
            Continuar con Google
          </Button>

          <Button
            onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
            variant="outline"
            className="w-full"
          >
            Continuar con GitHub
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                O con email
              </span>
            </div>
          </div>

          {/* Credentials Form */}
          <form action={async (formData) => {
            "use server"
            await signIn("credentials", formData)
          }}>
            <div className="space-y-4">
              <Input
                name="email"
                type="email"
                placeholder="email@ejemplo.com"
                required
              />
              <Input
                name="password"
                type="password"
                placeholder="Contraseña"
                required
              />
              <Button type="submit" className="w-full">
                Iniciar Sesión
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

#### **Paso 7: Usar en tu App**

```tsx
// Client Component
"use client"
import { useSession, signOut } from "next-auth/react"

export function UserButton() {
  const { data: session } = useSession()

  if (!session) return <a href="/login">Login</a>

  return (
    <div>
      <p>Hola, {session.user.name}</p>
      <button onClick={() => signOut()}>Logout</button>
    </div>
  )
}
```

```tsx
// Server Component
import { auth } from "@/auth"

export default async function DashboardPage() {
  const session = await auth()

  if (!session) redirect("/login")

  return <div>Hola, {session.user.name}</div>
}
```

### Proteger Rutas (Middleware)

```typescript
// middleware.ts
export { auth as middleware } from "@/auth"

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*"],
}
```

### Dependencias Adicionales

```bash
npm install bcryptjs
npm install -D @types/bcryptjs
```

### Referencias

- [NextAuth.js v5 Documentation](https://authjs.dev/)
- [NextAuth.js Examples](https://github.com/nextauthjs/next-auth/tree/main/apps/examples)
- [Prisma Adapter](https://authjs.dev/reference/adapter/prisma)

---

## ⚡ Opción C: Clerk

### ¿Cuándo Elegir Clerk?

✅ **Elige Clerk si:**

- Priorizas **velocidad máxima** de setup (10 min)
- Quieres **UI completamente pre-built** y customizable
- Necesitas **features enterprise** out-of-the-box
- Presupuesto permite ~$25/mes después de free tier

❌ **NO elijas Clerk si:**

- Quieres evitar vendor lock-in
- Presupuesto muy ajustado
- Prefieres self-hosted

### Setup en 3 Pasos

#### **Paso 1: Crear Cuenta en Clerk**

1. Visita [https://clerk.com](https://clerk.com)
2. Crea una cuenta gratuita
3. Crea una nueva aplicación
4. Copia tus API keys

#### **Paso 2: Instalar Clerk**

```bash
npm install @clerk/nextjs
```

#### **Paso 3: Configurar**

```bash
# .env.local
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
```

```tsx
// app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs'

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="es">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
```

```tsx
// app/login/page.tsx
import { SignIn } from "@clerk/nextjs"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn />
    </div>
  )
}
```

**Listo!** Clerk maneja todo automáticamente.

### Referencias

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk + Next.js Guide](https://clerk.com/docs/quickstarts/nextjs)

---

## 📊 Resumen: ¿Cuál Elegir?

| Escenario                                      | Recomendación |
| ---------------------------------------------- | ------------- |
| Ya usas Neon, quieres rapidez                  | Stack Auth    |
| Necesitas control total, opensource            | NextAuth      |
| Presupuesto OK, quieres máxima velocidad       | Clerk         |
| Proyecto complejo con auth custom              | NextAuth      |
| MVP rápido con usuarios limitados              | Stack Auth    |
| Enterprise con presupuesto                     | Clerk         |
| Aprender autenticación a fondo                 | NextAuth      |

---

## 🎯 Siguientes Pasos

Después de implementar auth:

1. ✅ **Proteger rutas** con middleware
2. 🔐 **Agregar roles/permissions** según necesidad
3. 📧 **Configurar emails** (welcome, password reset, etc.)
4. 🔑 **Implementar 2FA/MFA** si es crítico
5. 📊 **Monitorear login attempts** y seguridad

---

## 📖 Recursos Adicionales

- [Decisión Arquitectural: ADR-009](../decisions/009-authentication-options.md)
- [Database Setup Guide](database-setup.md) (prerequisito para NextAuth)
- [OWASP Auth Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

---

**¿Problemas?** Abre un issue en el repositorio del template.
