import regionesData from './regiones-chile.json'

export type Comuna = {
  codigo: string
  nombre: string
}

export type Region = {
  codigo: string
  numero_romano: string
  nombre: string
  nombre_corto: string
  comunas: Comuna[]
}

export type RegionesData = {
  regiones: Region[]
}

// Datos tipados
export const REGIONES_CHILE = regionesData as RegionesData

/**
 * Obtiene todas las regiones
 */
export function getRegiones(): Region[] {
  return REGIONES_CHILE.regiones
}

/**
 * Obtiene una región por código
 */
export function getRegionByCodigo(codigo: string): Region | undefined {
  return REGIONES_CHILE.regiones.find((r) => r.codigo === codigo)
}

/**
 * Obtiene todas las comunas de una región específica
 */
export function getComunasByRegion(codigoRegion: string): Comuna[] {
  const region = getRegionByCodigo(codigoRegion)
  return region?.comunas || []
}

/**
 * Obtiene una comuna por código
 */
export function getComunaByCodigo(codigoComuna: string): Comuna | undefined {
  for (const region of REGIONES_CHILE.regiones) {
    const comuna = region.comunas.find((c) => c.codigo === codigoComuna)
    if (comuna) return comuna
  }
  return undefined
}

/**
 * Obtiene la región que contiene una comuna específica
 */
export function getRegionByComuna(codigoComuna: string): Region | undefined {
  return REGIONES_CHILE.regiones.find((region) =>
    region.comunas.some((comuna) => comuna.codigo === codigoComuna)
  )
}

/**
 * Formatea una región para mostrar en Combobox
 */
export function formatRegionForCombobox(region: Region) {
  return {
    value: region.codigo,
    label: region.nombre_corto,
  }
}

/**
 * Formatea una comuna para mostrar en Combobox
 */
export function formatComunaForCombobox(comuna: Comuna) {
  return {
    value: comuna.codigo,
    label: comuna.nombre,
  }
}

/**
 * Obtiene el código de región por nombre (búsqueda flexible)
 * Soporta nombre completo, nombre corto o búsqueda parcial
 * Ejemplos:
 * - "Región Metropolitana de Santiago" → "13"
 * - "Región Metropolitana" → "13"
 * - "Metropolitana" → "13"
 */
export function getRegionCodigoByNombre(nombre: string): string | null {
  if (!nombre) return null

  const nombreLower = nombre.toLowerCase().trim()

  // 1. Búsqueda exacta primero (más precisa)
  let region = REGIONES_CHILE.regiones.find(
    (r) => r.nombre.toLowerCase() === nombreLower || r.nombre_corto.toLowerCase() === nombreLower
  )

  // 2. Si no encuentra, búsqueda parcial (el nombre contiene o está contenido)
  if (!region) {
    region = REGIONES_CHILE.regiones.find(
      (r) =>
        r.nombre.toLowerCase().includes(nombreLower) ||
        nombreLower.includes(r.nombre_corto.toLowerCase())
    )
  }

  return region?.codigo || null
}
