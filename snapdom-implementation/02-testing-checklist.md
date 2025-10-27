# ✅ Testing Checklist Exhaustivo

**Fecha:** 2025-01-27
**Objetivo:** Validar que la funcionalidad de captura funciona en todos los escenarios posibles

---

## 📋 Leyenda

- ✅ **PASS** - Funciona correctamente
- ❌ **FAIL** - No funciona, requiere fix
- ⚠️ **WARNING** - Funciona pero con issue menor
- ⏭️ **SKIP** - No aplicable en este proyecto

---

## 1. Tests Funcionales Básicos

### Test 1.1: Captura Exitosa (Happy Path)

**Escenario:** Proyecto con 5-10 pagos normales

**Pasos:**

1. Abrir dialog de un proyecto con pagos
2. Esperar a que cargue completamente
3. Click en botón Copy
4. Esperar toast de éxito
5. Abrir Paint/Photoshop
6. Paste (Ctrl+V / Cmd+V)

**Resultado esperado:**

- [ ] Botón muestra spinner durante proceso
- [ ] Toast "Imagen copiada al portapapeles" aparece
- [ ] Imagen se pega correctamente en aplicación externa
- [ ] Imagen incluye resumen completo (4 cards)
- [ ] Imagen incluye tabla completa de pagos
- [ ] Colores son correctos (no transparentes)
- [ ] Texto es legible y nítido
- [ ] Iconos se ven correctos
- [ ] Gráfico circular de progreso se ve correcto
- [ ] Numeración de pagos es correcta (1, 2, 3...)

**Status:** [ ] PASS / [ ] FAIL / [ ] WARNING

**Notas/Issues:**

```
[Anotar cualquier problema encontrado]
```

---

### Test 1.2: Proyecto sin Pagos

**Escenario:** Proyecto creado sin pagos registrados aún

**Pasos:**

1. Crear proyecto nuevo sin agregar pagos
2. Abrir dialog de pagos
3. Verificar que muestra "No hay pagos registrados"
4. Click en botón Copy

**Resultado esperado:**

- [ ] Dialog muestra resumen con balance = total
- [ ] Tabla muestra mensaje "No hay pagos registrados"
- [ ] Botón Copy está enabled
- [ ] Captura incluye resumen + mensaje de tabla vacía
- [ ] Imagen es válida y útil

**Status:** [ ] PASS / [ ] FAIL / [ ] WARNING

**Notas/Issues:**

```
[Anotar cualquier problema encontrado]
```

---

### Test 1.3: Tabla con Muchos Pagos (>20)

**Escenario:** Proyecto con 20-50 pagos (tabla larga con scroll)

**Preparación:**

```bash
# Si no hay proyecto con tantos pagos, crear uno de prueba
# O usar script de seed si existe
```

**Pasos:**

1. Abrir dialog de proyecto con 20+ pagos
2. Verificar que tabla requiere scroll
3. Click en botón Copy
4. Esperar (puede tardar 2-3 segundos)
5. Verificar imagen pegada

**Resultado esperado:**

- [ ] Captura tarda <5 segundos (aceptable)
- [ ] Toast "Generando imagen..." aparece (opcional)
- [ ] Imagen captura TODA la tabla (no solo viewport)
- [ ] Se pueden ver todos los pagos en la imagen
- [ ] Última fila visible en la imagen
- [ ] Imagen es alta (puede ser 2000px+ altura)

**Status:** [ ] PASS / [ ] FAIL / [ ] WARNING

**Notas/Issues:**

```
[Si tarda >5 segundos, anotar tiempo exacto]
[Si solo captura viewport, marcar como FAIL]
```

---

### Test 1.4: Click Prematuro (Antes de Cargar)

**Escenario:** Usuario clickea Copy antes de que termine el fetch

**Pasos:**

1. Abrir dialog
2. **Inmediatamente** (sin esperar) click en botón Copy
3. Esperar a que carguen los datos
4. Click nuevamente en Copy

