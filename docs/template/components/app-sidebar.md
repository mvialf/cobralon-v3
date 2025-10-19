# AppSidebar

Sidebar colapsible con navegación principal del sistema SaaS.

## Ubicación

[components/layout/app-sidebar.tsx](../../../components/layout/app-sidebar.tsx)

## Características

- **Colapsible**: Se puede colapsar/expandir
- **Estado persistente**: El estado se guarda
- **Responsive**: Drawer en mobile, sidebar permanente en desktop
- **Configuración centralizada**: Arrays `navigationItems` y `settingsItems`

## Configurar Navegación

Edita [app-sidebar.tsx líneas 19-48](../../../components/layout/app-sidebar.tsx#L19-L48):

```tsx
const navigationItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: Home, // De lucide-react
  },
  {
    title: 'Usuarios',
    href: '/users',
    icon: Users,
  },
  // Agregar más items aquí...
]

const settingsItems = [
  {
    title: 'Configuración',
    href: '/settings',
    icon: Settings,
  },
  // ...
]
```

## Agregar Nuevo Link

1. Importar icon de `lucide-react`:

   ```tsx
   import { Home, Users, Plus } from 'lucide-react' // ← Agregar Plus
   ```

2. Agregar al array correspondiente:
   ```tsx
   const navigationItems = [
     // ...items existentes
     {
       title: 'Nuevo Item',
       href: '/nuevo',
       icon: Plus,
     },
   ]
   ```

## Estructura

```
AppSidebar
├── SidebarHeader
│   ├── Logo
│   └── Collapse Trigger
│
├── SidebarContent
│   ├── navigationItems (grupo principal)
│   └── settingsItems (grupo secundario)
│
└── SidebarFooter
    └── User Dropdown Menu
```

## Iconos Disponibles

Usa cualquier icon de [lucide-react](https://lucide.dev/icons/):

- `Home`, `Users`, `Settings`, `FileText`, `BarChart`
- `Mail`, `Bell`, `Search`, `Plus`, `Trash`
- Más de 1000 iconos disponibles

## Props

No tiene props. Configuración interna vía arrays.

## Customización Avanzada

### Agregar Badges a Items

```tsx
{
  title: "Mensajes",
  href: "/messages",
  icon: Mail,
  badge: "3",  // ← Agregar badge
}
```

Luego renderizar en el componente.

### Submenus / Acordeones

Requiere modificar el componente para soportar items anidados.
No incluido por defecto (feature compleja).

## Ver También

- [AppLayout](app-layout.md) - Usa este sidebar
- Icons: https://lucide.dev/icons/
