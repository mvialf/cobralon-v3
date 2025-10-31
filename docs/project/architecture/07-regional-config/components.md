# Componentes Regionales

Componentes UI que consumen la configuración regional del Context API para adaptarse automáticamente al país y región seleccionados.

---

## 📦 Componentes Disponibles

| Componente       | Archivo                                  | Consume Config    | Propósito                          |
| ---------------- | ---------------------------------------- | ----------------- | ---------------------------------- |
| CurrencyInput    | `components/ui/currency-input.tsx`       | `currency, locale`| Input de montos con formateo       |
| PhoneInput       | `components/ui/phone-input.tsx`          | `pais`            | Input de teléfono con validación   |
| RutInput         | `components/ui/rut-input.tsx`            | _(solo Chile)_    | Input de RUT chileno               |
| AddressFields    | `components/forms/address-fields.tsx`    | `region` (inicial)| Campos de dirección con cascada    |

---

## 1. CurrencyInput

### Descripción

Input numérico con formateo automático de moneda en tiempo real.

**Archivo:** `components/ui/currency-input.tsx`

**Features:**
- ✅ Formateo mientras escribes: `1234567` → `$1.234.567`
- ✅ Separadores de miles/decimales automáticos según locale
- ✅ Símbolo de moneda derivado del país configurado
- ✅ Soporte para monedas sin decimales (CLP, JPY, KRW)
- ✅ Validación min/max
- ✅ Doble-click para seleccionar todo

### Props

```typescript
interface CurrencyInputProps {
  value: number              // Valor numérico
  onChange: (value: number) => void
  currency?: string          // ISO 4217 (ej: "CLP", "USD", "EUR")
  locale?: string            // ej: "es-CL", "en-US"
  min?: number               // Valor mínimo
  max?: number               // Valor máximo
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
  name?: string
}
```

### Uso de Configuración

```typescript
const { configuration } = useConfiguration()

// Prioridad: props > context > defaults
const currency = currencyProp ?? configuration.currency ?? 'EUR'
const locale = localeProp ?? configuration.locale ?? 'es-ES'

// Auto-detección de separadores según locale
const numberFormatter = new Intl.NumberFormat(locale, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const parts = numberFormatter.formatToParts(12345.67)
const thousandSeparator = parts.find((p) => p.type === 'group')?.value || ','
const decimalSeparator = parts.find((p) => p.type === 'decimal')?.value || '.'
```

### Ejemplo de Uso

#### Uso Básico (deriva de config global)

```typescript
'use client'
import { CurrencyInput } from '@/components/ui/currency-input'

export function ProjectForm() {
  const [subtotal, setSubtotal] = useState(0)

  return (
    <CurrencyInput
      value={subtotal}
      onChange={setSubtotal}
      // currency y locale se derivan automáticamente del contexto
    />
  )
}
```

**Resultado:**
- Si `pais = "CL"` → Muestra `$ 1.234.567` (sin decimales)
- Si `pais = "AR"` → Muestra `$ 1.234.567,00` (con decimales)
- Si `pais = "MX"` → Muestra `$ 1,234,567.00` (separadores USA)

---

#### Override de Moneda

```typescript
<CurrencyInput
  value={amount}
  onChange={setAmount}
  currency="USD"
  locale="en-US"
/>
```

**Resultado:** Muestra `$ 1,234.56` independiente de la configuración global

---

#### Con React Hook Form

