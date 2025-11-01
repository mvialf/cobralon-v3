# Decisión: Context API para Configuración Regional

Sistema de configuración regional usando React Context API (no i18n completo).

---

## Contexto

Necesitábamos manejar configuración regional para:

- **Ubicación:** País, región, ciudad, comuna
- **Formato de moneda:** CLP, USD, EUR, etc.
- **Locale:** es-CL, es-AR, es-MX, etc.
- **Componentes regionales:** PhoneInput (E.164), CurrencyInput, RutInput

**Requisitos:**

- Actualmente solo Chile (CLP)
- Preparación para expansión multi-país
- Persistencia en navegador
- Sin overhead innecesario

---

## Decisión

Implementar **Context API** con configuración regional simple:

```typescript
interface ConfigurationContextType {
  // Ubicación
  pais: string // "CL", "AR", "MX"
  region: string // "Metropolitana (RM)"
  ciudad: string // "Santiago"
  comuna: string // "Providencia"

  // Derivados automáticamente del país
  currency: string // "CLP", "ARS", "MXN"
  locale: string // "es-CL", "es-AR", "es-MX"

  // Setters
  setPais: (value: string) => void
  setRegion: (value: string) => void
  setCiudad: (value: string) => void
  setComuna: (value: string) => void
  resetConfiguration: () => void
}
```

---

## Alternativas Consideradas

### Alternativa 1: next-intl

```typescript
import { useTranslations } from 'next-intl'

function MyComponent() {
  const t = useTranslations('Projects')
  return <h1>{t('title')}</h1>
}
```

**Pros:**

- ✅ Sistema i18n completo
- ✅ Traducción de strings
- ✅ Formateo de fechas/números
- ✅ SSR/RSC compatible

**Contras:**

- ❌ **Overkill** para solo configuración regional
- ❌ **Requiere archivos de traducción** (actualmente solo español)
- ❌ **Setup complejo** (middleware, locale detection, routing)
- ❌ **No necesitamos traducciones** (mono-idioma)

**Por qué NO:** El proyecto solo necesita configuración regional, no multi-idioma.

---

### Alternativa 2: Hardcoded CLP

```typescript
// Hardcoded en todos lados
const CURRENCY = 'CLP'
const LOCALE = 'es-CL'
```

**Pros:**

- ✅ Más simple
- ✅ Sin abstracción

**Contras:**

- ❌ **No extensible** a otros países
- ❌ **Cambiar país = refactor masivo**
- ❌ **Sin preparación para futuro**

**Por qué NO:** Necesitamos preparación para expansión.

---

### Alternativa 3: react-i18next

```typescript
import { useTranslation } from 'react-i18next'

function MyComponent() {
  const { t, i18n } = useTranslation()
  return <h1>{t('welcome')}</h1>
}
```

**Pros:**

- ✅ Muy popular
- ✅ Muchas features

**Contras:**

- ❌ **Client-side only** (problemas con RSC)
- ❌ **Requiere traducción completa**
- ❌ **Bundle size significativo**

**Por qué NO:** Mismo problema que next-intl (overkill).

---

### Alternativa 4: Environment Variables

```bash
# .env.local
NEXT_PUBLIC_COUNTRY=CL
NEXT_PUBLIC_CURRENCY=CLP
NEXT_PUBLIC_LOCALE=es-CL
```

**Pros:**

- ✅ Simple
- ✅ Sin Context API

**Contras:**

- ❌ **No configurable por usuario** (requiere rebuild)
- ❌ **No persiste en browser**
- ❌ **Todos los usuarios mismo país** (no multi-tenant)

**Por qué NO:** Necesitamos configuración por usuario/organización.

---

## Razones

### 1. ✅ Preparación para Multi-País

Base sólida sin overhead:

```typescript
// Fácil agregar países en futuro
const PAISES_CONFIG = {
  CL: {
    name: "Chile",
    currency: "CLP",
    locale: "es-CL",
    regiones: [...]
  },
  AR: {
    name: "Argentina",
    currency: "ARS",
    locale: "es-AR",
    regiones: [...]
  },
  MX: {
    name: "México",
    currency: "MXN",
    locale: "es-MX",
    regiones: [...]
  }
}
```

---

### 2. ✅ Simplicidad

Solo Context API + localStorage:

```typescript
// lib/contexts/configuration-context.tsx
export function ConfigurationProvider({ children }) {
  const [pais, setPais] = useState("CL")
  const [region, setRegion] = useState("Metropolitana (RM)")

  // Derivar automáticamente
  const currency = PAISES_CONFIG[pais].currency
  const locale = PAISES_CONFIG[pais].locale

  // Persistir en localStorage
  useEffect(() => {
    localStorage.setItem('configuration', JSON.stringify({ pais, region, ... }))
  }, [pais, region, ...])

  return (
    <ConfigurationContext.Provider value={{ pais, region, currency, locale, ... }}>
      {children}
    </ConfigurationContext.Provider>
  )
}
```

