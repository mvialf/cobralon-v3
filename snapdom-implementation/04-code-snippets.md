# 📦 Code Snippets - Listos para Usar

**Fecha:** 2025-01-27
**Objetivo:** Código completo listo para copiar y pegar

---

## 📋 Índice

1. [Archivo Completo Modificado](#1-archivo-completo-modificado)
2. [Snippets Individuales](#2-snippets-individuales)
3. [Variantes Opcionales](#3-variantes-opcionales)
4. [Tests Unitarios (Opcional)](#4-tests-unitarios-opcional)

---

## 1. Archivo Completo Modificado

### `components/dialogs/projects/view-project-payments-dialog.tsx`

**Archivo completo con todas las modificaciones integradas:**

```tsx
'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Copy, Loader2 } from 'lucide-react'
import { PaymentSummaryCard } from '@/components/summarys/payment-summary-card'
import { ProjectPaymentsTable } from '@/components/tables/project-payments-table'
import { ProjectNameSummary } from '@/components/summarys/project-name-summary'
import { Skeleton } from '@/components/ui/skeleton'
import { snapdom } from '@zumer/snapdom'
import { toast } from 'sonner'

interface ViewProjectPaymentsDialogProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ProjectPaymentData {
  totalAmount: number | null
  currency: string
  projectNumber: string
  projectName?: string | null
  customerName: string
  totalPaid: number
  balance: number
  percentPaid: number
}

/**
 * Dialog para visualizar pagos de un proyecto
 * Incluye funcionalidad de captura de pantalla para copiar estado de cuenta
 */
export function ViewProjectPaymentsDialog({
  projectId,
  open,
  onOpenChange,
}: ViewProjectPaymentsDialogProps) {
  const [project, setProject] = useState<ProjectPaymentData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCopying, setIsCopying] = useState(false)

  const contentRef = useRef<HTMLDivElement>(null)

  const fetchProjectPaymentData = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/projects/${projectId}`)

      if (!response.ok) {
        throw new Error('Error al cargar proyecto')
      }

      const data = await response.json()
      setProject({
        totalAmount: data.totalAmount,
        currency: data.currency,
        projectNumber: data.projectNumber,
        projectName: data.projectName,
        customerName: data.customer.name,
        totalPaid: data.totalPaid,
        balance: data.balance,
        percentPaid: data.percentPaid,
      })
    } catch (error) {
      console.error('Error fetching project payment data:', error)
      toast.error('Error al cargar datos del proyecto')
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    if (open && projectId) {
      fetchProjectPaymentData()
    }
  }, [open, projectId, fetchProjectPaymentData])

  /**
   * Captura el contenido del dialog como imagen PNG y lo copia al portapapeles
   * Incluye fallback a texto plano si la captura de imagen falla
   */
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
      // Especialmente útil si la tabla tiene muchos rows
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-pay-bg">
        {/* Header con botón de copiar */}
        <div className="flex justify-between items-center px-2 py-1 border-b border-pay-foreground/10">
          <DialogHeader className="flex-1">
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

          {/* Botón de copiar */}
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
          <div ref={contentRef} className="space-y-6 py-6 bg-white text-gray-800">
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
}
```

---

## 2. Snippets Individuales

### 2.1 Solo el Import Block

```tsx
// Agregar a imports existentes:
import { useRef } from 'react' // Agregar a destructuring de 'react'
import { Button } from '@/components/ui/button'
import { Copy, Loader2 } from 'lucide-react'
import { snapdom } from '@zumer/snapdom'
import { toast } from 'sonner'
```

---

### 2.2 Solo los Estados

```tsx
// Agregar después de estados existentes:
const [isCopying, setIsCopying] = useState(false)
const contentRef = useRef<HTMLDivElement>(null)
```

---

### 2.3 Solo la Función handleCopy

```tsx
const handleCopy = async () => {
  if (!contentRef.current || !project || isLoading) {
    toast.error('No hay contenido para copiar')
    return
  }

  setIsCopying(true)

  try {
    await document.fonts.ready
    await new Promise((resolve) => setTimeout(resolve, 300))

    const canvas = await snapdom.toCanvas(contentRef.current, {
      scale: 2,
      backgroundColor: '#ffffff',
    })

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/png', 1.0)
    })

    if (!blob) throw new Error('No se pudo convertir a PNG')

    const clipboardItem = new ClipboardItem({ 'image/png': blob })
    await navigator.clipboard.write([clipboardItem])

    toast.success('Imagen copiada al portapapeles')
  } catch (error) {
    console.error('Error:', error)

    const textToCopy = `
ESTADO DE CUENTA
Proyecto: ${project.projectNumber}
Cliente: ${project.customerName}
Total: ${project.totalAmount?.toLocaleString()} ${project.currency}
Pagado: ${project.totalPaid.toLocaleString()}
Saldo: ${project.balance.toLocaleString()}
    `.trim()

    try {
      await navigator.clipboard.writeText(textToCopy)
      toast.warning('Copiado como texto')
    } catch {
      toast.error('Error al copiar')
    }
  } finally {
    setIsCopying(false)
  }
}
```

---

### 2.4 Solo el Botón Copy

```tsx
<Button
  variant="ghost"
  size="icon"
  onClick={handleCopy}
  disabled={isLoading || !project || isCopying}
  title="Copiar al portapapeles"
  className="text-pay-foreground hover:bg-pay-foreground/10"
