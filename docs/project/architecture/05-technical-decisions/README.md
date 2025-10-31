# Decisiones Técnicas Clave

Documentación de decisiones arquitecturales importantes del proyecto con razones, alternativas y trade-offs.

---

## 📚 Decisiones Documentadas

### 1. [PaymentAllocation Table](payment-allocation.md)

**Decisión:** Tabla intermedia N:M entre Payment y Project

**¿Por qué?**
- ✅ Soporta pagos a múltiples proyectos (1:N)
- ✅ Historial completo de asignaciones
- ✅ Balance calculado: `SUM(allocations) GROUP BY project`

**Alternativas:** FK directo, JSON embedded

---

### 2. [Decimal Precision](decimal-precision.md)

**Decisión:** Tipo `Decimal(12,2)` para montos financieros

**¿Por qué?**
- ✅ Exactitud sin errores de punto flotante
- ✅ Standard financiero (2 decimales)
- ✅ Rango suficiente (hasta $999,999,999,999.99)

**Alternativas:** Float/Double, Int (centavos)

---

### 3. [Cascade vs Restrict](cascade-vs-restrict.md)

**Decisión:** Políticas `onDelete` diferenciadas por tipo de relación

**¿Por qué?**
- ✅ CASCADE para ownership (Customer → Project)
- ✅ RESTRICT para configuración (Project → ProjectStatus)
- ✅ Protege integridad de datos

**Filosofía:** Ownership vs Reference

---

### 4. [Installments Separate](installments-separate.md)

**Decisión:** Tabla `Installment` separada (no JSON field)

**¿Por qué?**
- ✅ Queries individuales: `WHERE status='pending'`
- ✅ Cron job simple: batch update
- ✅ Auditoría completa: paidDate, status

**Alternativas:** JSON field, N Payments

---

### 5. [Legacy Status Field](legacy-status-field.md)

**Decisión:** Mantener `projectStatusLegacy` + nuevo FK `projectStatusId`

**¿Por qué?**
- ✅ Migración progresiva sin breaking changes
- ✅ Nuevos proyectos usan FK configurable
- ⚠️ Deuda técnica temporal

**Estado:** Migración en progreso

---

### 6. [Regional Config](regional-config.md)

**Decisión:** Context API para configuración regional (no i18n completo)

**¿Por qué?**
- ✅ Base para futuro multi-país
- ✅ Simplicidad (sin librerías externas)
- ✅ localStorage + derivación automática (currency, locale)

**Alternativas:** next-intl, Hardcoded CLP

---

## 🎯 Formato de Decisiones

Cada decisión sigue el formato:

```markdown
# Decisión: [Título]

## Contexto

¿Qué problema resolvemos?

## Decisión

¿Qué elegimos?

## Alternativas Consideradas

1. Alternativa A
   - Pros: ...
   - Contras: ...
   - Por qué NO: ...

2. Alternativa B
   - Pros: ...
   - Contras: ...
   - Por qué NO: ...

## Razones

1. Razón 1
2. Razón 2
...

## Trade-offs

- ⚠️ **Desventaja 1:** Descripción
  - ✅ **Mitigación:** Cómo mitigamos

- ⚠️ **Desventaja 2:** Descripción
  - ✅ **Mitigación:** Cómo mitigamos
```

---

## 🔗 Referencias

### ADRs del Template

Decisiones del framework base (no del proyecto):

- [ADR-001: Next.js 15 + App Router](../../template/decisions/001-nextjs-15-app-router.md)
- [ADR-002: Tailwind CSS v4](../../template/decisions/002-tailwind-css-v4.md)
- [ADR-003: shadcn/ui New York](../../template/decisions/003-shadcn-ui-new-york.md)
- [ADR-008: Prisma + Neon](../../template/decisions/008-prisma-neon.md)
- [ADR-012: Pino Structured Logging](../decisions/012-pino-structured-logging.md)

### Decisiones del Proyecto

Este directorio contiene decisiones específicas del proyecto Cobralon (no del template).

---

## Ver También

- [Modelo de Datos](../01-data-model/) - Implementación de decisiones
- [Business Logic Layer](../03-layers/business-logic.md) - Validaciones y cálculos

**Última actualización:** 2025-10-30
