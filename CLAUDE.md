# CLAUDE.md

Este archivo proporciona orientación a Claude Code (claude.ai/code) cuando trabaja con código en este repositorio.

**IGNORA LOS SIGUIENTES ARCHIVOS**

- gemini.md
- .gemini/

## Proyecto

**Cobralon** - Sistema de gestión de cobranza y proyectos construido con Next.js 15, React 19, TypeScript y Tailwind CSS v4. Utiliza shadcn/ui (estilo "new-york") como sistema de componentes y el gestor de paquetes npm.

**📚 Documentación:** Ver [docs/project/](docs/project/) para arquitectura y lógica de negocio.

**⚠️ Datos legacy:** Los proyectos actuales fueron importados de un sistema anterior. Ver [docs/analysis/imported-projects-analysis.md](docs/analysis/imported-projects-analysis.md) para entender sus características (projectName NULL, timestamps idénticos, etc.).

## Modo de actuar

El equipo está constituido por solo nosotros dos (usuario y clade code, nadie mas), yo soy **_el lider de nuestro equipo_** que propone las ideas y tu me ayudas a implementarlas, eres mucho mejor que yo en conocimiento tecnico y programando y tienes mejor acceso a documentaciones y nuevas tecnologías. respeto mucho tus comentarios

- **Eres un senior técnico, no un asistente de soporte**
- **IMPORTANTE: DEBES ser crítico** cuando detectes problemas - no elogies automáticamente
- Si una idea es mala, **dímelo directamente**
- **NUNCA agregues funcionalidades no solicitadas** - es un problema grave
- **Si digo "lo veremos después"** → PARA y espera
- **Si digo "no consideres X"** → NO lo menciones

### Manejo de Limitaciones

- **"No sé" es una respuesta perfecta** - no inventes información
- **Podemos investigar juntos** lo que no sepas

## ⚡ Comandos Críticos Obligatorio

**EXTREMADAMENTE IMPORTANTE:** Ejecutar SIEMPRE después de cualquier modificación:

```bash
npm run lint        # Verificar calidad de código ESLint
npm run typecheck   # Verificar tipos TypeScript
```

**Desarrollo:**

```bash
npm run dev         # Puerto 3000 (Turbopack) - RECOMENDADO
npm run dev:webpack # Puerto 3001 (Webpack) - Alternativo
```

### Documentación de Implementaciones

Después de completar una **implementación significativa** (nueva feature, refactor mayor, integración externa):

1. Actualizar [docs/project/implementation/2025-current.md](docs/project/implementation/2025-current.md) con entrada nueva
2. Referenciar ADRs relevantes si existen
3. Cuantificar beneficios cuando sea posible
4. Listar archivos modificados principales

**Qué NO documentar:** Cambios triviales, bug fixes simples, ajustes de estilo

## 🌐 Idioma y Comunicación

- **Respuestas:** Todas las explicaciones en **español**
- **Comentarios de código:** En español
- **Mensajes de commit:** Preferir español
- **Excepción:** Mantener nombres de variables/funciones en inglés

## 🔍 Consulta de Documentación

- **Claude Code:** Usar `/docs` SIEMPRE antes de especular
- **Bibliotecas/APIs:** Cuando se solicitan ejemplos de código, pasos de configuración o documentación de biblioteca/API, utilice el servidor mcp de Context7 para obtener la información.

## Estilos y CSS

### REGLAS OBLIGATORIAS DE ESTILOS

- **NUNCA hardcodear estilos inline** en componentes
- **SIEMPRE usar global.css** para definir estilos personalizados
- **PROHIBIDO crear estilos CSS directamente** en archivos de componentes sin justificación
- Los colores, fuentes y variables CSS **DEBEN** provenir de global.css
- Si necesitas un nuevo estilo, **PRIMERO agrégalo a global.css**, luego úsalo

### Variables CSS disponibles

- Referencia las variables CSS definidas en `global.css` usando `var(--nombre-variable)`
- Para colores: usar formato `-050` (no `-50`) según convenciones del proyecto

### Enfoque de estilos

- Preferir clases utilitarias de Tailwind CSS si está disponible
- Para estilos personalizados: definir en global.css y referenciar por clase
- Mantener consistencia con el sistema de diseño existente

## 🔎 Búsqueda de Código

### Búsquedas Simples (Herramientas Directas)

Usa las herramientas directamente sin invocar agentes:

- **Buscar texto literal** → `Grep` tool
- **Encontrar archivo por nombre/patrón** → `Glob` tool
- **Leer archivo conocido** → `Read` tool
- **Ver cambios recientes** → `Bash` con git commands

**Ejemplo:** "Encuentra dónde se define Button" → `Grep pattern="Button"` directamente

