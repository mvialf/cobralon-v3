# Ejemplos de Uso de Configuración Regional

Casos de uso prácticos del sistema de configuración regional con Context API.

---

## 📚 Índice de Ejemplos

1. [Página de Settings](#1-página-de-settings)
2. [Form Dinámico Multi-País](#2-form-dinámico-multi-país)
3. [Dashboard con Métricas Regionales](#3-dashboard-con-métricas-regionales)
4. [Custom Locale Formatting](#4-custom-locale-formatting)
5. [Validación Regional Condicional](#5-validación-regional-condicional)
6. [Multi-Tenancy Futuro](#6-multi-tenancy-futuro)

---

## 1. Página de Settings

Página de configuración donde el usuario puede cambiar país, región, ciudad y comuna.

### Implementación

```typescript
// app/settings/regional/page.tsx
'use client'

import { useConfiguration } from '@/hooks/use-configuration'
import { PAISES_CONFIG } from '@/lib/constants/paises-config'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export default function RegionalSettingsPage() {
  const {
    pais,
    region,
    ciudad,
    comuna,
    currency,
    locale,
    setPais,
    setRegion,
    setCiudad,
    setComuna,
    resetConfiguration,
  } = useConfiguration()

  const paisData = PAISES_CONFIG[pais]
  const regionData = paisData?.regiones.find((r) => r.name === region)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuración Regional</h1>
        <p className="text-muted-foreground">
          Configura tu ubicación para personalizar formatos y opciones
        </p>
      </div>

      {/* Card Principal */}
      <Card>
        <CardHeader>
          <CardTitle>Ubicación</CardTitle>
          <CardDescription>
            Selecciona tu país, región y comuna para adaptar la aplicación
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selector de País */}
          <div className="space-y-2">
            <Label htmlFor="pais">País</Label>
            <Select value={pais} onValueChange={setPais}>
              <SelectTrigger id="pais">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PAISES_CONFIG).map(([code, config]) => (
                  <SelectItem key={code} value={code}>
                    {config.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selector de Región */}
          <div className="space-y-2">
            <Label htmlFor="region">Región</Label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger id="region">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paisData?.regiones.map((r) => (
                  <SelectItem key={r.code} value={r.name}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selector de Ciudad */}
          <div className="space-y-2">
            <Label htmlFor="ciudad">Ciudad</Label>
            <Select value={ciudad} onValueChange={setCiudad}>
              <SelectTrigger id="ciudad">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {regionData?.ciudades.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selector de Comuna */}
          <div className="space-y-2">
            <Label htmlFor="comuna">Comuna</Label>
            <Select value={comuna} onValueChange={setComuna}>
              <SelectTrigger id="comuna">
                <SelectValue placeholder="Selecciona una comuna..." />
              </SelectTrigger>
              <SelectContent>
                {regionData?.comunas.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Divider */}
          <div className="border-t pt-4" />

          {/* Valores Derivados (Read-Only) */}
          <div className="space-y-2 rounded-lg bg-muted p-4">
            <h4 className="font-semibold text-sm">Valores Derivados</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Moneda:</span>{' '}
                <span className="font-mono font-medium">{currency}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Locale:</span>{' '}
                <span className="font-mono font-medium">{locale}</span>
              </div>
            </div>
          </div>

          {/* Botón Reset */}
          <Button
            variant="outline"
            onClick={resetConfiguration}
            className="w-full"
          >
            Restaurar Valores por Defecto
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Resultado:**
- Usuario cambia país → `currency` y `locale` se actualizan automáticamente
- Regiones/ciudades/comunas se filtran según país seleccionado
- Cambios persisten en localStorage

---

## 2. Form Dinámico Multi-País

Formulario que adapta campos según el país seleccionado.

### Implementación

```typescript
// components/forms/customers/customer-form.tsx
'use client'

import { useConfiguration } from '@/hooks/use-configuration'
import { CurrencyInput } from '@/components/ui/currency-input'
import { PhoneInput } from '@/components/ui/phone-input'
import { RutInput } from '@/components/ui/rut-input'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Form, FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form'

export function CustomerForm() {
  const { pais } = useConfiguration()

  const form = useForm({
    defaultValues: {
      name: '',
      document: '',
      phone: '',
      creditLimit: 0,
    },
  })

  return (
    <Form {...form}>
      <form className="space-y-4">
        {/* Nombre (común a todos los países) */}
        <FormField
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Documento (adapta según país) */}
        <FormField
          name="document"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {pais === 'CL' && 'RUT'}
                {pais === 'AR' && 'CUIT/CUIL'}
                {pais === 'MX' && 'RFC'}
              </FormLabel>
              <FormControl>
                {pais === 'CL' ? (
                  <RutInput
                    value={field.value}
                    onRutChange={field.onChange}
                    showValidationIcon
                  />
                ) : (
                  <Input
                    {...field}
                    placeholder={
                      pais === 'AR' ? '20-12345678-9' : 'RFC123456ABC'
                    }
                  />
                )}
              </FormControl>
            </FormItem>
          )}
        />

        {/* Teléfono (prefijo automático) */}
        <FormField
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Teléfono</FormLabel>
              <FormControl>
                <PhoneInput
                  value={field.value}
                  onChange={field.onChange}
                  showValidationIcon
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Límite de Crédito (moneda automática) */}
        <FormField
          name="creditLimit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Límite de Crédito</FormLabel>
              <FormControl>
                <CurrencyInput
                  value={field.value}
                  onChange={field.onChange}
                  min={0}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <Button type="submit">Guardar</Button>
      </form>
    </Form>
  )
}
```

**Comportamiento por País:**

| País | Documento      | Prefijo Teléfono | Moneda |
| ---- | -------------- | ---------------- | ------ |
| CL   | RutInput       | +56              | $ CLP  |
| AR   | Input (CUIT)   | +54              | $ ARS  |
| MX   | Input (RFC)    | +52              | $ MXN  |

---

## 3. Dashboard con Métricas Regionales

Dashboard que muestra métricas formateadas según configuración regional.

### Implementación

```typescript
// app/dashboard/page.tsx
'use client'

import { useConfiguration } from '@/hooks/use-configuration'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Metric {
  label: string
  value: number
  type: 'currency' | 'number'
}

export default function DashboardPage() {
  const { currency, locale } = useConfiguration()

  const metrics: Metric[] = [
    { label: 'Ingresos del Mes', value: 12500000, type: 'currency' },
    { label: 'Proyectos Activos', value: 42, type: 'number' },
    { label: 'Balance Pendiente', value: 3750000, type: 'currency' },
    { label: 'Clientes Nuevos', value: 18, type: 'number' },
  ]

  const formatValue = (metric: Metric) => {
    if (metric.type === 'currency') {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(metric.value)
    }

    return new Intl.NumberFormat(locale).format(metric.value)
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatValue(metric)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

**Resultado:**

| País | Ingresos del Mes      |
| ---- | --------------------- |
| CL   | `$ 12.500.000`        |
| AR   | `$ 12.500.000,00`     |
| MX   | `$ 12,500,000.00`     |
| US   | `$ 12,500,000.00`     |

---

## 4. Custom Locale Formatting

Helper functions para formateo consistente en toda la app.

### Implementación

```typescript
// lib/utils/regional-formatters.ts
import { useConfiguration } from '@/hooks/use-configuration'

/**
 * Hook para formatters regionales consistentes
 */
export function useRegionalFormatters() {
  const { currency, locale } = useConfiguration()

  return {
    /**
     * Formatear montos
     */
    formatCurrency: (amount: number) => {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount)
    },

    /**
     * Formatear números (sin moneda)
     */
    formatNumber: (value: number) => {
      return new Intl.NumberFormat(locale).format(value)
    },

    /**
     * Formatear fechas
     */
    formatDate: (date: Date, options?: Intl.DateTimeFormatOptions) => {
      return new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        ...options,
      }).format(date)
    },

    /**
     * Formatear porcentajes
     */
    formatPercent: (value: number) => {
      return new Intl.NumberFormat(locale, {
        style: 'percent',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(value / 100)
    },
  }
}
```

### Uso

```typescript
'use client'

import { useRegionalFormatters } from '@/lib/utils/regional-formatters'

export function ProjectSummary({ project }) {
  const { formatCurrency, formatDate, formatPercent } = useRegionalFormatters()

  const progress = (project.paid / project.total) * 100

  return (
    <div>
      <p>Total: {formatCurrency(project.total)}</p>
      <p>Fecha: {formatDate(project.date)}</p>
      <p>Progreso: {formatPercent(progress)}</p>
    </div>
  )
}
```

---

## 5. Validación Regional Condicional

Schema de validación que adapta reglas según país.

### Implementación

```typescript
// lib/validations/customer-validations.ts
import { z } from 'zod'
import { validateRut } from './rut-validations'

/**
 * Schema dinámico que adapta validaciones según país
 */
export function getCustomerSchema(pais: string) {
  const baseSchema = {
    name: z.string().min(1, 'Nombre es requerido'),
    phone: z.string().min(1, 'Teléfono es requerido'),
    email: z.string().email('Email inválido').optional().or(z.literal('')),
  }

  // Validación de documento según país
  const documentValidation = (() => {
    switch (pais) {
      case 'CL':
        return z
          .string()
          .min(1, 'RUT es requerido')
          .refine((val) => validateRut(val), {
            message: 'RUT inválido',
          })

      case 'AR':
        return z
          .string()
          .min(1, 'CUIT/CUIL es requerido')
          .regex(/^\d{2}-\d{8}-\d$/, 'Formato: 20-12345678-9')

      case 'MX':
        return z
          .string()
          .min(1, 'RFC es requerido')
          .regex(/^[A-Z]{4}\d{6}[A-Z0-9]{3}$/, 'RFC inválido')

      default:
        return z.string().min(1, 'Documento es requerido')
    }
  })()

  return z.object({
    ...baseSchema,
    document: documentValidation,
  })
}
```

### Uso en Form

```typescript
'use client'

import { useConfiguration } from '@/hooks/use-configuration'
import { getCustomerSchema } from '@/lib/validations/customer-validations'

export function CustomerForm() {
  const { pais } = useConfiguration()

  const schema = useMemo(() => getCustomerSchema(pais), [pais])

  const form = useForm({
    resolver: zodResolver(schema),
  })

  // ...
}
```

**Resultado:**
- Si `pais = "CL"` → Valida RUT con algoritmo Módulo 11
- Si `pais = "AR"` → Valida formato CUIT/CUIL
- Si `pais = "MX"` → Valida formato RFC

---

## 6. Multi-Tenancy Futuro

Extensión para soportar configuración por organización (no implementado actualmente).

### Arquitectura Futura

```typescript
// lib/contexts/configuration-context.tsx (FUTURO)
interface ConfigurationContextType {
  // Configuración del usuario
  userConfig: {
    pais: string
    region: string
    currency: string
    locale: string
  }

  // Configuración de la organización (override)
  orgConfig?: {
    pais: string
    currency: string
    locale: string
    timezone: string
  }

  // Configuración efectiva (org > user > default)
  effectiveConfig: {
    pais: string
    currency: string
    locale: string
  }
}
```

### Caso de Uso

**Escenario:** Empresa con operaciones en Chile y Argentina

```typescript
// Usuario trabaja en Chile, pero organización es argentina
const userConfig = {
  pais: 'CL',
  region: 'Metropolitana (RM)',
  currency: 'CLP',
  locale: 'es-CL',
}

const orgConfig = {
  pais: 'AR',
  currency: 'ARS',
  locale: 'es-AR',
  timezone: 'America/Buenos_Aires',
}

// Configuración efectiva (org override)
const effectiveConfig = {
  pais: 'AR', // ← Override de org
  currency: 'ARS', // ← Override de org
  locale: 'es-AR', // ← Override de org
}
```

**Implementación:**

1. Agregar modelo `Organization` en Prisma:
   ```prisma
   model Organization {
     id       String @id @default(uuid())
     name     String
     pais     String @default("CL")
     currency String @default("CLP")
     locale   String @default("es-CL")
     timezone String @default("America/Santiago")
   }
   ```

2. Fetch config de org al cargar app:
   ```typescript
   useEffect(() => {
     fetch(`/api/organizations/${orgId}/config`)
       .then((res) => res.json())
       .then(setOrgConfig)
   }, [orgId])
   ```

3. Merge configs con prioridad:
   ```typescript
   const effectiveConfig = {
     ...DEFAULT_CONFIG,
     ...userConfig,
     ...orgConfig, // ← Override final
   }
   ```

---

## Patrones Recomendados

### ✅ DO

```typescript
// 1. Usar hook para obtener configuración
const { currency, locale } = useConfiguration()

// 2. Permitir override por props
<CurrencyInput currency={customCurrency || currency} />

// 3. Derivar automáticamente cuando sea posible
const symbol = PAISES_CONFIG[pais].currencySymbol

// 4. Formatear consistentemente con Intl
const formatted = new Intl.NumberFormat(locale, {
  style: 'currency',
  currency,
}).format(amount)
```

### ❌ DON'T

```typescript
// 1. NO hardcodear valores regionales
const CURRENCY = 'CLP' // ❌ Mal

// 2. NO duplicar lógica de derivación
const locale = pais === 'CL' ? 'es-CL' : 'es-AR' // ❌ Mal

// 3. NO usar configuración en Server Components sin props
export default async function ServerPage() {
  const { currency } = useConfiguration() // ❌ Error: client-side only
}
```

---

## Testing

### Mock del Hook

```typescript
// __mocks__/use-configuration.ts
import { vi } from 'vitest'

export const useConfiguration = vi.fn(() => ({
  pais: 'CL',
  region: 'Metropolitana (RM)',
  ciudad: 'Santiago',
  comuna: 'Providencia',
  currency: 'CLP',
  locale: 'es-CL',
  setPais: vi.fn(),
  setRegion: vi.fn(),
  setCiudad: vi.fn(),
  setComuna: vi.fn(),
  resetConfiguration: vi.fn(),
}))
```

### Test de Componente Regional

```typescript
import { render, screen } from '@testing-library/react'
import { useConfiguration } from '@/hooks/use-configuration'
import { CurrencyInput } from '@/components/ui/currency-input'

vi.mock('@/hooks/use-configuration')

describe('CurrencyInput regional behavior', () => {
  it('debe formatear con CLP para Chile', () => {
    vi.mocked(useConfiguration).mockReturnValue({
      currency: 'CLP',
      locale: 'es-CL',
      // ... otros campos
    })

    render(<CurrencyInput value={1234567} onChange={vi.fn()} />)

    // CLP sin decimales
    expect(screen.getByDisplayValue('$ 1.234.567')).toBeInTheDocument()
  })

  it('debe formatear con ARS para Argentina', () => {
    vi.mocked(useConfiguration).mockReturnValue({
      currency: 'ARS',
      locale: 'es-AR',
    })

    render(<CurrencyInput value={1234567} onChange={vi.fn()} />)

    // ARS con decimales
    expect(screen.getByDisplayValue('$ 1.234.567,00')).toBeInTheDocument()
  })
})
```

---

## Ver También

- [Hooks](hooks.md) - useConfiguration API
- [Components](components.md) - Componentes regionales
- [Architecture](architecture.md) - Context API flow
- [Regional Config Decision](../05-technical-decisions/regional-config.md) - Por qué Context API

**Última actualización:** 2025-10-30
