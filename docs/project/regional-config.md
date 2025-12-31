# Sistema de Configuración Regional (Country Settings)

Documentación completa del sistema de configuración regional y multi-país del proyecto.

---

## 📚 Tabla de Contenidos

1. [Introducción](#introducción)
2. [Arquitectura General](#arquitectura-general)
3. [Archivos Involucrados](#archivos-involucrados)
4. [Flujo de Datos](#flujo-de-datos)
5. [Configuración de Chile](#configuración-de-chile)
6. [Tipos y Estructuras de Datos](#tipos-y-estructuras-de-datos)
7. [Uso del Sistema](#uso-del-sistema)
8. [Casos de Uso](#casos-de-uso)
9. [Extensibilidad](#extensibilidad)
10. [FAQ](#faq)

---

## Introducción

### ¿Qué es el Sistema de Configuración Regional?

Es un sistema centralizado que gestiona la configuración específica de cada país, incluyendo:

- 🌍 País y región del usuario
- 💰 Moneda y locale (formato de números/fechas)
- 🌐 Idioma de la interfaz
- ⏰ Zona horaria
- 📅 Primer día de la semana

### Características Principales

✅ **Derivación Automática**: Al seleccionar un país, todos los valores se configuran automáticamente
✅ **Modo Personalizado**: Permite override manual de configuraciones
✅ **Persistencia**: Se guarda en localStorage del navegador
✅ **Type-Safe**: TypeScript en toda la cadena
✅ **Escalable**: Diseñado para agregar más países fácilmente

---

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                    ConfigurationProvider                     │
│                  (React Context + localStorage)              │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  UserConfiguration State                            │    │
│  │  {                                                  │    │
│  │    pais: 'cl',                                      │    │
│  │    region: '13',                                    │    │
│  │    currency: 'CLP',     ← Derivado automáticamente │    │
│  │    locale: 'es-CL',     ← Derivado automáticamente │    │
│  │    idioma: 'Español',   ← Derivado automáticamente │    │
│  │    timezone: '...',     ← Derivado automáticamente │    │
│  │    primerDia: 'lunes'   ← Derivado automáticamente │    │
│  │  }                                                  │    │
│  └────────────────────────────────────────────────────┘    │
│                           ↕                                  │
│                   localStorage sync                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              useConfiguration() Hook                         │
│         (Acceso desde cualquier componente)                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    UI Components                             │
│  - Settings Page (selector de país/región)                  │
│  - Forms (address-fields, project-form, etc.)               │
│  - Formatters (currency, dates, numbers)                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Archivos Involucrados

### 1. **Core - Context Provider**

#### `lib/contexts/configuration-context.tsx` (171 líneas)

**Responsabilidad**: Gestión del estado global de configuración

**Funciones principales**:

- `ConfigurationProvider` - Provider de React Context
- `useConfiguration()` - Hook para acceso global
- Lógica de derivación automática (líneas 100-123)
- Sincronización con localStorage (líneas 70-93)

**Tipos exportados**:

```typescript
export type UserConfiguration = {
  pais: string
  region: string
  currency: string
  locale: string
  modoPersonalizado: boolean
  idioma: string
  timezone: string
  primerDia: string
}

export type ConfigurationContextType = {
  configuration: UserConfiguration
  updateConfiguration: (updates: Partial<UserConfiguration>) => void
  resetToDefaults: () => void
}
```

**Storage key**: `'user-configuration'`

---

### 2. **Configuration Data**

#### `lib/paises-config.ts` (57 líneas)

**Responsabilidad**: Define los valores por defecto para cada país

**Exports principales**:

```typescript
// Type para configuración de país
export type PaisConfig = {
  nombre: string
  currency: string    // ISO 4217 (CLP, ARS, USD)
  locale: string      // Locale para formateo (es-CL, es-AR)
  idioma: string
  timezone: string
  primerDia: 'lunes' | 'domingo'
}

// Record de países disponibles
export const PAISES_CONFIG: Record<string, PaisConfig> = {
  cl: {
    nombre: 'Chile',
    currency: 'CLP',
    locale: 'es-CL',
    idioma: 'Español',
    timezone: 'America/Santiago',
    primerDia: 'lunes',
  },
  // Estructura lista para agregar más países
}

// Opciones para modo personalizado
export const IDIOMAS_DISPONIBLES = [...]
export const TIMEZONES_DISPONIBLES = [...]
export const PRIMER_DIA_OPCIONES = [...]
```

---

### 3. **Chile-Specific Data**

#### `lib/regiones-chile.ts` (84 líneas)

**Responsabilidad**: Helpers para trabajar con regiones y comunas de Chile

**Tipos**:

```typescript
export type Comuna = {
  codigo: string
  nombre: string
}

export type Region = {
  codigo: string
  numero_romano: string
  nombre: string
  nombre_corto: string
  comunas: Comuna[]
}
```

**Funciones exportadas**:

| Función                            | Retorno               | Propósito                        |
| ---------------------------------- | --------------------- | -------------------------------- |
| `getRegiones()`                    | `Region[]`            | Todas las regiones de Chile (16) |
| `getRegionByCodigo(codigo)`        | `Region \| undefined` | Busca región por código          |
| `getComunasByRegion(codigoRegion)` | `Comuna[]`            | Comunas de una región            |
| `getComunaByCodigo(codigo)`        | `Comuna \| undefined` | Busca comuna específica          |
| `getRegionByComuna(codigo)`        | `Region \| undefined` | Región que contiene una comuna   |
| `formatRegionForCombobox(region)`  | `{value, label}`      | Format para Combobox             |
| `formatComunaForCombobox(comuna)`  | `{value, label}`      | Format para Combobox             |

**Datos importados desde**: `lib/regiones-chile.json`

---

#### `lib/regiones-chile.json` (~1500 líneas)

**Responsabilidad**: Base de datos completa de división territorial de Chile

**Estructura**:

```json
{
  "regiones": [
    {
      "codigo": "15",
      "numero_romano": "XV",
      "nombre": "Región de Arica y Parinacota",
      "nombre_corto": "Arica y Parinacota",
      "comunas": [
        { "codigo": "15101", "nombre": "Arica" },
        { "codigo": "15102", "nombre": "Camarones" },
        ...
      ]
    },
    ...
  ]
}
```

**Contenido**:

- 16 regiones de Chile
- 346 comunas totales
- Códigos oficiales (INE - Instituto Nacional de Estadísticas)
- Nombres completos y cortos

---

### 4. **UI Components**

#### `app/settings/general/page.tsx` (216 líneas)

**Responsabilidad**: Interfaz de usuario para configuración regional

**Secciones principales**:

**A. Selector de País** (líneas 54-71)

- Combobox con países disponibles
- Actualiza configuración al cambiar

**B. Selector de Región** (líneas 73-96)

- Solo visible si `pais === 'cl'`
- Muestra 16 regiones de Chile con formato: "Nombre Corto (Número Romano)"
- Ej: "Metropolitana de Santiago (XIII)"

**C. Modo Automático vs Personalizado** (líneas 100-201)

- **Modo Automático**: Valores read-only derivados del país
- **Modo Personalizado**: Campos editables (idioma, timezone, primer día)
- Botones para alternar entre modos

**Hooks utilizados**:

```typescript
const { configuration, updateConfiguration } = useConfiguration()
const { pais, region, modoPersonalizado, idioma, timezone, primerDia } = configuration
const regiones = getRegiones()
```

---

#### `hooks/use-configuration.ts` (12 líneas)

**Responsabilidad**: Re-export del hook para mantener convención de carpetas

```typescript
export { useConfiguration } from '@/lib/contexts/configuration-context'
export type {
  UserConfiguration,
  ConfigurationContextType,
} from '@/lib/contexts/configuration-context'
```

**Por qué existe**: Convención del proyecto - hooks van en `hooks/`, no en `lib/`

---

### 5. **Formatter Utilities**

#### `lib/format.ts`

**Responsabilidad**: Formateo basado en configuración regional

**Funciones que usan `locale` y `currency`**:

```typescript
// Usa configuration.currency y configuration.locale
formatCurrency(amount: number, currencyCode?: string): string

// Usa configuration.locale
formatNumber(value: number, locale?: string, options?: NumberFormatOptions): string

// Usa configuration.locale
formatDate(date: Date | string, locale?: string, format?: DateFormat): string
```

**Ejemplo de uso**:

```typescript
const { configuration } = useConfiguration()

// Automáticamente usa CLP y es-CL si país es Chile
formatCurrency(1234.56) // → "$1.235"
formatNumber(1234.56) // → "1.234,56"
formatDate(new Date()) // → "6 de noviembre de 2025"
```

---

### 6. **Root Layout Provider**

#### `app/layout.tsx`

**Responsabilidad**: Envuelve la app con ConfigurationProvider

```typescript
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <ConfigurationProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </ConfigurationProvider>
      </body>
    </html>
  )
}
```

**Orden de providers**: ConfigurationProvider debe estar arriba porque otros providers pueden necesitar configuración regional.

---

## Flujo de Datos

### 1. Inicialización al Cargar la App

```
1. Usuario abre la app
   ↓
2. RootLayout monta ConfigurationProvider
   ↓
3. useEffect carga datos de localStorage (línea 70-82 en configuration-context.tsx)
   ↓
4. SI existe 'user-configuration' en localStorage:
     → Parse JSON y setConfiguration(parsed)
   SINO:
     → Usa DEFAULT_CONFIGURATION (Chile por defecto)
   ↓
5. setIsInitialized(true)
   ↓
6. App renderiza con configuración cargada
```

---

### 2. Usuario Cambia de País (Modo Automático)

```
1. Usuario selecciona "Chile" en Settings
   ↓
2. onChange del Combobox → updateConfiguration({ pais: 'cl' })
   ↓
3. updateConfiguration ejecuta (líneas 96-127):

   setConfiguration((prev) => {
     const newConfig = { ...prev, pais: 'cl' }

     // Detecta cambio de país (línea 101)
     if (updates.pais && !newConfig.modoPersonalizado) {
       const paisConfig = PAISES_CONFIG['cl']

       // DERIVACIÓN AUTOMÁTICA:
       newConfig.currency = 'CLP'
       newConfig.locale = 'es-CL'
       newConfig.idioma = 'Español'
       newConfig.timezone = 'America/Santiago'
       newConfig.primerDia = 'lunes'
     }

     return newConfig
   })
   ↓
4. useEffect detecta cambio en configuration (línea 85-93)
   ↓
5. localStorage.setItem('user-configuration', JSON.stringify(configuration))
   ↓
6. Re-render de todos los componentes que usan useConfiguration()
   ↓
7. Selector de Región se hace visible (pais === 'cl')
   ↓
8. Formatters ahora usan CLP y es-CL
```

---

### 3. Usuario Selecciona Región (Chile)

```
1. Usuario selecciona "Metropolitana de Santiago (XIII)"
   ↓
2. onChange del Combobox → updateConfiguration({ region: '13' })
   ↓
3. updateConfiguration ejecuta:

   setConfiguration((prev) => ({
     ...prev,
     region: '13'  // Solo actualiza región, NO deriva otros valores
   }))
   ↓
4. localStorage sync
   ↓
5. configuration.region ahora es '13'
   ↓
6. Componentes address-fields ahora pueden cargar comunas de RM
```

---

### 4. Usuario Activa Modo Personalizado

```
1. Usuario hace clic en "Personalizar"
   ↓
2. onClick → updateConfiguration({ modoPersonalizado: true })
   ↓
3. setConfiguration actualiza modoPersonalizado: true
   ↓
4. Re-render:
   - Campos read-only se convierten en Combobox editables
   - Usuario puede cambiar idioma, timezone, primerDia manualmente
   ↓
5. Si cambia idioma a "English":
   → updateConfiguration({ idioma: 'English' })
   → Solo actualiza idioma, NO deriva automáticamente
```

---

### 5. Usuario Restaura Modo Automático

```
1. Usuario hace clic en "Restaurar automático"
   ↓
2. onClick → updateConfiguration({ modoPersonalizado: false })
   ↓
3. updateConfiguration detecta modoPersonalizado: false (línea 114-123)

   if (updates.modoPersonalizado === false) {
     const paisConfig = PAISES_CONFIG[newConfig.pais]

     // RE-DERIVAR TODO desde el país actual:
     newConfig.currency = paisConfig.currency
     newConfig.locale = paisConfig.locale
     newConfig.idioma = paisConfig.idioma
     newConfig.timezone = paisConfig.timezone
     newConfig.primerDia = paisConfig.primerDia
   }
   ↓
4. Valores personalizados se descartan
   ↓
5. Campos vuelven a read-only con valores de Chile
```

---

## Configuración de Chile

### Valores por Defecto (PAISES_CONFIG['cl'])

```typescript
{
  nombre: 'Chile',
  currency: 'CLP',              // Peso Chileno (ISO 4217)
  locale: 'es-CL',              // Español de Chile
  idioma: 'Español',            // Idioma UI
  timezone: 'America/Santiago', // UTC-3/-4 (varía por horario de verano)
  primerDia: 'lunes'           // Semana comienza lunes (ISO 8601)
}
```

---

### División Territorial

#### 16 Regiones

| Código | N° Romano | Nombre Completo                                | Nombre Corto              | Comunas |
| ------ | --------- | ---------------------------------------------- | ------------------------- | ------- |
| 15     | XV        | Región de Arica y Parinacota                   | Arica y Parinacota        | 4       |
| 01     | I         | Región de Tarapacá                             | Tarapacá                  | 7       |
| 02     | II        | Región de Antofagasta                          | Antofagasta               | 9       |
| 03     | III       | Región de Atacama                              | Atacama                   | 9       |
| 04     | IV        | Región de Coquimbo                             | Coquimbo                  | 15      |
| 05     | V         | Región de Valparaíso                           | Valparaíso                | 38      |
| 13     | RM        | Región Metropolitana de Santiago               | Metropolitana de Santiago | 52      |
| 06     | VI        | Región del Libertador Gral. Bernardo O'Higgins | O'Higgins                 | 33      |
| 07     | VII       | Región del Maule                               | Maule                     | 30      |
| 16     | XVI       | Región de Ñuble                                | Ñuble                     | 21      |
| 08     | VIII      | Región del Biobío                              | Biobío                    | 33      |
| 09     | IX        | Región de La Araucanía                         | La Araucanía              | 32      |
| 14     | XIV       | Región de Los Ríos                             | Los Ríos                  | 12      |
| 10     | X         | Región de Los Lagos                            | Los Lagos                 | 30      |
| 11     | XI        | Región Aysén del Gral. Carlos Ibáñez del Campo | Aysén                     | 10      |
| 12     | XII       | Región de Magallanes y de la Antártica Chilena | Magallanes y Antártica    | 11      |

**Total**: 346 comunas

---

### Formato de Moneda (CLP)

```typescript
formatCurrency(1234567.89, 'CLP')
// → "$1.234.568"

// Características:
// - Sin decimales (peso no usa centavos)
// - Separador de miles: punto
// - Símbolo: $
// - Redondeo al entero más cercano
```

---

### Formato de Números (es-CL)

```typescript
formatNumber(1234.56, 'es-CL')
// → "1.234,56"

// Características:
// - Separador de miles: punto (.)
// - Separador decimal: coma (,)
```

---

### Formato de Fechas (es-CL)

```typescript
formatDate(new Date('2025-11-06'), 'es-CL', 'long')
// → "6 de noviembre de 2025"

formatDate(new Date('2025-11-06'), 'es-CL', 'short')
// → "06-11-2025"
```

---

### Zona Horaria (America/Santiago)

- **UTC Offset**: UTC-3 (horario de verano) / UTC-4 (horario estándar)
- **Horario de verano**: Septiembre - Abril
- **Horario estándar**: Mayo - Agosto

---

## Tipos y Estructuras de Datos

### UserConfiguration

```typescript
type UserConfiguration = {
  // ===== SELECCIÓN DEL USUARIO =====
  pais: string // Código ISO 3166-1 alpha-2 ('cl', 'ar', etc.)
  region: string // Código de región (específico del país)

  // ===== DERIVADOS AUTOMÁTICAMENTE =====
  currency: string // ISO 4217 ('CLP', 'ARS', 'USD')
  locale: string // BCP 47 ('es-CL', 'es-AR', 'en-US')

  // ===== PERSONALIZABLES (si modoPersonalizado = true) =====
  modoPersonalizado: boolean
  idioma: string // Idioma UI ('Español', 'English', 'Português')
  timezone: string // IANA timezone ('America/Santiago')
  primerDia: string // 'lunes' | 'domingo'
}
```

---

### PaisConfig

```typescript
type PaisConfig = {
  nombre: string // Nombre completo del país
  currency: string // Código ISO 4217
  locale: string // Locale para Intl API
  idioma: string // Idioma por defecto
  timezone: string // IANA timezone
  primerDia: 'lunes' | 'domingo'
}
```

---

### Region (Chile)

```typescript
type Region = {
  codigo: string // Código INE ('13', '05', etc.)
  numero_romano: string // Romano oficial ('XIII', 'V', etc.)
  nombre: string // Nombre completo oficial
  nombre_corto: string // Nombre corto para UI
  comunas: Comuna[]
}
```

---

### Comuna (Chile)

```typescript
type Comuna = {
  codigo: string // Código INE ('13101', '05101', etc.)
  nombre: string // Nombre oficial ('Santiago', 'Valparaíso')
}
```

---

## Uso del Sistema

### Acceso a la Configuración

#### En Componentes

```typescript
'use client'

import { useConfiguration } from '@/hooks/use-configuration'

export function MyComponent() {
  const { configuration, updateConfiguration } = useConfiguration()

  return (
    <div>
      <p>País: {configuration.pais}</p>
      <p>Moneda: {configuration.currency}</p>
      <p>Locale: {configuration.locale}</p>
    </div>
  )
}
```

---

### Actualizar Configuración

#### Cambiar País

```typescript
// Solo cambiar país → derivación automática de todo lo demás
updateConfiguration({ pais: 'cl' })

// Resultado:
// {
//   pais: 'cl',
//   currency: 'CLP',
//   locale: 'es-CL',
//   idioma: 'Español',
//   timezone: 'America/Santiago',
//   primerDia: 'lunes'
// }
```

---

#### Cambiar Región (Chile)

```typescript
updateConfiguration({ region: '13' }) // Región Metropolitana

// Solo actualiza region, NO deriva otros valores
```

---

#### Modo Personalizado

```typescript
// Activar modo personalizado
updateConfiguration({ modoPersonalizado: true })

// Ahora puedes cambiar valores individuales:
updateConfiguration({ idioma: 'English' })
updateConfiguration({ timezone: 'America/New_York' })

// Restaurar automático
updateConfiguration({ modoPersonalizado: false })
// → Re-deriva todo desde PAISES_CONFIG[pais]
```

---

### Uso en Formatters

```typescript
import { useConfiguration } from '@/hooks/use-configuration'
import { formatCurrency, formatNumber, formatDate } from '@/lib/format'

function ProductPrice({ price }: { price: number }) {
  const { configuration } = useConfiguration()

  return (
    <div>
      {/* Usa currency y locale automáticamente */}
      <span>{formatCurrency(price)}</span>

      {/* O pasa explícitamente */}
      <span>{formatCurrency(price, configuration.currency)}</span>
    </div>
  )
}
```

---

### Uso en Formularios de Dirección

```typescript
'use client'

import { useConfiguration } from '@/hooks/use-configuration'
import { getRegiones, getComunasByRegion } from '@/lib/regiones-chile'

export function AddressFields() {
  const { configuration } = useConfiguration()
  const [selectedRegion, setSelectedRegion] = useState('')

  // Solo cargar regiones si es Chile
  const regiones = configuration.pais === 'cl' ? getRegiones() : []
  const comunas = selectedRegion ? getComunasByRegion(selectedRegion) : []

  return (
    <>
      {configuration.pais === 'cl' && (
        <>
          <Select value={selectedRegion} onValueChange={setSelectedRegion}>
            {regiones.map((r) => (
              <SelectItem key={r.codigo} value={r.codigo}>
                {r.nombre_corto}
              </SelectItem>
            ))}
          </Select>

          <Select>
            {comunas.map((c) => (
              <SelectItem key={c.codigo} value={c.codigo}>
                {c.nombre}
              </SelectItem>
            ))}
          </Select>
        </>
      )}
    </>
  )
}
```

---

## Casos de Uso

### Caso 1: Empresa Chilena (Default)

**Escenario**: Usuario nuevo abre la app por primera vez

**Comportamiento**:

```
1. NO existe localStorage → usa DEFAULT_CONFIGURATION
2. Valores iniciales:
   - pais: 'cl'
   - currency: 'CLP'
   - locale: 'es-CL'
   - timezone: 'America/Santiago'
3. Usuario ve interfaz en español con pesos chilenos
4. Puede seleccionar su región (ej: RM)
```

**Archivos involucrados**:

- `lib/contexts/configuration-context.tsx:42-51` (DEFAULT_CONFIGURATION)
- `lib/paises-config.ts:10-18` (valores de Chile)

---

### Caso 2: Usuario con Configuración Especial

**Escenario**: Chileno que trabaja remotamente desde USA

**Solución con Modo Personalizado**:

```
1. País: Chile (para moneda CLP)
2. Modo Personalizado: activado
3. Timezone: America/New_York (manual override)
4. Idioma: Español (mantener)
5. Primer día: domingo (manual override)
```

**Resultado**:

- Precios en CLP
- Fechas en zona horaria de NY
- Interfaz en español
- Calendario comienza en domingo

---

### Caso 3: Agregar Nuevo País (Argentina)

**Pasos**:

1. Agregar configuración en `lib/paises-config.ts`:

```typescript
export const PAISES_CONFIG: Record<string, PaisConfig> = {
  cl: { ... },
  ar: {
    nombre: 'Argentina',
    currency: 'ARS',
    locale: 'es-AR',
    idioma: 'Español',
    timezone: 'America/Buenos_Aires',
    primerDia: 'lunes',
  },
}
```

2. Agregar al selector en `app/settings/general/page.tsx:17-22`:

```typescript
const paises = [
  { value: 'cl', label: 'Chile' },
  { value: 'ar', label: 'Argentina' },
]
```

3. (Opcional) Crear `lib/provincias-argentina.ts` y `lib/provincias-argentina.json`:

```typescript
export type Provincia = {
  codigo: string
  nombre: string
  localidades: Localidad[]
}

export function getProvincias(): Provincia[] { ... }
```

4. Actualizar lógica en `app/settings/general/page.tsx:74-96`:

```typescript
{pais === 'cl' && <RegionSelector />}
{pais === 'ar' && <ProvinciaSelector />}
```

**Resultado**: Sistema automáticamente manejará ARS, es-AR, etc.

---

## Extensibilidad

### Agregar Nuevos Países

El sistema está diseñado para escalabilidad:

**Checklist para Agregar País**:

- [ ] Agregar entry en `PAISES_CONFIG` (lib/paises-config.ts)
- [ ] Agregar a lista de países en Settings (app/settings/general/page.tsx)
- [ ] Si necesita división territorial:
  - [ ] Crear archivo `lib/regiones-{pais}.json`
  - [ ] Crear helpers `lib/regiones-{pais}.ts`
  - [ ] Actualizar UI para mostrar selector condicional
- [ ] Actualizar formatters si usa formato especial
- [ ] Agregar tests para nuevo país

---

### Agregar Nuevos Campos de Configuración

**Ejemplo**: Agregar "formato de hora" (12h vs 24h)

1. **Actualizar Type** (`lib/contexts/configuration-context.tsx:13-27`):

```typescript
export type UserConfiguration = {
  // ... campos existentes
  formatoHora: '12h' | '24h'
}
```

2. **Actualizar DEFAULT_CONFIGURATION** (línea 42-51):

```typescript
const DEFAULT_CONFIGURATION: UserConfiguration = {
  // ... valores existentes
  formatoHora: '24h',
}
```

3. **Actualizar PaisConfig** (`lib/paises-config.ts:1-8`):

```typescript
export type PaisConfig = {
  // ... campos existentes
  formatoHora: '12h' | '24h'
}
```

4. **Actualizar derivación automática** (línea 100-109):

```typescript
if (updates.pais && !newConfig.modoPersonalizado) {
  const paisConfig = PAISES_CONFIG[updates.pais]
  // ... derivaciones existentes
  newConfig.formatoHora = paisConfig.formatoHora
}
```

5. **Agregar a UI** (`app/settings/general/page.tsx`):

```typescript
{modoPersonalizado && (
  <Combobox
    value={formatoHora}
    onValueChange={(value) => updateConfiguration({ formatoHora: value })}
    options={[
      { value: '12h', label: '12 horas (AM/PM)' },
      { value: '24h', label: '24 horas' },
    ]}
  />
)}
```

---

## FAQ

### ¿Por qué localStorage y no database?

**R**: Configuración regional es preferencia de UI del navegador, no del usuario lógico. Un mismo usuario puede tener diferentes configuraciones en diferentes dispositivos (ej: laptop en oficina Chile vs tablet en viaje USA).

Si necesitas sincronización entre dispositivos, puedes:

1. Agregar UserSettings table en Prisma
2. Guardar en DB al cambiar
3. Cargar desde DB en login
4. Usar localStorage como fallback si no hay sesión

---

### ¿Qué pasa si el JSON de regiones-chile.json se corrompe?

**R**: TypeScript validará la estructura en build time. En runtime:

- `getRegiones()` retornará array vacío si falla el parse
- UI manejará gracefully con "No se encontró la región"
- Configuration seguirá funcionando (región es opcional)

---

### ¿Cómo migro usuarios existentes si cambio la estructura de UserConfiguration?

**R**: Agregar migration en `ConfigurationProvider`:

```typescript
React.useEffect(() => {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    const parsed = JSON.parse(stored)

    // MIGRATION: Agregar campos nuevos si no existen
    const migrated = {
      ...DEFAULT_CONFIGURATION,
      ...parsed,
      // Agregar defaults para campos nuevos
      formatoHora: parsed.formatoHora ?? '24h',
    }

    setConfiguration(migrated)
  }
}, [])
```

---

### ¿Por qué primerDia es string y no number (0-6)?

**R**: User-facing value debe ser legible. Internamente puedes convertir:

```typescript
const primerDiaToNumber = {
  'domingo': 0,
  'lunes': 1,
}

// Usar en date pickers:
<Calendar firstDayOfWeek={primerDiaToNumber[configuration.primerDia]} />
```

---

### ¿Puedo tener diferentes configuraciones por módulo?

**R**: Sí. El sistema es global, pero puedes crear contexts específicos:

```typescript
// Para módulo de facturación con moneda fija
export function FacturacionProvider({ children }) {
  const { configuration } = useConfiguration()

  // Override solo para este módulo
  const facturacionConfig = {
    ...configuration,
    currency: 'USD',  // Siempre USD en facturación
  }

  return (
    <FacturacionContext.Provider value={facturacionConfig}>
      {children}
    </FacturacionContext.Provider>
  )
}
```

---

### ¿Cómo testeo componentes que usan useConfiguration()?

**R**: Mock del provider:

```typescript
import { ConfigurationProvider } from '@/lib/contexts/configuration-context'

function renderWithConfig(ui: React.ReactElement, config?: Partial<UserConfiguration>) {
  const defaultConfig = {
    pais: 'cl',
    currency: 'CLP',
    locale: 'es-CL',
    ...config,
  }

  return render(
    <ConfigurationProvider>
      {ui}
    </ConfigurationProvider>
  )
}

// Test
it('muestra precio en CLP', () => {
  renderWithConfig(<ProductPrice price={1000} />)
  expect(screen.getByText('$1.000')).toBeInTheDocument()
})
```

---

### ¿El sistema funciona en SSR (Server Components)?

**R**: Parcialmente. `useConfiguration()` es Client-only (usa localStorage). Para SSR:

**Opción 1**: Detectar país por IP en server

```typescript
// app/page.tsx (Server Component)
import { headers } from 'next/headers'

export default async function Page() {
  const headersList = headers()
  const country = headersList.get('cf-ipcountry') ?? 'cl'  // Cloudflare header

  return <ClientComponent defaultCountry={country} />
}
```

**Opción 2**: Accept-Language header

```typescript
const locale = headersList.get('accept-language')?.split(',')[0] ?? 'es-CL'
```

**Opción 3**: Guardar en cookies (para SSR access)

```typescript
// En ConfigurationProvider
React.useEffect(() => {
  document.cookie = `userCountry=${configuration.pais}; path=/`
}, [configuration.pais])

// En Server Component
import { cookies } from 'next/headers'
const country = cookies().get('userCountry')?.value ?? 'cl'
```

---

## Diagrama Completo de Dependencias

```
app/layout.tsx
  └─ ConfigurationProvider (lib/contexts/configuration-context.tsx)
       ├─ PAISES_CONFIG (lib/paises-config.ts)
       └─ localStorage ('user-configuration')

app/settings/general/page.tsx
  ├─ useConfiguration() (hooks/use-configuration.ts)
  │    └─ ConfigurationContext
  ├─ getRegiones() (lib/regiones-chile.ts)
  │    └─ regiones-chile.json
  └─ IDIOMAS_DISPONIBLES, TIMEZONES_DISPONIBLES (lib/paises-config.ts)

lib/format.ts
  └─ configuration.currency, configuration.locale (vía hook)

components/forms/address-fields.tsx
  ├─ useConfiguration()
  ├─ getRegiones()
  └─ getComunasByRegion()
```

---

## Archivos de Configuración (Summary)

| Archivo                                  | Líneas | Responsabilidad                      | Exports Principales                           |
| ---------------------------------------- | ------ | ------------------------------------ | --------------------------------------------- |
| `lib/contexts/configuration-context.tsx` | 171    | Context provider + lógica derivación | `ConfigurationProvider`, `useConfiguration()` |
| `lib/paises-config.ts`                   | 57     | Config de países + opciones          | `PAISES_CONFIG`, `IDIOMAS_DISPONIBLES`        |
| `lib/regiones-chile.ts`                  | 84     | Helpers para regiones/comunas        | `getRegiones()`, `getComunasByRegion()`       |
| `lib/regiones-chile.json`                | ~1500  | DB de división territorial           | 16 regiones, 346 comunas                      |
| `hooks/use-configuration.ts`             | 12     | Re-export del hook                   | `useConfiguration()`                          |
| `app/settings/general/page.tsx`          | 216    | UI de configuración                  | Componente React                              |

---

## Conclusión

Este sistema de configuración regional proporciona:

✅ **Flexibilidad**: Modo automático + personalizado
✅ **Escalabilidad**: Fácil agregar países
✅ **Type Safety**: TypeScript end-to-end
✅ **Performance**: localStorage (no network requests)
✅ **UX**: Derivación automática inteligente

**Próximos pasos sugeridos**:

1. Agregar tests unitarios para derivación automática
2. Agregar más países (Argentina, México, Colombia)
3. Considerar sincronización con DB para multi-device
4. Agregar formato de hora (12h/24h)

---

**Última actualización**: 2025-11-06
**Versión**: 1.0
**Autor**: Sistema de Configuración Regional v1
