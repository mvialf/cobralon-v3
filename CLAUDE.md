# CLAUDE.md

Este archivo proporciona orientación a Claude Code (claude.ai/code) cuando trabaja con código en este repositorio.

**IGNORA LOS SIGUIENTES ARCHIVOS**

- gemini.md
- .gemini/

## Proyecto

Template de layout SaaS construido con Next.js 15, React 19, TypeScript y Tailwind CSS v4. Utiliza shadcn/ui (estilo "new-york") como sistema de componentes y el gestor de paquetes npm.

**📚 Documentación completa:** Ver [docs/template/](docs/template/) y [docs/project/](docs/project/)

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
npm run dev         # Puerto 3002 (Turbopack) - RECOMENDADO
npm run dev:webpack # Puerto 3001 (Webpack) - Alternativo
```

### Documentación de Implementaciones

Después de completar una **implementación significativa** (nueva feature, refactor mayor, integración externa):

1. Actualizar [docs/project/implementation.md](docs/project/implementation.md) con entrada nueva
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

## 📚 Importaciones de Documentación

### 📦 Template Framework (Para Entender el Template)

@docs/template/README.md # Introducción rápida al template
@docs/template/architecture/overview.md # Visión arquitectural general
@docs/template/architecture/stack.md # Stack tecnológico, versiones y configuración
@docs/template/components/app-layout.md # API del AppLayout
@docs/template/components/app-sidebar.md # Configurar sidebar navegación
@docs/template/methodology/workflow.md # Proceso de desarrollo recomendado
@docs/template/methodology/testing.md # Estrategia de testing recomendada
@docs/template/methodology/patterns.md # Patrones de código y anti-patrones
@docs/template/methodology/documentation.md # Cómo usar ADRs + Implementation Log

### 📘 Decisiones Arquitecturales del Template (ADRs)

@docs/template/decisions/001-nextjs-14-app-router.md # Por qué Next.js 15 + App Router
@docs/template/decisions/002-tailwind-css-v4.md # Por qué Tailwind CSS v4
@docs/template/decisions/003-shadcn-ui-new-york.md # Por qué shadcn/ui estilo New York
@docs/template/decisions/004-layout-system-dos-capas.md # Por qué sistema de layout 2 capas

### 🚧 Proyecto Específico (Para Trabajar en Este Código)

@docs/project/README.md # Documentación del proyecto específico
@docs/project/architecture.md # Arquitectura específica de este proyecto
@docs/project/implementation.md # Timeline de implementaciones del proyecto
@docs/project/decisions/ # ADRs específicos del proyecto (inicialmente vacío)

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

- Layouts son client components (`"use client"`)
- Iconos desde `lucide-react`
- Path imports con alias `@/`

## 🗄️ Database: Workflows Híbridos (Opcional)

El template incluye Prisma + Neon PostgreSQL. Puedes trabajar **manualmente** o usar **Neon MCP** (opcional) para acelerar tareas específicas.

### Setup Manual (Recomendado para Aprender)

**Proceso completo:**

1. Ir a [neon.tech](https://neon.tech) y crear proyecto
2. Copiar connection strings (DATABASE_URL + DIRECT_URL)
3. Crear `.env.local` con las credenciales
4. Ejecutar:
   ```bash
   npm run db:generate  # Genera Prisma Client
   npm run db:push      # Aplica schema a DB
   npm run db:seed      # Pobla con data de ejemplo
   ```
5. Verificar en Prisma Studio: `npm run db:studio`

**Tiempo:** 15-20 minutos
**Ventaja:** Entiendes cada paso
**Cuándo:** Primera vez, aprendiendo el stack

Ver guía completa: [docs/template/guides/database-setup.md](docs/template/guides/database-setup.md)

### Setup Asistido con Neon MCP (Opcional)

**Si configuraste Neon MCP** (ver [guía opcional](docs/template/guides/neon-mcp-optional.md)):

```
Usuario: "Claude, crea proyecto Neon para este template:
- Nombre: mi-nuevo-saas
- Región: us-east-2
- Genera .env.local
- Ejecuta setup completo de Prisma"

