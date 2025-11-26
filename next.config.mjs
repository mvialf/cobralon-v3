import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Evita warning de múltiples lockfiles en directorios padre
  outputFileTracingRoot: __dirname,
  eslint: {
    // ✅ Cambiado a false para que builds fallen con errores de lint
    ignoreDuringBuilds: false,
  },
  typescript: {
    // ✅ Cambiado a false para que builds fallen con errores de tipo
    ignoreBuildErrors: false,
  },
  images: {
    // ⚠️ Mantener true para desarrollo
    // TODO: Configurar dominio de CDN para producción
    unoptimized: true,
  },
}

export default nextConfig
