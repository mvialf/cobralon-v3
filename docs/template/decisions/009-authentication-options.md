# ADR-009: No Incluir Autenticación por Defecto

## Estado

**Aceptado**

**Fecha:** 2025-10-19

## Contexto

Los templates reutilizables deben balancear dos objetivos contradictorios:

1. **"Batteries included"**: Facilitar el inicio rápido con features comunes
2. **Flexibilidad**: Evitar decisiones opinadas que limiten casos de uso

La autenticación es una feature **crítica** pero **altamente variable** según el proyecto:

- Diferentes métodos: OAuth, email/password, magic links, SSO, passwordless, etc.
- Diferentes providers: Google, GitHub, Microsoft, custom, etc.
- Diferentes requisitos: 2FA, MFA, biometrics, RBAC, etc.
- Diferentes regulaciones: GDPR, HIPAA, SOC2, etc.

Consideraciones específicas para un **template**:

- **No podemos predecir** qué auth necesita cada usuario
- **Incluir auth por defecto** fuerza una dependencia que muchos no necesitan
- **Diferentes industrias** tienen requisitos radicalmente diferentes
- **Stack preference** varía: algunos prefieren SaaS (Clerk), otros self-hosted (NextAuth)

## Decisión

**NO incluir** autenticación preconfigurada en el template base.

**SÍ incluir** documentación exhaustiva con **3 opciones principales** listas para implementar:

1. **Stack Auth** (recomendado para usuarios de Neon)
2. **NextAuth.js v5** (recomendado para control total)
3. **Clerk** (recomendado para velocidad máxima)

### Entregables

- ✅ Guía completa: `docs/template/guides/authentication-setup.md`
- ✅ Este ADR: `docs/template/decisions/009-authentication-options.md`
- ✅ Comparación objetiva de alternativas
- ✅ Código de ejemplo inline (no archivos separados)
- ✅ Links a documentación oficial actualizada

## Alternativas Consideradas

### Alternativa 1: Incluir Stack Auth por Defecto

**Pros:**

- Setup ultra rápido para usuarios de Neon
- Componentes UI pre-built
- Integración nativa con Neon (ya incluido en template)
- Admin dashboard incluido
- 2FA/MFA sin configuración adicional

**Contras:**

- **Vendor lock-in moderado**: Dependencia de Stack Auth platform
- **No es la opción más popular**: NextAuth tiene más adopción
- **Asume que usas Neon**: Algunos usuarios pueden preferir otra DB
- **Agrega dependencias**: Usuarios que no necesitan auth pagan el costo
- **Stack Auth es relativamente nuevo** (~2 años vs 8+ de NextAuth)

**Por qué NO:**

- Fuerza una decisión opinada en un template que debe ser flexible
- No todos los proyectos necesitan auth inmediatamente
- Stack Auth es excelente **cuando lo necesitas**, pero innecesario antes

### Alternativa 2: Incluir NextAuth.js por Defecto

**Pros:**

- **Más popular y maduro** (8+ años, miles de apps)
- **Zero vendor lock-in**: 100% opensource
- **Máxima flexibilidad**: Customización total
- **Compatible con cualquier DB**: No asume Neon/Prisma

**Contras:**

- **Requiere UI manual**: Debes crear componentes de login/signup
- **Setup más complejo**: 4 tablas en DB, configuración extensa
- **Tiempo de implementación**: 2-3 horas vs 15 min de Stack/Clerk
- **Curva de aprendizaje**: Conceptos como adapters, callbacks, sessions
- **Agrega 4 tablas a DB**: Contamina schema base del template

**Por qué NO:**

- Template debe ser minimal. NextAuth requiere setup significativo
- 4 tablas adicionales en Prisma schema complican el template
- La complejidad de NextAuth es valiosa **cuando necesitas flexibilidad**, pero overhead innecesario si solo quieres login simple

### Alternativa 3: Incluir Clerk por Defecto

**Pros:**

- **Setup más rápido** (10 min)
- **UI completamente pre-built** y customizable
- **Features enterprise** out-of-the-box
- **Admin dashboard** robusto
- **Soporte profesional**

**Contras:**

- **Vendor lock-in alto**: Migrar de Clerk es difícil
- **Costo**: $25/mes después de free tier (10,000 MAU)
- **No es opensource**: SaaS propietario
- **Overkill para MVPs**: Features que quizás nunca uses

**Por qué NO:**

- Template debe evitar vendor lock-in innecesario
- Costo recurrente puede ser problema para muchos usuarios
- Clerk es excelente para **enterprise**, pero excesivo para template general

### Alternativa 4: Incluir Solo Documentación (Sin Código de Ejemplo)

**Pros:**

- Template mínimo (sin código extra)
- Links a docs oficiales (siempre actualizadas)
- Flexibilidad máxima

**Contras:**

- **Poca guía**: Usuarios deben investigar todo
- **Experiencia de inicio lenta**: Sin quick start
- **Inconsistente**: Cada usuario implementa diferente

**Por qué NO:**

- Template debe facilitar desarrollo rápido
- Documentación sola no es suficiente (necesitamos ejemplos)
- Comparación objetiva agrega valor vs solo enlaces

