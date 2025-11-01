# Arquitectura del Sistema de Configuración Regional

Arquitectura detallada del Context API y flujo de datos de configuración regional.

---

## Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ROOT LAYOUT (app/layout.tsx)                 │
│                                                                     │
│  <html>                                                             │
│    <body>                                                           │
│      <ThemeProvider>                                                │
│        <ConfigurationProvider>  ← Context Provider aquí            │
│          {children}                                                 │
│        </ConfigurationProvider>                                     │
│      </ThemeProvider>                                               │
│    </body>                                                          │
│  </html>                                                            │
└─────────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────────┐
│              ConfigurationProvider (Client Component)                │
│                                                                     │
│  Estado interno:                                                    │
│  const [pais, setPais] = useState<string>("CL")                     │
│  const [region, setRegion] = useState<string>("Metropolitana (RM)")│
│  const [ciudad, setCiudad] = useState<string>("Santiago")          │
│  const [comuna, setComuna] = useState<string>("")                   │
│                                                                     │
│  Valores derivados:                                                 │
│  const currency = PAISES_CONFIG[pais]?.currency || "CLP"           │
│  const locale = PAISES_CONFIG[pais]?.locale || "es-CL"             │
│                                                                     │
│  Persistencia:                                                      │
│  useEffect(() => {                                                  │
│    localStorage.setItem('configuration', JSON.stringify({          │
│      pais, region, ciudad, comuna                                  │
│    }))                                                              │
│  }, [pais, region, ciudad, comuna])                                │
│                                                                     │
│  Hydration:                                                         │
│  useEffect(() => {                                                  │
│    const stored = localStorage.getItem('configuration')            │
│    if (stored) {                                                    │
│      const config = JSON.parse(stored)                             │
│      setPais(config.pais || "CL")                                  │
│      // ...                                                         │
│    }                                                                │
│  }, [])                                                             │
└─────────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    COMPONENTES CONSUMIDORES                          │
│                                                                     │
│  1. Client Components (directo)                                    │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ 'use client'                                                │   │
│  │ const { currency } = useConfiguration()                     │   │
│  │ return <CurrencyInput currency={currency} />                │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  2. Server Components (via props)                                  │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ // Server Component                                         │   │
│  │ export default async function Page() {                      │   │
│  │   const defaultCurrency = "CLP"  ← Hardcoded en server     │   │
│  │   return <ClientComponent currency={defaultCurrency} />     │   │
│  │ }                                                            │   │
│  └────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Flujo de Datos

### 1. Inicialización (Client-Side Hydration)

```typescript
// ConfigurationProvider se monta en el cliente
useEffect(() => {
  // Leer localStorage
  const stored = localStorage.getItem('configuration')

  if (stored) {
    const config = JSON.parse(stored)

    // Hidratar estado
    setPais(config.pais || 'CL')
    setRegion(config.region || 'Metropolitana (RM)')
    setCiudad(config.ciudad || 'Santiago')
    setComuna(config.comuna || '')
  }
}, [])
```

**Timeline:**

```
1. SSR/SSG: Render inicial con defaults ("CL", "Metropolitana", ...)
2. Client mount: useEffect se ejecuta
3. Read localStorage: Obtiene config guardada
4. Hydrate state: setPais(), setRegion(), etc.
5. Re-render: UI actualizada con config persistida
```

---

### 2. Derivación Automática

```typescript
// En ConfigurationProvider
const currency = PAISES_CONFIG[pais]?.currency || 'CLP'
const locale = PAISES_CONFIG[pais]?.locale || 'es-CL'
```

**Tabla de derivación:**

| pais | currency | locale |
| ---- | -------- | ------ |
| CL   | CLP      | es-CL  |
| AR   | ARS      | es-AR  |
| MX   | MXN      | es-MX  |

**Ventaja:** Componentes no necesitan saber el mapping, solo usan `currency` y `locale`.

---

### 3. Actualización de Estado

```typescript
// Usuario cambia país en Settings
const { setPais } = useConfiguration()

<Select value={pais} onValueChange={setPais}>
  <SelectItem value="CL">Chile</SelectItem>
  <SelectItem value="AR">Argentina</SelectItem>
</Select>
```

**Cascada de efectos:**