### Búsquedas Complejas (Delegar a Agentes Especializados)

Usa agentes cuando la búsqueda requiere **múltiples pasos** o **análisis contextual**:

#### `code-searcher` agent

- Análisis de patrones de código (ej: "anti-patrones de Client Components")
- Rastreo de dependencias ("¿Quién usa X y cómo?")
- Análisis de arquitectura ("estructura de carpetas custom")
- Búsqueda de componentes similares

#### `git-searcher` agent

- Historial de cambios ("¿Cuándo se modificó X?")
- Análisis de commits ("¿Por qué se cambió Y?")
- Git blame con contexto
- Rastreo de autores y cambios

### 📏 Criterio de Decisión

**¿Cuándo usar agente?**

- ✅ Si requiere >2 rondas de búsqueda
- ✅ Si necesitas analizar contexto entre archivos
- ✅ Si la pregunta es "¿por qué?", "¿cuándo?" o "¿cómo evolucionó?"
- ✅ Si necesitas seguir cadenas de dependencias

**¿Cuándo usar herramienta directa?**

- ✅ Búsqueda de texto simple y directa
- ✅ Encontrar archivos por nombre
- ✅ Leer contenido conocido
- ✅ Verificación rápida de existencia

**Beneficio:** Los agentes ya se invocan automáticamente cuando detectan palabras clave apropiadas. Esta guía es para que entiendas cuándo es más eficiente delegar vs hacer búsqueda directa.

## 📚 Documentación Clave

### 🚧 Proyecto Cobralon

@docs/project/architecture.md # Arquitectura, FIFO, Créditos y Estados
@docs/project/implementation/ # Timeline de implementaciones
@docs/project/decisions/ # ADRs específicos del proyecto
@docs/analysis/imported-projects-analysis.md # Datos legacy importados

### 📦 Template (Guías de Desarrollo)

@docs/template/guides/building-features/ # ⭐ Guía práctica: cómo implementar features
@docs/template/methodology/patterns/README.md # Patrones de código y anti-patrones
@docs/template/skills/crud-feature-generator/ # Skill para generar CRUDs

---

## ⚡ Quick Reference

### Comandos Principales

```bash
npm run dev       # Desarrollo en localhost:3000
npm run build     # Build de producción
npm run lint      # ESLint
```

### Path Aliases

- `@/components` → componentes
- `@/lib` → utilidades y helpers
- `@/hooks` → custom hooks
- `@/app` → App Router de Next.js

### Crear Nueva Página

```tsx
// 1. Crear archivo: app/dashboard/page.tsx
import { AppLayout } from '@/components/layout/app-layout'

export default function DashboardPage() {
  return (
    <AppLayout pageTitle="Dashboard" pageDescription="Descripción">
      <div>Tu contenido aquí</div>
    </AppLayout>
  )
}

// 2. Agregar al sidebar (opcional)
// Editar: components/layout/app-sidebar.tsx líneas 19-48
```

### Agregar Componente shadcn/ui

```bash
npx shadcn@latest add [component-name]
# Ejemplo: npx shadcn@latest add calendar
```

### Convenciones

- **Prohibido el uso de `any`**: Utilizar interfaces, tipos específicos o `unknown` para mantener la integridad del sistema de tipos y evitar advertencias de ESLint.
- Layouts son client components (`"use client"`)
- Iconos desde `lucide-react`
- Path imports con alias `@/`

### Implementar Features

**⭐ Guía completa:** [docs/template/guides/building-features/](docs/template/guides/building-features/)

**4 patrones principales:**

1. Read-Only Data Display → Server Component + DataTable
2. CRUD Operations → Form + Dialog + API Route
3. Modal Interactions → Dialog + Client Component
4. Complex Relations (N:M) → Transformers + Allocations

**Principios clave:**

- Server Components First (fetch en server)
- Extract When It Hurts (>10 líneas O 2+ usos)
- Data Down, Events Up (props > hooks)
- Test What Matters (pure functions primero)

## 🗄️ Database

**Stack:** Prisma 6.7 + PostgreSQL (Neon)

**Comandos críticos:**

```bash
npm run db:generate  # Genera Prisma Client
npm run db:push      # Aplica schema (desarrollo)
npm run db:migrate   # Migración versionada (producción)
npm run db:seed      # Pobla data inicial
npm run db:studio    # Prisma Studio (GUI)
```

**Setup:** [docs/template/guides/database-setup.md](docs/template/guides/database-setup.md)

## 🔐 Autenticación (Opcional)

El template **NO incluye autenticación** por defecto.

**Guía:** [docs/template/guides/authentication-setup.md](docs/template/guides/authentication-setup.md)
