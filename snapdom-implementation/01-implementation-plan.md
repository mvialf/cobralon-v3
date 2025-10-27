# 📋 Plan de Implementación Paso a Paso

**Fecha:** 2025-01-27
**Duración estimada:** 90 minutos
**Nivel de dificultad:** Medio

---

## 🎯 Objetivo

Implementar funcionalidad de captura de pantalla en `ViewProjectPaymentsDialog` que permita a usuarios copiar el estado de cuenta como imagen PNG al portapapeles.

---

## 📊 Fases de Implementación

### Fase 0: Pre-requisitos y Setup (5 min)

#### Checklist de validación previa

- [ ] Verificar que estás en branch `dev` o crear feature branch
- [ ] Verificar que el proyecto compila sin errores
- [ ] Verificar que tienes permisos npm install
- [ ] Backup del archivo actual (opcional pero recomendado)

#### Comandos

```bash
# 1. Crear branch (opcional)
git checkout -b feature/payment-dialog-screenshot

# 2. Verificar compilación actual
npm run typecheck
npm run lint

# 3. Backup del archivo original
cp components/dialogs/projects/view-project-payments-dialog.tsx \
   components/dialogs/projects/view-project-payments-dialog.tsx.backup

# 4. Verificar que el dialog funciona actualmente
npm run dev
# → Abrir http://localhost:3000
# → Navegar a proyectos → Abrir dialog de pagos
# → Verificar que todo se ve correcto
```

**Resultado esperado:** ✅ Todo compila, dialog funciona normalmente

**Si algo falla:** Solucionar antes de continuar

---

### Fase 1: Instalación de Dependencias (5 min)

#### 1.1 Instalar snapdom

```bash
npm install @zumer/snapdom
```

**Verificar instalación:**

```bash
npm list @zumer/snapdom
# Debe mostrar: @zumer/snapdom@1.3.0 (o similar)
```

#### 1.2 Agregar tipos TypeScript (si no se instalan automáticamente)

```bash
# Si TypeScript se queja de tipos
npm install --save-dev @types/node  # (probablemente ya instalado)
```

#### 1.3 Verificar que el proyecto sigue compilando

```bash
npm run typecheck
# Debe pasar sin errores
```

**Checkpoint:** ✅ Dependencia instalada, proyecto compila

---

### Fase 2: Modificaciones al Archivo Dialog (20-30 min)

#### 2.1 Agregar imports necesarios

**Ubicación:** `components/dialogs/projects/view-project-payments-dialog.tsx`

**ANTES (líneas 1-15):**

```tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PaymentSummaryCard } from '@/components/summarys/payment-summary-card'
import { ProjectPaymentsTable } from '@/components/tables/project-payments-table'
import { ProjectNameSummary } from '@/components/summarys/project-name-summary'
import { Skeleton } from '@/components/ui/skeleton'
```

**DESPUÉS (agregar al final de imports):**

```tsx
'use client'

import { useCallback, useEffect, useState, useRef } from 'react' // ← Agregar useRef
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button' // ← NUEVO
import { Copy, Loader2 } from 'lucide-react' // ← NUEVO
import { PaymentSummaryCard } from '@/components/summarys/payment-summary-card'
import { ProjectPaymentsTable } from '@/components/tables/project-payments-table'
import { ProjectNameSummary } from '@/components/summarys/project-name-summary'
import { Skeleton } from '@/components/ui/skeleton'
import { snapdom } from '@zumer/snapdom' // ← NUEVO
import { toast } from 'sonner' // ← NUEVO (verificar que ya existe en proyecto)
```

**Nota importante sobre toast:**

```bash
# Verificar que sonner está instalado
npm list sonner

# Si NO está instalado (poco probable):
npm install sonner
```

---

#### 2.2 Agregar estado y ref dentro del componente

**Ubicación:** Después de línea 41 (después de `const [isLoading, setIsLoading]`)

**ANTES:**

```tsx
export function ViewProjectPaymentsDialog({
  projectId,
  open,
  onOpenChange,
}: ViewProjectPaymentsDialogProps) {
  const [project, setProject] = useState<ProjectPaymentData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchProjectPaymentData = useCallback(async () => {
    // ...
  }, [projectId])
```

