/**
 * Script para crear usuario admin inicial
 *
 * Uso: npx tsx scripts/create-admin.ts
 *
 * Este script crea el primer usuario admin en la base de datos.
 * Usar solo una vez durante el setup inicial.
 */

import { auth } from '../lib/auth'

async function createAdmin() {
  console.log('🔐 Creando usuario admin...\n')

  const email = 'admin@ejemplo.com' // Cambiar antes de ejecutar
  const password = 'cambiar-este-password' // Cambiar antes de ejecutar
  const name = 'Nombre Admin'

  try {
    // Crear usuario usando la API interna de better-auth
    const result = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
      },
    })

    if (result.user) {
      console.log('✅ Usuario admin creado exitosamente!\n')
      console.log('📧 Email:', email)
      console.log('🔑 Password:', password)
      console.log('👤 Nombre:', name)
      console.log('\n⚠️  IMPORTANTE: Cambia el password despues del primer login!')
    }
  } catch (error) {
    // Si el usuario ya existe, better-auth lanza un error
    if (error instanceof Error && error.message.includes('already exists')) {
      console.log('ℹ️  El usuario admin ya existe')
      console.log('📧 Email:', email)
    } else {
      console.error('❌ Error creando usuario:', error)
      process.exit(1)
    }
  }

  console.log('\n🎉 Setup de auth completado!')
}

createAdmin()
