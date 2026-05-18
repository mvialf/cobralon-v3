/**
 * Script legacy de sincronización de balances
 *
 * EJECUTAR DESPUÉS DE MIGRACIÓN:
 * npx tsx scripts/populate-project-balances.ts
 *
 * Este script:
 * 1. Lee todos los proyectos desde ProjectFinancials
 * 2. Copia el balance derivado hacia Project.balance legacy
 *
 * SAFE TO RUN: Puede ejecutarse múltiples veces sin efectos secundarios
 */

import { prisma } from '../lib/db'
import { Decimal } from '@prisma/client/runtime/library'

interface ProjectFinancialsRow {
  projectId: string
  projectNumber: string
  balance: Decimal
}

interface Stats {
  total: number
  updated: number
  errors: number
  totalBalance: number
  projectsWithDebt: number
  projectsFullyPaid: number
}

async function populateBalances(): Promise<Stats> {
  console.log('🚀 Iniciando sincronización de balances legacy desde ProjectFinancials...\n')

  const stats: Stats = {
    total: 0,
    updated: 0,
    errors: 0,
    totalBalance: 0,
    projectsWithDebt: 0,
    projectsFullyPaid: 0,
  }

  try {
    console.log('📦 Cargando balances derivados...')
    const projects = await prisma.$queryRaw<ProjectFinancialsRow[]>`
      SELECT
        p.id AS "projectId",
        p."projectNumber",
        pf.balance
      FROM "Project" p
      JOIN "ProjectFinancials" pf ON pf."projectId" = p.id
      ORDER BY p."projectNumber"
    `

    stats.total = projects.length
    console.log(`✅ ${projects.length} proyectos encontrados\n`)

    // Procesar cada proyecto
    console.log('🔄 Sincronizando balances legacy...\n')

    for (const project of projects) {
      try {
        const balance = Number(project.balance)

        await prisma.project.update({
          where: { id: project.projectId },
          data: {
            balance: new Decimal(balance),
          },
        })

        // Estadísticas
        stats.updated++
        stats.totalBalance += balance

        if (balance > 0) {
          stats.projectsWithDebt++
        } else {
          stats.projectsFullyPaid++
        }

        // Log de progreso cada 10 proyectos
        if (stats.updated % 10 === 0) {
          console.log(`  ✓ ${stats.updated}/${stats.total} proyectos actualizados...`)
        }
      } catch (error) {
        stats.errors++
        console.error(`  ❌ Error en proyecto ${project.projectNumber}:`, error)
      }
    }

    return stats
  } catch (error) {
    console.error('\n❌ Error fatal:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar script
;(async () => {
  try {
    const stats = await populateBalances()

    // Reporte final
    console.log('\n' + '='.repeat(60))
    console.log('📊 RESUMEN DE EJECUCIÓN')
    console.log('='.repeat(60))
    console.log(`Total proyectos:        ${stats.total}`)
    console.log(`✅ Actualizados:        ${stats.updated}`)
    console.log(`❌ Errores:             ${stats.errors}`)
    console.log(`\n💰 Balance total:       $${stats.totalBalance.toLocaleString('es-CL')}`)
    console.log(
      `📈 Con deuda:           ${stats.projectsWithDebt} (${((stats.projectsWithDebt / stats.total) * 100).toFixed(1)}%)`
    )
    console.log(
      `✅ Pagados completos:   ${stats.projectsFullyPaid} (${((stats.projectsFullyPaid / stats.total) * 100).toFixed(1)}%)`
    )
    console.log('='.repeat(60))
    console.log('\n✅ Población de balances completada exitosamente!')

    process.exit(0)
  } catch (error) {
    console.error('\n💥 Script fallido:', error)
    process.exit(1)
  }
})()