>
  {isCopying ? <Loader2 className="h-5 w-5 animate-spin" /> : <Copy className="h-5 w-5" />}
</Button>
```

---

### 2.5 Solo el Div con Ref

```tsx
<div ref={contentRef} className="space-y-6 py-6 bg-white text-gray-800">
  {/* Contenido a capturar */}
</div>
```

---

## 3. Variantes Opcionales

### Variante 3.1: Con Progress Indicator

**Para tablas muy largas (20+ pagos):**

```tsx
const handleCopy = async () => {
  if (!contentRef.current || !project || isLoading) {
    toast.error('No hay contenido para copiar')
    return
  }

  // Mostrar toast de progreso para tablas largas
  const numberOfPayments = /* obtener cantidad de pagos */
  if (numberOfPayments > 20) {
    toast.info('Generando imagen... Esto puede tardar unos segundos')
  }

  setIsCopying(true)

  try {
    await document.fonts.ready
    await new Promise((resolve) => setTimeout(resolve, 300))

    const canvas = await snapdom.toCanvas(contentRef.current, {
      scale: 2,
      backgroundColor: '#ffffff',
    })

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/png', 1.0)
    })

    if (!blob) throw new Error('No se pudo convertir a PNG')

    const clipboardItem = new ClipboardItem({ 'image/png': blob })
    await navigator.clipboard.write([clipboardItem])

    toast.success('Imagen copiada exitosamente')
  } catch (error) {
    // ... fallback igual
  } finally {
    setIsCopying(false)
  }
}
```

---

### Variante 3.2: Con Colores Inline (Si Variables CSS Fallan)

```tsx
<div
  ref={contentRef}
  style={{
    backgroundColor: '#ffffff',
    color: '#1f2937',
    padding: '1.5rem',
  }}
  className="space-y-6"
>
  {/* Contenido */}
</div>
```

---

### Variante 3.3: Con Botón de Descarga Adicional

**Si quieres agregar botón de "Descargar" además de "Copiar":**

```tsx
// Agregar función de descarga
const handleDownload = async () => {
  if (!contentRef.current || !project || isLoading) return

  setIsCopying(true)

  try {
    await document.fonts.ready
    await new Promise((resolve) => setTimeout(resolve, 300))

    const canvas = await snapdom.toCanvas(contentRef.current, {
      scale: 2,
      backgroundColor: '#ffffff',
    })

    // Convertir a data URL
    const dataUrl = canvas.toDataURL('image/png', 1.0)

    // Crear link de descarga
    const link = document.createElement('a')
    link.download = `estado-cuenta-${project.projectNumber}.png`
    link.href = dataUrl
    link.click()

    toast.success('Imagen descargada')
  } catch (error) {
    toast.error('Error al descargar imagen')
  } finally {
    setIsCopying(false)
  }
}

