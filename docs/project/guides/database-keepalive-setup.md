# Database Keep-Alive Setup (Neon Free Tier)

## Problema

Neon PostgreSQL en free tier suspende la base de datos después de **5 minutos de inactividad**. Esto causa:

- ❌ Tests E2E fallan con error `P1001: Can't reach database server`
- ❌ Usuarios experimentan cold starts (latencia de 1-3 segundos)
- ❌ Primera request después de inactividad es lenta

## Solución

Este proyecto incluye un sistema de **keep-alive automático** que hace ping a la base de datos cada 4 minutos para mantenerla activa mientras el usuario está usando la aplicación.

## Componentes del Sistema

### 1. Health Check Endpoint

**Ubicación:** `app/api/health/warmup/route.ts`

```typescript
GET /api/health/warmup
```

**Respuesta:**

```json
{
  "status": "ok",
  "message": "Database is active",
  "latency": "123ms",
  "coldStart": false,
  "isActive": true
}
```

**Cuándo devuelve coldStart: true:**

- Latencia > 1000ms (indica que la DB estaba suspendida)

### 2. Custom Hook: `useDatabaseKeepalive`

**Ubicación:** `hooks/use-database-keepalive.ts`

```typescript
useDatabaseKeepalive({
  enabled: true, // Activar keep-alive
  intervalMs: 4 * 60 * 1000, // 4 minutos (default)
  onSuccess: (data) => console.log('DB ping successful', data),
  onError: (error) => console.error('DB ping failed', error),
})
```

**Comportamiento:**

- Hace ping inicial inmediatamente
- Ping cada 4 minutos (configurable)
- Solo activo si `enabled: true`

### 3. Provider Component: `DatabaseKeepaliveProvider`

**Ubicación:** `components/providers/database-keepalive-provider.tsx`

```tsx
<DatabaseKeepaliveProvider autoEnable={false}>{children}</DatabaseKeepaliveProvider>
```

**Props:**

- `autoEnable?: boolean` - Si `true`, keep-alive se activa inmediatamente al montar. Si `false` (default), espera primera interacción del usuario.

**Comportamiento con `autoEnable: false` (recomendado):**

- Keep-alive NO se activa automáticamente
- Se activa en la primera interacción del usuario: `mousedown`, `keydown`, `scroll`, `touchstart`
- Esto evita pings innecesarios si el usuario abre la app pero no la usa

## Setup en tu Aplicación

### Opción A: Keep-Alive Global (Recomendado)

Agregar el provider en el **root layout** para proteger TODA la aplicación:

```tsx
// app/layout.tsx
import { DatabaseKeepaliveProvider } from '@/components/providers/database-keepalive-provider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <ThemeProvider>
          <DatabaseKeepaliveProvider autoEnable={false}>
            {children}
          </DatabaseKeepaliveProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
```

**Ventajas:**

- ✅ Protege toda la app
- ✅ Usuario nunca experimenta cold starts después de primera interacción
- ✅ Tests E2E no fallan por DB suspendida

**Desventajas:**

- ⚠️ Genera requests cada 4 minutos mientras usuario está en la app
- ⚠️ Si múltiples usuarios, puede consumir límite de requests de Neon (300K/mes en free tier)

### Opción B: Keep-Alive Selectivo

Activar solo en páginas específicas:

```tsx
// app/dashboard/layout.tsx
import { DatabaseKeepaliveProvider } from '@/components/providers/database-keepalive-provider'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DatabaseKeepaliveProvider autoEnable={false}>{children}</DatabaseKeepaliveProvider>
}
```

**Ventajas:**

- ✅ Menos requests (solo en páginas seleccionadas)
- ✅ Control granular

**Desventajas:**

- ⚠️ Páginas sin provider pueden experimentar cold starts
- ⚠️ Tests E2E pueden fallar si navegan a páginas sin provider

### Opción C: Solo Health Check Manual

No usar provider automático, solo hacer warmup manual cuando sea necesario:

