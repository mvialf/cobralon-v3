# 🐛 Bug: NewProjectDialog Submit No Funciona

## 📋 Resumen Ejecutivo

El formulario de "Nuevo Proyecto" no envía datos al hacer clic en "Guardar Proyecto". El dialog permanece abierto y no se crea ningún proyecto.

**Status:** 🔴 Crítico - Bloquea creación de proyectos
**Introducido en:** Commit `c3e458e` (Tue Oct 21 09:56:21 2025)
**Causa raíz:** Incompatibilidad entre `form="form-id"` pattern + React Hook Form + Radix UI Portals + React 19

---

## 🔍 Síntomas Observados

### Comportamiento Esperado

1. Usuario llena formulario de nuevo proyecto
2. Usuario hace clic en "Guardar Proyecto"
3. Se envía POST request a `/api/projects`
4. Dialog se cierra
5. Proyecto aparece en la tabla

### Comportamiento Actual

1. Usuario llena formulario de nuevo proyecto ✅
2. Usuario hace clic en "Guardar Proyecto" ✅
3. **NADA SUCEDE** ❌
   - No se envía POST request a `/api/projects`
   - No hay errores en consola del navegador
   - No hay errores en servidor
   - Dialog permanece abierto
   - Form parece válido (todos los campos llenos)

---

## 🧪 Reproducción del Bug

### Pasos para Reproducir

```bash
# 1. Iniciar servidor
npm run dev

# 2. Navegar a http://localhost:3000/projects

# 3. Clic en botón "Nuevo Proyecto"

# 4. Llenar formulario:
#    - Cliente: Juan Perez
#    - Proyecto: Proyecto de Prueba E2E
#    - Calle: Av. Principal 123
#    - Región: Metropolitana (RM)
#    - Comuna: Santiago
#    - Subtotal: 100000

# 5. Clic en "Guardar Proyecto"

# 6. Observar: Dialog NO se cierra
```

### Evidencia (Playwright MCP)

```javascript
// Verificación técnica realizada
{
  formExists: true,                    // ✅ Form presente en DOM
  formId: "new-project-form",          // ✅ ID correcto
  hasSubmitHandler: false,             // ❌ No hay handler registrado
  submitButtonExists: true,            // ✅ Botón presente
  submitButtonType: "submit",          // ✅ Tipo correcto
  submitButtonForm: "new-project-form", // ✅ Atributo form correcto
  submitButtonDisabled: false,         // ✅ No está deshabilitado
  formInSameTree: false               // ❌ Form y botón en árboles DOM separados
}
```

**Hallazgo crítico:** `formInSameTree: false` indica que el form y el botón están en diferentes árboles DOM debido a los portales de Radix UI.

---

## 📜 Historial de Cambios

### Commit que Introdujo el Bug

```bash
commit c3e458e92acca946df9589917d8ebe08d432cf27
Author: Mauricio Vial <mvialf@gmail.com>
Date:   Tue Oct 21 09:56:21 2025 -0300

    refactor: migrar NewProjectDialog a ScrollableDialog
```

### Cambios Realizados

**ANTES (Funcionaba):**

```tsx
<Dialog>
  <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
    <DialogHeader>
      <DialogTitle>Nuevo Proyecto</DialogTitle>
      <DialogDescription>...</DialogDescription>
    </DialogHeader>
    <ProjectForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    {/* Botón de submit DENTRO del form (ProjectForm) */}
  </DialogContent>
</Dialog>
```

**DESPUÉS (Roto):**

```tsx
<ScrollableDialog>
  <ScrollableDialogContent className="sm:max-w-[700px]">
    <ScrollableDialogHeader>
      <ScrollableDialogTitle>Nuevo Proyecto</ScrollableDialogTitle>
    </ScrollableDialogHeader>
    <ScrollableDialogBody>
      <ProjectForm
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        showSubmitButton={false} // ❌ Oculta botón interno
        formId="new-project-form" // ❌ Intenta conectar con botón externo
      />
    </ScrollableDialogBody>
    <ScrollableDialogFooter>
      {/* Botón FUERA del form, en portal separado */}
      <Button type="submit" form="new-project-form" disabled={isSubmitting}>
        {isSubmitting ? 'Guardando...' : 'Guardar Proyecto'}
      </Button>
    </ScrollableDialogFooter>
  </ScrollableDialogContent>
</ScrollableDialog>
```