Claude ejecuta automáticamente:
✅ Crea proyecto en Neon
✅ Actualiza .env.local con connection strings
✅ npm run db:generate && db:push && db:seed
✅ Listo en 2-3 minutos
```

**Tiempo:** 2-3 minutos
**Ventaja:** Rápido para proyectos frecuentes
**Cuándo:** Ya conoces el proceso, quieres velocidad

**Nota:** Siempre **revisas el .env.local generado** antes de continuar.

### Migraciones: Manual vs Asistido

#### Migración Manual

```bash
# 1. Editar schema.prisma (agregar/modificar modelos)
# 2. Aplicar cambios
npm run db:push          # Para desarrollo
# o
npm run db:migrate       # Para producción (crea migración versionada)

# 3. Verificar en Neon dashboard que se aplicó
```

**Riesgo:** Si falla, rollback manual.

#### Migración Asistida (Con Neon MCP)

```
Usuario: "Necesito agregar tabla Posts con campos:
- title (String)
- content (Text)
- authorId (FK a User)
Hazlo en branch temporal primero"

Claude (con Neon MCP):
1. ✅ Crea branch DB temporal: migration-posts-table
2. ✅ Actualiza schema.prisma
3. ✅ Ejecuta migración en branch aislado
4. ⚠️  "Prueba en localhost:3000, confirma si funciona"

Usuario: "Funciona, aplica a main"

Claude:
5. ✅ Merge cambios a branch principal
6. ✅ Elimina branch temporal
```

**Ventaja:** Si algo falla, el branch principal no se afecta. Database branching seguro.

### Debugging de Queries

#### Manual

```bash
# 1. Identificar query lenta en logs
# 2. Copiar query a Neon SQL Editor
# 3. Ejecutar EXPLAIN ANALYZE
# 4. Analizar plan de ejecución
# 5. Agregar índices manualmente
```

#### Asistido (Con Neon MCP)

```
Usuario: "Esta query es lenta:
SELECT * FROM users WHERE email LIKE '%@gmail.com'
¿Qué está mal?"

Claude (usa explain_sql_statement):
✅ Problema: Full table scan (no usa índice)
✅ Sugerencia: El patrón '%...' impide uso de índice
✅ Alternativa: Usar índice trigram o full-text search
✅ ¿Crear índice optimizado?
```

### Cuándo Usar Cada Approach

| Tarea                       | Manual                  | Con Neon MCP              |
| --------------------------- | ----------------------- | ------------------------- |
| **Primera vez aprendiendo** | ✅ Recomendado          | ❌ Puede ocultar detalles |
| **Setup de proyecto nuevo** | ⏱️ 15-20 min            | ⚡ 2-3 min                |
| **Migración simple**        | ✅ Rápido               | 🤷 Innecesario            |
| **Migración riesgosa**      | ⚠️ Sin red de seguridad | ✅ Branch temporal        |
| **Debug de performance**    | ⏱️ Requiere conocer SQL | ⚡ Lenguaje natural       |
| **Desarrollo diario**       | ✅ Prisma Client        | ✅ Prisma Client          |

**Recomendación:** Aprende el proceso **manual** primero. Usa Neon MCP cuando **quieras velocidad** o **seguridad extra** (branches).

## 🔐 Autenticación (Opcional)

El template **NO incluye autenticación** por defecto para máxima flexibilidad. Cada proyecto tiene requisitos diferentes.

### Guía Completa

**Ver:** [docs/template/guides/authentication-setup.md](docs/template/guides/authentication-setup.md)

**Decisión:** [ADR-009: Authentication Options](docs/template/decisions/009-authentication-options.md)

### Quick Comparison

| Opción         | Setup Time | UI Components | Best For                     |
| -------------- | ---------- | ------------- | ---------------------------- |
| **Stack Auth** | 15-30 min  | ✅ Sí         | Usuarios de Neon, velocidad  |
| **NextAuth**   | 2-3 hrs    | ❌ No         | Control total, opensource    |
| **Clerk**      | 10-15 min  | ✅ Sí         | Velocidad máxima, enterprise |

### Opción A: Stack Auth (Recomendado para Neon)

**Quick Start:**

```bash
# 1. Instalar Stack Auth
npx @stackframe/init-stack . --no-browser