```typescript
<FormField
  control={form.control}
  name="subtotal"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Subtotal</FormLabel>
      <FormControl>
        <CurrencyInput
          value={field.value}
          onChange={field.onChange}
          min={0}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Comportamiento Regional

| País | Currency | Formato        | Decimales |
| ---- | -------- | -------------- | --------- |
| CL   | CLP      | `$ 1.234.567`  | ❌ No      |
| AR   | ARS      | `$ 1.234.567,00` | ✅ Sí   |
| MX   | MXN      | `$ 1,234.56`   | ✅ Sí     |
| US   | USD      | `$ 1,234.56`   | ✅ Sí     |

**Monedas sin decimales:** CLP, JPY, KRW (centavos eliminados automáticamente)

---

## 2. PhoneInput

### Descripción

Input de teléfono con validación E.164 y prefijo de país automático.

**Archivo:** `components/ui/phone-input.tsx`

**Features:**
- ✅ Prefijo de país automático (ej: `+56` para Chile)
- ✅ Validación de formato E.164 en tiempo real
- ✅ Icono de validación visual (checkmark/x)
- ✅ Auto-añade prefijo si el usuario lo omite
- ✅ Solo Chile actualmente (validación estricta +56 9XXXXXXXX)

### Props

```typescript
interface PhoneInputProps {
  value: string              // Formato E.164 (ej: "+56912345678")
  onChange: (value: string) => void
  defaultCountry?: Country   // ISO 3166-1 alpha-2 ("CL", "US")
  showValidationIcon?: boolean // Default: false
  showCountryPrefix?: boolean  // Default: true
  autoAddPrefix?: boolean      // Default: true
  className?: string
  disabled?: boolean
  placeholder?: string
}
```

### Uso de Configuración

```typescript
const { configuration } = useConfiguration()

// Prioridad: props > context > default (Chile)
const defaultCountry =
  countryProp ?? (configuration.pais.toUpperCase() as Country) ?? 'CL'

// Prefijo automático
const countryCallingCode = getCountryCallingCode(defaultCountry) // "56"
const prefix = `+${countryCallingCode}` // "+56"
```

### Ejemplo de Uso

#### Uso Básico

```typescript
'use client'
import { PhoneInput } from '@/components/ui/phone-input'

export function CustomerForm() {
  const [phone, setPhone] = useState('')

  return (
    <PhoneInput
      value={phone}
      onChange={setPhone}
      placeholder="+56 9 1234 5678"
      showValidationIcon
    />
  )
}
```

**Comportamiento:**
- Usuario escribe: `912345678`
- Sistema auto-añade prefijo: `+56912345678`
- Muestra checkmark verde si válido ✅

---

#### Con React Hook Form

```typescript
<FormField
  control={form.control}
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
      <FormMessage />
    </FormItem>
  )}
/>
```

### Validación Regional

**Chile (estricta):**
```typescript
// Validación actual: solo Chile
const chilePhonePattern = /^\+56[2-9]\d{8}$/

// Válido:
// +56 9 1234 5678 (celular)
// +56 2 1234 5678 (fijo RM)
// +56 33 123 4567 (fijo región)

// Inválido:
// +56 1234 5678 (faltan dígitos)
// +56 0123 4567 (inicia con 0)
```

**Extensión futura:** Agregar validación para AR, MX, etc. cuando se implementen otros países.

---

## 3. RutInput

### Descripción

Input especializado para RUT chileno con formateo y validación automática.

**Archivo:** `components/ui/rut-input.tsx`

**Features:**
- ✅ Formateo automático: `123456789` → `12.345.678-9`
- ✅ Validación de dígito verificador
- ✅ Sanitización de input (solo números, K, puntos, guión)
- ✅ Icono de validación visual
- ✅ Compatible con React Hook Form
- ⚠️ **Solo para Chile** (pais === "CL")

### Props

```typescript
interface RutInputProps {
  value?: string                   // RUT formateado o limpio
  onRutChange?: (cleanRut: string) => void
  showValidationIcon?: boolean     // Default: false
  formatOnChange?: boolean         // Default: true
  className?: string
  disabled?: boolean
}
```

### Uso de Configuración

**Nota:** Este componente NO consume directamente `useConfiguration`. Es responsabilidad del form parent mostrar/ocultar según `pais === "CL"`.

### Ejemplo de Uso

#### Uso Simple

```typescript
'use client'
import { RutInput } from '@/components/ui/rut-input'

