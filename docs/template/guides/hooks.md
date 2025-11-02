# Custom Hooks - Hooks Reutilizables

Custom hooks incluidos en el template para funcionalidad común en aplicaciones React.

## 📍 Ubicación

[`hooks/`](../../../hooks/)

## 🎯 Overview

El template incluye hooks optimizados para casos de uso frecuentes:

- **Type-safe** - TypeScript con generics
- **Production-tested** - Validados en proyectos reales
- **Zero dependencies** - Solo React
- **Well-documented** - JSDoc completo con ejemplos

---

## useDebounce

Hook que "debounces" un valor, retrasando updates hasta que el usuario deja de cambiar el valor por un tiempo determinado.

### 📍 Ubicación

[`hooks/use-debounce.ts`](../../../hooks/use-debounce.ts)

### Signature

```typescript
function useDebounce<T>(value: T, delay: number = 300): T
```

### Parámetros

- `value`: Valor a debounce (cualquier tipo con generic `<T>`)
- `delay`: Delay en milisegundos (default: 300ms)

### Returns

- Valor debounced del mismo tipo que `value`

---

### 🎯 Casos de Uso

#### 1. Search con Debounce

Prevenir queries excesivas mientras el usuario escribe:

```typescript
'use client'
import { useState } from 'react'
import { useDebounce } from '@/hooks/use-debounce'

export function SearchBar() {
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 500)

  // Solo ejecuta query cuando el usuario para de escribir por 500ms
  useEffect(() => {
    if (debouncedSearch) {
      // Fetch results
      fetch(`/api/search?q=${debouncedSearch}`).then(...)
    }
  }, [debouncedSearch])

  return (
    <input
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Buscar..."
    />
  )
}
```

**Beneficio:** Si el usuario escribe "react hooks", se ejecuta 1 query en lugar de 11.

---

#### 2. Auto-save de Forms

Guardar cambios automáticamente con debounce:

```typescript
'use client'
import { useState, useEffect } from 'react'
import { useDebounce } from '@/hooks/use-debounce'

export function AutoSaveForm() {
  const [formData, setFormData] = useState({ title: '', content: '' })
  const debouncedData = useDebounce(formData, 1000)

  // Auto-save 1 segundo después de que el usuario deja de escribir
  useEffect(() => {
    if (debouncedData.title || debouncedData.content) {
      fetch('/api/drafts/save', {
        method: 'POST',
        body: JSON.stringify(debouncedData),
      })
    }
  }, [debouncedData])

  return (
    <form>
      <input
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
      />
      <textarea
        value={formData.content}
        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
      />
      <span className="text-sm text-muted-foreground">Auto-guardando...</span>
    </form>
  )
}
```

---

#### 3. Filter/Sort con Debounce

Prevenir re-renders excesivos en listas:

```typescript
'use client'
import { useState } from 'react'
import { useDebounce } from '@/hooks/use-debounce'

export function ProductList({ products }: { products: Product[] }) {
  const [filterText, setFilterText] = useState('')
  const debouncedFilter = useDebounce(filterText, 300)

  // Solo filtra cuando el usuario deja de escribir
  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(debouncedFilter.toLowerCase())
  )

  return (
    <>
      <input
        value={filterText}
        onChange={(e) => setFilterText(e.target.value)}
        placeholder="Filtrar productos..."
      />
      <ul>
        {filteredProducts.map((product) => (
          <li key={product.id}>{product.name}</li>
        ))}
      </ul>
    </>
  )
}
```

---

#### 4. Resize Listener con Debounce

Prevenir eventos excesivos en window resize:

```typescript
'use client'
import { useState, useEffect } from 'react'
import { useDebounce } from '@/hooks/use-debounce'

export function ResponsiveComponent() {
  const [windowWidth, setWindowWidth] = useState(0)
  const debouncedWidth = useDebounce(windowWidth, 200)

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)

    handleResize() // Initial
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Solo re-renderiza 200ms después de que el usuario termina de resize
  return (
    <div>
      <p>Window width: {debouncedWidth}px</p>
      {debouncedWidth < 768 ? <MobileView /> : <DesktopView />}
    </div>
  )
}
```

---

### 🔧 Cómo Funciona

```typescript
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // Set timeout para actualizar el valor
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Cleanup: cancela el timeout si value cambia antes del delay
    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}
```

