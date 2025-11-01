# ADR-011: CaptureDialog Pattern - Captura de Contenido de Diálogos

## Estado

**Aceptado** (Experimental)

**Fecha:** 2025-10-29

**Estado Experimental:** Validar con ≥3 casos de uso reales antes de marcar como estable.

## Contexto

Necesitábamos una forma estándar de permitir a los usuarios **copiar contenido de diálogos como imágenes** para compartir información fuera de la aplicación (WhatsApp, email, tickets de soporte, etc.).

### Requisitos Identificados

1. **Captura visual:** Convertir contenido HTML a imagen PNG de alta calidad
2. **Copia automática:** Al portapapeles con un clic
3. **Fallback robusto:** Si falla la imagen, copiar como texto plano
4. **Consistencia visual:** Las capturas deben verse profesionales, sin importar el theme del usuario
5. **Reutilización:** Patrón aplicable a múltiples tipos de diálogos
6. **Accesibilidad:** Mantener estándares ARIA

### Caso de Uso Original

**Dialog:** `ViewProjectPaymentsDialog` (Estado de Cuenta)

- Muestra resumen de pagos de un proyecto
- Usuario quiere compartir estado con cliente vía WhatsApp
- Requiere captura visual con formato profesional

**Requisitos futuros identificados:**

- Estado de cliente (múltiples proyectos)
- Resumen de cuota (installments)
- Reportes de proyecto
- Facturas/recibos
- Diagramas técnicos

## Decisión

Crear un **componente reutilizable `<CaptureDialog>`** con:

1. **Hook separado:** `useCaptureDialog` (lógica pura, reutilizable)
2. **Componente wrapper:** `<CaptureDialog>` (UI + accesibilidad)
3. **Variables CSS dedicadas:** `capture-*` (theme consistente)
4. **Estrategia de fallback:** 3 niveles (custom → DOM → genérico)

### Ubicación

```
components/custom/capture-dialog/
├── capture-dialog.tsx      # Componente wrapper
├── use-capture-dialog.ts   # Hook reutilizable
├── index.ts                # Exports
└── README.md               # Documentación completa
```

### Variables CSS

```css
/* app/globals.css */
--capture-bg: oklch(0.928 0.006 264.531);
--capture-foreground: oklch(0.278 0.033 256.848);
--capture-border: oklch(0.872 0.01 258.338);
/* ... más colores */
```

**Razón:** Theme fijo (light mode) para consistencia visual.

## Alternativas Consideradas

### Alternativa 1: Copy Manual en Cada Dialog

Implementar captura manualmente en cada dialog que lo necesite.

- **Pros:**
  - Máxima flexibilidad por dialog
  - Sin abstracción
- **Contras:**
  - **Código duplicado** (lógica de captura copiada en múltiples lugares)
  - Inconsistencia UX (cada dialog funciona diferente)
  - Difícil mantener (bugs se replican)
  - No escala (>3 casos)
- **Por qué NO:** DRY violation. No sostenible a largo plazo.

### Alternativa 2: html2canvas

Usar `html2canvas` en lugar de `@zumer/snapdom`.

- **Pros:**
  - Más popular (14M downloads/week)
  - Más opciones de configuración
  - Mejor soporte de comunidad
- **Contras:**
  - Más pesado (~500KB minified)
  - API más compleja
  - **Requiere cambiar dependencia existente** (ya usamos snapdom)
- **Por qué NO:** snapdom funciona perfectamente. No hay razón para cambiar.

### Alternativa 3: Server-Side Rendering (Puppeteer/Playwright)

Generar imágenes en el servidor usando headless browser.

- **Pros:**
  - Captura perfecta (browser real)
  - Soporta CSS avanzado
  - No depende de browser del cliente
- **Contras:**
  - **Requiere infraestructura adicional** (servidor, queue)
  - Latencia alta (varios segundos)
  - Costo de hosting
  - Complejidad extrema
- **Por qué NO:** Overkill para el caso de uso. Cliente-side es suficiente.

### Alternativa 4: Screenshot API Nativa (Experimental)

Usar `navigator.mediaDevices.getDisplayMedia()` para captura de pantalla nativa.

- **Pros:**
  - API del navegador (sin dependencias)
  - Captura perfecta
- **Contras:**
  - **Requiere permiso del usuario** (UX pobre)
  - Experimental (no todos los browsers)
  - Captura TODA la pantalla (no solo el dialog)
- **Por qué NO:** UX inaceptable (usuario debe dar permiso cada vez).

### Alternativa 5: Solo Texto Plano

No ofrecer captura de imagen, solo copiar texto.

- **Pros:**
  - Simple
  - Sin dependencias
  - Funciona siempre
- **Contras:**
  - **Pierde formato visual** (tablas, colores, badges)
  - Menos profesional
  - Usuarios prefieren imágenes para WhatsApp/email
- **Por qué NO:** No cumple requisitos. Los usuarios necesitan imágenes.

### Alternativa 6: Variables CSS por Dialog

En lugar de `capture-*`, usar prefijos específicos: `payment-*`, `project-*`, etc.

- **Pros:**
  - Permite theming diferente por dialog
- **Contras:**
  - **Inconsistencia visual** entre capturas
  - Más variables CSS
  - Confunde al usuario (cada captura se ve diferente)
- **Por qué NO:** Preferimos consistencia profesional.

## Consecuencias

### Positivas ✅