```
1. User selecciona "AR" en dropdown
2. setPais("AR") se ejecuta
3. State change: pais = "AR"
4. Derivación: currency = "ARS", locale = "es-AR"
5. useEffect de persistencia: localStorage.setItem(...)
6. Todos los componentes consumidores re-renderizan:
   - CurrencyInput muestra símbolo "$" (ARS)
   - PhoneInput cambia defaultCountry a "AR"
   - AddressFields muestra provincias argentinas
```

---

## Implementación del Provider

### ConfigurationProvider

```typescript
// lib/contexts/configuration-context.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { PAISES_CONFIG } from '@/lib/constants/paises-config'

interface ConfigurationContextType {
  // Estado
  pais: string
  region: string
  ciudad: string
  comuna: string

  // Derivados
  currency: string
  locale: string

  // Setters
  setPais: (value: string) => void
  setRegion: (value: string) => void
  setCiudad: (value: string) => void
  setComuna: (value: string) => void
  resetConfiguration: () => void
}

const ConfigurationContext = createContext<ConfigurationContextType | undefined>(undefined)

export function ConfigurationProvider({ children }: { children: ReactNode }) {
  // Estado
  const [pais, setPais] = useState<string>("CL")
  const [region, setRegion] = useState<string>("Metropolitana (RM)")
  const [ciudad, setCiudad] = useState<string>("Santiago")
  const [comuna, setComuna] = useState<string>("")

  // Derivar currency y locale del país
  const currency = PAISES_CONFIG[pais]?.currency || "CLP"
  const locale = PAISES_CONFIG[pais]?.locale || "es-CL"

  // Hydrate desde localStorage (client-side only)
  useEffect(() => {
    const stored = localStorage.getItem('configuration')
    if (stored) {
      try {
        const config = JSON.parse(stored)
        setPais(config.pais || "CL")
        setRegion(config.region || "Metropolitana (RM)")
        setCiudad(config.ciudad || "Santiago")
        setComuna(config.comuna || "")
      } catch (error) {
        console.error('Failed to parse configuration from localStorage:', error)
      }
    }
  }, [])

  // Persistir cambios en localStorage
  useEffect(() => {
    const config = { pais, region, ciudad, comuna }
    localStorage.setItem('configuration', JSON.stringify(config))
  }, [pais, region, ciudad, comuna])

  const resetConfiguration = () => {
    setPais("CL")
    setRegion("Metropolitana (RM)")
    setCiudad("Santiago")
    setComuna("")
  }

  return (
    <ConfigurationContext.Provider
      value={{
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
        resetConfiguration
      }}
    >
      {children}
    </ConfigurationContext.Provider>
  )
}

export function useConfiguration() {
  const context = useContext(ConfigurationContext)

  if (!context) {
    throw new Error('useConfiguration must be used within ConfigurationProvider')
  }

  return context
}
```

---

## Persistencia en localStorage

### Estructura del Storage

```json
// localStorage.getItem('configuration')
{
  "pais": "CL",
  "region": "Metropolitana (RM)",
  "ciudad": "Santiago",
  "comuna": "Providencia"
}
```

**Nota:** `currency` y `locale` NO se persisten (se derivan del `pais`).

---

### Ventajas de Usar localStorage

1. ✅ **Persistencia entre sesiones:** Usuario mantiene config al cerrar/abrir browser
2. ✅ **Sin backend:** No requiere DB ni API calls
3. ✅ **Inmediato:** Lectura/escritura síncrona
4. ✅ **Por dominio:** Configuración aislada por sitio

---

### Desventajas

1. ⚠️ **Client-side only:** No disponible en SSR
2. ⚠️ **Por browser:** Cambiar de browser pierde config
3. ⚠️ **Límite de 5-10MB:** Más que suficiente para este caso

**Mitigación de SSR:**

```typescript
// Evitar error en server
useEffect(() => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('configuration')
    // ...
  }
}, [])
```

---

## Master Data: PAISES_CONFIG

### Estructura Completa

