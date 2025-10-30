# CaptureDialog

Dialog que permite capturar su contenido como imagen PNG y copiarlo al portapapeles.

## 🎯 Features

- ✅ Captura contenido como imagen PNG (alta calidad, 2x resolution)
- ✅ Copia automáticamente al portapapeles
- ✅ Fallback inteligente a texto plano si falla la captura
- ✅ Theme consistente (independiente de dark/light mode del usuario)
- ✅ Accesible (ARIA compliant)
- ✅ Estados de loading integrados
- ✅ Totalmente customizable

## ⚠️ Estado: Experimental

Este componente está en fase experimental. Validar con ≥3 casos de uso reales antes de marcar como estable.

## 📦 Instalación

El componente ya está incluido en el template. No requiere instalación adicional.

**Dependencia:** `@zumer/snapdom` (ya instalado)

## 🚀 Uso Básico

```tsx
import { CaptureDialog } from '@/components/custom/capture-dialog'

function MyComponent() {
  const [open, setOpen] = useState(false)

  return (
    <CaptureDialog open={open} onOpenChange={setOpen} title="Estado de Cuenta">
      <div className="bg-capture-bg text-capture-foreground p-6">
        <h2 className="text-xl font-bold">Mi contenido</h2>
        <p>Este contenido se capturará como imagen</p>
      </div>
    </CaptureDialog>
  )
}
```

## 📚 Ejemplos

### Ejemplo 1: Uso Simple (Zero Config)

El componente extrae automáticamente el texto del DOM como fallback:

```tsx
<CaptureDialog open={open} onOpenChange={setOpen} title="Resumen de Proyecto">
  <div className="bg-capture-bg text-capture-foreground p-6">
    <h2>Proyecto: P 0001-2025</h2>
    <p>Cliente: Acme Corp</p>
    <p>Total: $1,500,000 CLP</p>
  </div>
</CaptureDialog>
```

### Ejemplo 2: Fallback Custom

Para fallback profesional, provee función `getFallbackText`:

```tsx
<CaptureDialog
  open={open}
  onOpenChange={setOpen}
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

### Ejemplo 3: Controles Personalizados

Reemplaza los botones por defecto:

```tsx
<CaptureDialog
  title="Reporte Completo"
  headerControls={
    <div className="flex items-center gap-2">
      <Button onClick={handlePrint} variant="ghost" size="icon">
        <Printer className="h-5 w-5" />
      </Button>
      <Button onClick={handleDownload} variant="ghost" size="icon">
        <Download className="h-5 w-5" />
      </Button>
      <Button onClick={handleCopy} variant="ghost" size="icon">
        <Copy className="h-5 w-5" />
      </Button>
      <DialogClose asChild>
        <Button variant="ghost" size="icon">
          <X className="h-5 w-5" />
        </Button>
      </DialogClose>
    </div>
  }
>
  <ReportContent />
</CaptureDialog>
```

### Ejemplo 4: Callbacks de Success/Error

```tsx
<CaptureDialog
  title="Datos del Cliente"
  onCopySuccess={() => {
    console.log('¡Imagen copiada!')
    // Analytics, tracking, etc.
  }}
  onCopyError={(error) => {
    console.error('Error:', error)
    // Error logging, telemetry, etc.
  }}
>
  <CustomerData />
</CaptureDialog>
```

### Ejemplo 5: Opciones de Captura Custom

```tsx
<CaptureDialog
  title="Diagrama Técnico"
  captureOptions={{
    scale: 3, // Mayor resolución
    backgroundColor: '#f0f0f0', // Fondo gris claro
  }}
>
  <TechnicalDiagram />
