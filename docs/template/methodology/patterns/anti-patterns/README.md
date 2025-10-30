# Anti-Patrones a Evitar

Esta sección documenta los anti-patrones comunes que debes evitar en proyectos basados en este template.

## 📋 Índice de Anti-Patrones

1. [Client Components Innecesarios](client-components-unnecessary.md)
   - Por qué evitar `"use client"` sin necesidad
   - Cuándo SÍ usarlo

2. [Props Drilling Excesivo](props-drilling.md)
   - Pasar props por múltiples niveles
   - Alternativas: Context API, state management

3. [Lógica de Negocio en Componentes](business-logic-in-components.md)
   - Por qué extraer a hooks o utilidades
   - Mantener componentes simples

4. [Estilos Inline Complejos](inline-complex-styles.md)
   - Evitar estilos inline verbosos
   - Usar Tailwind classes o componentes reutilizables

5. [Conditional Styling Hardcodeado](conditional-styling-hardcoded.md)
   - Valores mágicos en conditional styling
   - Soluciones con configuración explícita

## Cómo Usar Esta Sección

- **Para desarrolladores nuevos:** Lee todos los anti-patrones antes de empezar a codear
- **Para code reviews:** Referencia específica cuando detectes alguno de estos patrones
- **Para documentación:** Agrega nuevos anti-patrones según los encuentres en el proyecto

## Filosofía

> Un anti-patrón es una solución común que parece correcta pero genera problemas a largo plazo.

Esta documentación existe para:

- ✅ Prevenir deuda técnica
- ✅ Mantener consistencia
- ✅ Acelerar onboarding
- ✅ Mejorar mantenibilidad

## Referencias

- [Patrones Recomendados](../README.md)
- [Building Features Guide](../../../guides/building-features/)

---

[← Volver al índice principal](../README.md)
