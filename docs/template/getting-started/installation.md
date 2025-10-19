# Instalación y Setup

Guía rápida para empezar a usar el template SaaS.

## Requisitos

- **Node.js**: >= 20.x (recomendado: 20.19.4)
- **npm**: >= 10.x (gestor de paquetes del proyecto)

## Paso 1: Clonar/Descargar el Template

```bash
# Si es un repo git
git clone <url-del-repo>
cd saas-layout

# O descarga el ZIP y descomprime
```

## Paso 2: Instalar Dependencias

```bash
npm install
```

Esto instalará todas las dependencias listadas en [package.json](../../../package.json).

## Paso 3: Iniciar Servidor de Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Paso 4: Explorar la Estructura

```
saas-layout/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Homepage (usa AppLayout)
│   └── layout.tsx         # Root layout
├── components/
│   ├── layout/            # AppLayout, HeaderNav, AppSidebar
│   └── ui/                # 50 componentes shadcn/ui
├── lib/
│   └── utils.ts           # Utilidad cn()
└── docs/                  # Esta documentación
```

## Siguiente Paso

Lee [Crear Tu Primera Página](first-page.md) para empezar a construir.

---

## Troubleshooting

### Puerto 3000 ya en uso

Cambia el puerto:

```bash
npm run dev -- -p 3001
```

### Errores de TypeScript en build

El template tiene `ignoreBuildErrors: true` en [next.config.mjs](../../../next.config.mjs#L6).
Para producción, cambia a `false` y corrige errores.

## Comandos Disponibles

```bash
npm run dev        # Desarrollo (localhost:3000)
npm run build      # Build de producción
npm start      # Servidor de producción (requiere build previo)
npm run lint       # Ejecutar ESLint
```

## Agregar Componentes shadcn/ui

```bash
# Ver lista disponible
npx shadcn@latest add

# Agregar componente
npx shadcn@latest add calendar
```

## Configuración Adicional

### Cambiar Puerto por Defecto

Crea `.env.local`:

```env
PORT=3001
```

### Configurar Base Path

Edita [next.config.mjs](../../../next.config.mjs):

```javascript
const nextConfig = {
  basePath: '/mi-app', // Para deployar en subdirectorio
}
```

---

**¿Siguiente paso?** → [Crear Tu Primera Página](first-page.md)
