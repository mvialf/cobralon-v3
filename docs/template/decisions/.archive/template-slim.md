# ADR-XXX: [Título Descriptivo de la Decisión]

## Decisión

[2-3 líneas: QUÉ decidimos usar y cuál es el alcance]

## Contexto

[4-6 líneas: Problema específico que necesitábamos resolver. Enfocarse en el "por qué" necesitábamos esto, no en justificar por qué NO elegimos alternativas]

## Alternativa Principal (opcional)

**[Nombre de la alternativa más relevante]:** [2-3 líneas explicando por qué NO se eligió esta alternativa específica. Solo incluir si aporta contexto crítico. Si la decisión fue obvia, omitir esta sección completamente]

## Consecuencias

### Beneficios ✅

1. **[Beneficio específico]:** [Descripción concreta, preferiblemente cuantificada]
2. **[Beneficio específico]:** [Descripción concreta, preferiblemente cuantificada]
3. **[Beneficio específico]:** [Descripción concreta, preferiblemente cuantificada]
4. **[Beneficio específico]:** [Opcional - máximo 5 beneficios]

### Trade-offs ⚠️

1. **[Trade-off específico]:** [Descripción del problema + cómo mitigarlo]
   - **Mitigación:** [Solución práctica al trade-off]
2. **[Trade-off específico]:** [Descripción del problema + cómo mitigarlo]
   - **Mitigación:** [Solución práctica al trade-off]
3. **[Trade-off específico]:** [Opcional - máximo 3-4 trade-offs]

## Quick Start

```bash
# Comandos clave (3-5 comandos principales)
npm run comando-principal
npm run comando-secundario

# Ejemplo de comando con explicación
npm run db:generate  # Genera tipos TypeScript
```

```typescript
// Código ejemplo esencial (5-15 líneas)
// Debe ser copy-paste funcional sin contexto adicional
import { ComponentePrincipal } from '@/lib/main'

const ejemplo = new ComponentePrincipal({
  opcion: 'valor',
})

// Uso básico
ejemplo.metodo()
```

## Referencias

- [Documentación Oficial](https://ejemplo.com/docs)
- [Guía de Setup en este template](../../guides/nombre-guia.md)
- [ADR Relacionado](XXX-titulo-relacionado.md) (si aplica)

---

**Última actualización:** YYYY-MM-DD

---

## Guía de Uso de Este Template

### Longitud Objetivo
- **Mínimo:** 40 líneas
- **Óptimo:** 50-100 líneas
- **Máximo:** 120 líneas (solo si absolutamente necesario)

### Secciones Obligatorias
- ✅ Decisión
- ✅ Contexto
- ✅ Consecuencias (Beneficios + Trade-offs)
- ✅ Quick Start (código + comandos)
- ✅ Referencias

### Secciones Opcionales
- 🟡 Alternativa Principal (solo si aporta contexto crítico)
- 🟡 Implementación (si hay detalles técnicos específicos del template)

### Qué MANTENER
- Información accionable
- Código funcional copy-paste
- Comandos específicos del template
- Trade-offs con mitigación práctica
- Referencias a docs actualizadas

### Qué ELIMINAR
- Alternativas obvias o irrelevantes
- Justificaciones extensas de "por qué NO"
- Información duplicada de docs oficiales
- Comparaciones que envejecen rápido
- Más de 1-2 alternativas descartadas

### Estilo de Escritura
- **Conciso y directo**
- **Enfocado en el usuario del template**
- **Responde: "¿Cómo me afecta esto?"**
- **NO: "¿Por qué NO elegimos X?"**

### Ejemplo de Buen Contenido

✅ **BUENO:**
```
Trade-off: Bundle size mayor (~1-2MB)
Mitigación: Para Edge Runtime usar `engineType = "client"`
```

❌ **MALO:**
```
Comparado con Drizzle que es ~50% más ligero y usa SQL-like API
que es más familiar para desarrolladores SQL, decidimos usar
Prisma porque tiene mejor DX aunque el bundle sea mayor...
[... 15 líneas más ...]
```

### Checklist Pre-Commit

Antes de marcar un ADR como completo, verificar:

- [ ] Longitud: 50-100 líneas ✅
- [ ] Responde "¿Cómo uso esto?" no "¿Por qué NO X?" ✅
- [ ] Código ejemplo es funcional copy-paste ✅
- [ ] Trade-offs incluyen mitigación ✅
- [ ] Referencias apuntan a docs actualizadas ✅
- [ ] Sin alternativas obvias/irrelevantes ✅
- [ ] Fecha de actualización correcta ✅

---

**Este template debe usarse para:**
- ✅ ADRs nuevos desde cero
- ✅ Refactorización de ADRs existentes (Tipo 1: "Ya decidido")

**NO usar este template para:**
- ❌ ADRs donde usuario debe elegir (usar template extendido)
- ❌ Documentación de guías (usar docs/guides/)
- ❌ Implementation logs (usar docs/project/implementation/)
