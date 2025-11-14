/**
 * Script para probar que proyectos con isFinal=true pero balance>0
 * aparezcan correctamente como "Activos"
 */

async function testActiveFilter() {
  console.log('\n=== PROBANDO FILTRO "ACTIVO" ===\n')

  const response = await fetch('http://localhost:3000/api/projects?projectState=Activo&limit=100')

  if (!response.ok) {
    console.error('❌ Error al obtener proyectos:', response.statusText)
    return
  }

  const data = await response.json()

  console.log(`✅ Total proyectos "Activos": ${data.projects.length}`)
  console.log(`📊 Paginación:`, data.pagination)

  // Analizar distribución de estados
  const statusDistribution = {}
  const withDebt = []

  data.projects.forEach((project) => {
    const statusName = project.projectStatus?.name || 'SIN ESTADO'
    const isFinal = project.projectStatus?.isFinal ?? false

    if (!statusDistribution[statusName]) {
      statusDistribution[statusName] = { count: 0, isFinal }
    }
    statusDistribution[statusName].count++

    // Buscar proyectos con isFinal=true y balance>0
    if (isFinal && project.balance > 0) {
      withDebt.push({
        projectNumber: project.projectNumber,
        customer: project.customer.name,
        status: statusName,
        balance: project.balance,
      })
    }
  })

  console.log('\n📈 Distribución por estado:')
  Object.entries(statusDistribution)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([status, data]) => {
      console.log(
        `  ${status} (isFinal: ${data.isFinal ? 'true' : 'false'}): ${data.count} proyectos`
      )
    })

  console.log(
    `\n🔍 Proyectos con isFinal=true pero balance>0 (deberían aparecer como "Activos"): ${withDebt.length}`
  )

  if (withDebt.length > 0) {
    console.log('\n✅ ÉXITO: Se encontraron proyectos finalizados con deuda:')
    console.table(withDebt.slice(0, 10))
  } else {
    console.log('\n⚠️  No se encontraron proyectos con isFinal=true y balance>0')
  }
}

testActiveFilter().catch(console.error)