# 2. Provisionar Neon Auth (si tienes Neon MCP configurado)
# Claude puede hacerlo automáticamente

# 3. Configurar .env.local
NEXT_PUBLIC_STACK_PROJECT_ID="..."
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY="..."
STACK_SECRET_SERVER_KEY="..."

# 4. Crear página de login
# Ver guía completa para código completo
```

**Componentes:**

```tsx
import { SignIn, UserButton } from "@stackframe/stack"

// Página de login
<SignIn />

// User dropdown en sidebar
<UserButton />
```

### Opción B: NextAuth.js

**Quick Start:**

```bash
npm install next-auth@beta @auth/prisma-adapter

# Requiere agregar 4 modelos a schema.prisma
# Ver guía completa para setup detallado
```

**Ventajas:**

- ✅ Control total sobre UI/UX
- ✅ Zero vendor lock-in
- ✅ Customización extrema

**Desventajas:**

- ⚠️ Debes crear UI manualmente
- ⚠️ Setup más complejo (4 tablas DB)

### Opción C: Clerk

**Quick Start:**

```bash
npm install @clerk/nextjs

# Configurar .env.local con API keys de Clerk
# Ver guía completa
```

**Ventajas:**

- ✅ Setup más rápido
- ✅ UI completa incluida
- ✅ Admin dashboard robusto

**Desventajas:**

- ⚠️ Vendor lock-in alto
- ⚠️ Costo: $25/mes después de free tier

### Cuándo Usar Cada Opción

| Escenario                       | Recomendación |
| ------------------------------- | ------------- |
| Ya usas Neon, quieres rapidez   | Stack Auth    |
| Necesitas control total         | NextAuth      |
| Presupuesto OK, máxima velocidad| Clerk         |
| Proyecto complejo, auth custom  | NextAuth      |
| MVP rápido                      | Stack Auth    |
| Enterprise con presupuesto      | Clerk         |

### Configurar Neon MCP (Opcional)

Si quieres probar el approach asistido:

1. **Obtén tu Neon API Key:**
   - Ve a: https://console.neon.tech/app/settings/api-keys
   - Crea una nueva API key
   - Cópiala (solo se muestra una vez)

2. **Configura la variable de entorno:**

   ```bash
   # Agrega a tu ~/.bashrc o ~/.zshrc
   export NEON_API_KEY="tu-api-key-aqui"

   # Recarga tu shell
   source ~/.bashrc  # o source ~/.zshrc
   ```

3. **Verifica la configuración:**
   - `.mcp.json` ya incluye la configuración de Neon MCP
   - Usa la variable `${NEON_API_KEY}` del shell

4. **Reinicia Claude Code** para que detecte el MCP server

**Importante:**

- El template funciona perfectamente **sin Neon MCP**. Es completamente opcional.
- La API key NO va en `.env.local` (eso es para Next.js, no para MCP)
- Lee más: [docs/template/guides/neon-mcp-optional.md](docs/template/guides/neon-mcp-optional.md)

---

**📖 Documentación Completa:** [docs/template/](docs/template/)
**🚀 Quick Start:** [docs/template/getting-started/installation.md](docs/template/getting-started/installation.md)
**🎨 Componentes:** [docs/template/components/](docs/template/components/)
**📘 ADRs:** [docs/template/decisions/](docs/template/decisions/)