export function ChileanCustomerForm() {
  const [rut, setRut] = useState('')

  return (
    <RutInput
      value={rut}
      onRutChange={setRut}
      showValidationIcon
      placeholder="12.345.678-9"
    />
  )
}
```

**Comportamiento:**
- Usuario escribe: `123456789`
- Sistema formatea: `12.345.678-9`
- Valida dígito verificador: ✅ o ❌

---

#### Con React Hook Form

```typescript
<FormField
  control={form.control}
  name="rut"
  render={({ field }) => (
    <FormItem>
      <FormLabel>RUT</FormLabel>
      <FormControl>
        <RutInput
          value={field.value}
          onRutChange={field.onChange}
          showValidationIcon
        />
      </FormControl>
      <FormDescription>Formato: 12.345.678-9</FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>
```

---

#### Condicional por País

```typescript
'use client'
import { useConfiguration } from '@/hooks/use-configuration'
import { RutInput } from '@/components/ui/rut-input'
import { Input } from '@/components/ui/input'

export function DocumentInput() {
  const { pais } = useConfiguration()

  return (
    <FormField
      control={form.control}
      name="document"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{pais === 'CL' ? 'RUT' : 'Documento'}</FormLabel>
          <FormControl>
            {pais === 'CL' ? (
              <RutInput
                value={field.value}
                onRutChange={field.onChange}
                showValidationIcon
              />
            ) : (
              <Input {...field} placeholder="DNI / Pasaporte" />
            )}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
```

### Validación

**Algoritmo Módulo 11:**
```typescript
// lib/validations/rut-validations.ts
export function validateRut(rut: string): boolean {
  const cleanRut = rut.replace(/[.-]/g, '')
  const cuerpo = cleanRut.slice(0, -1)
  const digitoVerificador = cleanRut.slice(-1).toUpperCase()

  let suma = 0
  let multiplicador = 2

  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i]) * multiplicador
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1
  }

  const resto = suma % 11
  const dv = 11 - resto

  const dvCalculado = dv === 11 ? '0' : dv === 10 ? 'K' : dv.toString()

  return dvCalculado === digitoVerificador
}
```

---

## 4. AddressFields

### Descripción

Componente compuesto para campos de dirección con selección cascada de región → comuna.

**Archivo:** `components/forms/address-fields.tsx`

**Features:**
- ✅ 4 campos: calle, casa/dpto, región, comuna
- ✅ Selección cascada: al cambiar región → filtra comunas
- ✅ Combobox con búsqueda para región y comuna
- ✅ Grid responsive (5+1 para calle/dpto, 1+1 para región/comuna)
- ✅ Integrado con React Hook Form

### Props

```typescript
interface AddressFieldsProps {
  control: Control<any>  // React Hook Form control
  defaultRegion?: string // Región inicial (ej: "Metropolitana (RM)")
}
```

### Uso de Configuración

```typescript
// Opcional: puede pre-popular con región del contexto
const { region } = useConfiguration()

<AddressFields
  control={form.control}
  defaultRegion={region}
/>
```

**Nota:** El componente NO usa `useConfiguration` internamente. La región se pasa como prop.

### Ejemplo de Uso

#### Integración en Form

```typescript
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AddressFields } from '@/components/forms/address-fields'
import { projectFormSchema } from '@/lib/validations/project-validations'

