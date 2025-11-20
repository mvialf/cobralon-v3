import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function analyzeProjects() {
  try {
    console.log('🔍 ANÁLISIS EXHAUSTIVO DE PROYECTOS IMPORTADOS VS NATIVOS\n')
    console.log('=' .repeat(80))

    // 1. Obtener todos los proyectos
    const allProjects = await prisma.project.findMany({
      include: {
        customer: true,
        projectStatus: true,
        paymentAllocations: {
          include: {
            payment: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    console.log(`\n📊 Total de proyectos: ${allProjects.length}\n`)

    // 2. Análisis de campos clave
    console.log('=' .repeat(80))
    console.log('📋 ANÁLISIS DE CAMPOS CLAVE')
    console.log('=' .repeat(80))

    const analysis = {
      projectStatusLegacy: {
        empty: 0,
        nonEmpty: 0,
        values: new Set()
      },
      projectStatusId: {
        null: 0,
        nonNull: 0
      },
      phone: {
        matchesCustomer: 0,
        differsFromCustomer: 0,
        customerHasNoPhone: 0
      },
      projectName: {
        null: 0,
        nonNull: 0
      },
      totalAmount: {
        null: 0,
        nonNull: 0,
        matchesTotal: 0,
        differsFromTotal: 0
      },
      uninstallTagIds: {
        empty: 0,
        nonEmpty: 0
      },
      taxRate: {
        is19: 0,
        isNot19: 0,
        values: new Set()
      },
      currency: {
        clp: 0,
        other: 0,
        values: new Set()
      }
    }

    // 3. Analizar cada proyecto
    for (const project of allProjects) {
      // projectStatusLegacy
      if (project.projectStatusLegacy === '') {
        analysis.projectStatusLegacy.empty++
      } else {
        analysis.projectStatusLegacy.nonEmpty++
        analysis.projectStatusLegacy.values.add(project.projectStatusLegacy)
      }

      // projectStatusId
      if (project.projectStatusId === null) {
        analysis.projectStatusId.null++
      } else {
        analysis.projectStatusId.nonNull++
      }

      // phone vs customer.phone
      if (project.customer.phone) {
        if (project.phone === project.customer.phone) {
          analysis.phone.matchesCustomer++
        } else {
          analysis.phone.differsFromCustomer++
        }
      } else {
        analysis.phone.customerHasNoPhone++
      }

      // projectName
      if (project.projectName === null) {
        analysis.projectName.null++
      } else {
        analysis.projectName.nonNull++
      }

      // totalAmount
      if (project.totalAmount === null) {
        analysis.totalAmount.null++
      } else {
        analysis.totalAmount.nonNull++
        if (project.totalAmount.equals(project.total)) {
          analysis.totalAmount.matchesTotal++
        } else {
          analysis.totalAmount.differsFromTotal++
        }
      }

      // uninstallTagIds
      if (project.uninstallTagIds.length === 0) {
        analysis.uninstallTagIds.empty++
      } else {
        analysis.uninstallTagIds.nonEmpty++
      }

      // taxRate
      if (project.taxRate.equals(19.0)) {
        analysis.taxRate.is19++
      } else {
        analysis.taxRate.isNot19++
        analysis.taxRate.values.add(project.taxRate.toString())
      }

      // currency
      if (project.currency === 'CLP') {
        analysis.currency.clp++
      } else {
        analysis.currency.other++
        analysis.currency.values.add(project.currency)
      }
    }

    // 4. Mostrar resultados
    console.log('\n1️⃣ projectStatusLegacy (campo legacy de importación):')
    console.log(`   ✅ Vacío (esperado en nativos): ${analysis.projectStatusLegacy.empty}`)
    console.log(`   ⚠️  No vacío (importados): ${analysis.projectStatusLegacy.nonEmpty}`)
    if (analysis.projectStatusLegacy.values.size > 0) {
      console.log(`   📝 Valores encontrados: ${Array.from(analysis.projectStatusLegacy.values).join(', ')}`)
    }

    console.log('\n2️⃣ projectStatusId (nuevo sistema):')
    console.log(`   ⚠️  NULL (no migrado): ${analysis.projectStatusId.null}`)
    console.log(`   ✅ Con valor (migrado/nativo): ${analysis.projectStatusId.nonNull}`)

    console.log('\n3️⃣ phone (teléfono del proyecto):')
    console.log(`   ✅ Coincide con customer.phone: ${analysis.phone.matchesCustomer}`)
    console.log(`   ⚠️  Difiere de customer.phone: ${analysis.phone.differsFromCustomer}`)
    console.log(`   ℹ️  Customer sin teléfono: ${analysis.phone.customerHasNoPhone}`)

    console.log('\n4️⃣ projectName (nombre del proyecto):')
    console.log(`   ⚠️  NULL (sin nombre): ${analysis.projectName.null}`)
    console.log(`   ✅ Con nombre: ${analysis.projectName.nonNull}`)

    console.log('\n5️⃣ totalAmount (campo de pagos):')
    console.log(`   ⚠️  NULL (no usa pagos): ${analysis.totalAmount.null}`)
    console.log(`   ✅ Con valor: ${analysis.totalAmount.nonNull}`)
    console.log(`   ✅ Coincide con total: ${analysis.totalAmount.matchesTotal}`)
    console.log(`   ⚠️  Difiere de total: ${analysis.totalAmount.differsFromTotal}`)

    console.log('\n6️⃣ uninstallTagIds (etiquetas de desinstalación):')
    console.log(`   ⚠️  Sin tags: ${analysis.uninstallTagIds.empty}`)
    console.log(`   ✅ Con tags: ${analysis.uninstallTagIds.nonEmpty}`)

    console.log('\n7️⃣ taxRate (tasa de impuesto):')
    console.log(`   ✅ 19% (default): ${analysis.taxRate.is19}`)
    console.log(`   ⚠️  Otro valor: ${analysis.taxRate.isNot19}`)
    if (analysis.taxRate.values.size > 0) {
      console.log(`   📝 Valores encontrados: ${Array.from(analysis.taxRate.values).join(', ')}`)
    }

    console.log('\n8️⃣ currency (moneda):')
    console.log(`   ✅ CLP (default): ${analysis.currency.clp}`)
    console.log(`   ⚠️  Otra moneda: ${analysis.currency.other}`)
    if (analysis.currency.values.size > 0) {
      console.log(`   📝 Valores encontrados: ${Array.from(analysis.currency.values).join(', ')}`)
    }

    // 5. Análisis de fechas (createdAt vs updatedAt)
    console.log('\n' + '='.repeat(80))
    console.log('📅 ANÁLISIS DE TIMESTAMPS')
    console.log('='.repeat(80))

    const sameTimestamps = allProjects.filter(p =>
      p.createdAt.getTime() === p.updatedAt.getTime()
    ).length

    console.log(`\n✅ createdAt == updatedAt (sin modificación): ${sameTimestamps}`)
    console.log(`⚠️  createdAt != updatedAt (modificado): ${allProjects.length - sameTimestamps}`)

    // 6. Análisis de relaciones
    console.log('\n' + '='.repeat(80))
    console.log('🔗 ANÁLISIS DE RELACIONES')
    console.log('='.repeat(80))

    const withPayments = allProjects.filter(p => p.paymentAllocations.length > 0).length
    const withoutPayments = allProjects.length - withPayments

    console.log(`\n✅ Con pagos asignados: ${withPayments}`)
    console.log(`⚠️  Sin pagos asignados: ${withoutPayments}`)

    // 7. Muestra de proyectos importados
    console.log('\n' + '='.repeat(80))
    console.log('📋 MUESTRA DE PROYECTOS (primeros 5)')
    console.log('='.repeat(80))

    for (const project of allProjects.slice(0, 5)) {
      console.log(`\n🔹 Proyecto: ${project.projectNumber}`)
      console.log(`   Cliente: ${project.customer.name}`)
      console.log(`   Status Legacy: "${project.projectStatusLegacy}"`)
      console.log(`   Status ID: ${project.projectStatusId || 'NULL'}`)
      console.log(`   projectName: ${project.projectName || 'NULL'}`)
      console.log(`   phone: ${project.phone}`)
      console.log(`   customer.phone: ${project.customer.phone}`)
      console.log(`   totalAmount: ${project.totalAmount || 'NULL'}`)
      console.log(`   total: ${project.total}`)
      console.log(`   uninstallTagIds: [${project.uninstallTagIds.join(', ')}]`)
      console.log(`   currency: ${project.currency}`)
      console.log(`   taxRate: ${project.taxRate}%`)
      console.log(`   createdAt: ${project.createdAt.toISOString()}`)
      console.log(`   updatedAt: ${project.updatedAt.toISOString()}`)
      console.log(`   Pagos: ${project.paymentAllocations.length}`)
    }

    // 8. Conclusiones
    console.log('\n' + '='.repeat(80))
    console.log('🎯 CONCLUSIONES')
    console.log('='.repeat(80))

    console.log('\n✅ Todos los proyectos SON importados si:')
    console.log(`   - projectStatusLegacy tiene valores (${analysis.projectStatusLegacy.nonEmpty}/${allProjects.length})`)
    console.log(`   - projectStatusId es NULL (${analysis.projectStatusId.null}/${allProjects.length})`)
    console.log(`   - totalAmount es NULL (${analysis.totalAmount.null}/${allProjects.length})`)
    console.log(`   - uninstallTagIds está vacío (${analysis.uninstallTagIds.empty}/${allProjects.length})`)
    console.log(`   - createdAt == updatedAt (${sameTimestamps}/${allProjects.length})`)

    console.log('\n⚠️  Diferencias encontradas:')

    if (analysis.projectStatusLegacy.nonEmpty > 0) {
      console.log(`   🔸 ${analysis.projectStatusLegacy.nonEmpty} proyectos tienen projectStatusLegacy`)
    }

    if (analysis.projectStatusId.null > 0) {
      console.log(`   🔸 ${analysis.projectStatusId.null} proyectos sin projectStatusId (no migrados)`)
    }

    if (analysis.phone.differsFromCustomer > 0) {
      console.log(`   🔸 ${analysis.phone.differsFromCustomer} proyectos con teléfono diferente al cliente`)
    }

    if (analysis.totalAmount.null > 0) {
      console.log(`   🔸 ${analysis.totalAmount.null} proyectos sin totalAmount (campo de pagos)`)
    }

    if (analysis.uninstallTagIds.empty === allProjects.length) {
      console.log(`   🔸 TODOS los proyectos sin uninstallTagIds`)
    }

    console.log('\n' + '='.repeat(80))

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

analyzeProjects()
