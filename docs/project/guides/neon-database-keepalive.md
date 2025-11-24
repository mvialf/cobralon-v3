# Neon Database Keepalive - Prevenir Suspensión por Inactividad

Guía completa para mantener la base de datos Neon activa y evitar cold starts.

## 📋 Problema

Neon **suspende automáticamente** la base de datos después de **5 minutos** de inactividad en el plan gratuito. Esto causa:

- **Cold starts**: 500ms - 3 segundos de latencia
- **Timeouts**: Prisma puede fallar con error `P1001: Can't reach database server`
- **UX degradada**: Primera request después de inactividad es muy lenta

## ✅ Soluciones Implementadas

### 1. Timeout Aumentado en Connection String (✅ Implementado)

**Ubicación**: `.env.local`

```bash
# Pooled connection con timeouts aumentados
DATABASE_URL="...?sslmode=require&connect_timeout=15&pool_timeout=20"

# Direct connection con timeout mayor
DIRECT_URL="...?sslmode=require&connect_timeout=30"
```

**Parámetros**:

- `connect_timeout=15`: Espera 15s para conectar (default: 5s)
- `pool_timeout=20`: Connection pool timeout de Prisma (default: 10s)

**Cuándo usar**: Siempre. Es la solución base que previene timeouts.

---

### 2. Database Warmup Utilities (✅ Implementado)

**Ubicación**: `lib/db/warmup.ts`

#### `warmupDatabase()`

Despierta la base de datos con un query ligero.

```typescript
import { warmupDatabase } from '@/lib/db/warmup'

// En API route o Server Component
const isActive = await warmupDatabase()
if (!isActive) {
  console.error('Database is down')
}
```

**Uso recomendado**:

- Llamar al iniciar sesión del usuario
- Health checks
- Antes de operaciones críticas

#### `isDatabaseActive()`

Verifica si la base de datos responde rápido.

```typescript
import { isDatabaseActive } from '@/lib/db/warmup'

const isActive = await isDatabaseActive(2000) // 2s timeout
console.log(isActive ? 'DB activa' : 'DB suspendida')
```

**Uso recomendado**:

- Status indicators en UI
- Monitoreo de salud

#### `keepDatabaseAlive()`

Mantiene la base de datos activa con pings periódicos.

```typescript
import { keepDatabaseAlive } from '@/lib/db/warmup'

// Iniciar keepalive (pings cada 4 minutos)
const cleanup = keepDatabaseAlive()

// Detener cuando termine la sesión
cleanup()
```

**⚠️ Advertencia**: Solo usar en server-side (Node.js), NO en client (browser).

---

### 3. API Route de Health Check (✅ Implementado)

**Ubicación**: `app/api/health/warmup/route.ts`

**Endpoint**: `GET /api/health/warmup`

```bash
curl http://localhost:3000/api/health/warmup
```

**Response**:

```json
{
  "status": "ok",
  "message": "Database is active",
  "latency": "1234ms",
  "coldStart": true,
  "isActive": true,
  "timestamp": "2025-01-20T10:30:00.000Z"
}
```

**Uso recomendado**:

- Monitoreo externo (uptime monitoring)
- Warmup manual desde frontend
- Debugging de latencia

---

### 4. React Hook: `useDatabaseKeepalive` (✅ Implementado)

**Ubicación**: `hooks/use-database-keepalive.ts`

Mantiene la base de datos activa durante sesiones de usuario en el cliente.

```typescript
'use client'
import { useDatabaseKeepalive } from '@/hooks/use-database-keepalive'

function Dashboard() {
  useDatabaseKeepalive({
    enabled: true, // Habilitar keepalive
    intervalMs: 4 * 60 * 1000, // 4 minutos
    onSuccess: (data) => {
      console.log('Database ping successful:', data.latency)
    },
    onError: (error) => {
      console.error('Database ping failed:', error)
    },
  })

  return <div>Dashboard activo</div>
}
```

**Características**:

- Hace ping a `/api/health/warmup` cada 4 minutos
- Funciona solo en client components
- Cleanup automático al desmontar

**Uso recomendado**:

- Dashboards con sesiones largas
- Admin panels
- Apps SaaS con usuarios activos

---

### 5. Provider Global: `DatabaseKeepaliveProvider` (✅ Implementado)

**Ubicación**: `components/providers/database-keepalive-provider.tsx`

Provider que envuelve tu app y mantiene la DB activa automáticamente.

#### Opción A: Auto-enable

```tsx
// app/layout.tsx
import { DatabaseKeepaliveProvider } from '@/components/providers/database-keepalive-provider'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <DatabaseKeepaliveProvider autoEnable={true}>{children}</DatabaseKeepaliveProvider>
      </body>
    </html>
  )
}
```

#### Opción B: On user activity (Recomendado)

```tsx
// app/layout.tsx
<DatabaseKeepaliveProvider autoEnable={false}>{children}</DatabaseKeepaliveProvider>
```

Se activa automáticamente cuando el usuario interactúa con la app (click, scroll, tecleo).