**Mecánica:**

1. Usuario cambia `value` → timer inicia
2. Si usuario cambia `value` de nuevo antes de `delay` → timer se cancela y reinicia
3. Si pasan `delay` ms sin cambios → `debouncedValue` se actualiza
4. Componente re-renderiza con nuevo valor

---

### 📊 Performance Impact

#### Sin Debounce

```typescript
// Usuario escribe "react"
// Queries ejecutadas: 5 (r, re, rea, reac, react)
```

#### Con Debounce (300ms)

```typescript
// Usuario escribe "react" rápidamente
// Queries ejecutadas: 1 (react) - después de 300ms
// Ahorro: 80% de queries
```

---

### Testing

Tests completos incluidos en [`hooks/__tests__/use-debounce.test.tsx`](../../../hooks/__tests__/use-debounce.test.tsx).

```bash
# Ejecutar tests
npm test hooks/__tests__/use-debounce.test.tsx

# Coverage:
# - Delay default (300ms)
# - Delay personalizado
# - Cancelación de timeouts anteriores
# - Tipos: string, number, object, array
# - Edge cases: null, undefined, 0ms delay
```

---

### Best Practices

#### ✅ DO

```typescript
// Usar para input del usuario
const debouncedSearch = useDebounce(searchTerm, 500)

// Ajustar delay según caso de uso:
// - Search: 300-500ms (usuario escribiendo)
// - Auto-save: 1000-2000ms (dar tiempo a editar)
// - Resize: 100-200ms (responsivo pero no excesivo)

// Usar en dependencias de useEffect
useEffect(() => {
  fetch(`/api?q=${debouncedValue}`)
}, [debouncedValue]) // ← debounced, no original
```

#### ❌ DON'T

```typescript
// No usar delay muy corto (no debounce)
const debounced = useDebounce(value, 10) // ❌ Demasiado corto

// No usar delay muy largo (UX lenta)
const debounced = useDebounce(searchTerm, 5000) // ❌ Usuario esperará 5 segundos

// No olvidar usar el valor debounced
useEffect(() => {
  fetch(`/api?q=${searchTerm}`) // ❌ Usando original, no debounced
}, [searchTerm])
```

---

### FAQ

#### ¿Cuándo NO usar debounce?

- ❌ Acciones críticas (pagos, submit final de forms)
- ❌ Navegación (clicks en links deben ser inmediatos)
- ❌ Botones de acción (UX debe ser responsive)

**Usa debounce solo para:**

- ✅ Input del usuario (typing, dragging, resizing)
- ✅ Auto-save
- ✅ Live search/filtering

#### ¿Qué delay usar?

| Caso de Uso     | Delay Recomendado | Razón                                      |
| --------------- | ----------------- | ------------------------------------------ |
| Search          | 300-500ms         | Balance entre responsive y performance     |
| Auto-save       | 1000-2000ms       | Dar tiempo al usuario para editar          |
| Filters/Sort    | 200-400ms         | UX responsive pero no excesivo             |
| Window resize   | 100-200ms         | Prevenir eventos excesivos pero responsive |
| Scroll listener | 100-150ms         | Responsive sin sobrecargar                 |

#### ¿Debounce vs Throttle?

- **Debounce:** Espera a que el usuario PARE de interactuar
  - Use case: Search, auto-save
- **Throttle:** Ejecuta a intervalos regulares MIENTRAS el usuario interactúa
  - Use case: Scroll infinito, tracking de mouse

**Template incluye:** `useDebounce` (más común). Para throttle, considera agregar `useThrottle` personalizado.

---

### Otros Hooks Incluidos

| Hook          | Ubicación          | Descripción                              |
| ------------- | ------------------ | ---------------------------------------- |
| `useIsMobile` | `hooks/use-mobile` | Detecta breakpoint mobile (<768px)       |
| `useToast`    | `hooks/use-toast`  | Sistema de notificaciones toast (Sonner) |

Ver archivos individuales para documentación completa.

---

## Referencias

- [React Hooks (Official)](https://react.dev/reference/react)
- [useDebounce Pattern](https://usehooks.com/useDebounce/)
- [Debouncing vs Throttling](https://css-tricks.com/debouncing-throttling-explained-examples/)

---

**Última actualización:** 2025-11-02
