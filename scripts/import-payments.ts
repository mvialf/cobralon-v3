import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

// ===== FUNCIONES REUTILIZADAS =====

function parseSpanishDate(dateStr: string): Date | null {
  if (!dateStr) return null

  try {
    const months: Record<string, number> = {
      enero: 0,
      febrero: 1,
      marzo: 2,
      abril: 3,
      mayo: 4,
      junio: 5,
      julio: 6,
      agosto: 7,
      septiembre: 8,
      octubre: 9,
      noviembre: 10,
      diciembre: 11,
    }

    const match = dateStr.match(/(\d+) de (\w+) de (\d+)/)
    if (!match) return null

    const day = parseInt(match[1])
    const month = months[match[2].toLowerCase()]
    const year = parseInt(match[3])

    if (month === undefined) return null

    return new Date(year, month, day)
  } catch {
    return null
  }
}

// ===== MAPEO DE PAYMENT METHODS =====

const PAYMENT_METHOD_MAPPING: Record<string, string> = {
  transferencia: 'b2600fdf-580d-4ff3-af84-156b3b042131', // Transferencia Bancaria
  'tarjeta de crédito': 'c4143820-130a-42dc-899f-50d793dd52aa', // Tarjeta de Crédito
  tarjeta: 'c4143820-130a-42dc-899f-50d793dd52aa', // Tarjeta de Crédito
}

// ===== MAIN =====

