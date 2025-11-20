import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const project = await prisma.project.findFirst({
    where: { projectNumber: "17208" }
  })
  
  if (project) {
    console.log('✅ Proyecto encontrado:')
    console.log('ID:', project.id)
    console.log('Número:', project.projectNumber)
    console.log('Nombre:', project.projectName)
    console.log('Total:', project.total.toString())
    console.log('TotalAmount:', project.totalAmount?.toString())
  } else {
    console.log('❌ Proyecto 17208 NO EXISTE en la base de datos')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