1. **DRY (Don't Repeat Yourself)**
   - Lógica de captura centralizada
   - No duplicar código en cada dialog
   - Bug fixes se aplican globalmente

2. **Consistencia UX**
   - Todas las capturas funcionan igual
   - Mismo look and feel profesional
   - Predecible para usuarios

3. **Reutilización**
   - Hook separado (`useCaptureDialog`) para casos custom
   - Componente wrapper para casos simples
   - Fácil agregar nuevos dialogs capturables

4. **Theme Consistente**
   - Variables `capture-*` garantizan mismo aspecto
   - Independiente del theme del usuario (dark/light)
   - Profesional para compartir con clientes

5. **Fallback Robusto**
   - Estrategia de 3 niveles:
     1. Función custom (usuario define texto)
     2. Extracción DOM (automático)
     3. Texto genérico (último recurso)
   - Nunca falla completamente

6. **Accesibilidad**
   - DialogTitle obligatorio (ARIA)
   - Estados de loading manejados
   - Keyboard navigation

### Negativas / Trade-offs ⚠️

1. **Dependencia de @zumer/snapdom**
   - Si deja de mantenerse, requiere migración
   - **Mitigación:** Hook separado facilita cambiar librería
   - **Alternativa:** html2canvas o dom-to-image

2. **Complejidad del Fallback**
   - Extracción DOM puede incluir texto no deseado
   - Formato puede ser feo (espacios, saltos de línea)
   - **Mitigación:** Documentar que para resultados profesionales, proveer `getFallbackText`

3. **Limitaciones de Captura**
   - Contenido muy largo (>5000px) puede degradar performance
   - Elementos externos (iframes, videos) no se capturan
   - Fonts externas requieren espera
   - **Mitigación:** Documentadas en README, delay de 300ms para rendering

4. **Abstracción Prematura (Riesgo)**
   - Solo 1 caso validado al momento de creación
   - API puede necesitar ajustes con casos 2 y 3
   - **Mitigación:** Marcado como "Experimental", refactor fácil (poca adopción)

5. **Theme Fijo (No Respeta Preferencias)**
   - Capturas siempre en light mode
   - No respeta dark mode del usuario
   - **Trade-off aceptado:** Consistencia > Personalización

## Implementación

### Arquitectura de 2 Capas

```
Hook (Lógica)                 Componente (UI + A11y)
useCaptureDialog    →         <CaptureDialog>
├─ contentRef                 ├─ Dialog wrapper
├─ handleCopy                 ├─ DialogTitle (a11y)
└─ isCopying                  ├─ Header controls
                              └─ Captureable area (ref)
```

### Ejemplo de Uso

```tsx
<CaptureDialog
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

### Proceso de Captura (4 Fases)

```
1. PREPARACIÓN
   - Esperar document.fonts.ready
   - Delay 300ms para rendering completo

2. CAPTURA (HTML → Canvas)
   - snapdom.toCanvas(element, options)
   - Scale 2x para pantallas Retina
   - Background blanco sólido

3. CONVERSIÓN (Canvas → PNG)
   - canvas.toBlob('image/png', 1.0)
   - Máxima calidad

4. COPIA AL PORTAPAPELES
   - ClipboardItem API
   - navigator.clipboard.write()
   - Fallback a texto si falla
```

## Validación

### Criterios de Éxito (Para marcar como Stable)

- [ ] Implementado en ≥3 casos de uso diferentes
- [ ] API no requiere cambios entre casos
- [ ] Performance aceptable (<1s de captura)
- [ ] Fallback funciona correctamente
- [ ] Tests unitarios del hook
- [ ] Documentación completa

### Casos de Uso Futuros

1. ✅ **ViewProjectPaymentsDialog** (Estado de Cuenta) - Implementado
2. ⏳ **CustomerSummaryDialog** (Resumen de Cliente)
3. ⏳ **InstallmentScheduleDialog** (Calendario de Cuotas)
4. ⏳ **InvoiceDialog** (Factura/Recibo)

### Métricas a Monitorear

- Tiempo promedio de captura
- Tasa de éxito vs fallback
- Errores reportados
- Feedback de usuarios

## Referencias

- **Implementación:** [components/custom/capture-dialog/](../../../components/custom/capture-dialog/)
- **Documentación:** [README.md](../../../components/custom/capture-dialog/README.md)
- **Ejemplo:** [app/examples/capture-dialog/page.tsx](../../../app/examples/capture-dialog/page.tsx)
- **@zumer/snapdom:** https://github.com/zumeru/snapdom
- **ClipboardItem API:** https://developer.mozilla.org/en-US/docs/Web/API/ClipboardItem

## Notas Adicionales

### Por Qué Separar Hook del Componente

1. **Flexibilidad:** Permite usar lógica en otros tipos de dialogs (Alert, Sheet, Drawer)
2. **Testeable:** Hook se puede testear independientemente
3. **Escape Hatch:** Si wrapper no sirve, usar hook directamente

### Migración Futura (Si snapdom falla)

```typescript
// Cambiar solo en use-capture-dialog.ts
import html2canvas from 'html2canvas'

// Línea 124
const canvas = await html2canvas(contentRef.current, {
  scale: 2,
  backgroundColor: '#ffffff',
})
```

El resto del código queda intacto.

### Variables CSS: ¿Por Qué No Reutilizar `secondary-*`?

- `secondary` varía entre dark/light mode
- Necesitamos colores **fijos** para capturas consistentes
- Separación de concerns (theming UI vs capturas)

---

**Última actualización:** 2025-10-29
**Autor:** Equipo Template
**Revisión:** Pendiente validación con casos 2 y 3
