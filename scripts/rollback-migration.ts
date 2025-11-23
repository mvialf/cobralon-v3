/**
 * Script de rollback para revertir migración de regiones
 *
 * Restaura el estado de la tabla project desde un backup JSON
 *
 * Uso:
 *   npx tsx scripts/rollback-migration.ts --backup=scripts/backups/project-backup-TIMESTAMP.json
 */

import { prisma } from '@/lib/db'
import { readFileSync, existsSync } from 'fs'

interface BackupProject {
  id: string
  projectNumber: string
  region: string
  [key: string]: unknown
}

async function rollbackMigration(backupPath: string): Promise<void> {
  console.log('🔄 ROLLBACK DE MIGRACIÓN\n')

  // 1. Verificar que el backup existe
  if (!existsSync(backupPath)) {
    throw new Error(`Archivo de backup no encontrado: ${backupPath}`)
  }

  // 2. Leer backup
  console.log(`📦 Leyendo backup: ${backupPath}`)
  const backupData = JSON.parse(readFileSync(backupPath, 'utf-8')) as BackupProject[]
  console.log(`   Proyectos en backup: ${backupData.length}\n`)

  // 3. Confirmar con usuario
  console.log('⚠️  ADVERTENCIA: Esto revertirá los cambios de región para TODOS los proyectos.')
  console.log('   ¿Está seguro? Esta operación NO se puede deshacer.\n')

  // En un entorno interactivo, aquí iría una confirmación
  // Por simplicidad, asumimos confirmación automática en este script

  // 4. Restaurar regiones
  console.log('🔄 Restaurando regiones...\n')

  let restored = 0
  let errors = 0

  for (const project of backupData) {
    try {
      await prisma.project.update({
        where: { id: project.id },
        data: { region: project.region },
      })
      restored++

      if (restored % 10 === 0) {
        console.log(`   Restaurados: ${restored}/${backupData.length}`)
      }
    } catch (error) {
      console.error(`   ❌ Error restaurando proyecto ${project.projectNumber}:`, error)
      errors++
    }
  }

  console.log('\n📊 RESUMEN:')
  console.log(`   Total restaurados: ${restored}`)
  console.log(`   Errores: ${errors}`)

  if (errors === 0) {
    console.log('\n✅ Rollback completado exitosamente\n')
  } else {
    console.log('\n⚠️  Rollback completado con errores\n')
  }
}

async function main() {
  // Parsear argumentos CLI
  const args = process.argv.slice(2)
  const backupArg = args.find((arg) => arg.startsWith('--backup='))

  if (!backupArg) {
    console.error('❌ Error: Debe especificar un archivo de backup')
    console.error('   Uso: npx tsx scripts/rollback-migration.ts --backup=PATH\n')
    process.exit(1)
  }

  const backupPath = backupArg.replace('--backup=', '')

  try {
    await rollbackMigration(backupPath)
    await prisma.$disconnect()
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Error durante rollback:', error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

// Ejecutar
main()