### Archivos Modificados en c3e458e

1. **`components/dialogs/projects/new-project-dialog.tsx`**
   - Migración de `Dialog` → `ScrollableDialog`
   - Movimiento de botón submit de dentro del form → footer del dialog
   - Uso de patrón `form="form-id"` para conectar botón externo

2. **`components/forms/projects/project-form.tsx`**
   - Nueva prop: `showSubmitButton?: boolean` (default: true)
   - Nueva prop: `formId?: string`
   - Botón interno ahora es condicional

---

## 🔧 Análisis Técnico

### Por Qué Falla el Patrón `form="form-id"`

#### 1. React Hook Form + DOM Event Handling

React Hook Form usa `form.handleSubmit()` que:

```tsx
<form onSubmit={form.handleSubmit(handleFormSubmit)}>
```

Este patrón espera capturar el evento `submit` nativo del form.

#### 2. Radix UI Portals

Radix UI renderiza el contenido del dialog en un **portal**:

```html
<body>
  <div id="__next">
    <!-- Aquí está tu app -->
  </div>

  <!-- Portal de Radix UI (fuera del árbol normal) -->
  <div data-radix-portal>
    <div role="dialog">
      <form id="new-project-form">
        <!-- Contenido del form -->
      </form>
      <div>
        <!-- Footer con botón -->
        <button type="submit" form="new-project-form">Guardar</button>
      </div>
    </div>
  </div>
</body>
```

#### 3. React 19 Event System

React 19 cambió cómo propaga eventos en portales. El flujo esperado:

```
Usuario click → Browser dispara submit → React captura evento →
React Hook Form handleSubmit() → Validación Zod → onSubmit callback
```

**Flujo actual (roto):**

```
Usuario click → Browser dispara submit →
React Hook Form NO captura (portal diferente) →
Nada sucede ❌
```

#### 4. FormData vs React Hook Form State

Verificación adicional mostró que FormData nativo tampoco captura los valores:

```javascript
// Valores presentes en FormData nativo:
projectNumber, projectName, phone, street, apartment,
windowsCount, squareMeters, description

// Valores FALTANTES (campos custom):
customerId ❌        // Combobox
date ❌              // DatePicker
subtotal ❌          // CurrencyInput
taxRate ❌           // PercentageInput
region ❌            // Combobox
comuna ❌            // Combobox
projectStatusId ❌   // Combobox
```

Esto confirma que **React Hook Form maneja el estado**, no el HTML nativo.

---

## 💡 Soluciones Propuestas

### Opción 1: Revertir a Botón Interno (Más Simple) ⭐

**Ventaja:** Funciona inmediatamente, zero risk
**Desventaja:** Pierde el footer sticky del ScrollableDialog

```tsx
<ScrollableDialog>
  <ScrollableDialogBody>
    <ProjectForm
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      // showSubmitButton={false}  ❌ REMOVER esta línea
      // formId="new-project-form"  ❌ REMOVER esta línea
    />
  </ScrollableDialogBody>
  <ScrollableDialogFooter>{/* ❌ REMOVER botón del footer */}</ScrollableDialogFooter>
</ScrollableDialog>
```

### Opción 2: Submit Programático con useImperativeHandle (Recomendado) ⭐⭐⭐

**Ventaja:** Mantiene diseño ScrollableDialog + funcionamiento garantizado
**Desventaja:** Requiere modificar ProjectForm

```tsx
// components/forms/projects/project-form.tsx
export interface ProjectFormRef {
  submit: () => void
}

export const ProjectForm = forwardRef<ProjectFormRef, ProjectFormProps>(
  ({ onSubmit, isSubmitting, defaultValues, showSubmitButton }, ref) => {
    const form = useForm<ProjectFormData>({ ... })

    useImperativeHandle(ref, () => ({
      submit: () => {
        form.handleSubmit(handleFormSubmit)()
      }
    }))

    // ... resto del componente
  }
)
```