**Resultado esperado:**

- [ ] Primer click: Botón está disabled (no responde)
- [ ] Primer click: No aparece ningún toast de error
- [ ] Cuando carga: Botón se habilita automáticamente
- [ ] Segundo click: Funciona correctamente

**Status:** [ ] PASS / [ ] FAIL / [ ] WARNING

**Notas/Issues:**

```
[Si el botón no está disabled, marcar como FAIL]
```

---

### Test 1.5: Fallback a Texto

**Escenario:** Simular fallo de Clipboard API para probar fallback

**Pasos para simular fallo:**

1. Abrir DevTools (F12)
2. Console tab
3. Ejecutar:
   ```javascript
   // Override Clipboard API para simular fallo
   navigator.clipboard.write = () => Promise.reject(new Error('Simulated error'))
   ```
4. Click en botón Copy

**Resultado esperado:**

- [ ] Toast warning: "No se pudo copiar imagen. Copiado como texto."
- [ ] Texto se copia al portapapeles
- [ ] Paste muestra texto formateado:
  ```
  ESTADO DE CUENTA
  Proyecto: P 0001-2025
  Cliente: Juan Pérez
  ...
  ```

**Restaurar después del test:**

```javascript
// Recargar página para restaurar API
location.reload()
```

**Status:** [ ] PASS / [ ] FAIL / [ ] WARNING

**Notas/Issues:**

```
[Verificar que el texto tiene formato legible]
```

---

## 2. Tests de UI/UX

### Test 2.1: Botón Visible y Accesible

**Pasos:**

1. Abrir dialog
2. Inspeccionar botón Copy visualmente

**Verificaciones:**

- [ ] Icono Copy (📋) visible claramente
- [ ] Botón tiene tooltip: "Copiar al portapapeles"
- [ ] Botón está alineado correctamente en header
- [ ] Botón NO tapa el título del dialog
- [ ] Color del icono es visible (contraste suficiente)
- [ ] Hover effect funciona (hover:bg-pay-foreground/10)

**Status:** [ ] PASS / [ ] FAIL / [ ] WARNING

---

### Test 2.2: Estados del Botón

**Pasos:**

1. Observar botón durante todo el ciclo

**Estados a verificar:**

**Estado 1: Loading (isLoading === true)**

- [ ] Botón disabled (opacity reducida)
- [ ] Cursor: not-allowed
- [ ] No responde a clicks

**Estado 2: Copiando (isCopying === true)**

- [ ] Icono cambia a Loader2 (spinner)
- [ ] Spinner animado (rotate animation)
- [ ] Botón disabled
- [ ] No se puede clickear múltiples veces

**Estado 3: Normal (ready to copy)**

- [ ] Icono Copy visible
- [ ] Botón enabled (hover funciona)
- [ ] Cursor: pointer
- [ ] Click dispara acción

**Status:** [ ] PASS / [ ] FAIL / [ ] WARNING

---

### Test 2.3: Toast Feedback

**Escenarios a verificar:**

**Toast 1: Éxito**

- [ ] Texto: "Imagen copiada al portapapeles"
- [ ] Tipo: success (verde)
- [ ] Duración: ~3 segundos
- [ ] Posición: bottom-right o top-center

**Toast 2: Error - No contenido**

- [ ] Texto: "No hay contenido para copiar"
- [ ] Tipo: error (rojo)

**Toast 3: Error - Cargando**

- [ ] Texto: "Esperando carga de datos..."
- [ ] Tipo: error

**Toast 4: Warning - Fallback**

- [ ] Texto: "No se pudo copiar imagen. Copiado como texto."
- [ ] Tipo: warning (amarillo)

**Status:** [ ] PASS / [ ] FAIL / [ ] WARNING

---

## 3. Tests de Renderizado y Captura

### Test 3.1: Colores y Estilos

**Pasos:**

