import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

interface CustomerRow {
  id: string
  createdAt: string
  email: string
  name: string
  phone: string
  updatedAt: string
}

async function importCustomers() {
  try {
    // Leer archivo
    const filePath = path.join(process.cwd(), 'clientes.txt')
    const content = fs.readFileSync(filePath, 'utf-8')

    // Parsear líneas (saltar header en líneas 1-2)
    const lines = content.split('\n').slice(2).filter(line => line.trim())

    console.log(`📊 Total de líneas a procesar: ${lines.length}`)

    const customers = []

    for (const line of lines) {
      // Split por tabs
      const parts = line.split('\t')

      if (parts.length < 6) continue

      const [id, createdAt, email, name, phone, updatedAt] = parts

      // Limpiar datos
      const cleanEmail = email === '""' || email === 'null' || !email ? null : email.replace(/"/g, '')
      const cleanName = name.replace(/"/g, '')
      const rawPhone = phone.replace(/"/g, '').trim()
      const cleanPhone = rawPhone === 'null' || rawPhone === '' || !rawPhone ? '000000000' : rawPhone

      customers.push({
        name: cleanName,
        phone: cleanPhone,
        email: cleanEmail,
        // Dejar que Prisma use fechas actuales (default)
      })
    }

    console.log(`✅ Registros parseados: ${customers.length}`)
    console.log(`\n📝 Primeros 3 registros:`)
    console.log(JSON.stringify(customers.slice(0, 3), null, 2))

    // Insertar en DB
    console.log(`\n🚀 Insertando ${customers.length} clientes...`)

    const result = await prisma.customer.createMany({
      data: customers,
      skipDuplicates: true,
    })

    console.log(`✅ ${result.count} clientes insertados exitosamente`)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

importCustomers()