**DESPUÉS:**

```tsx
export function ViewProjectPaymentsDialog({
  projectId,
  open,
  onOpenChange,
}: ViewProjectPaymentsDialogProps) {
  const [project, setProject] = useState<ProjectPaymentData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCopying, setIsCopying] = useState(false)  // ← NUEVO

  const contentRef = useRef<HTMLDivElement>(null)     // ← NUEVO

  const fetchProjectPaymentData = useCallback(async () => {
    // ...
  }, [projectId])
```

---

#### 2.3 Agregar función handleCopy

**Ubicación:** Después de `fetchProjectPaymentData`, antes del primer `useEffect`

**Código completo a insertar:**

```tsx
// Función para copiar contenido al portapapeles
const handleCopy = async () => {
  // Validaciones críticas
  if (!contentRef.current) {
    toast.error('No hay contenido para copiar')
    return
  }

  if (!project) {
    toast.error('No hay datos del proyecto')
    return
  }

  if (isLoading) {
    toast.error('Esperando carga de datos...')
    return
  }

  setIsCopying(true)

  try {
    // Esperar a que todas las fuentes estén cargadas
    await document.fonts.ready

    // Delay opcional para asegurar render completo
    // (especialmente útil si la tabla tiene muchos rows)
    await new Promise((resolve) => setTimeout(resolve, 300))

    // Generar canvas con snapdom
    const canvas = await snapdom.toCanvas(contentRef.current, {
      scale: 2, // Retina quality (2x resolution)
      backgroundColor: '#ffffff', // Fondo blanco sólido
    })

    // Convertir canvas a blob PNG
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/png', 1.0)
    })

    if (!blob) {
      throw new Error('No se pudo convertir a imagen PNG')
    }

    // Copiar al portapapeles
    const clipboardItem = new ClipboardItem({ 'image/png': blob })
    await navigator.clipboard.write([clipboardItem])

    toast.success('Imagen copiada al portapapeles')
  } catch (error) {
    console.error('Error al copiar imagen:', error)

    // Plan B: Copiar como texto si falla la imagen
    const textToCopy = `
ESTADO DE CUENTA
Proyecto: ${project.projectNumber}
Cliente: ${project.customerName}
${project.projectName ? `Nombre: ${project.projectName}` : ''}
Total Proyecto: ${project.totalAmount?.toLocaleString()} ${project.currency}
Total Pagado: ${project.totalPaid.toLocaleString()} ${project.currency}
Saldo Pendiente: ${project.balance.toLocaleString()} ${project.currency}
Porcentaje Pagado: ${project.percentPaid}%
      `.trim()

    try {
      await navigator.clipboard.writeText(textToCopy)
      toast.warning('No se pudo copiar imagen. Copiado como texto.')
    } catch (textError) {
      toast.error('Error al copiar al portapapeles')
    }
  } finally {
    setIsCopying(false)
  }
}
```

---

#### 2.4 Modificar estructura del Dialog para agregar botón

**ANTES (líneas ~78-92):**

```tsx
return (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-pay-bg">
      <DialogHeader>
        <DialogTitle className="text-pay-foreground">ESTADO DE CUENTA</DialogTitle>
        {isLoading ? (
          <DialogDescription className="text-pay-foreground">Cargando...</DialogDescription>
        ) : project ? (
          <ProjectNameSummary
            projectNumber={project.projectNumber}
            customerName={project.customerName}
            projectName={project.projectName}
            className="pt-2"
          />
        ) : null}
      </DialogHeader>

      {isLoading ? (
        // ... skeleton
      ) : project ? (
        <div className="space-y-6 py-6">
          {/* Contenido */}
        </div>
      ) : null}
    </DialogContent>
  </Dialog>
)
```

**DESPUÉS (estructura modificada):**