1. Capturar imagen
2. Abrir en editor de imágenes
3. Usar eyedropper tool para verificar colores

**Elementos a verificar:**

**Cards del resumen:**

- [ ] Fondo cards: Blanco o color pay-card correcto (NO transparente)
- [ ] Texto principal: Negro/gris oscuro legible
- [ ] Iconos: Colores correctos (primary, orange, green)
- [ ] Sombras: Visibles sutilmente

**Tabla de pagos:**

- [ ] Header: Fondo primary (azul/teal)
- [ ] Header texto: Blanco (pay-card)
- [ ] Body rows: Fondo pay-card
- [ ] Body texto: pay-foreground
- [ ] Badges: Colores correctos (default vs secondary)

**Gráfico circular:**

- [ ] Círculo base: Gris claro
- [ ] Círculo progreso: Color primary
- [ ] Texto porcentaje: Negro legible

**Status:** [ ] PASS / [ ] FAIL / [ ] WARNING

**Notas:**

```
[Si colores están transparentes o incorrectos, aplicar fix de colores inline]
```

---

### Test 3.2: Resolución y Calidad

**Pasos:**

1. Capturar imagen
2. Abrir en editor
3. Ver propiedades de la imagen

**Verificaciones:**

- [ ] Resolución esperada: ~1600x1400px (2x scale)
- [ ] Formato: PNG
- [ ] Tamaño archivo: 800KB - 2MB (aceptable)
- [ ] Zoom 100%: Texto nítido y legible
- [ ] Zoom 200%: Calidad aceptable (Retina ready)
- [ ] Iconos sin pixelado (SVG bien renderizado)

**Status:** [ ] PASS / [ ] FAIL / [ ] WARNING

---

### Test 3.3: Elementos Completos

**Verificar que TODO el contenido se capturó:**

**Resumen (4 cards):**

- [ ] Card "Saldo" con monto
- [ ] Card con gráfico circular de progreso
- [ ] Card "Abonos" con monto
- [ ] Card "Proyecto" con monto

**Tabla:**

- [ ] Header con columnas: N°, Fecha, Tipo, Monto
- [ ] Todas las filas de pagos
- [ ] Badges de tipo (Directo/Dividido)
- [ ] Montos formateados correctamente

**Otros elementos:**

- [ ] Título "ESTADO DE CUENTA" (opcional - si está en contentRef)
- [ ] Nombre del proyecto (opcional - si está en contentRef)

**Status:** [ ] PASS / [ ] FAIL / [ ] WARNING

---

## 4. Tests Cross-Browser

### Test 4.1: Chrome/Chromium

**Versión:** [Anotar versión]

**Pasos:**

1. Abrir proyecto en Chrome
2. Ejecutar Test 1.1 (Happy Path)

**Resultado:**

- [ ] Captura funciona correctamente
- [ ] Clipboard API soportado
- [ ] Sin warnings en consola

**Status:** [ ] PASS / [ ] FAIL / [ ] SKIP

---

### Test 4.2: Firefox

**Versión:** [Anotar versión]

**Pasos:**

1. Abrir proyecto en Firefox
2. Ejecutar Test 1.1 (Happy Path)

**Resultado esperado:**

- [ ] Captura funciona
- [ ] Puede mostrar notificación de "clipboard access" (OK)
- [ ] Sin errores en consola

**Status:** [ ] PASS / [ ] FAIL / [ ] SKIP

---

### Test 4.3: Safari (macOS)

**Versión:** [Anotar versión]

**Pasos:**

1. Abrir proyecto en Safari
2. Ejecutar Test 1.1 (Happy Path)

**Resultado esperado:**

- [ ] Captura funciona (Safari 13.1+)
- [ ] Clipboard API soportado
- [ ] Sin errores

**Nota:** Safari < 13.1 caerá en fallback a texto automáticamente

**Status:** [ ] PASS / [ ] FAIL / [ ] SKIP

---

### Test 4.4: Edge

**Versión:** [Anotar versión]

