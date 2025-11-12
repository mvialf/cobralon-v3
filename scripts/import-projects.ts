import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// ===== FUNCIONES DE NORMALIZACIÓN =====

function normalizePhone(phone: string): string {
  if (!phone) return ''
  return phone
    .replace(/[\s\-\+]/g, '') // Remover espacios, guiones, +
    .replace(/^56/, '') // Remover prefijo +56
    .trim()
}

function normalizeName(name: string): string {
  if (!name) return ''
  return name.toLowerCase().trim().replace(/\s+/g, ' ') // Normalizar espacios múltiples
}

// ===== PARSERS =====

function parseAddress(address: string): { street: string; apartment: string | null } {
  if (!address) return { street: '', apartment: null }

  // Buscar patrones: "depto", "dpto", "casa", "d-", etc.
  const match = address.match(/^(.+?),?\s*(depto?\.?\s*\d+[\w-]*|casa\s*\d+|d[\s-]*\d+)/i)

  if (match) {
    return {
      street: match[1].trim(),
      apartment: match[2].trim(),
    }
  }

  return { street: address.trim(), apartment: null }
}

function parseSpanishDate(dateStr: string): Date | null {
  if (!dateStr) return null

  try {
    // Formato: "3 de abril de 2025, 9:00:00 p.m. UTC-3"
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

// ===== MAPEO DE STATUS =====

const STATUS_MAPPING: Record<string, string> = {
  completado: '3d5dd671-2ee6-46eb-93db-55d4f6629b14',
  complicación: '86fc6f47-44ce-49d7-aedd-1a659ca6a812',
  ingresado: '4245c72e-2f84-4164-a377-d6f147c090f5',
  montaje: '369dec58-48f0-4ab1-866a-e3783ad0bbd8',
  sello: '62035a25-133e-4720-b925-7adb970e020f',
}

// ===== MAIN =====

async function importProjects() {
  try {
    console.log('🚀 FASE 1: Construyendo mapeo de clientes...\n')

    // Leer clientes.txt
    const clientsFilePath = path.join(process.cwd(), 'clientes.txt')
    const clientsContent = fs.readFileSync(clientsFilePath, 'utf-8')
    const clientsLines = clientsContent
      .split('\n')
      .slice(2)
      .filter((line) => line.trim())

    // Crear mapeo oldId → {name, phone}
    const oldClientsMap = new Map<string, { name: string; phone: string }>()

    for (const line of clientsLines) {
      const parts = line.split('\t')
      if (parts.length < 6) continue

      const [id, , email, name, phone] = parts
      oldClientsMap.set(id, {
        name: name.replace(/"/g, ''),
        phone: phone.replace(/"/g, ''),
      })
    }

    console.log(`✅ Clientes antiguos parseados: ${oldClientsMap.size}`)

    // Leer clientes nuevos de DB
    const newCustomers = await prisma.customer.findMany()
    console.log(`✅ Clientes nuevos en DB: ${newCustomers.length}`)

    // Crear mapeo oldId → newId
    const idMapping = new Map<string, string>()
    const unmatchedOldIds: string[] = []

    for (const [oldId, oldData] of oldClientsMap) {
      const normalizedOldPhone = normalizePhone(oldData.phone)
      const normalizedOldName = normalizeName(oldData.name)

      // Si el phone viejo es vacío/null, matchear solo por nombre
      const isFictitiousPhone = !oldData.phone || oldData.phone === 'null'

      const match = newCustomers.find((nc) => {
        const nameMatches = normalizeName(nc.name) === normalizedOldName

        if (isFictitiousPhone) {
          // Para clientes con teléfono ficticio, matchear solo por nombre
          return nameMatches && nc.phone === '000000000'
        } else {
          // Match normal por nombre Y teléfono
          return nameMatches && normalizePhone(nc.phone) === normalizedOldPhone
        }
      })

      if (match) {
        idMapping.set(oldId, match.id)
      } else {
        unmatchedOldIds.push(oldId)
      }
    }

    console.log(`✅ Mapeo exitoso: ${idMapping.size}/${oldClientsMap.size}`)

    if (unmatchedOldIds.length > 0) {
      console.log(`⚠️  Clientes sin match: ${unmatchedOldIds.length}`)
      console.log('   Primeros 5:', unmatchedOldIds.slice(0, 5))
    }

    console.log('\n🚀 FASE 2: Procesando proyectos...\n')

    // Leer proyectos.txt
    const projectsFilePath = path.join(process.cwd(), 'projectos.txt')
    const projectsContent = fs.readFileSync(projectsFilePath, 'utf-8')
    const projectsLines = projectsContent
      .split('\n')
      .slice(2)
      .filter((line) => line.trim())

    console.log(`📊 Total de proyectos a procesar: ${projectsLines.length}`)

    const projects = []
    const errors: Array<{ line: number; error: string }> = []

    for (let i = 0; i < projectsLines.length; i++) {
      const line = projectsLines[i]
      const parts = line.split('\t')

      if (parts.length < 19) {
        errors.push({ line: i + 1, error: 'Campos insuficientes' })
        continue
      }

      const [
        docId,
        address,
        clientId,
        clientName,
        commune,
        createdAt,
        date,
        description,
        fullAddress,
        glosa,
        phone,
        projectNumber,
        region,
        squareMeters,
        status,
        subtotal,
        taxRate,
        updatedAt,
        windowsCount,
      ] = parts

      // Validar clientId mapping
      const newCustomerId = idMapping.get(clientId.replace(/"/g, ''))
      if (!newCustomerId) {
        errors.push({ line: i + 1, error: `Cliente no encontrado: ${clientId}` })
        continue
      }

      // Validar status mapping
      const cleanStatus = status.replace(/"/g, '').toLowerCase()
      const projectStatusId = STATUS_MAPPING[cleanStatus]
      if (!projectStatusId) {
        errors.push({ line: i + 1, error: `Status desconocido: ${cleanStatus}` })
        continue
      }

      // Parsear campos
      const { street, apartment } = parseAddress(address.replace(/"/g, ''))
      const parsedDate = parseSpanishDate(date)
      const subtotalNum = parseFloat(subtotal)
      const taxRateNum = parseFloat(taxRate)
      const total = subtotalNum * (1 + taxRateNum / 100)

      if (!parsedDate) {
        errors.push({ line: i + 1, error: `Fecha inválida: ${date}` })
        continue
      }

      if (isNaN(subtotalNum) || isNaN(taxRateNum)) {
        errors.push({ line: i + 1, error: 'Números inválidos' })
        continue
      }

      projects.push({
        projectNumber: projectNumber.replace(/"/g, ''),
        projectName: glosa.replace(/"/g, '') || null,
        customerId: newCustomerId,
        phone: phone.replace(/"/g, '') || '000000000',
        street: street || 'Sin dirección',
        apartment: apartment,
        comuna: commune.replace(/"/g, '') || 'Sin comuna',
        region: region.replace(/"/g, '') || 'RM',
        projectStatusId: projectStatusId,
        date: parsedDate,
        subtotal: subtotalNum,
        taxRate: taxRateNum,
        total: total,
        totalAmount: total,
        windowsCount: parseInt(windowsCount) || 0,
        squareMeters: parseFloat(squareMeters) || 0,
        description: description.replace(/"/g, '') || null,
        currency: 'CLP',
        uninstallTagIds: [],
      })
    }

    console.log(`✅ Proyectos válidos: ${projects.length}`)
    console.log(`❌ Proyectos con errores: ${errors.length}`)

    if (errors.length > 0) {
      console.log('\n⚠️  ERRORES ENCONTRADOS (primeros 10):')
      errors.slice(0, 10).forEach((e) => {
        console.log(`   Línea ${e.line}: ${e.error}`)
      })
    }

    console.log('\n📝 Primeros 3 proyectos:')
    console.log(JSON.stringify(projects.slice(0, 3), null, 2))

    // Pedir confirmación
    console.log('\n⚠️  ¿Deseas continuar con la importación? (comentar esta línea si sí)')
    // return

    console.log('\n🚀 FASE 3: Importando proyectos...')

    const result = await prisma.project.createMany({
      data: projects,
      skipDuplicates: true,
    })

    console.log(`\n✅ ${result.count} proyectos insertados exitosamente`)
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

importProjects()
