/**
 * Script de migración de regiones
 *
 * Convierte nombres de regiones a códigos oficiales
 *
 * Uso:
 *   npx tsx scripts/migrate-regions.ts --dry-run   # Simulación
 *   npx tsx scripts/migrate-regions.ts              # Migración real
 */

import { prisma } from '@/lib/db'
import { normalizeRegionValue, getRegionByCodigo } from '@/lib/regiones-chile'
import { writeFileSync } from 'fs'
import { join } from 'path'

interface MigrationRecord {
  projectId: string
  projectNumber: string
  oldValue: string
  newValue: string
  status: 'success' | 'error'
  error?: string
}

interface MigrationResult {
  total: number
  successful: number
  failed: number
  records: MigrationRecord[]
  backupPath?: string
}

// Detectar modo dry-run desde argumentos CLI
const isDryRun = process.argv.includes('--dry-run')

async function createBackup(): Promise<string> {
  console.log('📦 Creando backup de tabla project...')

  const allProjects = await prisma.project.findMany()
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0]
  const backupDir = join(process.cwd(), 'scripts', 'backups')
  const backupPath = join(backupDir, `project-backup-${timestamp}.json`)

  // Crear directorio si no existe
  try {
    const { mkdirSync } = await import('fs')
    mkdirSync(backupDir, { recursive: true })
  } catch (error) {
    // Directorio ya existe
  }

  writeFileSync(backupPath, JSON.stringify(allProjects, null, 2), 'utf-8')

  console.log(`✅ Backup creado: ${backupPath}`)
  console.log(`   Total proyectos respaldados: ${allProjects.length}\n`)

  return backupPath
}

async function migrateRegions(dryRun: boolean): Promise<MigrationResult> {
  const result: MigrationResult = {
    total: 0,
    successful: 0,
    failed: 0,
    records: [],
  }

  console.log(dryRun ? '🔍 DRY RUN - SIMULACIÓN DE MIGRACIÓN\n' : '🚀 MIGRACIÓN REAL\n')

  // 1. Obtener proyectos con regiones que NO son códigos
  const projects = await prisma.project.findMany({
    select: {
      id: true,
      projectNumber: true,
      region: true,
    },
  })

  // Filtrar solo los que NO son códigos válidos
  const projectsToMigrate = projects.filter((p) => !getRegionByCodigo(p.region))

  console.log(`📊 Proyectos a migrar: ${projectsToMigrate.length}\n`)

  if (projectsToMigrate.length === 0) {
    console.log('✅ No hay proyectos que requieran migración\n')
    return result
  }

  // 2. Crear backup (solo en modo real)
  if (!dryRun) {
    result.backupPath = await createBackup()
  }

  // 3. Procesar conversiones
  console.log('Proyecto'.padEnd(15), 'Región Actual'.padEnd(30), '→', 'Código Destino', 'Status')
  console.log('-'.repeat(90))

  for (const project of projectsToMigrate) {
    result.total++

    const newCode = normalizeRegionValue(project.region)
    const record: MigrationRecord = {
      projectId: project.id,
      projectNumber: project.projectNumber,
      oldValue: project.region,
      newValue: newCode || 'ERROR',
      status: newCode ? 'success' : 'error',
    }

    if (!newCode) {
      record.error = `No se pudo convertir "${project.region}"`
      result.failed++
      console.log(
        project.projectNumber.padEnd(15),
        project.region.padEnd(30),
        '→',
        'ERROR'.padEnd(16),
        '❌'
      )
    } else {
      if (!dryRun) {
        try {
          // Actualizar en DB (solo en modo real)
          await prisma.project.update({
            where: { id: project.id },
            data: { region: newCode },
          })
          result.successful++
          console.log(
            project.projectNumber.padEnd(15),
            project.region.padEnd(30),
            '→',
            newCode.padEnd(16),
            '✅'
          )
        } catch (error) {
          record.status = 'error'
          record.error = error instanceof Error ? error.message : 'Error desconocido'
          result.failed++
          console.log(
            project.projectNumber.padEnd(15),
            project.region.padEnd(30),
            '→',
            'DB ERROR'.padEnd(16),
            '❌'
          )
        }
      } else {
        // En dry-run solo simular
        result.successful++
        console.log(
          project.projectNumber.padEnd(15),
          project.region.padEnd(30),
          '→',
          newCode.padEnd(16),
          '✓'
        )
      }
    }

    result.records.push(record)
  }

  console.log('-'.repeat(90))

  return result
}

async function validateMigration(): Promise<boolean> {
  console.log('\n🔍 Validando migración...\n')

  const projects = await prisma.project.findMany({
    select: { region: true },
  })

  let hasInvalidRegions = false

  for (const project of projects) {
    if (!getRegionByCodigo(project.region)) {
      console.log(`❌ Región inválida encontrada: "${project.region}"`)
      hasInvalidRegions = true
    }
  }

  if (!hasInvalidRegions) {
    console.log('✅ Todas las regiones son códigos válidos')
    console.log(`   Total proyectos validados: ${projects.length}\n`)
    return true
  } else {
    console.log('❌ Se encontraron regiones inválidas\n')
    return false
  }
}

async function main() {
  console.log('🔄 MIGRACIÓN DE REGIONES\n')
  console.log(`Modo: ${isDryRun ? 'DRY RUN (Simulación)' : 'REAL'}\n`)

  try {
    const result = await migrateRegions(isDryRun)

    // Guardar log
    if (!isDryRun && result.records.length > 0) {
      const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0]
      const logDir = join(process.cwd(), 'scripts', 'logs')
      const logPath = join(logDir, `migration-${timestamp}.json`)

      try {
        const { mkdirSync } = await import('fs')
        mkdirSync(logDir, { recursive: true })
      } catch (error) {
        // Directorio ya existe
      }

      writeFileSync(logPath, JSON.stringify(result, null, 2), 'utf-8')
      console.log(`\n📝 Log guardado: ${logPath}`)
    }

    // Resumen
    console.log('\n📊 RESUMEN:')
    console.log(`   Total proyectos procesados: ${result.total}`)
    console.log(`   Exitosos: ${result.successful}`)
    console.log(`   Fallidos: ${result.failed}`)

    if (result.backupPath) {
      console.log(`   Backup: ${result.backupPath}`)
    }

    // Validar (solo en modo real)
    if (!isDryRun && result.total > 0) {
      const isValid = await validateMigration()

      if (!isValid) {
        console.log('⚠️  La validación falló. Considere ejecutar rollback.')
        console.log(`   npx tsx scripts/rollback-migration.ts --backup=${result.backupPath}\n`)
        process.exit(1)
      }
    }

    if (isDryRun && result.total > 0) {
      console.log('\n💡 Para ejecutar la migración real:')
      console.log('   npx tsx scripts/migrate-regions.ts\n')
    } else if (!isDryRun && result.total > 0) {
      console.log('\n✅ Migración completada exitosamente\n')
    }

    await prisma.$disconnect()
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Error durante migración:', error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

// Ejecutar
main()