### Alternativa 5: Carpeta `examples/authentication/` con Código Listo

**Pros:**

- Código copy-paste inmediato
- Ejemplos completos de cada opción
- Fácil comparar implementaciones

**Contras:**

- **Se desactualiza rápidamente**: Stack/NextAuth/Clerk cambian APIs
- **Duplica esfuerzo**: Ya hay ejemplos oficiales excelentes
- **Confusión**: Usuarios deben elegir ejemplo vs producción
- **Mantenimiento**: Requiere actualizar 3 implementaciones paralelas

**Por qué NO:**

- Preferimos **documentación con snippets inline** + links a repos oficiales
- Código de ejemplo se vuelve legacy rápidamente
- Ejemplos oficiales de Stack/NextAuth/Clerk son superiores

### Alternativa 6: Sistema de "Installers" (CLI Interactivo)

Similar a T3 Stack (`create-t3-app`):

```bash
npm create saas-template
? Incluir autenticación? (Y/n)
? Proveedor: Stack Auth / NextAuth / Clerk
→ Instala dependencias + configura automáticamente
```

**Pros:**

- **Experiencia guiada** para nuevos usuarios
- **Customización en setup**: Cada proyecto elige
- **Código instalado correctamente**: Sin copy-paste manual

**Contras:**

- **Complejidad masiva**: Requiere CLI tool separado
- **Mantenimiento**: 3x el esfuerzo (Stack + NextAuth + Clerk)
- **Testing**: Cada combinación debe ser probada
- **Scope creep**: Template se convierte en framework

**Por qué NO (por ahora):**

- Fuera del scope de un template simple
- Requiere inversión significativa de desarrollo
- Considerar para **v2.0** si el template gana tracción

## Consecuencias

### Positivas ✅

#### 1. **Template Permanece Ligero y Flexible**

```json
// package.json - Sin dependencias de auth
{
  "dependencies": {
    "next": "^15.5.6",
    "react": "^19.2.0"
    // ... UI dependencies
    // ❌ NO: "next-auth", "@clerk/nextjs", "@stackframe/stack"
  }
}
```

**Beneficio:**

- Bundle size mínimo
- Sin decisiones forzadas
- Cada proyecto agrega solo lo que necesita

#### 2. **Usuarios Eligen la Mejor Opción para Su Caso**

```
Startup MVP → Stack Auth (rapidez)
Enterprise → Clerk (features + soporte)
Opensource Project → NextAuth (zero lock-in)
Regulated Industry → Custom Auth (control total)
```

**Beneficio:** No hay "one size fits all" en auth. Flexibilidad es clave.

#### 3. **Documentación Completa como Valor Agregado**

La guía incluye:

- ✅ Comparación objetiva de pros/cons
- ✅ Cuándo elegir cada opción
- ✅ Setup paso a paso completo
- ✅ Código de ejemplo inline
- ✅ Referencias a docs oficiales
- ✅ Troubleshooting común

**Beneficio:** Los usuarios **aprenden** a tomar decisiones, no solo copian código.

#### 4. **Evitamos Vendor Lock-in del Template**

Si incluimos Stack Auth por defecto:

```tsx
// Usuario se acostumbra a:
import { useUser } from '@stackframe/stack'

// Si migra a NextAuth:
import { useSession } from 'next-auth/react'
// ❌ Breaking change masivo
```

Con documentación, cada usuario elige desde el inicio.

#### 5. **Mantenimiento Simplificado**

**Sin auth incluido:**

```
- Stack Auth actualiza API → Users leen changelog
- NextAuth v5 → v6 → Users migran según necesidad
- Clerk cambia pricing → No afecta template
```

**Con auth incluido:**

```
- Stack Auth breaking change → URGENT: Update template
- NextAuth v6 → Reescribir ejemplo
- Clerk depreca feature → Comunicar a todos los usuarios
```

**Beneficio:** Template no está acoplado al ciclo de release de 3 librerías diferentes.

#### 6. **Usuarios Aprenden Auth Patterns**

La guía **educa** sobre:

- Diferencias entre JWT vs Database sessions
- OAuth flows
- Credential providers
- Session management
- Protected routes con middleware

**Beneficio:** Conocimiento transferible más allá de este template.

### Negativas / Trade-offs ⚠️

#### 1. **Setup Inicial Más Lento**

**Sin auth incluido:**

```
Clone template → npm install → [User lee guía] → Implementa auth → Ready
Time: Clone (1 min) + Install (2 min) + Auth (15-180 min) = 18-183 min
```

**Con auth incluido:**

```
Clone template → npm install → Configure .env → Ready
Time: Clone (1 min) + Install (2 min) + Config (5 min) = 8 min
```

**Diferencia:** +10-175 min según opción elegida.

**Mitigación:**

- Guía optimizada para mínimo 15 min (Stack Auth)
- Usuarios que no necesitan auth aún: Ganan tiempo
- Cuando necesitas auth específico: El tiempo extra vale la pena

#### 2. **Decisión Abrumadora para Principiantes**

