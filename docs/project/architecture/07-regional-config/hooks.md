# useConfiguration Hook

Hook personalizado para acceder y modificar la configuración regional global.

---

## Uso Básico

```typescript
'use client'
import { useConfiguration } from '@/hooks/use-configuration'

export function MyComponent() {
  const {
    pais,
    region,
    comuna,
    currency,
    locale,
    setPais,
    setRegion,
    resetConfiguration
  } = useConfiguration()

  return (
    <div>
      <p>País: {pais}</p>
      <p>Moneda: {currency}</p>
      <button onClick={() => setPais("AR")}>Cambiar a Argentina</button>
    </div>
  )
}
```

---

## API Completa

### Estado (Read-Only)

| Propiedad | Tipo   | Default           | Descripción                        |
| --------- | ------ | ----------------- | ---------------------------------- |
| `pais`    | string | `"CL"`            | Código de país (ISO 3166-1 alpha-2) |
| `region`  | string | `"Metropolitana (RM)"` | Nombre de región               |
| `ciudad`  | string | `"Santiago"`      | Nombre de ciudad                   |
| `comuna`  | string | `""`              | Nombre de comuna                   |
| `currency`| string | `"CLP"`           | Código de moneda (derivado de país) |
| `locale`  | string | `"es-CL"`         | Locale (derivado de país)          |

---

### Setters (Write)

| Función              | Parámetros          | Descripción                |
| -------------------- | ------------------- | -------------------------- |
| `setPais`            | `(value: string)`   | Cambiar país               |
| `setRegion`          | `(value: string)`   | Cambiar región             |
| `setCiudad`          | `(value: string)`   | Cambiar ciudad             |
| `setComuna`          | `(value: string)`   | Cambiar comuna             |
| `resetConfiguration` | `()`                | Restaurar valores default  |

---

## Ejemplos de Uso

### 1. Leer Configuración

```typescript
'use client'
import { useConfiguration } from '@/hooks/use-configuration'

export function WelcomeMessage() {
  const { pais, region, currency } = useConfiguration()

  return (
    <div>
      <h1>Bienvenido desde {region}, {pais}</h1>
      <p>Moneda configurada: {currency}</p>
    </div>
  )
}
```

---

### 2. Actualizar Configuración

```typescript
'use client'
import { useConfiguration } from '@/hooks/use-configuration'
import { Button } from '@/components/ui/button'

export function CountrySelector() {
  const { pais, setPais } = useConfiguration()

  return (
    <div className="flex gap-2">
      <Button
        variant={pais === "CL" ? "default" : "outline"}
        onClick={() => setPais("CL")}
      >
        Chile
      </Button>
      <Button
        variant={pais === "AR" ? "default" : "outline"}
        onClick={() => setPais("AR")}
      >
        Argentina
      </Button>
      <Button
        variant={pais === "MX" ? "default" : "outline"}
        onClick={() => setPais("MX")}
      >
        México
      </Button>
    </div>
  )
}
```

---

### 3. Formulario de Configuración Completo

```typescript
'use client'
import { useConfiguration } from '@/hooks/use-configuration'
import { PAISES_CONFIG } from '@/lib/constants/paises-config'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'

export function ConfigurationForm() {
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
    resetConfiguration
  } = useConfiguration()

  const paisData = PAISES_CONFIG[pais]

  return (
    <div className="space-y-4">
      {/* Selector de País */}
      <div>
        <label className="text-sm font-medium">País</label>
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

      {/* Selector de Región */}
      <div>
        <label className="text-sm font-medium">Región</label>
        <Select value={region} onValueChange={setRegion}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {paisData.regiones.map((r) => (
              <SelectItem key={r.code} value={r.name}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Selector de Ciudad */}
      <div>
        <label className="text-sm font-medium">Ciudad</label>
        <Select value={ciudad} onValueChange={setCiudad}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {paisData.regiones
              .find(r => r.name === region)
              ?.ciudades.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Selector de Comuna */}
      <div>
        <label className="text-sm font-medium">Comuna</label>
        <Select value={comuna} onValueChange={setComuna}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {paisData.regiones
              .find(r => r.name === region)
              ?.comunas.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Valores Derivados (Read-Only) */}
      <div className="pt-4 border-t">
        <p className="text-sm text-muted-foreground">
          <strong>Moneda:</strong> {currency}
        </p>
        <p className="text-sm text-muted-foreground">
          <strong>Locale:</strong> {locale}
        </p>
      </div>

      {/* Reset Button */}
      <Button onClick={resetConfiguration} variant="outline">
        Restaurar Valores por Defecto
      </Button>
    </div>
  )
}
```

---

### 4. Uso en Forms con Derivación

```typescript
'use client'
import { useConfiguration } from '@/hooks/use-configuration'
import { useForm } from 'react-hook-form'
import { CurrencyInput } from '@/components/ui/currency-input'

export function ProjectForm() {
  const { currency, region } = useConfiguration()
  const form = useForm({
    defaultValues: {
      subtotal: 0,
      region: region  // Pre-popular con región configurada
    }
  })

  return (
    <form>
      <CurrencyInput
        {...form.register('subtotal')}
        currency={currency}  // Derivado automáticamente
      />

      <input
        {...form.register('region')}
        defaultValue={region}
      />
    </form>
  )
}
```