**Pasos:**

1. Abrir proyecto en Edge
2. Ejecutar Test 1.1

**Resultado:**

- [ ] Captura funciona (igual que Chrome)

**Status:** [ ] PASS / [ ] FAIL / [ ] SKIP

---

## 5. Tests de Performance

### Test 5.1: Tiempo de Captura

**Medir tiempo para diferentes tamaños de tabla:**

| Pagos    | Tiempo esperado | Tiempo real | Status |
| -------- | --------------- | ----------- | ------ |
| 0 pagos  | <500ms          | \_\_\_ ms   | [ ]    |
| 5 pagos  | <1s             | \_\_\_ ms   | [ ]    |
| 10 pagos | <1.5s           | \_\_\_ ms   | [ ]    |
| 20 pagos | <2.5s           | \_\_\_ ms   | [ ]    |
| 50 pagos | <5s             | \_\_\_ ms   | [ ]    |

**Método de medición:**

```javascript
// En consola del browser
let startTime = Date.now()
// Click en Copy
// Cuando aparece toast
console.log('Tiempo:', Date.now() - startTime, 'ms')
```

**Criterio de éxito:** <5 segundos para 50 pagos

**Status:** [ ] PASS / [ ] FAIL / [ ] WARNING

---

### Test 5.2: Uso de Memoria

**Pasos:**

1. Abrir DevTools → Performance tab
2. Grabar performance
3. Click en Copy
4. Detener grabación

**Verificaciones:**

- [ ] No hay memory leaks obvios
- [ ] Memoria se libera después de copiar
- [ ] No hay warnings de performance

**Status:** [ ] PASS / [ ] FAIL / [ ] SKIP

---

## 6. Tests de Edge Cases

### Test 6.1: Montos Extremos

**Escenario:** Proyecto con montos muy grandes o muy pequeños

**Casos:**

- [ ] Total proyecto: $0 (borde)
- [ ] Total proyecto: $999,999,999 (muy grande)
- [ ] Pago: $0.01 (centavos)
- [ ] Pago negativo: -$500 (si es posible)

**Verificar:**

- [ ] Números se formatean correctamente
- [ ] No hay overflow visual
- [ ] Decimales correctos

**Status:** [ ] PASS / [ ] FAIL / [ ] SKIP

---

### Test 6.2: Nombres/Textos Largos

**Escenario:** Proyecto con nombre muy largo

**Casos:**

- [ ] Nombre proyecto: 100+ caracteres
- [ ] Nombre cliente: 50+ caracteres

**Verificar:**

- [ ] Texto no se corta abruptamente
- [ ] Wrap o ellipsis aplicado
- [ ] Captura incluye texto (no truncado)

**Status:** [ ] PASS / [ ] FAIL / [ ] SKIP

---

### Test 6.3: Caracteres Especiales

**Escenario:** Nombres con caracteres especiales

**Casos a probar:**

- [ ] Ñ, á, é, í, ó, ú (español)
- [ ] €, $, £, ¥ (símbolos moneda)
- [ ] &, <, >, " (HTML entities)
- [ ] Emoji: 🏠, 💰, ✅ (si es posible)

**Verificar:**

- [ ] Caracteres se renderizan correctamente
- [ ] No hay "�" (caracteres rotos)

**Status:** [ ] PASS / [ ] FAIL / [ ] SKIP

---

### Test 6.4: Conexión Lenta/Timeout

**Escenario:** Simular red lenta para fetch de datos

**Pasos:**

1. DevTools → Network tab
2. Throttling: "Slow 3G"
3. Abrir dialog (tarda en cargar)
4. Esperar a que cargue
5. Click Copy

**Verificar:**

- [ ] Dialog muestra loading correctamente
- [ ] Botón disabled mientras loading
- [ ] Cuando carga, botón enabled
- [ ] Captura funciona normal

**Status:** [ ] PASS / [ ] FAIL / [ ] SKIP

---

