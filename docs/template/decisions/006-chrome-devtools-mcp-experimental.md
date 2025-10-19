# ADR-006: Chrome DevTools MCP para Testing E2E (Experimental)

## Estado

**Experimental / Aceptado para Uso Limitado**

**Fecha:** 2025-01-13

## Contexto

Después de implementar Vitest para unit/integration tests, necesitábamos decidir nuestra estrategia de E2E testing. Las opciones principales eran:

1. Playwright (industry standard)
2. Cypress (popular pero más lento)
3. Chrome DevTools MCP (experimental, AI-driven)

El usuario expresó interés en **probar Chrome DevTools MCP** en este proyecto para evaluar la herramienta en un caso de uso real.

## Decisión

Adoptar **Chrome DevTools MCP** como herramienta **experimental** para E2E testing exploratorio, **NO como reemplazo** de herramientas tradicionales como Playwright.

**Scope de uso:**

- ✅ Debugging interactivo con Claude Code
- ✅ Exploración de bugs reportados por usuarios
- ✅ Validación rápida de features nuevas
- ✅ Generación de screenshots y evidencia
- ❌ NO para regression testing automatizado
- ❌ NO para CI/CD pipelines

## Alternativas Consideradas

### Alternativa 1: Playwright (Recomendado para Producción)

- **Pros:**
  - Industry standard para E2E testing
  - Multi-browser support (Chrome, Firefox, Safari, Edge)
  - Parallel test execution
  - Auto-waiting (reliability)
  - Test generator (codegen)
  - Integración con CI/CD out-of-the-box
  - Trace viewer para debugging
  - Component testing support
- **Contras:**
  - Requiere aprender API de Playwright
  - Escribir y mantener archivos `.spec.ts`
  - Setup inicial más complejo
- **Por qué NO (como única opción):** Queremos **experimentar** con Chrome DevTools MCP **en paralelo**, no reemplazar Playwright.

**Nota:** Se recomienda usar Playwright para regression testing en proyectos serios.

### Alternativa 2: Cypress

- **Pros:**
  - Muy popular (usado por muchas empresas)
  - Excelente DX con Cypress Studio
  - Time-travel debugging
  - Screenshots y videos automáticos
- **Contras:**
  - **Más lento** que Playwright
  - Solo Chrome-based browsers nativamente (Firefox/Safari limitados)
  - Network stubbing más complejo
  - No support para múltiples pestañas/tabs
- **Por qué NO:** Playwright es superior técnicamente.

### Alternativa 3: Selenium

- **Pros:**
  - El más maduro (15+ años)
  - Multi-lenguaje (Java, Python, C#, etc.)
  - Soporte amplio de browsers
- **Contras:**
  - API verbosa y antigua
  - Más lento que alternativas modernas
  - Flaky tests comunes
  - Configuración compleja
- **Por qué NO:** Tecnología legacy, preferimos herramientas modernas.

### Alternativa 4: Chrome DevTools MCP (Nuestra Elección)

- **Pros:**
  - **AI-driven**: Claude Code puede escribir y ejecutar tests conversacionalmente
  - **Fast iteration**: Describe el problema → Claude lo prueba
  - **Útil para debugging**: Navegación, screenshots, logs, network, performance
  - **Sin código de tests**: No requiere mantener archivos `.spec.ts`
  - **Flexible**: Útil para exploración y validación rápida
- **Contras:**
  - **No es para CI/CD**: No diseñado para pipelines automatizados
  - **Solo Chrome**: No prueba cross-browser
  - **No reproduce tests**: Tests no persisten como código
  - **Experimental**: Herramienta relativamente nueva
  - **Requiere Chrome en debug mode**: No "headless" puro
- **Por qué SÍ (con limitaciones):** Valor único para debugging interactivo con Claude. No reemplaza Playwright, sino que **complementa**.

## Consecuencias

### Positivas ✅

1. **Debugging Conversacional con Claude**
   - Describe el bug a Claude → Claude navega y reproduce el issue
   - Captura screenshots y logs automáticamente
   - Útil para bugs reportados por usuarios

2. **Exploración Rápida de Features**
   - "Claude, prueba el flujo de checkout completo"
   - Más rápido que escribir un test de Playwright manualmente
   - Útil en fases tempranas de desarrollo

3. **Performance Debugging**
   - Claude puede ejecutar `performance_start_trace()` y analizar Core Web Vitals
   - Identifica bottlenecks en network y rendering
   - Genera reportes automáticamente

4. **Mobile Testing Rápido**
   - Claude puede probar múltiples viewports rápidamente
   - `resize_page(375, 667)` → screenshot → análisis

5. **Sin Mantenimiento de Tests**
   - No hay archivos `.spec.ts` que mantener
   - Tests son conversaciones ad-hoc

### Negativas / Trade-offs ⚠️

1. **NO Reemplaza Regression Testing**
   - Tests no persisten como código
   - No hay concept de "test suite"
   - **Mitigación:** Usar Playwright para regression tests. Chrome DevTools MCP es solo para exploración.

2. **Solo Chrome**
   - No prueba Firefox, Safari, Edge
   - **Impacto:** Bugs específicos de otros browsers no se detectan
   - **Mitigación:** Si el proyecto requiere cross-browser testing, usar Playwright adicionalmente.

3. **Requiere Chrome en Debug Mode**

   ```bash
   google-chrome --remote-debugging-port=9222
   ```

   - No es "headless" puro
   - Requiere configuración manual
   - **Mitigación:** Documentado en [guía](../guides/chrome-devtools-mcp-testing.md).

4. **No CI/CD Friendly**
   - No está diseñado para ejecutarse en pipelines
   - Requiere interacción humana (conversación con Claude)
   - **Mitigación:** Usar Playwright en CI/CD. Chrome DevTools MCP es local-only.

5. **Experimental y Nuevo**
   - Herramienta relativamente nueva
   - Menos recursos y ejemplos que Playwright
   - **Mitigación:** Uso limitado a casos específicos documentados.

## Implementación

### Instalación

**NO incluida en el template por defecto** (debe instalarse manualmente si se desea usar).

```bash
# Global installation
npm install -g @modelcontextprotocol/server-chrome-devtools
```

### Configuración Claude Code

Agregar a `~/.config/Claude Code/mcp_settings.json`:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-chrome-devtools"],
      "env": {
        "CHROME_PATH": "/usr/bin/google-chrome"
      }
    }
  }
}
```

### Inicio de Chrome

```bash
google-chrome --remote-debugging-port=9222
```

### Uso con Claude Code

Ejemplo de conversación:

```
Usuario: "Claude, prueba el formulario de contacto en localhost:3000"