---

### 3. ✅ Sin Librerías Externas

Menos dependencias:

```json
// package.json (NO requiere)
{
  // "next-intl": "^3.0.0",        ❌ No necesario
  // "react-i18next": "^13.0.0",   ❌ No necesario
  // "i18next": "^23.0.0"          ❌ No necesario
}
```

**Beneficio:**

- Menos bundle size
- Menos breaking changes
- Control total del código

---

### 4. ✅ Derivación Automática

Currency y locale se derivan del país:

```typescript
// Componentes no necesitan saber mapping
function CurrencyInput() {
  const { currency } = useConfiguration()  // "CLP", "ARS", "MXN"
  return <NumericFormat prefix={getCurrencySymbol(currency)} />
}

function AddressFields() {
  const { pais, region } = useConfiguration()
  const regionesDisponibles = PAISES_CONFIG[pais].regiones
  // ...
}
```

---

### 5. ✅ Componentes Regionales

Fácil crear componentes específicos:

```typescript
// components/ui/rut-input.tsx
export function RutInput({ ...props }) {
  const { pais } = useConfiguration()

  // Solo mostrar para Chile
  if (pais !== "CL") return null

  return (
    <Input
      {...props}
      onChange={(e) => {
        const formatted = formatRut(e.target.value)
        props.onChange?.(formatted)
      }}
    />
  )
}
```

---

## Implementación

### 1. Master Data

```typescript
// lib/constants/paises-config.ts
export const PAISES_CONFIG = {
  CL: {
    name: 'Chile',
    code: 'CL',
    currency: 'CLP',
    currencySymbol: '$',
    locale: 'es-CL',
    regiones: [
      {
        name: 'Metropolitana (RM)',
        code: 'RM',
        ciudades: ['Santiago'],
        comunas: [
          'Providencia',
          'Las Condes',
          'Vitacura',
          'Lo Barnechea',
          'Ñuñoa',
          'Santiago Centro',
          'Maipú',
          'La Florida',
          // ... 52 comunas
        ],
      },
      // ... 15 regiones
    ],
  },
  AR: {
    name: 'Argentina',
    code: 'AR',
    currency: 'ARS',
    currencySymbol: '$',
    locale: 'es-AR',
    regiones: [
      {
        name: 'Buenos Aires',
        code: 'BA',
        ciudades: ['CABA', 'La Plata'],
        comunas: [], // Argentina usa "barrios" en CABA
      },
      // ... otras provincias
    ],
  },
}
```

---

### 2. Context Provider

```typescript
// lib/contexts/configuration-context.tsx
const ConfigurationContext = createContext<ConfigurationContextType | undefined>(undefined)

export function ConfigurationProvider({ children }: { children: React.ReactNode }) {
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
      const config = JSON.parse(stored)
      setPais(config.pais || "CL")
      setRegion(config.region || "Metropolitana (RM)")
      setCiudad(config.ciudad || "Santiago")
      setComuna(config.comuna || "")
    }
  }, [])

  // Persistir cambios
  useEffect(() => {
    localStorage.setItem('configuration', JSON.stringify({
      pais, region, ciudad, comuna
    }))
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
        pais, region, ciudad, comuna,
        currency, locale,
        setPais, setRegion, setCiudad, setComuna,
        resetConfiguration
      }}
    >
      {children}
    </ConfigurationContext.Provider>
  )
}
```

---

### 3. Custom Hook

```typescript
// hooks/use-configuration.ts
export function useConfiguration() {
  const context = useContext(ConfigurationContext)

  if (!context) {
    throw new Error('useConfiguration must be used within ConfigurationProvider')
  }

  return context
}
```

---

### 4. Root Layout

```typescript
// app/layout.tsx
import { ConfigurationProvider } from '@/lib/contexts/configuration-context'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <ConfigurationProvider>
            {children}
          </ConfigurationProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
```

---

### 5. Uso en Componentes

#### CurrencyInput

```typescript
// components/ui/currency-input.tsx
export function CurrencyInput({
  currency: propCurrency,  // Override opcional
  ...props
}: CurrencyInputProps) {
  const { currency: contextCurrency } = useConfiguration()

  // Prioridad: props > context > default
  const effectiveCurrency = propCurrency || contextCurrency || "CLP"

  return (
    <NumericFormat
      thousandSeparator="."
      decimalSeparator=","
      prefix={getCurrencySymbol(effectiveCurrency) + " "}
      decimalScale={2}
      fixedDecimalScale
      allowNegative={false}
      customInput={Input}
      {...props}
    />
  )
}
```

#### PhoneInput