```tsx
return (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-pay-bg">
      {/* ← NUEVO: Header con botón de copiar */}
      <div className="flex justify-between items-center px-2 py-1 border-b border-pay-foreground/10">
        <DialogHeader className="flex-1">
          <DialogTitle className="text-pay-foreground">ESTADO DE CUENTA</DialogTitle>
          {isLoading ? (
            <DialogDescription className="text-pay-foreground">
              Cargando...
            </DialogDescription>
          ) : project ? (
            <ProjectNameSummary
              projectNumber={project.projectNumber}
              customerName={project.customerName}
              projectName={project.projectName}
              className="pt-2"
            />
          ) : null}
        </DialogHeader>

        {/* ← NUEVO: Botón de copiar */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCopy}
          disabled={isLoading || !project || isCopying}
          title="Copiar al portapapeles"
          className="text-pay-foreground hover:bg-pay-foreground/10"
        >
          {isCopying ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Copy className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Contenido del dialog */}
      {isLoading ? (
        <div className="space-y-6 py-6">
          <Skeleton className="h-32 w-full bg-pay-card" />
          <Skeleton className="h-64 w-full bg-pay-card" />
        </div>
      ) : project ? (
        {/* ← MODIFICADO: Agregar ref aquí */}
        <div
          ref={contentRef}
          className="space-y-6 py-6 bg-white text-gray-800"
        >
          {/* Resumen de Pagos - Variant Dashboard */}
          <PaymentSummaryCard
            variant="dashboard"
            totalAmount={project.totalAmount}
            currency={project.currency}
            totalPaid={project.totalPaid}
            balance={project.balance}
            percentPaid={project.percentPaid}
          />

          {/* Tabla de Pagos */}
          <div className="overflow-x-auto">
            <ProjectPaymentsTable projectId={projectId} hidePaymentMethod />
          </div>
        </div>
      ) : null}
    </DialogContent>
  </Dialog>
)
```

**Cambios clave:**

1. ✅ Header movido dentro de un div flex para incluir botón
2. ✅ Botón Copy agregado con estados disabled correctos
3. ✅ `ref={contentRef}` agregado al contenedor del contenido
4. ✅ Clases `bg-white text-gray-800` agregadas para garantizar captura con colores

---

### Fase 3: Validación Inicial (15 min)

#### 3.1 Compilación TypeScript

```bash
npm run typecheck
```

**Errores comunes esperados:**

**Error 1:** `Cannot find module '@zumer/snapdom'`

```bash
# Solución: Reinstalar
rm -rf node_modules package-lock.json
npm install
```

**Error 2:** `Property 'toBlob' does not exist on type 'HTMLCanvasElement'`

```bash
# Solución: Agregar lib DOM al tsconfig.json
# (probablemente ya está, pero verificar)
```

**Error 3:** Toast no funciona

```bash
# Verificar que sonner está correctamente configurado
# Ver app/layout.tsx o componente raíz
```

---

#### 3.2 Test visual inicial

```bash
npm run dev
```

**Pasos:**

1. Abrir http://localhost:3000
2. Navegar a página de proyectos
3. Abrir un proyecto con pagos
4. Verificar que se ve el botón Copy (icono)
5. Verificar que está disabled mientras carga
6. Verificar que se habilita cuando terminó de cargar

**Checklist visual:**

- [ ] Botón Copy visible en header
- [ ] Icono Copy correcto
- [ ] Botón disabled durante loading
- [ ] Botón enabled después de cargar
- [ ] No hay errores en consola del browser

---

#### 3.3 Test funcional básico

**Pasos:**

1. Click en botón Copy
2. Verificar que muestra spinner (Loader2)
3. Esperar ~1-2 segundos
4. Verificar toast de éxito: "Imagen copiada al portapapeles"
5. Abrir Paint/Photoshop/etc
6. Paste (Ctrl+V / Cmd+V)
7. Verificar que la imagen se pegó correctamente

**Checklist funcional:**

- [ ] Click inicia proceso (spinner visible)
- [ ] Toast de éxito aparece
- [ ] Imagen se pega en aplicación externa
- [ ] Imagen incluye resumen Y tabla
- [ ] Colores se ven correctos
- [ ] Texto es legible (resolución suficiente)

**Si algo falla:** Ir a [03-troubleshooting.md](03-troubleshooting.md)

---

### Fase 4: Testing Exhaustivo (30 min)

Ver [02-testing-checklist.md](02-testing-checklist.md) para lista completa.

**Tests críticos mínimos:**

