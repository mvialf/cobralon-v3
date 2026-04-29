import { prisma } from '@/lib/db'

/**
 * Trunca todas las tablas de dominio en orden seguro (CASCADE) y reinicia
 * secuencias. Pensada para llamarse en `beforeEach` de cada test de integración.
 *
 * No toca tablas de auth (user, session, account, verification): los tests no
 * dependen de usuarios y mantenerlas evita romper si algún día se agrega seed.
 */
export async function resetDb(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "credit_transactions",
      "PaymentAllocation",
      "Installment",
      "Payment",
      "project_adjustments",
      "project_uninstall_tags",
      "project_events",
      "aftersale_events",
      "visit_events",
      "Aftersale",
      "Project",
      "visits",
      "Customer",
      "CommissionTier",
      "PaymentMethod",
      "ProjectStatus",
      "AftersaleStatus",
      "VisitStatus",
      "adjustment_reasons",
      "UninstallTag",
      "team_tags",
      "BadgeColor"
    RESTART IDENTITY CASCADE
  `)
}
