---
paths: ["components/**/*.tsx", "app/**/*.tsx", "app/**/*.css"]
---

# Reglas de Estilos y CSS

## REGLAS OBLIGATORIAS

- **NUNCA hardcodear estilos inline** en componentes
- **SIEMPRE usar global.css** para definir estilos personalizados
- **PROHIBIDO crear estilos CSS directamente** en archivos de componentes sin justificación
- Los colores, fuentes y variables CSS **DEBEN** provenir de global.css
- Si necesitas un nuevo estilo, **PRIMERO agrégalo a global.css**, luego úsalo

## Variables CSS

- Referencia variables con `var(--nombre-variable)`
- Para colores: usar formato `-050` (no `-50`) según convenciones del proyecto

## Enfoque

1. **Preferir** clases utilitarias de Tailwind CSS
2. Para estilos personalizados: definir en global.css y referenciar por clase
3. Mantener consistencia con el sistema de diseño existente