## 7. Tests de Accesibilidad (Opcional)

### Test 7.1: Keyboard Navigation

**Pasos:**

1. Abrir dialog con Tab (desde página)
2. Tab hasta botón Copy
3. Presionar Space o Enter

**Verificar:**

- [ ] Botón es focusable con Tab
- [ ] Focus ring visible
- [ ] Space/Enter dispara acción

**Status:** [ ] PASS / [ ] FAIL / [ ] SKIP

---

### Test 7.2: Screen Reader (Opcional)

**Herramienta:** NVDA (Windows) o VoiceOver (macOS)

**Verificar:**

- [ ] Botón tiene label: "Copiar al portapapeles"
- [ ] Estados disabled anunciados
- [ ] Toast feedback se lee

**Status:** [ ] PASS / [ ] FAIL / [ ] SKIP

---

## 📊 Resumen de Resultados

### Por Categoría

| Categoría     | Total Tests | Passed     | Failed     | Warnings   | Skipped    |
| ------------- | ----------- | ---------- | ---------- | ---------- | ---------- |
| Funcionales   | 5           | \_\_\_     | \_\_\_     | \_\_\_     | \_\_\_     |
| UI/UX         | 3           | \_\_\_     | \_\_\_     | \_\_\_     | \_\_\_     |
| Renderizado   | 3           | \_\_\_     | \_\_\_     | \_\_\_     | \_\_\_     |
| Cross-Browser | 4           | \_\_\_     | \_\_\_     | \_\_\_     | \_\_\_     |
| Performance   | 2           | \_\_\_     | \_\_\_     | \_\_\_     | \_\_\_     |
| Edge Cases    | 4           | \_\_\_     | \_\_\_     | \_\_\_     | \_\_\_     |
| Accesibilidad | 2           | \_\_\_     | \_\_\_     | \_\_\_     | \_\_\_     |
| **TOTAL**     | **23**      | **\_\_\_** | **\_\_\_** | **\_\_\_** | **\_\_\_** |

---

### Tests Críticos (Mínimos para aprobar)

Estos tests DEBEN pasar antes de merge:

- [x] Test 1.1: Captura exitosa (Happy Path)
- [x] Test 1.2: Proyecto sin pagos
- [x] Test 1.4: Click prematuro
- [x] Test 1.5: Fallback a texto
- [x] Test 2.2: Estados del botón
- [x] Test 3.1: Colores correctos
- [x] Test 4.1: Chrome funciona

**Status:** [ ] Todos críticos PASS → **APROBAR**

---

## 🐛 Issues Encontrados

**Formato de reporte:**

```markdown
### Issue #1: [Título descriptivo]

**Severidad:** Critical / High / Medium / Low

**Test:** [Número de test donde ocurrió]

**Descripción:**
[Descripción detallada del problema]

**Steps to reproduce:**

1. [Paso 1]
2. [Paso 2]

**Expected:**
[Comportamiento esperado]

**Actual:**
[Comportamiento real]

**Screenshots/Evidencia:**
[Link o descripción]

**Propuesta de fix:**
[Si tienes idea de cómo arreglarlo]

**Status:** [ ] Open / [ ] Fixed / [ ] Won't Fix
```

---

## ✅ Aprobación Final

**Criterios de aprobación:**

- [ ] Todos los tests críticos pasan
- [ ] ≤1 test FAIL (no crítico)
- [ ] Warnings documentados y aceptados
- [ ] Issues críticos resueltos o mitigados

**Tester:** [Nombre]
**Fecha:** [Fecha de testing]
**Ambiente:** Dev / Staging / Production
**Versión:** [Branch/commit hash]

**Firma de aprobación:** ****\*\*\*\*****\_****\*\*\*\*****

**Notas adicionales:**

```
[Cualquier comentario final]
```

---

**Checklist creado por:** Claude Code
**Fecha:** 2025-01-27
**Versión:** 1.0 - Testing exhaustivo
