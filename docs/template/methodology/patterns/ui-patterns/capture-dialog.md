# Patrón de Captura de Diálogos (CaptureDialog)

⚠️ **Estado: Experimental** - Validar con ≥3 casos de uso antes de marcar como estable.

## Regla

**Cuando necesites que los usuarios puedan copiar contenido de diálogos como imágenes para compartir fuera de la aplicación, usa el componente `<CaptureDialog>`.**

## Caso de Uso

Perfecto para diálogos que muestran información que usuarios necesitan compartir:

- Estados de cuenta
- Resúmenes de pago
- Reportes de proyecto
- Calendarios de cuotas
- Facturas/recibos

## ✅ Correcto: Uso Básico

```tsx
import { CaptureDialog } from '@/components/custom/capture-dialog'

<CaptureDialog open={open} onOpenChange={setOpen} title="Estado de Cuenta">
  <div className="bg-capture-bg text-capture-foreground p-6">
    <h2 className="text-xl font-bold">Proyecto: P 0001-2025</h2>
    <p>Cliente: Acme Corp</p>
    <p>Total: $1,500,000 CLP</p>
  </div>
</CaptureDialog>
```

## ✅ Mejor: Con Fallback Custom

Para fallback profesional si falla la captura de imagen:

```tsx
<CaptureDialog
  title="Estado de Cuenta"
  getFallbackText={() =>
    `
ESTADO DE CUENTA
Proyecto: ${project.projectNumber}
Cliente: ${customer.name}
Total Proyecto: ${formatCurrency(project.total)}
Total Pagado: ${formatCurrency(project.totalPaid)}
Saldo Pendiente: ${formatCurrency(project.balance)}
  `.trim()
  }
>
  <ProjectSummaryContent project={project} />
</CaptureDialog>
```

## Features del Componente

### Automáticas

- ✅ Captura contenido como imagen PNG (alta calidad)
- ✅ Copia automáticamente al portapapeles
- ✅ Fallback inteligente a texto si falla la imagen
- ✅ Theme consistente (independiente de dark/light mode)

### Configurables

- `title`: Título del diálogo
- `getFallbackText`: Función que genera texto fallback
- `onSuccess`: Callback al copiar exitosamente
- `onError`: Callback en caso de error

## Uso Avanzado: Solo el Hook

Si necesitas lógica de captura sin el wrapper de Dialog:

```tsx
import { useCaptureDialog } from '@/components/custom/capture-dialog'

function MyCustomDialog() {
  const { contentRef, handleCopy, isCopying } = useCaptureDialog({
    getFallbackText: () => generateMyText(),
    onSuccess: () => toast.success('¡Copiado!'),
  })

  return (
    <AlertDialog>
      <AlertDialogContent>
        <Button onClick={handleCopy} disabled={isCopying}>
          {isCopying ? <Loader2 className="animate-spin" /> : <Copy />}
        </Button>

        <div ref={contentRef} className="bg-capture-bg">
          {/* Tu contenido */}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

## Theming

El componente usa variables CSS `capture-*` que son **fijas** (light mode) para consistencia:

```css
/* Clases Tailwind disponibles */
bg-capture-bg           /* Fondo principal */
text-capture-foreground /* Texto principal */
border-capture-border   /* Bordes */
bg-capture-card         /* Cards internos */
```

**Razón:** Todas las capturas se ven profesionales y consistentes, sin importar si el usuario tiene dark mode.

## ❌ Incorrecto

```tsx
// ❌ NO usar clases de theme normal (varían con dark/light)
<div className="bg-background text-foreground">
  {/* Captura se verá diferente según theme del usuario */}
</div>

// ❌ NO implementar captura manualmente en cada dialog
const handleCopy = async () => {
  const canvas = await snapdom.toCanvas(...)
  // Código duplicado, difícil de mantener
}
```

## ✅ Correcto

```tsx
// ✅ Usar clases capture-* para consistencia
<div className="bg-capture-bg text-capture-foreground">
  {/* Siempre se ve igual */}
</div>

// ✅ Usar componente o hook reutilizable
<CaptureDialog>...</CaptureDialog>
```

## Limitaciones Conocidas

1. **Contenido muy largo (>5000px):** Puede degradar performance
2. **Elementos externos (iframes, videos):** No se capturan
3. **Fonts externas:** Requiere espera (ya manejado automáticamente)

## Arquitectura Interna

```
CaptureDialog Component
├── AlertDialog (shadcn/ui wrapper)
├── contentRef (React ref al contenido)
├── useCaptureDialog hook
│   ├── html-to-image (snapdom.toCanvas)
│   ├── Clipboard API (copy blob)
│   └── Fallback text (si falla imagen)
└── Copy Button (con loading state)
```

## Ejemplo Completo

```tsx
// components/dialogs/project-summary-dialog.tsx

import { CaptureDialog } from '@/components/custom/capture-dialog'
import { formatCurrency } from '@/lib/utils'

interface ProjectSummaryDialogProps {
  project: Project
  customer: Customer
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProjectSummaryDialog({
  project,
  customer,
  open,
  onOpenChange,
}: ProjectSummaryDialogProps) {
  return (
    <CaptureDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Resumen de Proyecto"
      getFallbackText={() => `
RESUMEN DE PROYECTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Proyecto: ${project.projectNumber}
Cliente: ${customer.name}
Teléfono: ${customer.phone}

MONTOS
Total Proyecto: ${formatCurrency(project.total)}
Total Pagado: ${formatCurrency(project.totalPaid)}
Saldo Pendiente: ${formatCurrency(project.balance)}

Estado: ${project.status}
Fecha: ${new Date(project.date).toLocaleDateString('es-CL')}
      `.trim()}
    >
      <div className="bg-capture-bg text-capture-foreground p-6 space-y-4">
        <div className="border-b border-capture-border pb-4">
          <h2 className="text-xl font-bold">Proyecto {project.projectNumber}</h2>
          <p className="text-sm">{customer.name}</p>
          <p className="text-sm">{customer.phone}</p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Total Proyecto:</span>
            <span className="font-semibold">{formatCurrency(project.total)}</span>
          </div>
          <div className="flex justify-between">
            <span>Total Pagado:</span>
            <span className="font-semibold">{formatCurrency(project.totalPaid)}</span>
          </div>
          <div className="flex justify-between border-t border-capture-border pt-2">
            <span className="font-bold">Saldo Pendiente:</span>
            <span className="font-bold">{formatCurrency(project.balance)}</span>
          </div>
        </div>

        <div className="bg-capture-card p-3 rounded">
          <p className="text-sm">Estado: {project.status}</p>
          <p className="text-sm">Fecha: {new Date(project.date).toLocaleDateString('es-CL')}</p>
        </div>
      </div>
    </CaptureDialog>
  )
}
```

## Referencias

- **Documentación completa:** [README.md](../../../../components/custom/capture-dialog/README.md)
- **Decisión:** [ADR-011: Capture Dialog Pattern](../../../decisions/011-capture-dialog-pattern.md)
- **html-to-image:** https://github.com/bubkoo/html-to-image

---

[← Anterior: Contenido Wide (Overflow)](wide-content-overflow.md) | [Volver al índice](../README.md) | [Siguiente: Form + Dialog Async Edit →](form-dialog-async-edit.md)
