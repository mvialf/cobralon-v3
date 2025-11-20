import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function deepAnalysis() {
  try {
    console.log('🧠 ANÁLISIS PROFUNDO: DETECCIÓN DE PROYECTOS IMPORTADOS\n')
    console.log('=' .repeat(80))

    // Obtener todos los proyectos con todas las relaciones
    const projects = await prisma.project.findMany({
      include: {
        customer: true,
        projectStatus: true,
        paymentAllocations: {
          include: {
            payment: {
              include: {
                paymentMethod: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    console.log(`\n📊 Total proyectos analizados: ${projects.length}\n`)

    // ============================================================
    // INDICADORES PRIMARIOS DE IMPORTACIÓN
    // ============================================================

    const indicators = {
      // 1. Campo legacy
      hasProjectStatusLegacy: projects.filter(p => p.projectStatusLegacy !== '').length,

      // 2. Status null (no migrado)
      hasNullProjectStatusId: projects.filter(p => p.projectStatusId === null).length,

      // 3. Sin nombre de proyecto
      hasNullProjectName: projects.filter(p => p.projectName === null).length,

      // 4. totalAmount null (no usa sistema de pagos)
      hasNullTotalAmount: projects.filter(p => p.totalAmount === null).length,

      // 5. Sin tags de desinstalación
      hasEmptyUninstallTags: projects.filter(p => p.uninstallTagIds.length === 0).length,

      // 6. Timestamps idénticos (nunca editado post-import)
      hasSameTimestamps: projects.filter(p =>
        p.createdAt.getTime() === p.updatedAt.getTime()
      ).length,

      // 7. TaxRate diferente de 19% (indicador de importación con taxRate legacy)
      hasNon19TaxRate: projects.filter(p => !p.taxRate.equals(19.0)).length,

      // 8. Phone == customer.phone (copiado en importación)
      phoneMatchesCustomer: projects.filter(p =>
        p.phone === p.customer.phone
      ).length
    }

    console.log('🔍 INDICADORES PRIMARIOS DE IMPORTACIÓN')
    console.log('=' .repeat(80))
    console.log(`
1. projectStatusLegacy no vacío:     ${indicators.hasProjectStatusLegacy}/${projects.length} (${((indicators.hasProjectStatusLegacy/projects.length)*100).toFixed(1)}%)
2. projectStatusId es NULL:          ${indicators.hasNullProjectStatusId}/${projects.length} (${((indicators.hasNullProjectStatusId/projects.length)*100).toFixed(1)}%)
3. projectName es NULL:              ${indicators.hasNullProjectName}/${projects.length} (${((indicators.hasNullProjectName/projects.length)*100).toFixed(1)}%)
4. totalAmount es NULL:              ${indicators.hasNullTotalAmount}/${projects.length} (${((indicators.hasNullTotalAmount/projects.length)*100).toFixed(1)}%)
5. uninstallTagIds vacío:            ${indicators.hasEmptyUninstallTags}/${projects.length} (${((indicators.hasEmptyUninstallTags/projects.length)*100).toFixed(1)}%)
6. createdAt == updatedAt:           ${indicators.hasSameTimestamps}/${projects.length} (${((indicators.hasSameTimestamps/projects.length)*100).toFixed(1)}%)
7. taxRate != 19%:                   ${indicators.hasNon19TaxRate}/${projects.length} (${((indicators.hasNon19TaxRate/projects.length)*100).toFixed(1)}%)
8. phone == customer.phone:          ${indicators.phoneMatchesCustomer}/${projects.length} (${((indicators.phoneMatchesCustomer/projects.length)*100).toFixed(1)}%)
`)

    // ============================================================
    // CLASIFICACIÓN POR SCORE DE IMPORTACIÓN
    // ============================================================

    console.log('=' .repeat(80))
    console.log('🎯 CLASIFICACIÓN POR SCORE DE IMPORTACIÓN')
    console.log('=' .repeat(80))

    const scoredProjects = projects.map(p => {
      let score = 0
      const reasons = []

      // Criterio 1: projectStatusLegacy no vacío (FUERTE)
      if (p.projectStatusLegacy !== '') {
        score += 3
        reasons.push(`projectStatusLegacy="${p.projectStatusLegacy}"`)
      }

      // Criterio 2: projectStatusId NULL (FUERTE)
      if (p.projectStatusId === null) {
        score += 3
        reasons.push('projectStatusId=NULL')
      }

      // Criterio 3: projectName NULL (MEDIO)
      if (p.projectName === null) {
        score += 2
        reasons.push('projectName=NULL')
      }

      // Criterio 4: totalAmount NULL (MEDIO)
      if (p.totalAmount === null) {
        score += 2
        reasons.push('totalAmount=NULL')
      }

      // Criterio 5: uninstallTagIds vacío (DÉBIL)
      if (p.uninstallTagIds.length === 0) {
        score += 1
        reasons.push('sin uninstallTags')
      }

      // Criterio 6: timestamps idénticos (DÉBIL)
      if (p.createdAt.getTime() === p.updatedAt.getTime()) {
        score += 1
        reasons.push('sin ediciones')
      }

      // Criterio 7: taxRate != 19% (DÉBIL - puede ser legítimo)
      if (!p.taxRate.equals(19.0)) {
        score += 1
        reasons.push(`taxRate=${p.taxRate}%`)
      }

      return {
        project: p,
        score,
        reasons
      }
    })

    // Clasificar por score
    const highScore = scoredProjects.filter(sp => sp.score >= 8)  // Muy probable importado
    const mediumScore = scoredProjects.filter(sp => sp.score >= 5 && sp.score < 8)  // Probable importado
    const lowScore = scoredProjects.filter(sp => sp.score >= 2 && sp.score < 5)  // Posiblemente importado
    const nativeScore = scoredProjects.filter(sp => sp.score < 2)  // Probable nativo

    console.log(`\n🔴 ALTA PROBABILIDAD (score ≥8):    ${highScore.length} proyectos`)
    console.log(`🟡 MEDIA PROBABILIDAD (score 5-7):  ${mediumScore.length} proyectos`)
    console.log(`🟢 BAJA PROBABILIDAD (score 2-4):   ${lowScore.length} proyectos`)
    console.log(`⚪ NATIVO (score <2):                ${nativeScore.length} proyectos`)

    // ============================================================
    // ANÁLISIS DE PATRONES DE DATOS
    // ============================================================

    console.log('\n' + '=' .repeat(80))
    console.log('📊 ANÁLISIS DE PATRONES DE DATOS')
    console.log('=' .repeat(80))

    // Distribución de taxRate
    const taxRateDistribution = {}
    projects.forEach(p => {
      const rate = p.taxRate.toString()
      taxRateDistribution[rate] = (taxRateDistribution[rate] || 0) + 1
    })

    console.log('\n💰 Distribución de taxRate:')
    Object.entries(taxRateDistribution)
      .sort(([, a], [, b]) => b - a)
      .forEach(([rate, count]) => {
        const pct = ((count / projects.length) * 100).toFixed(1)
        console.log(`   ${rate}%: ${count} proyectos (${pct}%)`)
      })

    // Distribución de projectStatus
    const statusDistribution = {}
    projects.forEach(p => {
      const status = p.projectStatus?.name || 'NULL'
      statusDistribution[status] = (statusDistribution[status] || 0) + 1
    })

    console.log('\n📌 Distribución de ProjectStatus:')
    Object.entries(statusDistribution)
      .sort(([, a], [, b]) => b - a)
      .forEach(([status, count]) => {
        const pct = ((count / projects.length) * 100).toFixed(1)
        console.log(`   ${status}: ${count} proyectos (${pct}%)`)
      })

    // Análisis de pagos
    const withPayments = projects.filter(p => p.paymentAllocations.length > 0)
    const withoutPayments = projects.filter(p => p.paymentAllocations.length === 0)

    console.log('\n💳 Análisis de Pagos:')
    console.log(`   Con pagos: ${withPayments.length} (${((withPayments.length/projects.length)*100).toFixed(1)}%)`)
    console.log(`   Sin pagos: ${withoutPayments.length} (${((withoutPayments.length/projects.length)*100).toFixed(1)}%)`)

    // Promedio de pagos por proyecto
    const avgPayments = withPayments.reduce((sum, p) => sum + p.paymentAllocations.length, 0) / withPayments.length
    console.log(`   Promedio pagos (de los que tienen): ${avgPayments.toFixed(2)}`)

    // ============================================================
    // DIFERENCIAS CLAVE: IMPORTADOS VS NATIVOS
    // ============================================================

    console.log('\n' + '=' .repeat(80))
    console.log('🔬 DIFERENCIAS CLAVE: IMPORTADOS VS NATIVOS')
    console.log('=' .repeat(80))

    console.log(`
📋 PROYECTOS IMPORTADOS deberían tener:
   ✅ projectStatusLegacy con valor (texto del status antiguo)
   ✅ projectStatusId NULL o referencia migrada manualmente
   ✅ projectName NULL (no tenían nombre en sistema antiguo)
   ⚠️  totalAmount NULL (campo nuevo del sistema de pagos)
   ✅ uninstallTagIds [] vacío (tags son nuevas)
   ✅ createdAt == updatedAt (nunca editados)
   ⚠️  taxRate puede ser 19%, 9.5%, 0% (importado del sistema viejo)

📋 PROYECTOS NATIVOS deberían tener:
   ❌ projectStatusLegacy vacío ("")
   ✅ projectStatusId con valor válido
   ❓ projectName opcional (puede tener o no)
   ✅ totalAmount == total (calculado automáticamente)
   ❓ uninstallTagIds puede tener tags si se configuran
   ❓ createdAt != updatedAt si se editó
   ✅ taxRate = 19% por defecto (o lo que elija usuario)
`)

    // ============================================================
    // RESULTADO DEL ANÁLISIS
    // ============================================================

    console.log('=' .repeat(80))
    console.log('🎯 RESULTADO DEL ANÁLISIS')
    console.log('=' .repeat(80))

    console.log('\n📊 ESTADO ACTUAL DE LA BASE DE DATOS:\n')

    if (indicators.hasProjectStatusLegacy === 0 &&
        indicators.hasNullProjectStatusId === 0 &&
        indicators.hasNullTotalAmount === 0) {
      console.log('✅ TODOS LOS PROYECTOS HAN SIDO COMPLETAMENTE MIGRADOS')
      console.log('   - Sin projectStatusLegacy')
      console.log('   - Todos tienen projectStatusId')
      console.log('   - Todos tienen totalAmount')
    } else if (indicators.hasProjectStatusLegacy > 0) {
      console.log('⚠️  HAY PROYECTOS PENDIENTES DE MIGRACIÓN COMPLETA')
      console.log(`   - ${indicators.hasProjectStatusLegacy} con projectStatusLegacy`)
      console.log(`   - ${indicators.hasNullProjectStatusId} sin projectStatusId`)
      console.log(`   - ${indicators.hasNullTotalAmount} sin totalAmount`)
    }

    // Anomalías detectadas
    console.log('\n⚠️  ANOMALÍAS DETECTADAS:\n')

    if (indicators.hasNullProjectName === projects.length) {
      console.log('🔸 TODOS los proyectos sin projectName')
      console.log('   ➜ Esto es NORMAL en proyectos importados')
      console.log('   ➜ El sistema antiguo no tenía este campo')
    }

    if (indicators.hasEmptyUninstallTags === projects.length) {
      console.log('\n🔸 TODOS los proyectos sin uninstallTagIds')
      console.log('   ➜ Esto es NORMAL en proyectos importados')
      console.log('   ➜ Las tags son una feature nueva')
    }

    if (indicators.hasNon19TaxRate > 0) {
      console.log(`\n🔸 ${indicators.hasNon19TaxRate} proyectos con taxRate != 19%`)
      console.log('   ➜ Posible indicador de datos importados con taxRate del sistema viejo')
      console.log('   ➜ O proyectos legítimos con exención/tasa reducida')
    }

    if (indicators.hasSameTimestamps === projects.length) {
      console.log('\n🔸 TODOS los proyectos con createdAt == updatedAt')
      console.log('   ➜ Indica que NINGÚN proyecto ha sido editado desde la importación')
      console.log('   ➜ O todos fueron creados recientemente y no editados')
    }

    // Scoring final
    console.log('\n' + '=' .repeat(80))
    console.log('📈 SCORING FINAL')
    console.log('=' .repeat(80))

    const avgScore = scoredProjects.reduce((sum, sp) => sum + sp.score, 0) / scoredProjects.length

    console.log(`\n🎯 Score promedio: ${avgScore.toFixed(2)}/13`)

    if (avgScore >= 8) {
      console.log('   ➜ ALTA PROBABILIDAD: La mayoría son proyectos importados')
    } else if (avgScore >= 5) {
      console.log('   ➜ MEDIA PROBABILIDAD: Mix de importados y nativos')
    } else if (avgScore >= 2) {
      console.log('   ➜ BAJA PROBABILIDAD: La mayoría son proyectos nativos')
    } else {
      console.log('   ➜ MUY BAJA PROBABILIDAD: Casi todos son nativos')
    }

    // Muestra de proyectos con score alto
    if (highScore.length > 0) {
      console.log('\n' + '=' .repeat(80))
      console.log('📋 MUESTRA: PROYECTOS CON ALTA PROBABILIDAD DE SER IMPORTADOS')
      console.log('=' .repeat(80))

      for (const sp of highScore.slice(0, 3)) {
        const p = sp.project
        console.log(`\n🔴 Proyecto ${p.projectNumber} (Score: ${sp.score}/13)`)
        console.log(`   Cliente: ${p.customer.name}`)
        console.log(`   Razones: ${sp.reasons.join(', ')}`)
        console.log(`   createdAt: ${p.createdAt.toISOString().split('T')[0]}`)
      }
    }

    console.log('\n' + '=' .repeat(80))

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

deepAnalysis()