export function ProjectForm() {
  const form = useForm({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      street: '',
      apartment: '',
      region: '',
      comuna: '',
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <AddressFields control={form.control} />
        <Button type="submit">Guardar</Button>
      </form>
    </Form>
  )
}
```

---

#### Pre-popular con Configuración Global

```typescript
'use client'
import { useConfiguration } from '@/hooks/use-configuration'

export function ProjectForm() {
  const { region } = useConfiguration()

  const form = useForm({
    defaultValues: {
      street: '',
      apartment: '',
      region: region,  // ← Pre-popular desde context
      comuna: '',
    },
  })

  return (
    <Form {...form}>
      <AddressFields
        control={form.control}
        defaultRegion={region}  // ← Opcional: estado inicial
      />
    </Form>
  )
}
```

### Estructura de Campos

```
┌────────────────────────────────────────┬──────┐
│ Calle y numeración *                   │ Casa │
│ (5 columnas)                           │ (1)  │
└────────────────────────────────────────┴──────┘

┌─────────────────────┬─────────────────────────┐
│ Región *            │ Comuna *                │
│ (Combobox)          │ (Combobox)              │
│                     │ (filtrado por región)   │
└─────────────────────┴─────────────────────────┘
```

### Comportamiento Cascada

1. **Usuario selecciona región:**
   ```typescript
   setSelectedRegion("Metropolitana (RM)")
   ```

2. **Sistema filtra comunas:**
   ```typescript
   const regionCodigo = regiones.find(r =>
     `${r.nombre_corto} (${r.numero_romano})` === selectedRegion
   )?.codigo

   const comunasDisponibles = getComunasByRegion(regionCodigo)
   ```

3. **Comuna Combobox se actualiza:**
   - Si región seleccionada → muestra comunas disponibles
   - Si región vacía → muestra "Primero selecciona una región" (disabled)

### Data Source

```typescript
// lib/regiones-chile.ts
export function getRegiones() {
  return [
    {
      codigo: "RM",
      nombre_corto: "Metropolitana",
      numero_romano: "RM",
      comunas: ["Santiago", "Providencia", "Las Condes", ...]
    },
    {
      codigo: "V",
      nombre_corto: "Valparaíso",
      numero_romano: "V",
      comunas: ["Valparaíso", "Viña del Mar", "Con-Con", ...]
    },
    // ... 15 regiones
  ]
}

export function getComunasByRegion(codigo: string) {
  const region = getRegiones().find(r => r.codigo === codigo)
  return region ? region.comunas.map(c => ({ nombre: c })) : []
}
```

---

## Integración Completa: Ejemplo Form

```typescript
'use client'
import { useConfiguration } from '@/hooks/use-configuration'
import { CurrencyInput } from '@/components/ui/currency-input'
import { PhoneInput } from '@/components/ui/phone-input'
import { RutInput } from '@/components/ui/rut-input'
import { AddressFields } from '@/components/forms/address-fields'

export function ProjectForm() {
  const { pais, region } = useConfiguration()

  const form = useForm({
    defaultValues: {
      // Address
      street: '',
      apartment: '',
      region: region,  // Pre-popular
      comuna: '',

      // Contact
      phone: '',
      document: '',

      // Financial
      subtotal: 0,
    },
  })

  return (
    <Form {...form}>
      <form>
        {/* Dirección */}
        <AddressFields
          control={form.control}
          defaultRegion={region}
        />

        {/* Teléfono (adapta prefijo según país) */}
        <FormField
          name="phone"
          render={({ field }) => (
            <PhoneInput
              value={field.value}
              onChange={field.onChange}
              showValidationIcon
            />
          )}
        />

        {/* Documento (solo Chile muestra RUT) */}
        <FormField
          name="document"
          render={({ field }) => (
            pais === 'CL' ? (
              <RutInput
                value={field.value}
                onRutChange={field.onChange}
                showValidationIcon
              />
            ) : (
              <Input {...field} placeholder="Documento" />
            )
          )}
        />

        {/* Montos (formateo automático según moneda) */}
        <FormField
          name="subtotal"
          render={({ field }) => (
            <CurrencyInput
              value={field.value}
              onChange={field.onChange}
              min={0}
            />
          )}
        />
      </form>
    </Form>
  )
}
```

**Resultado:**
- Si `pais = "CL"`: Muestra RutInput, PhoneInput con +56, CurrencyInput con $ sin decimales
- Si `pais = "AR"`: Muestra Input normal, PhoneInput con +54, CurrencyInput con $ con decimales
- Región pre-populada desde configuración global

---

## Ver También

- [Hooks](hooks.md) - useConfiguration API
- [Architecture](architecture.md) - Context API flow
- [Examples](examples.md) - Casos de uso completos
- [Regional Config Decision](../05-technical-decisions/regional-config.md) - Por qué Context API

**Última actualización:** 2025-10-30
