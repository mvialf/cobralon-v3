# Path Aliases

## Regla

**Usa alias `@/` en lugar de rutas relativas profundas.**

## ✅ Correcto

```tsx
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useConfiguration } from '@/hooks/use-configuration'
```

## ❌ Incorrecto

```tsx
import { Button } from '../../../components/ui/button'
import { cn } from '../../lib/utils'
import { useConfiguration } from '../../../hooks/use-configuration'
```

## Por Qué

### Ventajas

1. **Legibilidad** - Rutas claras y predecibles
2. **Refactoring** - Mover archivos no rompe imports
3. **Mantenibilidad** - Fácil saber dónde está cada módulo
4. **DX** - Autocomplete funciona mejor

### Desventajas de Rutas Relativas

- ❌ Difícil saber la ubicación real del archivo
- ❌ Contar niveles de `../` es propenso a errores
- ❌ Refactoring rompe imports
- ❌ No escala bien en proyectos grandes

## Aliases Configurados

El template tiene los siguientes aliases configurados en `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Mapeo de Rutas

| Alias                 | Ruta Real            |
| --------------------- | -------------------- |
| `@/components`        | `/components`        |
| `@/lib`               | `/lib`               |
| `@/hooks`             | `/hooks`             |
| `@/app`               | `/app`               |
| `@/components/ui`     | `/components/ui`     |
| `@/components/custom` | `/components/custom` |
| `@/components/layout` | `/components/layout` |

## Ejemplos

### Importando Componentes UI

```tsx
// ✅ CORRECTO
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

// ❌ INCORRECTO
import { Button } from '../../../components/ui/button'
```

### Importando Utils

```tsx
// ✅ CORRECTO
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils/format'

// ❌ INCORRECTO
import { cn } from '../../lib/utils'
```

### Importando Hooks

```tsx
// ✅ CORRECTO
import { useConfiguration } from '@/hooks/use-configuration'
import { useIsMobile } from '@/hooks/use-mobile'

// ❌ INCORRECTO
import { useConfiguration } from '../../../hooks/use-configuration'
```

### En Archivos Profundos

```tsx
// app/dashboard/settings/profile/page.tsx

// ✅ CORRECTO - Siempre clara la ubicación
import { UserProfileForm } from '@/components/forms/user-profile-form'
import { AppLayout } from '@/components/layout/app-layout'

// ❌ INCORRECTO - ¿Cuántos niveles?
import { UserProfileForm } from '../../../../components/forms/user-profile-form'
import { AppLayout } from '../../../../components/layout/app-layout'
```

## Configuración IDE

### VSCode

El template incluye configuración para IntelliSense:

```json
// .vscode/settings.json (si existe)
{
  "typescript.preferences.importModuleSpecifier": "non-relative"
}
```

Esto hace que VSCode use automáticamente `@/` en autocompletado.

### WebStorm/IntelliJ

Soporta automáticamente los paths de `tsconfig.json`.

## Excepciones

Las únicas rutas relativas aceptables son:

1. **Archivos en el mismo directorio**

   ```tsx
   // ✅ Aceptable
   import { columns } from './columns'
   import { ProjectForm } from './project-form'
   ```

2. **Subdirectorios inmediatos**
   ```tsx
   // ✅ Aceptable
   import { StatusBadge } from './components/status-badge'
   ```

## Referencias

- [Next.js Path Aliases](https://nextjs.org/docs/app/building-your-application/configuring/absolute-imports-and-module-aliases)
- [TypeScript Path Mapping](https://www.typescriptlang.org/docs/handbook/module-resolution.html#path-mapping)

---

[← Anterior: Server Components](server-components-first.md) | [Volver al índice](../README.md) | [Siguiente: Función cn() →](cn-function.md)