</CaptureDialog>
```

## 🎨 Theming

El componente usa variables CSS `capture-*` que son **independientes del theme del usuario** (siempre light mode):

```css
/* app/globals.css */
--capture-bg: oklch(0.928 0.006 264.531);
--capture-foreground: oklch(0.278 0.033 256.848);
--capture-border: oklch(0.872 0.01 258.338);
/* ... más colores */
```

**Clases Tailwind disponibles:**

- `bg-capture-bg` - Fondo principal
- `text-capture-foreground` - Texto principal
- `border-capture-border` - Bordes
- `bg-capture-card` - Fondo de cards internos
- `bg-capture-orange`, `bg-capture-green`, `bg-capture-blue` - Colores de énfasis

**Razón:** Garantiza que todas las capturas se vean consistentes, sin importar si el usuario tiene dark mode o light mode activado.

## 🔧 Uso Avanzado: Solo el Hook

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

## 📋 API Reference

### `<CaptureDialog>`

| Prop               | Tipo                      | Default                                             | Descripción                         |
| ------------------ | ------------------------- | --------------------------------------------------- | ----------------------------------- |
| `open`             | `boolean`                 | -                                                   | Control de apertura                 |
| `onOpenChange`     | `(open: boolean) => void` | -                                                   | Callback de cambio de estado        |
| `title`            | `string`                  | -                                                   | Título (obligatorio para a11y)      |
| `titleClassName`   | `string`                  | `"sr-only"`                                         | Clase CSS para título               |
| `captureOptions`   | `CaptureOptions`          | `{ scale: 2, backgroundColor: '#fff' }`             | Opciones de captura                 |
| `getFallbackText`  | `() => string`            | DOM extraction                                      | Función para texto de fallback      |
| `onCopySuccess`    | `() => void`              | -                                                   | Callback de éxito                   |
| `onCopyError`      | `(error: Error) => void`  | -                                                   | Callback de error                   |
| `children`         | `ReactNode`               | -                                                   | Contenido a capturar                |
| `headerControls`   | `ReactNode`               | Botones Copy + Close                                | Controles personalizados del header |
| `className`        | `string`                  | `"max-w-xl p-0 max-h-[90vh] overflow-y-auto gap-0"` | ClassName para DialogContent        |
| `contentClassName` | `string`                  | `"bg-capture-bg"`                                   | ClassName para área capturable      |
| `isLoading`        | `boolean`                 | `false`                                             | Deshabilita botón de copiar         |

### `useCaptureDialog(options?)`

**Options:**

```typescript
{
  captureOptions?: {
    scale?: number              // Default: 2
    backgroundColor?: string    // Default: '#ffffff'
  }
  getFallbackText?: () => string
  onSuccess?: () => void
  onError?: (error: Error) => void
}
```

**Returns:**

```typescript
{
  contentRef: RefObject<HTMLDivElement>
  handleCopy: () => Promise<void>
  isCopying: boolean
}
```

## ⚠️ Limitaciones Conocidas

1. **Captura de contenido muy largo (>5000px):**
   - Puede degradar performance
   - Considerar pagination o summary view

2. **Fonts externas:**
   - Requiere espera de `document.fonts.ready`
   - Ya implementado en el hook

3. **Elementos externos (iframes, videos):**
   - No se capturan correctamente
   - Usar screenshots externos si es crítico

## 🐛 Troubleshooting

### La captura está en blanco

**Solución:** Asegúrate de usar clases `bg-capture-*` en tu contenido:

```tsx
<div className="bg-capture-bg text-capture-foreground p-6">{/* Contenido */}</div>
```

### El texto de fallback está mal formateado

**Solución:** Provee función `getFallbackText` custom:

```tsx
getFallbackText={() => `
  TÍTULO
  Campo: ${value}
  Campo 2: ${value2}
`.trim()}
```

### La captura se ve diferente al dialog

**Solución:** El delay de 300ms permite rendering completo. Si aún falla, incrementa:

```tsx
// En use-capture-dialog.ts, línea 115
await new Promise((resolve) => setTimeout(resolve, 500)) // Incrementar a 500ms
```

## 📖 Documentación Adicional

- **ADR:** [docs/template/decisions/011-capture-dialog-pattern.md](../../../docs/template/decisions/011-capture-dialog-pattern.md)
- **Patrones:** [docs/template/methodology/patterns/ui-patterns/capture-dialog.md](../../../docs/template/methodology/patterns/ui-patterns/capture-dialog.md)
- **Ejemplo:** [app/examples/capture-dialog/page.tsx](../../../app/examples/capture-dialog/page.tsx)

## 📜 Licencia

Mismo que el template base.

---

**Última actualización:** 2025-10-29