```typescript
// components/ui/phone-input.tsx
export function PhoneInput({ ...props }: PhoneInputProps) {
  const { pais } = useConfiguration()

  // Derivar defaultCountry del país seleccionado
  const defaultCountry = pais as CountryCode || "CL"

  return (
    <PhoneInputPrimitive
      defaultCountry={defaultCountry}
      international
      {...props}
    />
  )
}
```

#### AddressFields

```typescript
// components/forms/address-fields.tsx
export function AddressFields({ form }: AddressFieldsProps) {
  const { pais, region } = useConfiguration()

  const paisData = PAISES_CONFIG[pais]
  const regionData = paisData.regiones.find(r => r.name === region)

  return (
    <>
      <FormField
        name="region"
        render={({ field }) => (
          <Select onValueChange={field.onChange} value={field.value}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar región" />
            </SelectTrigger>
            <SelectContent>
              {paisData.regiones.map((r) => (
                <SelectItem key={r.code} value={r.name}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />

      <FormField
        name="comuna"
        render={({ field }) => (
          <Select onValueChange={field.onChange} value={field.value}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar comuna" />
            </SelectTrigger>
            <SelectContent>
              {regionData?.comunas.map((comuna) => (
                <SelectItem key={comuna} value={comuna}>
                  {comuna}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </>
  )
}
```

---

### 6. Settings Page

```typescript
// app/settings/configuration/page.tsx
export default function ConfigurationPage() {
  const {
    pais, region, ciudad, comuna,
    currency, locale,
    setPais, setRegion, setCiudad, setComuna,
    resetConfiguration
  } = useConfiguration()

  return (
    <AppLayout pageTitle="Configuración Regional">
      <Card>
        <CardHeader>
          <CardTitle>Ubicación</CardTitle>
          <CardDescription>Configurar país y región</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>País</Label>
            <Select value={pais} onValueChange={setPais}>
              <SelectTrigger>
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

          <div>
            <Label>Región</Label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAISES_CONFIG[pais].regiones.map((r) => (
                  <SelectItem key={r.code} value={r.name}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Derivados (read-only) */}
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              <strong>Moneda:</strong> {currency}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Locale:</strong> {locale}
            </p>
          </div>

          <Button onClick={resetConfiguration} variant="outline">
            Restaurar Valores por Defecto
          </Button>
        </CardContent>
      </Card>
    </AppLayout>
  )
}
```

---

## Trade-offs

### ⚠️ No es i18n Completo

Si en futuro necesitas multi-idioma:

- Tendrás que migrar a next-intl o react-i18next
- Traducir todos los strings (actualmente hardcoded en español)
- Agregar archivos de traducción (en.json, es.json, etc.)

**Mitigación:**

- Context API es compatible con i18n libraries
- Migración gradual posible:

```typescript
// Futuro: Agregar next-intl sin romper Context API
import { ConfigurationProvider } from '@/lib/contexts/configuration-context'
import { NextIntlClientProvider } from 'next-intl'

<NextIntlClientProvider locale={locale} messages={messages}>
  <ConfigurationProvider>
    {children}
  </ConfigurationProvider>
</NextIntlClientProvider>
```

---

### ⚠️ Client-Side Only (Hydration)

Context API requiere client-side:

```typescript
// ❌ NO disponible en Server Components
export default async function ServerComponent() {
  const { currency } = useConfiguration() // ERROR
}

// ✅ Disponible en Client Components
;('use client')
export function ClientComponent() {
  const { currency } = useConfiguration() // OK
}
```

**Mitigación:**

- Componentes de formularios ya son Client Components
- Para Server Components: pasar currency como prop

```typescript
// app/projects/page.tsx (Server Component)
export default async function ProjectsPage() {
  const defaultCurrency = "CLP"  // ← Default en server

  return <ProjectsTable defaultCurrency={defaultCurrency} />
}
```

---

## Expansión Futura

### Agregar Nuevo País

1. Agregar a `PAISES_CONFIG`:

```typescript
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
    // ... 31 estados
  ]
}
```

2. Listo. Todo automático:
   - CurrencyInput muestra "$" con locale "es-MX"
   - PhoneInput usa defaultCountry "MX"
   - AddressFields muestra estados mexicanos

---

### Multi-Tenant (Futuro)

Si necesitas diferentes países por organización:

```typescript
// lib/contexts/configuration-context.tsx
export function ConfigurationProvider({ orgId, children }) {
  // Cargar config específica de org desde DB
  const [config, setConfig] = useState(null)

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

## Ver También

- [Regional Components](../03-layers/ui-components.md#componentes-regionales) - PhoneInput, CurrencyInput, RutInput
- [Address Fields](../02-business-flows/address-handling.md) - Manejo de direcciones
- [Constants](../03-layers/business-logic.md#constants) - PAISES_CONFIG

**Última actualización:** 2025-10-30