**Problema:**

```
Nuevo usuario: "¿Stack Auth? ¿NextAuth? ¿Clerk? ¿Cuál elijo?"
```

**Mitigación:**

- Quick comparison table al inicio de la guía
- **Recomendación clara**: Stack Auth para Neon users
- Flowchart de decisión (futuro enhancement)

#### 3. **Implementación Inconsistente Entre Proyectos**

**Problema:**

Dos proyectos del mismo template pueden tener auth completamente diferente:

```
Proyecto A: Stack Auth
Proyecto B: NextAuth
Proyecto C: Custom implementation
```

**Mitigación:**

- Esto es **feature, no bug**: Flexibilidad es el objetivo
- Empresas pueden crear "company template" con auth preseleccionado

#### 4. **Curva de Aprendizaje para Cada Opción**

**Problema:**

- Stack Auth: Aprender Stack SDK
- NextAuth: Aprender adapters, providers, callbacks
- Clerk: Aprender Clerk components

**Mitigación:**

- La guía incluye ejemplos completos
- Links a docs oficiales detalladas
- Código inline comentado

#### 5. **Sin Ejemplo en Vivo**

**Problema:**

Template no incluye demo funcionando de auth.

**Mitigación:**

- Links a demos oficiales:
  - Stack Auth: https://demo.stack-auth.com
  - NextAuth: https://next-auth.js.org/
  - Clerk: https://clerk.com/demo

## Implementación

### Archivos Creados

```
docs/template/guides/
└── authentication-setup.md       # Guía completa (350+ líneas)

docs/template/decisions/
└── 009-authentication-options.md # Este ADR

CLAUDE.md                                 # Actualizado con sección auth
docs/template/README.md                   # Actualizado con feature
docs/project/implementation/2025-current.md # Nueva entrada
```

### Estructura de la Guía

```markdown
authentication-setup.md
├── Por Qué NO Incluimos Auth
├── Quick Comparison (tabla)
├── Opción A: Stack Auth
│ ├── Cuándo elegir
│ ├── Setup paso a paso
│ ├── Código de ejemplo
│ └── Referencias
├── Opción B: NextAuth
│ ├── Cuándo elegir
│ ├── Setup paso a paso
│ ├── Código de ejemplo
│ └── Referencias
├── Opción C: Clerk
│ ├── Cuándo elegir
│ ├── Setup paso a paso
│ ├── Código de ejemplo
│ └── Referencias
├── Resumen: ¿Cuál Elegir?
└── Siguientes Pasos
```

## Experiencia del Usuario Final

### Usuario Tipo A: "Quiero Auth Rápido"

```bash
# Lee guía → Elige Stack Auth
npm install @stackframe/stack
npx @stackframe/init-stack . --no-browser

# Configura Neon Auth (5 min)
# Crea página de login (5 min)
# Total: 15 min
```

### Usuario Tipo B: "Quiero Control Total"

```bash
# Lee guía → Elige NextAuth
npm install next-auth@beta @auth/prisma-adapter

# Configura schema Prisma (30 min)
# Configura auth.config.ts (30 min)
# Crea UI de login (60 min)
# Total: 2 horas
```

### Usuario Tipo C: "No Necesito Auth Aún"

```bash
# Ignora la guía completamente
# Desarrolla features sin auth
# Agrega auth cuando sea necesario (Mes 2-3)
```

**Beneficio:** Cada usuario toma su propio camino.

## Referencias

- [Stack Auth Documentation](https://docs.stack-auth.com/)
- [NextAuth.js v5 Documentation](https://authjs.dev/)
- [Clerk Documentation](https://clerk.com/docs)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Neon + Stack Auth Guide](https://neon.tech/docs/guides/stack-auth)

## Notas Adicionales

### Revisión Futura (v2.0)

Considerar para futuras versiones:

**Opción: CLI Installer Interactivo**

```bash
npx create-saas-template my-app
? Incluir autenticación? (Y/n) Y
? Proveedor:
  > Stack Auth (Recomendado para Neon)
    NextAuth (Control total)
    Clerk (Velocidad máxima)
    Skip (Agregar después)

→ Instala dependencias
→ Configura archivos base
→ Actualiza .env.example
```

**Pros:**

- Setup completamente guiado
- Elimina decisiones manuales
- Código instalado correctamente

**Contras:**

- Requiere desarrollar CLI tool
- Mantenimiento 3x más complejo
- Testing de combinaciones

**Decisión:** Postponer hasta validar demanda del template.

### Alternativas Emergentes (Monitorear)

**Supabase Auth:**

- Ganando tracción en 2024-2025
- All-in-one (DB + Auth + Storage)
- Considerar si se integra bien con Neon

**Lucia Auth:**

- Lightweight alternative a NextAuth
- TypeScript-first
- Monitorear madurez

### Feedback de Usuarios

Si múltiples usuarios piden:

- ✅ **Auth incluido por defecto** → Reconsiderar
- ✅ **CLI installer** → Priorizar v2.0
- ✅ **Preferencia clara** por una opción → Actualizar recomendación

---

**Última actualización:** 2025-10-19