#### Test 1: Proyecto con datos normales

- [ ] 5-10 pagos
- [ ] Captura exitosa
- [ ] Imagen completa

#### Test 2: Proyecto sin pagos

- [ ] 0 pagos registrados
- [ ] Captura muestra "No hay pagos"
- [ ] Imagen válida

#### Test 3: Proyecto con muchos pagos

- [ ] 20+ pagos
- [ ] Captura TODA la tabla (scroll completo)
- [ ] Tiempo de captura <3 segundos

#### Test 4: Click prematuro

- [ ] Abrir dialog
- [ ] Click inmediato en Copy (antes de cargar)
- [ ] Botón disabled (no hace nada)
- [ ] Cuando carga, botón se habilita

#### Test 5: Fallback a texto

- [ ] Simular error de Clipboard API (DevTools)
- [ ] Verificar que copia texto como fallback
- [ ] Toast warning aparece

---

### Fase 5: Ajustes y Pulido (15 min)

#### 5.1 Ajuste de colores (si es necesario)

**Si los colores no se capturan correctamente:**

```tsx
// Opción A: Agregar colores inline explícitos
<div
  ref={contentRef}
  style={{
    backgroundColor: '#ffffff',
    color: '#1f2937',
    padding: '1.5rem'
  }}
  className="space-y-6"
>
```

**Si CircularProgressChart no se ve:**

```tsx
// Agregar delay adicional
await new Promise((resolve) => setTimeout(resolve, 500)) // 500ms en lugar de 300ms
```

---

#### 5.2 Optimización de UX

**Opción 1: Progress indicator para tablas largas**

```tsx
// Si el proyecto tiene >20 pagos, mostrar indicador
const handleCopy = async () => {
  // ...

  if (allocationsCount > 20) {
    toast.info('Generando imagen... Esto puede tardar unos segundos')
  }

  setIsCopying(true)
  // ...
}
```

**Opción 2: Tooltip descriptivo**

```tsx
<Button
  // ...
  title="Copiar estado de cuenta como imagen"  // ← Más descriptivo
>
```

---

#### 5.3 Validación final de código

```bash
# ESLint
npm run lint

# TypeScript
npm run typecheck

# Build de producción (opcional)
npm run build
```

**Todos deben pasar sin errores.**

---

### Fase 6: Documentación y Commit (10 min)

#### 6.1 Actualizar CHANGELOG (si existe)

```markdown
## [Unreleased]

### Added

- Feature: Botón "Copiar" en dialog de pagos de proyecto
  - Captura estado de cuenta completo como imagen PNG
  - Resolución 2x (Retina quality)
  - Fallback a texto si Clipboard API falla
  - Dependencia: @zumer/snapdom@1.3.0
```

#### 6.2 Commit

```bash
git add components/dialogs/projects/view-project-payments-dialog.tsx
git add package.json package-lock.json

git commit -m "feat(payments): implementar captura de pantalla en dialog de pagos

- Agregar botón 'Copiar' en ViewProjectPaymentsDialog
- Captura resumen + tabla de pagos como imagen PNG
- Usar @zumer/snapdom para renderizado HTML->Canvas
- Clipboard API para copiar imagen al portapapeles
- Fallback a texto plano si imagen falla
- Loading state y validaciones de seguridad
- Resolución 2x para pantallas Retina

Testing:
- ✅ Proyecto con pagos normal
- ✅ Proyecto sin pagos
- ✅ Proyecto con 20+ pagos
- ✅ Click prematuro (protected)
- ✅ Fallback a texto funciona

Refs: #[issue-number] (si aplica)
"
```

---

## 🔄 Estrategia de Rollback

### Si algo sale mal durante implementación

#### Rollback Nivel 1: Revertir archivo

```bash
# Si guardaste backup
cp components/dialogs/projects/view-project-payments-dialog.tsx.backup \
   components/dialogs/projects/view-project-payments-dialog.tsx

# O revertir con git
git checkout HEAD -- components/dialogs/projects/view-project-payments-dialog.tsx
```

#### Rollback Nivel 2: Desinstalar dependencia

```bash
npm uninstall @zumer/snapdom
npm run typecheck  # Verificar que sigue compilando
```

