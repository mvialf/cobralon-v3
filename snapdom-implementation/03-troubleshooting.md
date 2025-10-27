# 🔧 Guía de Resolución de Problemas

**Fecha:** 2025-01-27
**Objetivo:** Resolver problemas comunes durante y después de la implementación

---

## 📋 Índice de Problemas

1. [Tabla no se captura completa](#problema-1-tabla-no-se-captura-completa)
2. [Variables CSS no se capturan](#problema-2-variables-css-no-se-capturan)
3. [Fuentes incorrectas o faltantes](#problema-3-fuentes-incorrectas-o-faltantes)
4. [Error "Cannot find module snapdom"](#problema-4-error-cannot-find-module-snapdom)
5. [Clipboard API no funciona](#problema-5-clipboard-api-no-funciona)
6. [Imagen se ve borrosa](#problema-6-imagen-se-ve-borrosa)
7. [Captura tarda demasiado](#problema-7-captura-tarda-demasiado)
8. [Botón no responde](#problema-8-botón-no-responde)
9. [CircularProgressChart no aparece](#problema-9-circularprogresschart-no-aparece)
10. [Error en producción pero funciona en dev](#problema-10-error-en-producción-pero-funciona-en-dev)

---

## Problema 1: Tabla no se captura completa

### Síntoma

- Imagen solo muestra las primeras filas de la tabla
- Faltan pagos en la parte inferior
- Parece que solo captura lo visible en viewport

### Causa Probable

El `contentRef` está apuntando a un contenedor con `max-height` o `overflow: hidden`

### Diagnóstico

```tsx
// Inspeccionar en DevTools
const element = document.querySelector('[ref]')
const styles = getComputedStyle(element)
console.log('Max-height:', styles.maxHeight) // No debe ser limitado
console.log('Overflow:', styles.overflow) // No debe ser 'hidden'
console.log('Height:', element.scrollHeight) // Debe ser altura completa
```

### Solución A: Verificar estructura del ref

```tsx
// ❌ INCORRECTO - ref en contenedor con max-height
<div className="max-h-[90vh] overflow-y-auto">
  <div ref={contentRef}>
    {/* Contenido */}
  </div>
</div>

// ✅ CORRECTO - ref en contenedor sin restricciones
<div className="max-h-[90vh] overflow-y-auto">
  <div>  {/* Contenedor scroll */}
    <div ref={contentRef} className="h-auto">
      {/* Contenido - sin max-height */}
    </div>
  </div>
</div>
```

### Solución B: Aumentar delay antes de captura

```tsx
// Dar más tiempo para que el DOM se expanda completamente
await new Promise((resolve) => setTimeout(resolve, 500)) // 500ms en lugar de 300ms
```

### Solución C: Forzar altura completa

```tsx
<div
  ref={contentRef}
  style={{
    maxHeight: 'none',  // ← Forzar sin límite
    overflow: 'visible'
  }}
>
```

### Verificación

1. Crear proyecto con 20+ pagos
2. Capturar imagen
3. Abrir en editor
4. Scroll hasta el final de la imagen
5. Verificar que el último pago se ve completo

---

## Problema 2: Variables CSS no se capturan

### Síntoma

- Colores aparecen transparentes o incorrectos
- Elementos se ven blancos/negros en lugar de colores del tema
- Fondo transparente en lugar de color pay-card

### Causa Probable

`snapdom` no está resolviendo correctamente las variables CSS, o las variables no están definidas en el momento de captura

### Diagnóstico

```javascript
// En consola del browser, después de abrir dialog
const element = document.querySelector('[ref]')
const styles = getComputedStyle(element)
console.log('BG Color:', styles.backgroundColor) // Debe ser rgb(), no var()
console.log('Text Color:', styles.color)
```

Si ves `var(--nombre-variable)` en lugar de `rgb(...)`, el problema está confirmado.

### Solución A: Colores inline en contentRef

```tsx
<div
  ref={contentRef}
  style={{
    backgroundColor: '#ffffff',  // Blanco sólido
    color: '#1f2937',            // Gris oscuro
    padding: '1.5rem'
  }}
  className="space-y-6"
>
```

### Solución B: Usar colores Tailwind directos

```tsx
<div
  ref={contentRef}
  className="bg-white text-gray-800 p-6 space-y-6"  // ← Clases Tailwind en lugar de custom
>
```

### Solución C: Esperar más tiempo para resolución CSS

```tsx
// Esperar a que CSS se aplique completamente
await document.fonts.ready
await new Promise((resolve) => setTimeout(resolve, 500))

// Forzar reflow antes de capturar
contentRef.current.offsetHeight // ← Trigger reflow

const canvas = await snapdom.toCanvas(contentRef.current, {
  scale: 2,
  backgroundColor: '#ffffff',
})
```

### Solución D: Definir colores en globals.css si no existen

```css
/* app/globals.css */
:root {
  --pay-foreground: rgb(31, 41, 55);
  --pay-card: rgb(255, 255, 255);
  --pay-bg: rgb(249, 250, 251);
  --pay-orange: rgb(249, 115, 22);
  --pay-green: rgb(34, 197, 94);
}
```

### Verificación

1. Capturar imagen
2. Abrir en editor
3. Usar eyedropper en elementos clave
4. Verificar que colores son los esperados (NO negro/blanco/transparente)

---

## Problema 3: Fuentes incorrectas o faltantes

### Síntoma

- Texto se renderiza con fuente fallback (Arial, Times New Roman)
- Fuente custom del proyecto no aparece en imagen

### Causa Probable

Fuentes no cargadas completamente cuando se captura

### Diagnóstico

```javascript
// Verificar estado de fuentes
document.fonts.check('16px Geist') // true = cargada, false = no
document.fonts.status // 'loaded' = listo
```

### Solución A: Esperar fuentes (ya implementado)

```tsx
// Ya está en el código, pero verificar que esté ANTES de captura
await document.fonts.ready  // ← Crítico

const canvas = await snapdom.toCanvas(...)
```

### Solución B: Delay adicional

```tsx
await document.fonts.ready

// Agregar delay adicional por si acaso
await new Promise(resolve => setTimeout(resolve, 500))

const canvas = await snapdom.toCanvas(...)
```

### Solución C: Preload fonts explícito

```tsx
// app/layout.tsx o globals.css
<link
  rel="preload"
  href="/fonts/Geist-Regular.woff2"
  as="font"
  type="font/woff2"
  crossOrigin="anonymous"
/>
```

### Solución D: Fallback a fuente segura

```tsx
<div
  ref={contentRef}
  style={{
    fontFamily: 'Geist, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  }}
>
```

### Verificación

1. Capturar imagen
2. Zoom 200%
3. Verificar que fuente coincide con la del dialog en pantalla

---

## Problema 4: Error "Cannot find module snapdom"

### Síntoma

```
Error: Cannot find module '@zumer/snapdom'
```

### Causa Probable

- Dependencia no instalada
- npm install no completó
- Cache de node_modules corrupto

### Solución A: Reinstalar dependencia

```bash
npm install @zumer/snapdom
```

### Solución B: Limpiar cache y reinstalar

```bash
rm -rf node_modules package-lock.json
npm install
```

### Solución C: Verificar package.json

```json
{
  "dependencies": {
    "@zumer/snapdom": "^1.3.0" // ← Debe estar aquí
  }
}
```

Si no está, agregar manualmente y ejecutar `npm install`

### Solución D: TypeScript no encuentra tipos

```bash
# Si TypeScript se queja de tipos
npm install --save-dev @types/node
```

### Verificación

```bash
npm list @zumer/snapdom
# Debe mostrar: @zumer/snapdom@1.3.0
```

---

## Problema 5: Clipboard API no funciona

### Síntoma

- Error: "Clipboard write not supported"
- No se copia al portapapeles
- Funciona en localhost pero no en producción

### Causa Probable

| Causa              | Solución                                   |
| ------------------ | ------------------------------------------ |
| Browser antiguo    | Usar fallback a texto (ya implementado)    |
| HTTP en producción | Cambiar a HTTPS                            |
| Sin user gesture   | Verificar que onClick dispara directamente |
| Permisos denegados | Feature detection                          |

### Diagnóstico

```javascript
// Verificar soporte
console.log('Clipboard API:', !!navigator.clipboard)
console.log('Write support:', !!navigator.clipboard?.write)

// Verificar protocolo
console.log('Protocol:', window.location.protocol) // Debe ser 'https:' en prod
```

### Solución A: Feature detection mejorado

```tsx
const handleCopy = async () => {
  // Verificar soporte ANTES de intentar
  if (!navigator.clipboard?.write) {
    console.warn('Clipboard API not supported, using text fallback')
    // Ir directo a fallback de texto
    await navigator.clipboard.writeText(textToCopy)
    toast.warning('Copiado como texto (imagen no soportada en este browser)')
    return
  }

  // Intentar copiar imagen...
}
```

### Solución B: HTTPS en producción

```bash
# Vercel, Netlify, etc. usan HTTPS automáticamente
# Si usas hosting custom, configurar certificado SSL
```

### Solución C: Fallback graceful (ya implementado)

El código ya tiene fallback a texto en el catch block. Si esto no funciona:

```tsx
} catch (error) {
  console.error('Error al copiar imagen:', error)

  // Fallback mejorado
  try {
    await navigator.clipboard.writeText(textToCopy)
    toast.warning('Copiado como texto')
  } catch (textError) {
    // Último recurso: prompt al usuario
    const textarea = document.createElement('textarea')
    textarea.value = textToCopy
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    toast.info('Texto copiado (método legacy)')
  }
}
```

### Verificación Browsers

| Browser    | Versión Mínima | Status      |
| ---------- | -------------- | ----------- |
| Chrome     | 63+            | ✅          |
| Firefox    | 63+            | ✅          |
| Safari     | 13.1+          | ✅          |
| Edge       | 79+            | ✅          |
| iOS Safari | 13.4+          | ⚠️ Limitado |

---

## Problema 6: Imagen se ve borrosa

### Síntoma

- Imagen capturada tiene baja resolución
- Texto pixelado o borroso
- Iconos se ven mal

### Causa Probable

Scale factor muy bajo o configuración incorrecta

### Diagnóstico

```tsx
// Verificar configuración de snapdom
const canvas = await snapdom.toCanvas(contentRef.current, {
  scale: 2, // ← Debe ser al menos 2
  // ...
})

// Verificar dimensiones del canvas
console.log('Canvas:', canvas.width, 'x', canvas.height)
// Debe ser ~2x el tamaño del elemento
```

### Solución A: Aumentar scale

```tsx
const canvas = await snapdom.toCanvas(contentRef.current, {
  scale: 3, // ← 3x para ultra-high resolution
  backgroundColor: '#ffffff',
})
```

**Trade-off:** Mayor calidad = mayor tiempo de procesamiento y tamaño de archivo

### Solución B: Verificar device pixel ratio

```tsx
const deviceScale = window.devicePixelRatio || 1
const canvas = await snapdom.toCanvas(contentRef.current, {
  scale: Math.max(2, deviceScale), // Al menos 2x, o devicePixelRatio
  backgroundColor: '#ffffff',
})
```

### Verificación

1. Capturar imagen
2. Verificar dimensiones en editor de imágenes
3. Zoom 200%
4. Texto debe verse nítido

---

## Problema 7: Captura tarda demasiado

### Síntoma

- Botón spinner tarda >5 segundos
- Browser se congela
- Timeout error

### Causa Probable

- Tabla muy larga (50+ pagos)
- Elementos DOM complejos
- Slow device

### Diagnóstico

```tsx
// Medir tiempo exacto
const start = Date.now()
const canvas = await snapdom.toCanvas(...)
console.log('Captura tardó:', Date.now() - start, 'ms')
```

### Solución A: Optimizar configuración snapdom

```tsx
const canvas = await snapdom.toCanvas(contentRef.current, {
  scale: 2, // No usar 3 si no es necesario
  backgroundColor: '#ffffff',
  logging: false, // ← Deshabilitar logs
  // Otras optimizaciones:
  foreignObjectRendering: false,
  imageTimeout: 0,
})
```

### Solución B: Warning UX para tablas largas

```tsx
const handleCopy = async () => {
  // ...

  // Si proyecto tiene muchos pagos, advertir
  if (numberOfPayments > 20) {
    toast.info('Generando imagen... Esto puede tardar unos segundos')
  }

  setIsCopying(true)
  // ...
}
```

### Solución C: Progress indicator

```tsx
// Alternativa avanzada: mostrar progreso
const handleCopy = async () => {
  let progressToast = null

  if (numberOfPayments > 30) {
    progressToast = toast.loading('Generando imagen (0%)')

    // Simulacro de progreso (snapdom no da progreso real)
    let progress = 0
    const interval = setInterval(() => {
      progress += 10
      toast.loading(`Generando imagen (${progress}%)`, { id: progressToast })
      if (progress >= 90) clearInterval(interval)
    }, 200)
  }

  // Captura...

  if (progressToast) {
    toast.dismiss(progressToast)
  }
}
```

### Solución D: Limitar altura de captura (drástico)

```tsx
// Si realmente es crítico el tiempo, limitar altura
<div
  ref={contentRef}
  style={{
    maxHeight: '3000px',  // ← Límite máximo
    overflow: 'hidden'     // ← Cortar lo que sobra
  }}
>
```

**Nota:** Esto perderá datos si la tabla es más larga que 3000px.

---

## Problema 8: Botón no responde

### Síntoma

- Click en botón no hace nada
- No aparece spinner
- No hay errores en consola

### Diagnóstico

```tsx
// Agregar logs para debugging
const handleCopy = async () => {
  console.log('handleCopy called')
  console.log('contentRef:', contentRef.current)
  console.log('project:', project)
  console.log('isLoading:', isLoading)

  if (!contentRef.current) {
    console.error('contentRef is null!')
    return
  }
  // ...
}
```

### Solución A: Verificar que onClick está conectado

```tsx
<Button
  onClick={handleCopy}  // ← Verificar que está conectado
  // ...
>
```

### Solución B: Verificar que ref está asignado

```tsx
// contentRef debe estar en el JSX
<div ref={contentRef}>  {/* ← Verificar esto */}
```

### Solución C: Verificar disabled state

```tsx
<Button
  onClick={handleCopy}
  disabled={isLoading || !project || isCopying}  // ← Puede estar disabled
  // ...
>
```

Si botón está disabled, verificar estados:

- `isLoading === false`?
- `project !== null`?
- `isCopying === false`?

### Solución D: Error silencioso en handleCopy

```tsx
const handleCopy = async () => {
  try {
    // ... código
  } catch (error) {
    console.error('Error completo:', error) // ← Log detallado
    toast.error(`Error: ${error.message}`)
  }
}
```

---

## Problema 9: CircularProgressChart no aparece

### Síntoma

- Imagen capturada no incluye el gráfico circular de progreso
- Aparece espacio en blanco donde debería estar el gráfico

### Causa Probable

SVG no renderizado completamente al momento de captura

### Diagnóstico

```tsx
// Verificar que SVG existe en DOM
const svg = contentRef.current?.querySelector('svg')
console.log('SVG encontrado:', !!svg)
console.log('SVG dimensions:', svg?.getBoundingClientRect())
```

### Solución A: Aumentar delay

```tsx
// Dar más tiempo para que SVG se renderice
await document.fonts.ready
await new Promise((resolve) => setTimeout(resolve, 500)) // 500ms en lugar de 300ms
```

### Solución B: Forzar render del SVG

```tsx
// Antes de capturar, forzar repaint
const svg = contentRef.current?.querySelector('svg')
if (svg) {
  svg.style.display = 'none'
  svg.offsetHeight  // Force reflow
  svg.style.display = ''
}

const canvas = await snapdom.toCanvas(...)
```

### Solución C: Verificar que no tiene display:none

```tsx
// CircularProgressChart debe estar visible
<div className="w-1/3 flex items-center">
  <CircularProgressChart percentage={percentPaid} /> {/* No debe tener display:none */}
</div>
```

### Verificación

1. Inspeccionar elemento SVG en DevTools
2. Verificar que tiene width/height
3. Verificar que no tiene `display: none` o `visibility: hidden`
4. Capturar y verificar imagen

---

## Problema 10: Error en producción pero funciona en dev

### Síntoma

- Funciona perfectamente en localhost
- Falla en producción (Vercel, Netlify, etc.)

### Posibles Causas

| Causa                   | Solución                               |
| ----------------------- | -------------------------------------- |
| HTTP vs HTTPS           | Clipboard API requiere HTTPS en prod   |
| Build optimizations     | Verificar que snapdom no se tree-shake |
| Environment differences | Verificar fonts, assets                |
| Browser targets         | Verificar transpilation en next.config |

### Diagnóstico

```bash
# Build local y preview
npm run build
npm run start  # Simula producción

# Verificar en http://localhost:3000
```

### Solución A: HTTPS en producción

Todos los hosts modernos (Vercel, Netlify, etc.) usan HTTPS automáticamente.

Si usas hosting custom:

```bash
# Instalar certbot para Let's Encrypt
sudo certbot --nginx -d tudominio.com
```

### Solución B: Verificar next.config transpilation

```javascript
// next.config.mjs
const nextConfig = {
  transpilePackages: ['@zumer/snapdom'], // ← Agregar esto
  // ...
}
```

### Solución C: Verificar que fonts están accesibles

```bash
# Fonts deben estar en public/ o CDN con CORS correcto
# Verificar en Network tab de DevTools en producción
```

### Solución D: Logging en producción

```tsx
const handleCopy = async () => {
  if (process.env.NODE_ENV === 'production') {
    console.log('Production capture start')
  }

  try {
    // ... código
  } catch (error) {
    // Log completo en producción para debugging
    console.error('Production error:', {
      message: error.message,
      stack: error.stack,
      protocol: window.location.protocol,
      browser: navigator.userAgent,
    })
  }
}
```

---

## 🚨 Rollback de Emergencia

### Si todo falla y necesitas revertir

```bash
# Opción 1: Revertir archivo
git checkout HEAD -- components/dialogs/projects/view-project-payments-dialog.tsx

# Opción 2: Revertir commit
git revert <commit-hash>

# Opción 3: Desinstalar dependencia
npm uninstall @zumer/snapdom
npm run build  # Verificar que compila
```

### Desplegar hotfix

```bash
git commit -m "hotfix: revertir captura de pantalla temporalmente"
git push origin main
# Vercel/Netlify auto-deploy
```

---

## 📞 Soporte Adicional

### Logs Útiles para Debugging

```tsx
// Agregar al inicio de handleCopy para debugging exhaustivo
console.group('Snapshot Debug Info')
console.log('contentRef:', contentRef.current)
console.log('Element dimensions:', {
  width: contentRef.current?.offsetWidth,
  height: contentRef.current?.scrollHeight, // scrollHeight = altura completa
})
console.log('Computed styles:', getComputedStyle(contentRef.current))
console.log('Clipboard support:', {
  api: !!navigator.clipboard,
  write: !!navigator.clipboard?.write,
})
console.log('Fonts loaded:', document.fonts.status)
console.log('Protocol:', window.location.protocol)
console.groupEnd()
```

### Recursos Externos

- [snapdom GitHub Issues](https://github.com/zumer/snapdom/issues)
- [Clipboard API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API)
- [html2canvas Known Issues](https://html2canvas.hertzen.com/documentation)

---

**Guía creada por:** Claude Code
**Fecha:** 2025-01-27
**Versión:** 1.0 - Troubleshooting completo