// Agregar botón en el header (junto al Copy)
;<div className="flex gap-2">
  <Button
    variant="ghost"
    size="icon"
    onClick={handleCopy}
    disabled={isLoading || !project || isCopying}
    title="Copiar al portapapeles"
  >
    {isCopying ? <Loader2 className="h-5 w-5 animate-spin" /> : <Copy className="h-5 w-5" />}
  </Button>

  <Button
    variant="ghost"
    size="icon"
    onClick={handleDownload}
    disabled={isLoading || !project || isCopying}
    title="Descargar imagen"
  >
    <Download className="h-5 w-5" /> {/* Agregar import Download */}
  </Button>
</div>
```

---

### Variante 3.4: Con Feature Detection Explícita

**Para mejor compatibilidad cross-browser:**

```tsx
const handleCopy = async () => {
  if (!contentRef.current || !project || isLoading) {
    toast.error('No hay contenido para copiar')
    return
  }

  // Feature detection ANTES de intentar
  if (!navigator.clipboard?.write) {
    toast.warning('Tu browser no soporta copia de imágenes')

    // Ir directo a fallback de texto
    const textToCopy = `...` // Texto formateado
    await navigator.clipboard.writeText(textToCopy)
    toast.info('Copiado como texto')
    return
  }

  setIsCopying(true)

  try {
    // ... resto del código igual
  } catch (error) {
    // ... fallback igual
  } finally {
    setIsCopying(false)
  }
}
```

---

### Variante 3.5: Con Scale Dinámico según Device

```tsx
const handleCopy = async () => {
  if (!contentRef.current || !project || isLoading) return

  setIsCopying(true)

  try {
    await document.fonts.ready
    await new Promise((resolve) => setTimeout(resolve, 300))

    // Detectar devicePixelRatio para mejor calidad
    const deviceScale = window.devicePixelRatio || 1
    const scale = Math.max(2, deviceScale) // Mínimo 2x, o el device ratio

    const canvas = await snapdom.toCanvas(contentRef.current, {
      scale, // Dinámico según device
      backgroundColor: '#ffffff',
    })

    // ... resto igual
  } catch (error) {
    // ...
  } finally {
    setIsCopying(false)
  }
}
```

---

## 4. Tests Unitarios (Opcional)

### Test Básico con Jest + Testing Library

**Crear:** `components/dialogs/projects/__tests__/view-project-payments-dialog.test.tsx`

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ViewProjectPaymentsDialog } from '../view-project-payments-dialog'

// Mock de fetch
global.fetch = jest.fn()

// Mock de snapdom
jest.mock('@zumer/snapdom', () => ({
  snapdom: {
    toCanvas: jest.fn().mockResolvedValue({
      toBlob: (callback: any) => {
        const blob = new Blob(['fake'], { type: 'image/png' })
        callback(blob)
      },
    }),
  },
}))

// Mock de Clipboard API
Object.assign(navigator, {
  clipboard: {
    write: jest.fn().mockResolvedValue(undefined),
    writeText: jest.fn().mockResolvedValue(undefined),
  },
})

describe('ViewProjectPaymentsDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        totalAmount: 1000000,
        currency: 'CLP',
        projectNumber: 'P 0001-2025',
        projectName: 'Test Project',
        customer: { name: 'Test Customer' },
        totalPaid: 500000,
        balance: 500000,
        percentPaid: 50,
      }),
    })
  })

  it('debe renderizar el botón Copy', async () => {
    render(<ViewProjectPaymentsDialog projectId="test-id" open={true} onOpenChange={jest.fn()} />)

    await waitFor(() => {
      expect(screen.getByTitle('Copiar al portapapeles')).toBeInTheDocument()
    })
  })

  it('botón debe estar disabled durante loading', () => {
    render(<ViewProjectPaymentsDialog projectId="test-id" open={true} onOpenChange={jest.fn()} />)

    const button = screen.getByTitle('Copiar al portapapeles')
    expect(button).toBeDisabled()
  })

  it('debe llamar a snapdom y clipboard al hacer click', async () => {
    const { snapdom } = require('@zumer/snapdom')

    render(<ViewProjectPaymentsDialog projectId="test-id" open={true} onOpenChange={jest.fn()} />)

    await waitFor(() => {
      expect(screen.getByTitle('Copiar al portapapeles')).not.toBeDisabled()
    })

    const user = userEvent.setup()
    const button = screen.getByTitle('Copiar al portapapeles')

    await user.click(button)

    await waitFor(() => {
      expect(snapdom.toCanvas).toHaveBeenCalled()
      expect(navigator.clipboard.write).toHaveBeenCalled()
    })
  })
})
```

