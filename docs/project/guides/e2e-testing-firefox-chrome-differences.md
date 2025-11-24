# Diferencias entre Firefox y Chrome en Tests E2E

**Fecha:** 2025-11-24
**Contexto:** Investigación de page crashes y timeouts en tests E2E

---

## 🔍 Problema Investigado

### Síntomas Iniciales

- ❌ Chrome: Page crashes con error "Page crashed"
- ❌ Firefox: Timeout de 60s esperando llenar campo teléfono
- ❌ Health check failures después del crash

### Progreso de Investigación

#### Fase 1: Múltiples Procesos en Paralelo (RESUELTO ✅)

**Problema:** 11 procesos de Playwright corriendo simultáneamente
**Impacto:** Race conditions, contención del servidor en puerto 3000, page crashes aleatorios
**Solución:** `pkill -9 -f "playwright"` + ejecutar tests secuencialmente
**Resultado:** Chrome tests pasaron 12/12 (100%)

#### Fase 2: Firefox-Specific Timeout (EN INVESTIGACIÓN 🔍)

**Problema:** Test "debe crear un cliente sin email (campo opcional)" timeout en Firefox
**Error:**

```
locator.fill: Test timeout of 60000ms exceeded
waiting for getByLabel(/teléfono/i)
```

**Código Problemático:**

```typescript
// Line 217 en customers.spec.ts
await dialog.getByLabel(/teléfono/i).fill(customerPhone)
```

**Estado de la Página al Timeout:**

```yaml
- dialog "Nuevo Cliente" [ref=e12]:
  - textbox "Nombre" [active]:  # ✅ Campo llenado
    - text: E2E Test No Email 1763977514692
  - generic [ref=e21]: Teléfono  # ⚠️ NO es un <label>
    - textbox "Teléfono" [ref=e24]  # ❌ Sin label asociado
```

---

## 📊 Análisis de Diferencias entre Browsers

### Chrome vs Firefox: getByLabel() Behavior

| Aspecto                       | Chrome             | Firefox                   |
| ----------------------------- | ------------------ | ------------------------- |
| `getByLabel(/teléfono/i)`     | ✅ Encuentra campo | ❌ Timeout (no encuentra) |
| Detecta labels implícitos     | ⚠️ Más permisivo   | ⚠️ Más estricto           |
| Componentes custom con prefix | ✅ Funciona        | ❌ Puede fallar           |
| ARIA label heuristics         | Flexibles          | Estrictas                 |

### Componente Problemático: PhoneInput con Prefix

El campo de teléfono tiene estructura custom:

```yaml
- generic:
    - generic: Teléfono # ← Texto visible
    - generic:
        - generic: '+56' # ← Prefix component
        - textbox "Teléfono" # ← Input real
```

**Problema:**

- El label "Teléfono" NO está asociado semánticamente con el input
- El prefix "+56" puede estar rompiendo la asociación label-input en Firefox
- Chrome es más permisivo con heurísticas de ARIA

---

## 🛠️ Soluciones Propuestas

### Solución 1: Cambiar Selector a getByRole (RECOMENDADO ⭐)

```typescript
// ❌ MAL - Depende de labels implícitos
await dialog.getByLabel(/teléfono/i).fill(customerPhone)

// ✅ BIEN - Buscar por role + name accesible
const phoneInput = dialog.getByRole('textbox', { name: /teléfono/i })
await phoneInput.fill(customerPhone)
```

**Ventajas:**

- ✅ Más robusto cross-browser
- ✅ Busca por accessible name (más flexible)
- ✅ Funciona con componentes custom

**Desventajas:**

- ⚠️ Si el accessible name tampoco está bien configurado, seguirá fallando

### Solución 2: Buscar por Placeholder (ALTERNATIVA)

```typescript
// ✅ ALTERNATIVA - Si el input tiene placeholder
const phoneInput = dialog.getByPlaceholder(/teléfono|número/i)
await phoneInput.fill(customerPhone)
```

**Ventajas:**

- ✅ Independiente de labels
- ✅ Funciona si hay placeholder

**Desventajas:**

- ❌ Requiere que el input tenga placeholder
- ❌ Menos semántico

### Solución 3: Usar Locator con nth() (ÚLTIMO RECURSO)

```typescript
// ⚠️ ÚLTIMO RECURSO - Por índice
const phoneInput = dialog.locator('input[type="tel"]').or(dialog.locator('input').nth(1))
await phoneInput.fill(customerPhone)
```

