# Anti-Patrón: Props Drilling Excesivo

## El Problema

Pasar props a través de múltiples niveles de componentes que no las usan, solo para alcanzar un componente hijo profundo.

## ❌ Incorrecto

```tsx
// Props drilling por 5 niveles
function App() {
  const [user, setUser] = useState(null)

  return <Dashboard user={user} setUser={setUser} />
}

function Dashboard({ user, setUser }) {
  return <Layout user={user} setUser={setUser} />
}

function Layout({ user, setUser }) {
  return <Sidebar user={user} setUser={setUser} />
}

function Sidebar({ user, setUser }) {
  return <UserMenu user={user} setUser={setUser} />
}

function UserMenu({ user, setUser }) {
  // Finalmente se usa aquí
  return <div onClick={() => setUser(null)}>{user?.name}</div>
}
```

**Problemas:**

- ❌ Componentes intermedios acoplados (Dashboard, Layout, Sidebar)
- ❌ Difícil refactorizar estructura
- ❌ Props innecesarias en cada nivel
- ❌ Type signatures complejas

## ✅ Correcto: Context API

```tsx
// contexts/user-context.tsx
'use client'

import { createContext, useContext, useState } from 'react'

const UserContext = createContext(null)

export function UserProvider({ children }) {
  const [user, setUser] = useState(null)

  return <UserContext.Provider value={{ user, setUser }}>{children}</UserContext.Provider>
}

export function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within UserProvider')
  }
  return context
}

// app/layout.tsx
import { UserProvider } from '@/contexts/user-context'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <UserProvider>{children}</UserProvider>
      </body>
    </html>
  )
}

// components/user-menu.tsx
'use client'

import { useUser } from '@/contexts/user-context'

export function UserMenu() {
  const { user, setUser } = useUser()

  return <div onClick={() => setUser(null)}>{user?.name}</div>
}

// Componentes intermedios NO necesitan pasar props
function Dashboard({ children }) {
  return <Layout>{children}</Layout>
}

function Layout({ children }) {
  return <Sidebar>{children}</Sidebar>
}

function Sidebar({ children }) {
  return (
    <div>
      <UserMenu />
      {children}
    </div>
  )
}
```

**Ventajas:**

- ✅ Componentes intermedios desacoplados
- ✅ Fácil refactorizar
- ✅ Solo el componente que necesita el state lo consume
- ✅ Type inference automático con TypeScript

## Cuándo Usar Context vs Props

### ✅ Usa Props cuando:

- Pasas datos a 1-2 niveles
- Los datos son específicos de un componente
- Los datos cambian frecuentemente (performance)

### ✅ Usa Context cuando:

- Pasas datos a >3 niveles
- Múltiples componentes necesitan los mismos datos
- Datos globales (theme, user, auth, config)

## Ejemplo del Template: ConfigurationContext

```tsx
// lib/contexts/configuration-context.tsx
'use client'

import { createContext, useContext, useState } from 'react'

interface ConfigurationContextType {
  pais: string
  currency: string
  locale: string
  setPais: (pais: string) => void
}

const ConfigurationContext = createContext<ConfigurationContextType | undefined>(undefined)

export function ConfigurationProvider({ children }) {
  const [pais, setPais] = useState('CL')

  const currency = pais === 'CL' ? 'CLP' : pais === 'AR' ? 'ARS' : 'USD'
  const locale = pais === 'CL' ? 'es-CL' : pais === 'AR' ? 'es-AR' : 'es-MX'

  return (
    <ConfigurationContext.Provider value={{ pais, currency, locale, setPais }}>
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

// Uso en cualquier componente profundo
function CurrencyInput() {
  const { currency } = useConfiguration()
  return <input placeholder={`Monto en ${currency}`} />
}
```

## Alternativa: State Management Libraries

Para casos muy complejos, considera:

- **Zustand** (ligero, simple)
- **Jotai** (atomic state)
- **Redux** (solo si es absolutamente necesario)

**Ejemplo con Zustand:**

```tsx
// stores/user-store.ts
import { create } from 'zustand'

interface UserState {
  user: User | null
  setUser: (user: User | null) => void
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}))

// Uso directo en cualquier componente
function UserMenu() {
  const { user, setUser } = useUserStore()
  return <div onClick={() => setUser(null)}>{user?.name}</div>
}
```

## Regla de Oro

> **Si pasas props por >3 niveles, considera Context API o state management.**

## Excepciones Válidas

**Componentes altamente reutilizables** pueden recibir props explícitamente:

```tsx
// ✅ OK: Button recibe props directamente (reutilizable)
function Button({ onClick, children, variant }) {
  return (
    <button onClick={onClick} className={getVariantClass(variant)}>
      {children}
    </button>
  )
}
```

## Referencias

- [React Context API](https://react.dev/learn/passing-data-deeply-with-context)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [Jotai Documentation](https://jotai.org/)

---

[← Anterior: Client Components Innecesarios](client-components-unnecessary.md) | [Volver al índice](README.md) | [Siguiente: Lógica de Negocio en Componentes →](business-logic-in-components.md)
