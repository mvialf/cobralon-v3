# Configuración Regional

Sistema de configuración regional basado en React Context API para manejo de país, moneda, locale y componentes regionales.

---

## 📋 Overview

El sistema de configuración regional permite:

- **Configuración de ubicación:** País, región, ciudad, comuna
- **Derivación automática:** Currency y locale se derivan del país
- **Persistencia:** localStorage con hydration automática
- **Componentes regionales:** PhoneInput, CurrencyInput, RutInput, AddressFields
- **Preparación multi-país:** Base para futuro soporte de múltiples países

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│         ConfigurationContext (React Context)            │
│                                                         │
│  Estado:                                                │
│  ├─ pais: string         ("CL", "AR", "MX")            │
│  ├─ region: string       ("Metropolitana (RM)")        │
│  ├─ ciudad: string       ("Santiago")                  │
│  ├─ comuna: string       ("Providencia")               │
│  ├─ currency: string     (derivado: "CLP")             │
│  └─ locale: string       (derivado: "es-CL")           │
│                                                         │
│  Persistencia: localStorage + hydration                │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│               PAISES_CONFIG (Master Data)               │
│                                                         │
│  Chile (CL):                                            │
│  ├─ currency: "CLP"                                     │
│  ├─ locale: "es-CL"                                     │
│  └─ regiones: [15 regiones con comunas]                │
│                                                         │
│  Argentina (AR): currency: "ARS", locale: "es-AR"       │
│  México (MX): currency: "MXN", locale: "es-MX"          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│            Componentes que consumen config              │
│                                                         │
│  ├─ CurrencyInput → useConfiguration() → currency       │
│  ├─ PhoneInput    → useConfiguration() → país           │
│  ├─ RutInput      → Solo para Chile                     │
│  ├─ AddressFields → useConfiguration() → región/comuna  │
│  └─ Settings      → useConfiguration() → todo           │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Componentes Principales

### 1. ConfigurationContext

**Archivo:** `lib/contexts/configuration-context.tsx`

**Responsabilidad:** Proveer configuración regional global

**Features:**
- Estado de ubicación (país, región, comuna)
- Derivación automática de currency y locale
- Persistencia en localStorage
- Setters para actualizar configuración

---

### 2. useConfiguration Hook

**Archivo:** `hooks/use-configuration.ts`

**Uso:**

```typescript
const {
  pais, region, comuna,
  currency, locale,
  setPais, setRegion
} = useConfiguration()
```

---

### 3. PAISES_CONFIG

**Archivo:** `lib/constants/paises-config.ts`

**Contenido:**

```typescript
{
  CL: {
    name: "Chile",
    currency: "CLP",
    locale: "es-CL",
    regiones: [
      {
        name: "Metropolitana (RM)",
        code: "RM",
        ciudades: ["Santiago"],
        comunas: ["Providencia", "Las Condes", ...]
      },
      // ... 14 regiones más
    ]
  },
  AR: { /* ... */ },
  MX: { /* ... */ }
}
```

---

## 📚 Documentación Detallada

### [Architecture](architecture.md)

- Flujo de datos del Context
- Persistencia en localStorage
- Hydration client-side
- Derivación de currency/locale

---

### [Hooks](hooks.md)

- `useConfiguration()` hook
- API completa
- Ejemplos de uso

---

### [Components](components.md)

Componentes regionales que consumen configuración:

1. **CurrencyInput** - Input de montos con formato regional
2. **PhoneInput** - Input de teléfono con validación E.164
3. **RutInput** - Input de RUT chileno (solo para CL)
4. **AddressFields** - Campos de dirección con regiones/comunas

---

### [Examples](examples.md)

- Uso en forms
- Uso en Settings page
- Cambio dinámico de país
- Multi-tenancy (futuro)

---

## 🚀 Quick Start

### 1. Usar en un Form

```typescript
'use client'
import { useConfiguration } from '@/hooks/use-configuration'
import { CurrencyInput } from '@/components/ui/currency-input'
import { AddressFields } from '@/components/forms/address-fields'

export function ProjectForm() {
  const { currency } = useConfiguration()

  return (
    <form>
      <CurrencyInput
        name="subtotal"
        currency={currency}  // Opcional: usa context si no se pasa
      />

      <AddressFields form={form} />  {/* Usa context internamente */}
    </form>
  )
}
```

---

### 2. Configurar en Settings

```typescript
'use client'
import { useConfiguration } from '@/hooks/use-configuration'

export function SettingsPage() {
  const { pais, setPais, currency, locale } = useConfiguration()

  return (
    <div>
      <Select value={pais} onValueChange={setPais}>
        <SelectItem value="CL">Chile</SelectItem>
        <SelectItem value="AR">Argentina</SelectItem>
        <SelectItem value="MX">México</SelectItem>
      </Select>

      <p>Moneda: {currency}</p>  {/* Derivado automáticamente */}
      <p>Locale: {locale}</p>     {/* Derivado automáticamente */}
    </div>
  )
}
```

---

## 🔍 Componentes Disponibles

| Componente       | Archivo                            | Configuración usada |
| ---------------- | ---------------------------------- | ------------------- |
| CurrencyInput    | `components/ui/currency-input.tsx` | `currency`          |
| PhoneInput       | `components/ui/phone-input.tsx`    | `pais`              |
| RutInput         | `components/ui/rut-input.tsx`      | `pais` (solo CL)    |
| AddressFields    | `components/forms/address-fields.tsx` | `pais`, `region`, `comuna` |
| ConfigurationForm| `components/settings/configuration-form.tsx` | Todos |

---

## 💡 Best Practices

### ✅ DO

```typescript
// 1. Usar hook para obtener configuración
const { currency } = useConfiguration()

// 2. Permitir override por props
<CurrencyInput currency={propCurrency || currency} />

// 3. Derivar automáticamente cuando sea posible
const locale = PAISES_CONFIG[pais].locale
```

---

### ❌ DON'T

```typescript
// 1. NO hardcodear valores regionales
const CURRENCY = "CLP"  // ❌ Mal

// 2. NO duplicar lógica de derivación
const locale = pais === "CL" ? "es-CL" : "es-AR"  // ❌ Mal

// 3. NO usar configuración en Server Components sin props
export default async function ServerComponent() {
  const { currency } = useConfiguration()  // ❌ Error: client-side only
}
```

---

## 🌍 Países Soportados

| País      | Code | Currency | Locale  | Regiones |
| --------- | ---- | -------- | ------- | -------- |
| Chile     | CL   | CLP      | es-CL   | 15       |
| Argentina | AR   | ARS      | es-AR   | 24       |
| México    | MX   | MXN      | es-MX   | 32       |

---

## 🔧 Extensión Futura

### Agregar Nuevo País

1. Editar `lib/constants/paises-config.ts`:

```typescript
PE: {
  name: "Perú",
  code: "PE",
  currency: "PEN",
  currencySymbol: "S/",
  locale: "es-PE",
  regiones: [
    {
      name: "Lima",
      code: "LIM",
      ciudades: ["Lima"],
      comunas: ["Miraflores", "San Isidro", ...]
    }
  ]
}
```

2. Listo. Todo automático:
   - CurrencyInput usa "S/" como símbolo
   - PhoneInput usa defaultCountry "PE"
   - AddressFields muestra regiones de Perú

---

## Ver También

- [Regional Config Decision](../05-technical-decisions/regional-config.md) - Por qué Context API
- [Business Logic](../03-layers/business-logic.md#constants) - PAISES_CONFIG completo
- [UI Components](../03-layers/ui-components.md#componentes-regionales) - Componentes

**Última actualización:** 2025-10-30
