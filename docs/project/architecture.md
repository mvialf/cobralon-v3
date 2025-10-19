# Arquitectura del Proyecto

> **Nota:** Este archivo es un placeholder/ejemplo. Reemplázalo con la arquitectura de TU proyecto específico.

## Propósito de Este Archivo

Documentar la arquitectura **específica de tu proyecto**, no del template.

El template ya tiene su arquitectura documentada en [docs/template/architecture/overview.md](../template/architecture/overview.md).

## Qué Documentar Aquí

### 1. Arquitectura de Alto Nivel

Diagrama conceptual de TU aplicación específica:

- Módulos principales
- Flujos de datos
- Integraciones externas
- Servicios

Ejemplo (si fuera e-commerce):

```
┌──────────────────────────────────────────┐
│           Frontend (Next.js)             │
│  ┌────────┐  ┌────────┐  ┌────────┐    │
│  │ Catalog│  │ Cart   │  │Checkout│    │
│  └────────┘  └────────┘  └────────┘    │
└──────────────────────────────────────────┘
                ↓
┌──────────────────────────────────────────┐
│           API Routes                      │
│  ┌────────┐  ┌────────┐  ┌────────┐    │
│  │Products│  │ Orders │  │Payments│    │
│  └────────┘  └────────┘  └────────┘    │
└──────────────────────────────────────────┘
                ↓
┌──────────────────────────────────────────┐
│           Database (PostgreSQL)           │
│  Products | Orders | Users | Payments    │
└──────────────────────────────────────────┘
                ↓
┌──────────────────────────────────────────┐
│         External Services                 │
│  Stripe | SendGrid | AWS S3 | Cloudinary │
└──────────────────────────────────────────┘
```

### 2. Decisiones Arquitecturales Clave

Referencia tus ADRs:

- [ADR-001: Por qué NextAuth](decisions/001-nextauth.md)
- [ADR-002: Por qué PostgreSQL + Prisma](decisions/002-postgres-prisma.md)
- [ADR-003: Por qué Stripe](decisions/003-stripe-payments.md)

### 3. Patrones Específicos de Tu Proyecto

- Manejo de estado global (si usas Zustand, Redux, etc.)
- Patrón de fetching de datos (React Query, SWR, etc.)
- Estructura de carpetas custom
- Naming conventions

### 4. Integraciones

- APIs externas
- Webhooks
- Cron jobs / scheduled tasks
- Email service
- Cloud storage
- Analytics

### 5. Security

- Manejo de auth/authorization
- API key management
- Rate limiting
- CORS configuration

## Ejemplo Mínimo

Si estás empezando y aún no tienes arquitectura compleja:

```markdown
## Arquitectura Actual

Proyecto SaaS simple basado en el template:

- **Frontend:** Next.js 14 con App Router
- **UI:** shadcn/ui components
- **Auth:** Pendiente (considerar NextAuth)
- **DB:** Pendiente (considerar Prisma + PostgreSQL)
- **Deploy:** Vercel

Ver [Template Architecture](../template/architecture/overview.md) para base.

## Roadmap Arquitectural

- [ ] Implementar autenticación
- [ ] Setup base de datos
- [ ] Integrar sistema de pagos
- [ ] Configurar email service
```

---

**Actualiza este archivo a medida que tu proyecto evoluciona.**
