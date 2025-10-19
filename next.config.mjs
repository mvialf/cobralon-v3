/** @type {import('next').NextConfig} */
const nextConfig = {
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