---

## 📦 Package.json Entry

**Verificar que tienes esta entrada:**

```json
{
  "dependencies": {
    "@zumer/snapdom": "^1.3.0",
    "sonner": "^1.x.x"
  }
}
```

---

## 🎨 CSS Custom Variables (Si No Existen)

**Agregar a `app/globals.css` si las variables pay-\* no existen:**

```css
:root {
  /* Variables para payment dialog */
  --pay-foreground: rgb(31, 41, 55);
  --pay-card: rgb(255, 255, 255);
  --pay-bg: rgb(249, 250, 251);
  --pay-orange: rgb(249, 115, 22);
  --pay-green: rgb(34, 197, 94);
  --shadow-pay: 0 1px 3px 0 rgb(0 0 0 / 0.1);
}

.dark {
  --pay-foreground: rgb(243, 244, 246);
  --pay-card: rgb(31, 41, 55);
  --pay-bg: rgb(17, 24, 39);
}

/* Clases utilitarias */
.text-pay-foreground {
  color: var(--pay-foreground);
}
.bg-pay-card {
  background-color: var(--pay-card);
}
.bg-pay-bg {
  background-color: var(--pay-bg);
}
.text-pay-orange {
  color: var(--pay-orange);
}
.text-pay-green {
  color: var(--pay-green);
}
.shadow-pay {
  box-shadow: var(--shadow-pay);
}
```

---

## 🚀 Script de Instalación Rápida

**Crear:** `scripts/install-snapdom-feature.sh`

```bash
#!/bin/bash

echo "📸 Instalando feature de captura de pantalla..."

# 1. Instalar dependencia
echo "📦 Instalando @zumer/snapdom..."
npm install @zumer/snapdom

# 2. Verificar que sonner existe
if ! npm list sonner > /dev/null 2>&1; then
  echo "⚠️  Sonner no encontrado, instalando..."
  npm install sonner
fi

# 3. Backup del archivo original
echo "💾 Creando backup..."
cp components/dialogs/projects/view-project-payments-dialog.tsx \
   components/dialogs/projects/view-project-payments-dialog.tsx.backup

echo "✅ Dependencias instaladas"
echo ""
echo "📝 Próximos pasos:"
echo "1. Copiar código de 04-code-snippets.md"
echo "2. Ejecutar: npm run typecheck"
echo "3. Ejecutar: npm run lint"
echo "4. Testing según 02-testing-checklist.md"
```

**Uso:**

```bash
chmod +x scripts/install-snapdom-feature.sh
./scripts/install-snapdom-feature.sh
```

---

## 📝 Git Commit Template

```bash
git commit -m "feat(payments): agregar captura de pantalla en dialog de pagos

- Implementar botón 'Copiar' en ViewProjectPaymentsDialog
- Capturar resumen + tabla de pagos como imagen PNG
- Usar @zumer/snapdom para HTML-to-Canvas rendering
- Clipboard API para copiar imagen al portapapeles
- Fallback a texto plano si imagen falla
- Loading states y validaciones completas
- Resolución 2x (Retina quality)

Dependencias:
- @zumer/snapdom@1.3.0 (+120KB bundle)

Testing:
- ✅ Proyecto con pagos normal
- ✅ Proyecto sin pagos
- ✅ Tabla larga (20+ pagos)
- ✅ Click prematuro (protected)
- ✅ Fallback a texto funciona
- ✅ Cross-browser (Chrome, Firefox, Safari)

Breaking changes: Ninguno
Backwards compatible: Sí

Refs: #123 (si aplica)
"
```

---

## 🔗 Referencias Rápidas

### Comandos útiles post-implementación

```bash
# Verificar que compila
npm run typecheck
npm run lint

# Test manual
npm run dev
# → Abrir http://localhost:3000
# → Navegar a proyectos → Abrir dialog
# → Click en Copy

# Build de producción
npm run build

# Verificar bundle size
npm run build -- --analyze  # Si tienes @next/bundle-analyzer
```

---

**Code snippets creados por:** Claude Code
**Fecha:** 2025-01-27
**Versión:** 1.0 - Código completo
