# ADR-011: CaptureDialog Pattern - Captura de Contenido como Imagen

## Estado

**Aceptado** (Experimental)

Validar con ≥3 casos de uso reales antes de marcar como estable.

## Decisión

Crear componente reutilizable `<CaptureDialog>` que permite copiar contenido de diálogos como imagen PNG al portapapeles con un clic.

**Arquitectura:**

- Hook separado: `useCaptureDialog` (lógica pura, reutilizable)
- Componente wrapper: `<CaptureDialog>` (UI + accesibilidad)
- Variables CSS: `capture-*` (theme fijo light mode para consistencia)

## Contexto

Necesitábamos que usuarios puedan **copiar contenido de diálogos como imágenes** para compartir por WhatsApp, email, tickets de soporte, etc.

**Requisitos:**

- Convertir HTML → PNG de alta calidad
- Copia automática al portapapeles
- Fallback a texto si falla
- Consistencia visual (independiente del theme del usuario)
- Reutilizable en múltiples tipos de diálogos

**Caso de uso original:** ViewProjectPaymentsDialog (Estado de Cuenta). Usuario quiere compartir estado con cliente vía WhatsApp.

## Alternativa Principal

**Copy manual en cada dialog:** Implementar captura manualmente donde se necesite.

**Por qué NO:** DRY violation. Con 3+ casos de uso, componente reutilizable ahorra tiempo y mantiene consistencia. Bugs se corrigen una vez, no en múltiples lugares.

## Consecuencias

### Beneficios ✅

1. **DRY (Don't Repeat Yourself):** Lógica centralizada. Bug fixes globales.

2. **Consistencia UX:** Todas las capturas funcionan igual. Mismo look profesional.

3. **Reutilización:** Hook separado para casos custom. Componente wrapper para casos simples.

4. **Theme consistente:** Variables `capture-*` garantizan mismo aspecto (light mode fijo), independiente del theme del usuario.

5. **Fallback robusto:** 3 niveles de fallback:
   - Función custom (usuario define texto)
   - Extracción DOM (automático)
   - Texto genérico (último recurso)

### Trade-offs ⚠️

1. **Dependencia de @zumer/snapdom:** Si deja de mantenerse, requiere migración.
   - **Mitigación:** Hook separado facilita cambiar librería. Alternativas: html2canvas, dom-to-image.

2. **Limitaciones de captura:** Contenido muy largo (>5000px) puede degradar performance. Elementos externos (iframes, videos) no se capturan.
   - **Mitigación:** Documentadas en README. Delay de 300ms para fonts rendering.

3. **Theme fijo (no respeta dark mode):** Capturas siempre en light mode.
   - **Trade-off aceptado:** Consistencia profesional > Personalización.

4. **Abstracción prematura (riesgo):** Solo 1 caso validado al crear.
   - **Mitigación:** Marcado "Experimental". API puede ajustarse con casos 2 y 3.

## Quick Start

```bash
# Instalación (ya incluido en template)
npm install @zumer/snapdom
```

```tsx
// Uso básico
import { CaptureDialog } from '@/components/custom/capture-dialog'
;<CaptureDialog
  open={open}
  onOpenChange={setOpen}
  title="Estado de Cuenta"
  getFallbackText={() =>
    `
    ESTADO DE CUENTA
    Proyecto: ${project.number}
    Total: ${project.total}
  `.trim()
  }
>
  <div className="bg-capture-bg text-capture-foreground p-6">
    <ProjectSummaryCard project={project} />
  </div>
</CaptureDialog>
```

```typescript
// Uso avanzado (solo hook)
import { useCaptureDialog } from '@/components/custom/capture-dialog'

const { contentRef, handleCopy, isCopying } = useCaptureDialog({
  getFallbackText: () => 'Mi texto fallback'
})

return (
  <div ref={contentRef}>
    {/* Contenido capturabale */}
    <button onClick={handleCopy} disabled={isCopying}>
      {isCopying ? 'Copiando...' : 'Copiar'}
    </button>
  </div>
)
```

## Proceso de Captura

```
1. PREPARACIÓN
   - Esperar document.fonts.ready
   - Delay 300ms para rendering completo

2. CAPTURA (HTML → Canvas)
   - snapdom.toCanvas(element)
   - Scale 2x para Retina displays

3. CONVERSIÓN (Canvas → PNG)
   - canvas.toBlob('image/png', 1.0)

4. COPIA AL PORTAPAPELES
   - ClipboardItem API
   - Fallback a texto si falla
```

## Validación

**Criterios para marcar como Stable:**

- [ ] Implementado en ≥3 casos de uso
- [ ] API no requiere cambios entre casos
- [ ] Performance <1s de captura
- [ ] Tests unitarios del hook

**Casos de uso:**

1. ✅ ViewProjectPaymentsDialog - Implementado
2. ⏳ CustomerSummaryDialog
3. ⏳ InstallmentScheduleDialog

## Referencias

- [Implementación](../../../components/custom/capture-dialog/)
- [Documentación completa](../../../components/custom/capture-dialog/README.md)
- [@zumer/snapdom](https://github.com/zumeru/snapdom)
- [ClipboardItem API](https://developer.mozilla.org/docs/Web/API/ClipboardItem)

---

**Última actualización:** 2025-10-29
