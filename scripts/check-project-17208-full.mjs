import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const project = await prisma.project.findFirst({
    where: { projectNumber: "17208" },
    include: {
      customer: true,
      projectStatus: true
    }
  })
  
  if (project) {
    console.log('✅ Proyecto 17208 COMPLETO:')
    console.log('ID:', project.id)
    console.log('Número:', project.projectNumber)
    console.log('Nombre:', project.projectName || 'null')
    console.log('Cliente:', project.customer?.name || 'Sin cliente')
    console.log('Total:', project.total.toString())
    console.log('Estado Legado:', project.projectStatusLegacy)
    console.log('Estado ID:', project.projectStatusId || 'null')
    console.log('Estado:', project.projectStatus?.state || 'null')
    console.log('\n--- ESTE ES EL PROBLEMA ---')
    console.log('La página puede tener filtros por defecto que ocultan este proyecto')
  } else {
    console.log('❌ Proyecto no encontrado')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