**Ventaja**: No consume recursos si el usuario está inactivo (idle tab).

**Uso recomendado**:

- Habilitar en layout principal si tienes usuarios activos frecuentemente
- Desactivar en producción si prefieres control manual
- Usar `autoEnable={false}` para activación lazy

---

## 🎯 Estrategias de Uso

### Estrategia 1: Keepalive Global (Apps con alta actividad)

```tsx
// app/layout.tsx
<DatabaseKeepaliveProvider autoEnable={true}>{children}</DatabaseKeepaliveProvider>
```

**Pros**:

- ✅ DB siempre activa durante sesiones de usuario
- ✅ Cero cold starts para usuarios activos
- ✅ Implementación simple (solo envolver layout)

**Cons**:

- ⚠️ Consume recursos incluso si usuario está idle
- ⚠️ Aumenta requests al server

**Recomendado para**: Admin panels, dashboards SaaS, apps internas con usuarios activos.

---

### Estrategia 2: Warmup en Login (Apps con acceso intermitente)

```tsx
// app/api/auth/login/route.ts (o similar)
import { warmupDatabase } from '@/lib/db/warmup'

export async function POST(request: Request) {
  // Despertar DB al iniciar sesión
  await warmupDatabase()

  // ... resto de lógica de login
}
```

**Pros**:

- ✅ DB despierta justo cuando el usuario entra
- ✅ No consume recursos cuando no hay usuarios
- ✅ Compatible con cualquier sistema de auth

**Cons**:

- ⚠️ Primera request después de login puede ser lenta
- ⚠️ Requiere implementación manual en login

**Recomendado para**: Apps con login intermitente, herramientas ocasionales.

---

### Estrategia 3: Warmup Selectivo (Apps híbridas)

```tsx
// Solo en páginas críticas
'use client'
function CriticalPage() {
  useDatabaseKeepalive({ enabled: true })
  return <div>...</div>
}

// No en páginas estáticas
function MarketingPage() {
  return <div>...</div> // Sin keepalive
}
```

**Pros**:

- ✅ Balance perfecto entre performance y recursos
- ✅ Control granular por página
- ✅ Optimiza consumo

**Cons**:

- ⚠️ Más complejo de mantener
- ⚠️ Requiere decisión por página

**Recomendado para**: Apps con mix de páginas (marketing + app), prototipos.

---

## 🧪 Testing

**Tests incluidos**: `lib/db/__tests__/warmup.test.ts`

```bash
npm test -- lib/db/__tests__/warmup.test.ts
```

**Cobertura**: 10 tests, todas las funciones críticas.

---

## 🔗 Referencias

### Documentación Oficial

- [Neon Scale to Zero](https://neon.com/docs/introduction/scale-to-zero) - Cómo funciona auto-suspend
- [Connection Latency and Timeouts](https://neon.com/docs/connect/connection-latency) - Manejar cold starts
- [Prisma with Neon](https://www.prisma.io/docs/orm/overview/databases/neon) - Configurar timeouts

### Decisiones de Implementación

- **Timeouts**: Basados en [Prisma Neon Discussion #23589](https://github.com/prisma/prisma/discussions/23589)
- **Keepalive Pattern**: Inspirado en [Neon Long-Running Apps Blog](https://neon.com/blog/using-neons-auto-suspend-with-long-running-applications)

---

## ⚠️ Consideraciones de Producción

### Plan Gratuito de Neon

- **Suspensión**: 5 minutos (NO configurable)
- **Cold start**: 500ms - 3s
- **Recomendación**: Usar keepalive solo en horas pico

### Planes Pagos de Neon

- **Suspensión**: Configurable hasta 7 días
- **Mejor solución**: Configurar delay largo en lugar de keepalive
- **Configuración**: Dashboard de Neon → Project Settings → Compute Settings

```bash
# Deshabilitar auto-suspend (solo planes pagos)
# Dashboard de Neon → Compute Settings
# Deseleccionar: "Suspend compute after a period of inactivity"
```

### Alternativa: Neon API

Para control programático (planes pagos):

```typescript
// Despertar compute manualmente vía Neon API
const response = await fetch(
  `https://console.neon.tech/api/v2/projects/${projectId}/endpoints/${endpointId}/start`,
  {
    method: 'POST',
    headers: { Authorization: `Bearer ${NEON_API_KEY}` },
  }
)
```

Ver: [Neon API - Start Endpoint](https://api-docs.neon.tech/reference/start-project-endpoint)

---

## 📝 Próximos Pasos

Si el problema persiste después de implementar estas soluciones:

1. **Verificar latencia**: Usar `/api/health/warmup` para medir cold starts
2. **Monitorear**: Agregar logging de timeouts en producción
3. **Considerar upgrade**: Planes pagos de Neon eliminan el problema
4. **Alternativa**: Migrar a [Supabase](https://supabase.com) o [PlanetScale](https://planetscale.com) (no tienen auto-suspend)

---

**Última actualización**: 2025-11-24
**Tests**: ✅ 10/10 passing
**Status**: Production-ready
