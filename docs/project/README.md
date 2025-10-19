# Documentación del Proyecto

Esta es la documentación de **este proyecto específico** construido con el SaaS Template.

> **Nota:** Esta documentación es un **ejemplo** de cómo documentar tu proyecto usando la metodología del template. Reemplaza este contenido con la documentación de TU proyecto.

## Archivos

- [**architecture.md**](architecture.md) - Arquitectura específica de este proyecto
- [**implementation.md**](implementation.md) - Timeline de implementaciones
- [**decisions/**](decisions/) - ADRs específicos del proyecto (no del template)

## Diferencia: Template vs Project Docs

### Template Docs ([docs/template/](../template/))

- Documentación del **framework/template** en sí
- Para **usuarios del template**
- Decisiones sobre Next.js, Tailwind, shadcn/ui, etc.

### Project Docs ([docs/project/](../project/))

- Documentación de **ESTE proyecto específico**
- Para **desarrolladores de este proyecto**
- Decisiones sobre auth, DB, features específicas, etc.

## Ejemplo de Uso

Si este fuera un proyecto de e-commerce real, aquí documentarías:

### ADRs del Proyecto

- `decisions/001-stripe-vs-paypal.md` - Por qué elegimos Stripe
- `decisions/002-prisma-postgres.md` - Por qué Prisma + PostgreSQL
- `decisions/003-s3-images.md` - Por qué AWS S3 para imágenes

### Implementation Log

Registrar implementaciones como:

- Setup de autenticación con NextAuth
- Integración de Stripe checkout
- Sistema de inventory management
- etc.

### Architecture

Documentar:

- Arquitectura específica del e-commerce
- Flujo de checkout
- Manejo de pagos
- etc.

---

## Cómo Usar Esto en Tu Proyecto

1. **Clona el template**
2. **Borra/modifica este README.md** con info de tu proyecto
3. **Crea tus ADRs** en `decisions/` según decides arquitectura
4. **Documenta implementaciones** en `implementation.md`
5. **Actualiza architecture.md** con tu arquitectura específica

---

**Ver:** [Template Documentation](../template/) para entender el framework base.