---

### 5. Resetear Configuración

```typescript
'use client'
import { useConfiguration } from '@/hooks/use-configuration'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export function ResetConfigButton() {
  const { resetConfiguration } = useConfiguration()

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Restaurar Configuración</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Restaurar configuración?</AlertDialogTitle>
          <AlertDialogDescription>
            Esto restaurará todas las opciones regionales a sus valores por defecto
            (Chile, Región Metropolitana, Santiago).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={resetConfiguration}>
            Restaurar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

---

## Comportamiento de Derivación

### Automático

`currency` y `locale` se derivan automáticamente del `pais`:

```typescript
// Usuario cambia país
setPais("AR")

// Automáticamente actualiza:
// currency: "CLP" → "ARS"
// locale: "es-CL" → "es-AR"
```

**Tabla de derivación:**

| setPais("...") | currency | locale  |
| -------------- | -------- | ------- |
| `"CL"`         | `"CLP"`  | `"es-CL"` |
| `"AR"`         | `"ARS"`  | `"es-AR"` |
| `"MX"`         | `"MXN"`  | `"es-MX"` |

---

## Persistencia

### Automática en localStorage

Todos los cambios se persisten automáticamente:

```typescript
// Usuario cambia región
setRegion("Valparaíso (V)")

// Automáticamente persiste en localStorage:
// localStorage.setItem('configuration', JSON.stringify({
//   pais: "CL",
//   region: "Valparaíso (V)",
//   ciudad: "Santiago",
//   comuna: ""
// }))
```

---

### Hydration al Montar

Al cargar la app:

```typescript
// 1. SSR/SSG render con defaults
// pais: "CL", region: "Metropolitana (RM)"

// 2. Client mount: Lee localStorage
// const stored = localStorage.getItem('configuration')
// const config = JSON.parse(stored)

// 3. Hydrate state
// setPais(config.pais)
// setRegion(config.region)
// ...

// 4. Re-render con valores persistidos
```

---

## Error Handling

### Hook Usado Fuera del Provider

```typescript
// ❌ Error: Hook usado sin Provider
export function BadComponent() {
  const { currency } = useConfiguration()  // Throws error
  return <div>{currency}</div>
}

// ✅ OK: Envuelto en Provider
<ConfigurationProvider>
  <BadComponent />
</ConfigurationProvider>
```

**Error message:**

```
Error: useConfiguration must be used within ConfigurationProvider
```

---

### País Inválido

```typescript
// Usuario intenta país no soportado
setPais("ZZ")

// Fallback automático a default:
// currency: PAISES_CONFIG["ZZ"]?.currency || "CLP"  → "CLP"
// locale: PAISES_CONFIG["ZZ"]?.locale || "es-CL"   → "es-CL"
```

---

## Performance

### Re-renders

Solo los componentes que usan el hook re-renderizan:

```typescript
// Component A usa pais
function ComponentA() {
  const { pais } = useConfiguration()
  // Re-renderiza cuando pais cambia
}

// Component B usa currency
function ComponentB() {
  const { currency } = useConfiguration()
  // Re-renderiza cuando currency cambia (cuando pais cambia)
}

// Component C no usa el hook
function ComponentC() {
  // NO re-renderiza cuando config cambia
}
```

---

### Memoization

Si necesitas computación costosa basada en config:

```typescript
import { useMemo } from 'react'
import { useConfiguration } from '@/hooks/use-configuration'

function ExpensiveComponent() {
  const { pais, region } = useConfiguration()

  const expensiveData = useMemo(() => {
    return computeExpensiveData(pais, region)
  }, [pais, region])  // Solo re-computa cuando pais o region cambian

  return <div>{expensiveData}</div>
}
```

---

## Integración con Forms

### React Hook Form

```typescript
'use client'
import { useConfiguration } from '@/hooks/use-configuration'
import { useForm } from 'react-hook-form'

export function ProjectForm() {
  const { currency, region } = useConfiguration()

  const form = useForm({
    defaultValues: {
      currency: currency,  // Pre-popular
      region: region       // Pre-popular
    }
  })

  return (
    <form>
      {/* Fields... */}
    </form>
  )
}
```

---

## Testing

### Mock del Hook

```typescript
// __mocks__/use-configuration.ts
export function useConfiguration() {
  return {
    pais: "CL",
    region: "Metropolitana (RM)",
    ciudad: "Santiago",
    comuna: "Providencia",
    currency: "CLP",
    locale: "es-CL",
    setPais: jest.fn(),
    setRegion: jest.fn(),
    setCiudad: jest.fn(),
    setComuna: jest.fn(),
    resetConfiguration: jest.fn()
  }
}
```

---

## Ver También

- [Architecture](architecture.md) - Arquitectura del Context API
- [Components](components.md) - Componentes que usan el hook
- [Examples](examples.md) - Más ejemplos de uso

**Última actualización:** 2025-10-30