async function importPayments() {
  try {
    console.log('🚀 FASE 1: Construyendo mapeo de proyectos...\n')

    // Leer projectos.txt para mapeo oldProjectId → projectNumber
    const projectsFilePath = path.join(process.cwd(), 'projectos.txt')
    const projectsContent = fs.readFileSync(projectsFilePath, 'utf-8')
    const projectsLines = projectsContent
      .split('\n')
      .slice(2)
      .filter((line) => line.trim())

    // Crear mapeo oldProjectId → projectNumber
    const oldProjectIdToNumberMap = new Map<string, string>()

    for (const line of projectsLines) {
      const parts = line.split('\t')
      if (parts.length < 12) continue

      const [oldProjectId] = parts
      const projectNumber = parts[11].replace(/"/g, '') // projectNumber está en columna 11

      if (oldProjectId && projectNumber) {
        oldProjectIdToNumberMap.set(oldProjectId, projectNumber)
      }
    }

    console.log(`✅ Mapeo oldProjectId → projectNumber: ${oldProjectIdToNumberMap.size}`)

    // Leer proyectos nuevos de DB
    const newProjects = await prisma.project.findMany({
      select: {
        id: true,
        projectNumber: true,
        customerId: true,
      },
    })

    console.log(`✅ Proyectos nuevos en DB: ${newProjects.length}`)

    // Crear mapeo projectNumber → { projectId, customerId }
    const projectNumberToDataMap = new Map<string, { projectId: string; customerId: string }>()

    for (const proj of newProjects) {
      projectNumberToDataMap.set(proj.projectNumber, {
        projectId: proj.id,
        customerId: proj.customerId,
      })
    }

    console.log('\n🚀 FASE 2: Procesando pagos...\n')

    // Leer payment.txt
    const paymentsFilePath = path.join(process.cwd(), 'payment.txt')
    const paymentsContent = fs.readFileSync(paymentsFilePath, 'utf-8')
    const paymentsLines = paymentsContent
      .split('\n')
      .slice(2)
      .filter((line) => line.trim())

    console.log(`📊 Total de pagos a procesar: ${paymentsLines.length}`)

    const payments: Array<{
      id: string
      amount: number
      date: Date
      customerId: string
      paymentMethodId: string
      selectedInstallments: number | null
      type: string
      notes: string | null
      currency: string
      reference: string | null
    }> = []

    const allocations: Array<{
      paymentId: string
      projectId: string
      allocatedAmount: number
    }> = []

    const errors: Array<{ line: number; error: string }> = []

    for (let i = 0; i < paymentsLines.length; i++) {
      const line = paymentsLines[i]
      const parts = line.split('\t')

      if (parts.length < 11) {
        errors.push({ line: i + 1, error: 'Campos insuficientes' })
        continue
      }

      const [
        docId,
        amount,
        createdAt,
        date,
        id,
        installments,
        notes,
        paymentMethod,
        paymentType,
        projectId,
        projectNumber,
      ] = parts

      // Limpiar campos
      const cleanAmount = parseFloat(amount)
      const cleanPaymentMethod = paymentMethod.replace(/"/g, '').toLowerCase()
      const cleanPaymentType = paymentType.replace(/"/g, '').toLowerCase()
      const cleanProjectId = projectId.replace(/"/g, '')
      const cleanInstallments = installments.trim() === '' ? null : parseInt(installments)
      const cleanNotes = notes.replace(/"/g, '') || null

      // Validar amount
      if (isNaN(cleanAmount) || cleanAmount <= 0) {
        errors.push({ line: i + 1, error: `Amount inválido: ${amount}` })
        continue
      }

      // Parsear fecha
      const parsedDate = parseSpanishDate(date)
      if (!parsedDate) {
        errors.push({ line: i + 1, error: `Fecha inválida: ${date}` })
        continue
      }

      // Mapear paymentMethod
      const paymentMethodId = PAYMENT_METHOD_MAPPING[cleanPaymentMethod]
      if (!paymentMethodId) {
        errors.push({ line: i + 1, error: `PaymentMethod desconocido: ${cleanPaymentMethod}` })
        continue
      }

      // Mapear oldProjectId → projectNumber → {newProjectId, customerId}
      let projectData: { projectId: string; customerId: string } | undefined

      if (cleanProjectId) {
        // Paso 1: oldProjectId → projectNumber
        const mappedProjectNumber = oldProjectIdToNumberMap.get(cleanProjectId)

        if (mappedProjectNumber) {
          // Paso 2: projectNumber → {newProjectId, customerId}
          projectData = projectNumberToDataMap.get(mappedProjectNumber)
        }
      }

      if (!projectData) {
        errors.push({
          line: i + 1,
          error: `Proyecto no encontrado para oldProjectId: ${cleanProjectId || 'vacío'}`,
        })
        continue
      }

      // Mapear paymentType a type
      let type = 'Project' // default
      if (cleanPaymentType === 'cliente') {
        type = 'Customer'
      } else if (cleanPaymentType === 'proyecto') {
        type = 'Project'
      }

      // Generar UUID para payment
      const paymentId = randomUUID()

      payments.push({
        id: paymentId,
        amount: cleanAmount,
        date: parsedDate,
        customerId: projectData.customerId,
        paymentMethodId: paymentMethodId,
        selectedInstallments: cleanInstallments,
        type: type,
        notes: cleanNotes,
        currency: 'CLP',
        reference: null,
      })

      // Crear allocation 1:1
      allocations.push({
        paymentId: paymentId,
        projectId: projectData.projectId,
        allocatedAmount: cleanAmount,
      })
    }

    console.log(`✅ Pagos válidos: ${payments.length}`)
    console.log(`❌ Pagos con errores: ${errors.length}`)

    if (errors.length > 0) {
      console.log('\n⚠️  ERRORES ENCONTRADOS (primeros 20):')
      errors.slice(0, 20).forEach((e) => {
        console.log(`   Línea ${e.line}: ${e.error}`)
      })
    }

    console.log('\n📝 Primeros 3 pagos:')
    console.log(JSON.stringify(payments.slice(0, 3), null, 2))

    console.log('\n📝 Primeras 3 allocations:')
    console.log(JSON.stringify(allocations.slice(0, 3), null, 2))

    // Pedir confirmación
    console.log('\n⚠️  ¿Deseas continuar con la importación? (comentar esta línea si sí)')
    // return

    console.log('\n🚀 FASE 3: Importando pagos y allocations...')

    // Usar transaction para asegurar integridad
    await prisma.$transaction(async (tx) => {
      // Insertar payments (batch)
      await tx.payment.createMany({
        data: payments,
      })

      // Insertar allocations (batch)
      await tx.paymentAllocation.createMany({
        data: allocations,
      })
    })

    console.log(`\n✅ ${payments.length} pagos insertados exitosamente`)
    console.log(`✅ ${allocations.length} allocations creadas exitosamente`)
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

importPayments()
