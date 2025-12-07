# Documentación del Proyecto: Cobralon

Bienvenido a la documentación técnica de **Cobralon**, el sistema de gestión de cobranza y proyectos.

## 🎯 Objetivo del Proyecto

Cobralon es un sistema diseñado para administrar el ciclo de vida financiero de proyectos de construcción/inmobiliarios, con un fuerte enfoque en:

1.  **Gestión de Cobranza**: Seguimiento de pagos y deudas.
2.  **Cuenta Corriente**: Control de saldos por proyecto y cliente.
3.  **Lógica FIFO**: Aplicación automática de pagos a deudas más antiguas.
4.  **Sistema de Créditos**: Manejo de saldos a favor (créditos) y su aplicación a nuevas deudas.

## 📚 Estructura de Documentación

Esta carpeta `docs/project/` contiene la documentación viva del sistema:

- [**architecture.md**](architecture.md): Arquitectura técnica y lógica de negocio (FIFO, Créditos, Estados).
- [**implementation/**](implementation/): Registro histórico de features implementadas.
- [**decisions/**](decisions/): Registro de Decisiones de Arquitectura (ADRs).

---

## 🏗️ Dominios de Negocio Principales

El núcleo de la lógica de negocio reside en `lib/business-logic/`. Los conceptos clave son:

### 1. Pagos FIFO (`payment-fifo.ts`)
El sistema aplica estrictamente el principio "First-In, First-Out". Cuando ingresa un pago:
1. Se ordena la deuda del cliente por antigüedad.
2. El pago cubre primero la deuda más vieja.
3. Si sobra dinero, se genera un crédito a favor.

### 2. Gestión de Créditos (`credit-management.ts`)
Los saldos a favor se manejan como "Créditos".
- **Invariante**: El saldo de crédito nunca puede ser negativo.
- **Aplicación**: Los créditos pueden usarse para pagar deudas futuras (total o parcialmente).

### 3. Estados de Proyecto (`project-state.ts`)
Un proyecto tiene un ciclo de vida definido por su saldo y status administrativo:
- **Activo**: Proyecto en curso o con deuda pendiente.
- **Finalizado**: Proyecto cerrado administrativamente Y con deuda cero.

---

## 🛠️ Stack Tecnológico

Ver [docs/template/architecture/stack.md](../template/architecture/stack.md) para el detalle técnico base, pero los componentes clave de este proyecto son:

- **Frontend**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **DB**: PostgreSQL + Prisma ORM
- **Validación**: Zod (Business Objects & Forms)
- **Testing**: Vitest (Unit & Integration)
