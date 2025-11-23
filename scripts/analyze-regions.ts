/**
 * Script de análisis de regiones en proyectos
 *
 * Identifica:
 * - Proyectos con códigos válidos vs nombres
 * - Nombres específicos que necesitan conversión
 * - Casos problemáticos
 *
 * Uso: npx tsx scripts/analyze-regions.ts
 */

import { prisma } from '@/lib/db'
import { normalizeRegionValue, getRegionByCodigo } from '@/lib/regiones-chile'

interface RegionStats {
  value: string
  count: number
  isCode: boolean
  normalizedCode: string | null
}

async function analyzeRegions() {
  console.log('🔍 Analizando regiones en base de datos...\n')

  // 1. Obtener todas las regiones únicas
  const projects = await prisma.project.findMany({
    select: {
      region: true,
    },
  })

  console.log(`📊 Total proyectos: ${projects.length}\n`)

  // 2. Agrupar por región
  const regionMap = new Map<string, number>()

  for (const project of projects) {
    const count = regionMap.get(project.region) || 0
    regionMap.set(project.region, count + 1)
  }

  // 3. Analizar cada región única
  const stats: RegionStats[] = []

  for (const [region, count] of regionMap.entries()) {
    const isCode = !!getRegionByCodigo(region)
    const normalizedCode = normalizeRegionValue(region)

    stats.push({
      value: region,
      count,
      isCode,
      normalizedCode,
    })
  }

  // 4. Ordenar por cantidad (descendente)
  stats.sort((a, b) => b.count - a.count)

  // 5. Reportar resultados
  console.log('📈 RESUMEN POR REGIÓN:\n')
  console.log('Región'.padEnd(40), 'Proyectos', 'Tipo'.padEnd(10), 'Código Normalizado')
  console.log('-'.repeat(80))

  let totalWithCodes = 0
  let totalWithNames = 0
  let totalProblematic = 0

  for (const stat of stats) {
    const type = stat.isCode ? '✅ Código' : stat.normalizedCode ? '⚠️ Nombre' : '❌ Inválido'

    console.log(
      stat.value.padEnd(40),
      stat.count.toString().padStart(9),
      type.padEnd(10),
      stat.normalizedCode || '(NO CONVERTIBLE)'
    )

    if (stat.isCode) {
      totalWithCodes += stat.count
    } else if (stat.normalizedCode) {
      totalWithNames += stat.count
    } else {
      totalProblematic += stat.count
    }
  }

  console.log('-'.repeat(80))
  console.log(`\n✅ Proyectos con códigos válidos: ${totalWithCodes}`)
  console.log(`⚠️ Proyectos con nombres (convertibles): ${totalWithNames}`)
  console.log(`❌ Proyectos problemáticos (NO convertibles): ${totalProblematic}`)
  console.log(`📊 Total: ${projects.length}\n`)

  // 6. Casos problemáticos (si existen)
  if (totalProblematic > 0) {
    console.log('🚨 REGIONES PROBLEMÁTICAS (requieren corrección manual):\n')

    const problematic = stats.filter((s) => !s.normalizedCode)
    for (const stat of problematic) {
      console.log(`   "${stat.value}" → ${stat.count} proyectos`)
    }
    console.log()
  }

  // 7. Preview de conversiones
  const toConvert = stats.filter((s) => !s.isCode && s.normalizedCode)

  if (toConvert.length > 0) {
    console.log('🔄 CONVERSIONES A REALIZAR:\n')

    for (const stat of toConvert) {
      console.log(`   "${stat.value}" → "${stat.normalizedCode}" (${stat.count} proyectos)`)
    }
    console.log()
  }

  await prisma.$disconnect()
}

// Ejecutar
analyzeRegions()
  .then(() => {
    console.log('✅ Análisis completado')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