Claude: Voy a navegar a la página y probar el formulario.

1. navigate_page("http://localhost:3000/contact")
2. take_snapshot() → Veo el formulario con campos: name, email, message
3. fill_form([
     { uid: "input-name", value: "Test User" },
     { uid: "input-email", value: "test@example.com" },
     { uid: "textarea-message", value: "Test message" }
   ])
4. click("button-submit")
5. wait_for("Thank you")
6. take_screenshot() → Evidencia de éxito
7. list_console_messages() → No errors

Resultado: Formulario funciona correctamente ✅
```

## Herramientas MCP Disponibles

Ver [guía completa](../guides/chrome-devtools-mcp-testing.md) para lista exhaustiva.

Destacadas:

- **Navegación**: `navigate_page`, `new_page`, `list_pages`
- **Inspección**: `take_snapshot`, `take_screenshot`, `evaluate_script`
- **Interacción**: `click`, `fill`, `fill_form`, `hover`, `drag`
- **Debugging**: `list_console_messages`, `list_network_requests`
- **Performance**: `performance_start_trace`, `performance_stop_trace`
- **Utilidades**: `resize_page`, `emulate_cpu`, `emulate_network`

## Casos de Uso Recomendados

### ✅ USAR para:

1. **Exploración de bugs reportados**

   ```
   Usuario reporta: "El botón de pago no funciona"
   → Claude navega, reproduce, captura error, identifica causa
   ```

2. **Validación rápida post-deployment**

   ```
   "Claude, verifica que el login funcione en staging"
   → Claude prueba y confirma en 30 segundos
   ```

3. **Performance debugging**

   ```
   "Analiza por qué la homepage carga lento"
   → Claude ejecuta trace, identifica imagen de 5MB sin optimizar
   ```

4. **Generación de screenshots para docs**
   ```
   "Captura screenshots de todas las páginas en mobile"
   → Claude navega y genera 10 screenshots en 2 minutos
   ```

### ❌ NO USAR para:

1. **Regression testing automatizado**
   - Usar Playwright con `.spec.ts` files

2. **CI/CD pipelines**
   - Chrome DevTools MCP no es headless puro

3. **Cross-browser testing**
   - Solo funciona con Chrome

4. **Tests que necesitan persistir**
   - No genera archivos de tests reutilizables

## Integración con Vitest

Chrome DevTools MCP y Vitest son **complementarios**, no competidores:

```
┌────────────────────────────────────────┐
│        Testing Pyramid                 │
├────────────────────────────────────────┤
│  E2E Exploratory (Chrome DevTools MCP) │  ← Manual, ad-hoc
├────────────────────────────────────────┤
│  E2E Regression (Playwright)           │  ← Automatizado, CI/CD
├────────────────────────────────────────┤
│  Integration Tests (Vitest)            │  ← Flujos multi-component
├────────────────────────────────────────┤
│  Unit Tests (Vitest)                   │  ← Lógica aislada
└────────────────────────────────────────┘
```

**Workflow recomendado:**

1. Implementar feature
2. Unit tests con Vitest
3. Claude prueba con Chrome DevTools MCP (exploración)
4. Si encuentra bug → Escribir Playwright test para evitar regression
5. Deploy con confianza

## Documentación Adicional

- [Guía completa de Chrome DevTools MCP](../guides/chrome-devtools-mcp-testing.md)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [Model Context Protocol Spec](https://modelcontextprotocol.io/)

## Decisiones Pendientes

- [ ] **Evaluar en 3 meses**: ¿Fue útil Chrome DevTools MCP?
- [ ] **Considerar Playwright**: Si el proyecto crece, agregar Playwright para regression
- [ ] **Documentar casos de éxito**: Trackear cuándo Chrome DevTools MCP fue útil vs no

## Conclusión

Chrome DevTools MCP es una herramienta **experimental** con valor único para:

- Debugging interactivo conversacional con Claude
- Exploración rápida de issues
- Generación de evidencia (screenshots, logs, traces)

**NO reemplaza** Playwright/Cypress para regression testing automatizado.

**Status Final:** Aceptado para uso **limitado y experimental**. Si el proyecto requiere E2E testing robusto, se recomienda implementar Playwright en paralelo.

---

**Última actualización:** 2025-01-13