#### Rollback Nivel 3: Revertir commit

```bash
git revert HEAD  # Crea commit que deshace cambios
```

---

### Si funciona en dev pero falla en producción

**Checklist de debugging:**

1. **Verificar HTTPS:**

   ```bash
   # Clipboard API requiere HTTPS en producción
   # Verificar que el deploy usa HTTPS
   ```

2. **Verificar bundle size:**

   ```bash
   # snapdom agrega ~120KB
   npm run build
   # Verificar que no hay warnings de bundle size
   ```

3. **Verificar browser support:**
   - Clipboard API: Chrome 63+, Firefox 63+, Safari 13.1+
   - Canvas API: Universal
   - Si hay usuarios con browsers viejos, el fallback a texto funciona

4. **Verificar variables CSS en producción:**
   - Abrir DevTools → Inspect elemento con `ref`
   - Verificar que `getComputedStyle()` devuelve colores correctos
   - Si no, aplicar colores inline (ver Fase 5.1)

---

## 📊 Checklist de Progreso

**Marcar con ✅ a medida que completas:**

### Setup

- [ ] Branch creada (o en dev)
- [ ] Backup del archivo original
- [ ] Proyecto compila sin errores

### Dependencias

- [ ] @zumer/snapdom instalado
- [ ] sonner verificado (ya existe)
- [ ] TypeScript no muestra errores de tipos

### Código

- [ ] Imports agregados
- [ ] Estado y ref agregados
- [ ] Función handleCopy implementada
- [ ] Estructura del Dialog modificada
- [ ] ref={contentRef} agregado

### Validación

- [ ] TypeScript compila
- [ ] ESLint pasa
- [ ] Botón visible en UI
- [ ] Captura funciona (test básico)

### Testing

- [ ] Test: Proyecto normal ✅
- [ ] Test: Proyecto sin pagos ✅
- [ ] Test: Tabla larga (20+ rows) ✅
- [ ] Test: Click prematuro ✅
- [ ] Test: Fallback a texto ✅

### Finalización

- [ ] Ajustes de colores (si necesario)
- [ ] UX optimizations aplicadas
- [ ] CHANGELOG actualizado
- [ ] Commit realizado

---

## ⏱️ Timeline Estimado

```
00:00 - Fase 0: Pre-requisitos (5 min)
00:05 - Fase 1: Dependencias (5 min)
00:10 - Fase 2: Código (30 min)
00:40 - Fase 3: Validación inicial (15 min)
00:55 - Fase 4: Testing (30 min)
01:25 - Fase 5: Ajustes (15 min)
01:40 - Fase 6: Documentación (10 min)
01:50 - COMPLETO ✅
```

**Total real esperado:** 90-120 minutos (incluye debugging)

---

## 🎯 Criterios de Éxito

### Funcionalidad

- ✅ Botón Copy visible en dialog
- ✅ Captura resumen + tabla completa
- ✅ Imagen se copia al portapapeles
- ✅ Resolución 2x (buena calidad)
- ✅ Fallback a texto funciona

### UX

- ✅ Loading state durante captura
- ✅ Toast feedback apropiado
- ✅ Botón disabled cuando no hay datos
- ✅ Tiempo de captura <3 segundos (tablas normales)

### Código

- ✅ TypeScript sin errores
- ✅ ESLint sin warnings
- ✅ Build de producción exitoso
- ✅ Código documentado (comentarios clave)

---

## 📞 Soporte

**Si tienes problemas durante implementación:**

1. Consultar [03-troubleshooting.md](03-troubleshooting.md)
2. Revisar consola del browser (F12)
3. Verificar Network tab (si hay fetch errors)
4. Revisar este plan paso a paso (puede que hayas saltado algo)

**Problemas comunes:**

- Variables CSS no se capturan → Ver Troubleshooting sección "Problema 2"
- Tabla no se captura completa → Ver Troubleshooting sección "Problema 1"
- Fonts incorrectas → Ver Troubleshooting sección "Problema 3"

---

**Plan creado por:** Claude Code
**Fecha:** 2025-01-27
**Versión:** 1.0 - Plan detallado