**Ventajas:**

- ✅ Siempre funcionará

**Desventajas:**

- ❌ Frágil (se rompe si cambia el orden)
- ❌ No semántico
- ❌ Difícil de mantener

### Solución 4: Arreglar el Componente (IDEAL A LARGO PLAZO 🎯)

**Arreglar PhoneInput para tener label semántico correcto:**

```tsx
// components/forms/phone-input.tsx (ejemplo)
<FormItem>
  <FormLabel htmlFor="phone-input">Teléfono</FormLabel>
  <div>
    <span>+56</span>
    <FormControl>
      <Input id="phone-input" {...field} />
    </FormControl>
  </div>
</FormItem>
```

**Ventajas:**

- ✅ Fix permanente
- ✅ Mejora accesibilidad real
- ✅ Funciona en todos los browsers

**Desventajas:**

- ⚠️ Requiere cambio en código de producción
- ⚠️ Puede afectar otros usos del componente

---

## 🔄 Próximos Pasos

### Inmediato

1. ✅ Cambiar selector en tests a `getByRole('textbox', { name: /teléfono/i })`
2. ✅ Re-ejecutar tests para verificar que Firefox pasa
3. ✅ Documentar este issue en lessons learned

### Mediano Plazo

1. ⚠️ Revisar TODOS los campos custom con prefix/suffix
2. ⚠️ Agregar tests específicos de accesibilidad
3. ⚠️ Considerar agregar Firefox a CI/CD

### Largo Plazo

1. 🎯 Arreglar componentes con labels semánticos incorrectos
2. 🎯 Implementar linting de accesibilidad (eslint-plugin-jsx-a11y)
3. 🎯 Agregar tests cross-browser sistemáticos

---

## 📚 Lecciones Aprendidas

### 1. Chrome Es Más Permisivo que Firefox con Selectors

- **Contexto:** Chrome usa heurísticas más flexibles para `getByLabel()`
- **Lección:** Tests que pasan en Chrome pueden fallar en Firefox
- **Acción:** Probar SIEMPRE en ambos browsers durante desarrollo

### 2. Componentes Custom Rompen Accesibilidad Fácilmente

- **Contexto:** PhoneInput con prefix "+56" rompió asociación label-input
- **Lección:** Componentes con structure custom necesitan ARIA explícito
- **Acción:** Usar `aria-labelledby` o `htmlFor` correctamente

### 3. Múltiples Tests en Paralelo Causan Race Conditions

- **Contexto:** 11 procesos Playwright compitiendo por puerto 3000
- **Lección:** `workers: 1` en config NO previene múltiples ejecuciones simultáneas
- **Acción:** Verificar que solo 1 suite E2E corre a la vez

### 4. Test Timeouts Pueden Causar Server Crashes

- **Contexto:** Firefox timeout de 60s → servidor Next.js se cayó
- **Lección:** Timeouts largos pueden dejar conexiones colgadas
- **Acción:** Investigar por qué el timeout causó crash del servidor

---

## 🧪 Testing Matrix

| Test                          | Chrome  | Firefox    | Estado              |
| ----------------------------- | ------- | ---------- | ------------------- |
| Cargar página                 | ✅ Pass | ✅ Pass    | OK                  |
| Abrir dialog                  | ✅ Pass | ✅ Pass    | OK                  |
| Validar campos                | ✅ Pass | ✅ Pass    | OK                  |
| Crear cliente (con email)     | ✅ Pass | ✅ Pass    | OK                  |
| **Crear cliente (sin email)** | ✅ Pass | ❌ Timeout | **FIX PENDIENTE**   |
| Email duplicado               | ✅ Pass | ❓ Skipped | Bloqueado por crash |

**Total:** 18/24 tests pasando (75%) después de limpiar procesos

---

## 📖 Referencias

- [Playwright getByLabel vs getByRole](https://playwright.dev/docs/locators#locate-by-label)
- [ARIA Label Best Practices](https://www.w3.org/WAI/ARIA/apg/patterns/)
- [Firefox Accessibility Tree](https://firefox-source-docs.mozilla.org/accessible/index.html)

---

**Última actualización:** 2025-11-24
**Autor:** Debug session con Claude Code
**Tests Relacionados:** `tests/e2e/customers.spec.ts`
