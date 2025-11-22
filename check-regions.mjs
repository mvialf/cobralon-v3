import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkRegions() {
  try {
    const projects = await prisma.project.findMany({
      select: {
        projectNumber: true,
        region: true,
        comuna: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    })

    console.log('\n📊 Análisis de regiones en proyectos:\n')
    console.log('=' .repeat(80))

    const regionStats = {}
    const comunaStats = {}

    projects.forEach((project, index) => {
      console.log(`\n${index + 1}. Proyecto #${project.projectNumber}`)
      console.log(`   Región: "${project.region}"`)
      console.log(`   Comuna: "${project.comuna}"`)
      console.log(`   Creado: ${project.createdAt.toISOString().split('T')[0]}`)

      // Detectar si es código (números) o nombre
      const isRegionCode = /^\d{1,2}$/.test(project.region)
      const regionType = isRegionCode ? 'CÓDIGO' : 'NOMBRE'
      console.log(`   Tipo región: ${regionType} ${isRegionCode ? '✅' : '⚠️'}`)

      regionStats[regionType] = (regionStats[regionType] || 0) + 1
    })

    console.log('\n' + '='.repeat(80))
    console.log('\n📈 Resumen:')
    console.log(`Total proyectos analizados: ${projects.length}`)
    console.log('\nDistribución de tipos de región:')
    Object.entries(regionStats).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} (${((count/projects.length)*100).toFixed(1)}%)`)
    })

    // Ejemplos de regiones únicas
    const uniqueRegions = [...new Set(projects.map(p => p.region))]
    console.log(`\nRegiones únicas encontradas: ${uniqueRegions.length}`)
    uniqueRegions.slice(0, 10).forEach((region, i) => {
      const isCode = /^\d{1,2}$/.test(region)
      console.log(`  ${i + 1}. "${region}" ${isCode ? '(código ✅)' : '(nombre ⚠️)'}`)
    })

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkRegions()