```typescript
// lib/constants/paises-config.ts
export const PAISES_CONFIG = {
  CL: {
    name: "Chile",
    code: "CL",
    currency: "CLP",
    currencySymbol: "$",
    locale: "es-CL",
    regiones: [
      {
        name: "Metropolitana (RM)",
        code: "RM",
        ciudades: ["Santiago"],
        comunas: [
          "Providencia",
          "Las Condes",
          "Vitacura",
          "Lo Barnechea",
          "Ñuñoa",
          // ... 48 comunas más
        ]
      },
      {
        name: "Valparaíso (V)",
        code: "V",
        ciudades: ["Valparaíso", "Viña del Mar"],
        comunas: ["Valparaíso", "Viña del Mar", "Con-Con", ...]
      },
      // ... 13 regiones más
    ]
  },
  AR: {
    name: "Argentina",
    code: "AR",
    currency: "ARS",
    currencySymbol: "$",
    locale: "es-AR",
    regiones: [
      {
        name: "Buenos Aires",
        code: "BA",
        ciudades: ["CABA", "La Plata"],
        comunas: []  // Argentina usa "barrios"
      },
      // ... 23 provincias más
    ]
  },
  MX: {
    name: "México",
    code: "MX",
    currency: "MXN",
    currencySymbol: "$",
    locale: "es-MX",
    regiones: [
      {
        name: "Ciudad de México",
        code: "CDMX",
        ciudades: ["CDMX"],
        comunas: ["Benito Juárez", "Coyoacán", ...]
      },
      // ... 31 estados más
    ]
  }
}
```

---

## Consumo en Componentes

### Client Component (Directo)

```typescript
'use client'
import { useConfiguration } from '@/hooks/use-configuration'

export function CurrencyInput({ amount, onChange }: Props) {
  const { currency } = useConfiguration()

  return (
    <NumericFormat
      value={amount}
      onValueChange={onChange}
      prefix={getCurrencySymbol(currency) + " "}
      // ...
    />
  )
}
```

---

### Server Component (Props)

```typescript
// app/projects/page.tsx (Server Component)
import { ProjectsTable } from '@/components/tables/projects-table'

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany()

  // En server, usar default
  const defaultCurrency = "CLP"

  return (
    <ProjectsTable
      projects={projects}
      defaultCurrency={defaultCurrency}
    />
  )
}
```

```typescript
// components/tables/projects-table.tsx (Client Component)
'use client'
import { useConfiguration } from '@/hooks/use-configuration'

export function ProjectsTable({ projects, defaultCurrency }: Props) {
  const { currency: contextCurrency } = useConfiguration()

  // Prioridad: context > props > hardcoded
  const currency = contextCurrency || defaultCurrency || "CLP"

  return <DataTable columns={columns} data={projects} />
}
```

---

## Trade-offs

### ⚠️ Client-Side Only

Context API requiere client-side:

```typescript
// ❌ ERROR en Server Component
export default async function ServerPage() {
  const { currency } = useConfiguration() // Error: Context no disponible
}

// ✅ OK en Client Component
;('use client')
export function ClientPage() {
  const { currency } = useConfiguration() // OK
}
```

**Mitigación:** Pasar config como props desde Server Components.

---

### ⚠️ Hydration Mismatch

SSR/SSG render con defaults, cliente hydrata con localStorage:

```
1. SSR: Render "CL", "Metropolitana"
2. Client mount: Lee localStorage → "AR", "Buenos Aires"
3. Re-render: UI flash (CL → AR)
```

**Mitigación:**

```typescript
// Marcar como opcional hasta hydration
const [isHydrated, setIsHydrated] = useState(false)

useEffect(() => {
  // ... hydrate logic ...
  setIsHydrated(true)
}, [])

if (!isHydrated) {
  return <Skeleton />  // Evitar flash
}
```

---

## Escalabilidad Futura

### Multi-Tenant

Si necesitas configuración por organización:

```typescript
export function ConfigurationProvider({ orgId, children }) {
  const [config, setConfig] = useState(null)

  // Cargar config de DB (server)
  useEffect(() => {
    fetch(`/api/organizations/${orgId}/configuration`)
      .then((res) => res.json())
      .then(setConfig)
  }, [orgId])

  const pais = config?.pais || 'CL'
  // ...
}
```

---

### Multi-Idioma (i18n)

Context API es compatible con next-intl:

```typescript
import { ConfigurationProvider } from '@/lib/contexts/configuration-context'
import { NextIntlClientProvider } from 'next-intl'

<NextIntlClientProvider locale={locale} messages={messages}>
  <ConfigurationProvider>
    {children}
  </ConfigurationProvider>
</NextIntlClientProvider>
```

---

## Ver También

- [Hooks](hooks.md) - useConfiguration API
- [Components](components.md) - Componentes regionales
- [Regional Config Decision](../05-technical-decisions/regional-config.md) - Por qué Context API

**Última actualización:** 2025-10-30