```tsx
// components/dialogs/projects/new-project-dialog.tsx
import { useRef } from 'react'
import { ProjectFormRef } from '@/components/forms/projects/project-form'

export function NewProjectDialog({ onProjectCreated }: NewProjectDialogProps) {
  const formRef = useRef<ProjectFormRef>(null)

  return (
    <ScrollableDialog>
      <ScrollableDialogBody>
        <ProjectForm
          ref={formRef}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          showSubmitButton={false}
        />
      </ScrollableDialogBody>
      <ScrollableDialogFooter>
        <Button onClick={() => formRef.current?.submit()} disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : 'Guardar Proyecto'}
        </Button>
      </ScrollableDialogFooter>
    </ScrollableDialog>
  )
}
```

### Opción 3: requestSubmit() Nativo (Alternativa)

**Ventaja:** No requiere useImperativeHandle
**Desventaja:** Menos type-safe, más frágil

```tsx
<Button
  onClick={() => {
    const form = document.getElementById('new-project-form') as HTMLFormElement
    form?.requestSubmit()
  }}
  disabled={isSubmitting}
>
  Guardar Proyecto
</Button>
```

### Opción 4: dispatchEvent Manual (No Recomendado)

```tsx
<Button
  onClick={() => {
    const form = document.getElementById('new-project-form')
    const event = new Event('submit', { bubbles: true, cancelable: true })
    form?.dispatchEvent(event)
  }}
>
  Guardar Proyecto
</Button>
```

---

## ✅ Recomendación Final

**Implementar Opción 2 (useImperativeHandle)** porque:

1. ✅ Mantiene el diseño de ScrollableDialog (footer sticky)
2. ✅ Type-safe (TypeScript completo)
3. ✅ Patrón React estándar (no depende de DOM APIs)
4. ✅ Funciona con React 19 + Radix UI portals
5. ✅ Fácil de testear
6. ✅ Reutilizable para otros dialogs similares

---

## 📊 Commits Posteriores (No Afectan)

```bash
b05ec3f - refactor: simplificar AddressFields          ✅ Safe
5f42f3c - refactor: ajustes menores en componentes     ✅ Safe
5ce60da - chore: formateo y mejoras menores            ✅ Safe
```

Estos commits no modificaron la lógica de submit del dialog.

---

## 🧪 Plan de Testing

Una vez implementada la solución:

### Test Manual

1. Crear proyecto nuevo con todos los campos
2. Verificar POST request a `/api/projects`
3. Verificar dialog se cierra
4. Verificar proyecto aparece en tabla
5. Verificar toast de éxito

### Test Playwright (Crear)

```typescript
// tests/e2e/new-project-dialog.spec.ts
import { test, expect } from '@playwright/test'

test('should create new project successfully', async ({ page }) => {
  await page.goto('http://localhost:3000/projects')

  // Abrir dialog
  await page.click('text=Nuevo Proyecto')

  // Llenar form
  await page.click('button:has-text("Selecciona un cliente")')
  await page.click('text=Juan Perez')

  await page.fill('input[name="projectName"]', 'Proyecto E2E Test')
  await page.fill('input[name="street"]', 'Av. Test 123')

  // ... más campos

  // Submit
  await page.click('button:has-text("Guardar Proyecto")')

  // Verificar
  await expect(page.locator('text=Proyecto creado exitosamente')).toBeVisible()
  await expect(page.locator('text=Proyecto E2E Test')).toBeVisible()
})
```

---

## 📎 Referencias

- **Archivos afectados:**
  - `components/dialogs/projects/new-project-dialog.tsx`
  - `components/forms/projects/project-form.tsx`
  - `components/ui/scrollable-dialog.tsx`

- **Documentación relevante:**
  - [React Hook Form - useImperativeHandle](https://react-hook-form.com/docs/useform)
  - [Radix UI - Dialog Portals](https://www.radix-ui.com/primitives/docs/components/dialog)
  - [React 19 - Event System Changes](https://react.dev/blog/2024/04/25/react-19)

- **ADRs relacionados:**
  - `docs/template/decisions/004-layout-system-dos-capas.md`
  - `docs/template/methodology/patterns.md` (Patrón de Diálogos)

---

**Fecha diagnóstico:** 2025-10-22
**Diagnosticado por:** Claude Code + Playwright MCP
**Prioridad:** 🔴 Alta - Bloquea funcionalidad crítica