```typescript
// En test suite o script
const response = await fetch('http://localhost:3000/api/health/warmup')
const data = await response.json()
console.log(data) // { status: 'ok', latency: '123ms' }
```

**Ventajas:**

- ✅ Control total
- ✅ Zero overhead en producción

**Desventajas:**

- ⚠️ Usuarios experimentan cold starts
- ⚠️ Requiere warmup manual antes de tests E2E

## Recomendación para Desarrollo

```tsx
// app/layout.tsx
<DatabaseKeepaliveProvider autoEnable={false}>{children}</DatabaseKeepaliveProvider>
```

**Por qué `autoEnable: false`:**

- Keep-alive se activa solo cuando usuario interactúa
- Si usuario abre la app pero no hace nada, no genera pings innecesarios
- Balanceo perfecto entre UX y consumo de recursos

## Recomendación para Producción

### Si tienes pocos usuarios (<100):

```tsx
<DatabaseKeepaliveProvider autoEnable={false}>{children}</DatabaseKeepaliveProvider>
```

### Si tienes muchos usuarios (>100):

❌ **NO uses keep-alive automático** en free tier de Neon

**Alternativas:**

1. **Upgrade a Neon paid tier** (auto-suspend configurable o desactivado)
2. **Migrar a otro proveedor** (Railway, Supabase, Vercel Postgres)
3. **Aceptar cold starts** (1-3s latencia) y solo hacer warmup manual para tests E2E

## Tests E2E

Para garantizar que la DB está activa antes de ejecutar tests, agregamos health check en `beforeAll`:

```typescript
// tests/e2e/customers.spec.ts
test.describe('Módulo de Clientes', () => {
  test.beforeAll(async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/health/warmup')
    expect(response.ok()).toBeTruthy()

    const data = await response.json()
    expect(data.status).toBe('ok')

    if (data.coldStart) {
      console.info(`⚠️  Database cold start detected (${data.latency})`)
    }
  })

  // ... tests
})
```

**Beneficio:**

- ✅ Tests NO fallan por DB suspendida
- ✅ Cold start ocurre ANTES del primer test (no durante)
- ✅ Logging claro si hay cold start

## Monitoreo

### Verificar si Keep-Alive está activo

Abrir DevTools console y buscar logs:

```
Database keepalive ping successful: { latency: "123ms", coldStart: false }
```

### Verificar cold starts

```typescript
useDatabaseKeepalive({
  enabled: true,
  onSuccess: (data) => {
    if (data.coldStart) {
      console.warn('Database cold start!', data.latency)
    }
  },
})
```

## Costos y Límites (Neon Free Tier)

- **Requests:** 300K/mes
- **Ping cada 4 min:** ~10K requests/mes por usuario activo 8h/día
- **Límite de usuarios:** ~30 usuarios concurrentes máximo

**Recomendación:** Si superas 20 usuarios activos simultáneos, considera upgrade a paid tier.

## Troubleshooting

### Tests E2E fallan con P1001

**Solución:** Agregar `test.beforeAll()` con health check (ver arriba)

### Keep-alive no se activa

**Debug:**

1. Verificar que `DatabaseKeepaliveProvider` está en el tree de componentes
2. Verificar que `enabled: true` o `autoEnable: true`
3. Buscar logs de error en console

### DB sigue suspendiéndose

**Posibles causas:**

1. Keep-alive no está activado (`autoEnable: false` y usuario no interactuó)
2. Error en endpoint `/api/health/warmup`
3. Interval demasiado largo (>5 minutos)

**Solución:** Cambiar a `autoEnable: true` temporalmente para debugging

---

**Referencias:**

- [useDatabaseKeepalive Hook](../../../hooks/use-database-keepalive.ts)
- [DatabaseKeepaliveProvider Component](../../../components/providers/database-keepalive-provider.tsx)
- [Health Warmup Endpoint](../../../app/api/health/warmup/route.ts)
- [Neon Docs: Auto-suspend](https://neon.tech/docs/introduction/auto-suspend)
