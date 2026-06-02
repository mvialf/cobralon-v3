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
 * Normaliza un string para comparación insensible a acentos y mayúsculas
 * @internal
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
}

/**
 * Obtiene el código de región por nombre (búsqueda flexible)
 * Soporta nombre completo, nombre corto o búsqueda parcial
 * Insensible a acentos y mayúsculas
 *
 * Ejemplos:
 * - "Región Metropolitana de Santiago" → "13"
 * - "Región Metropolitana" → "13"
 * - "Metropolitana" → "13"
 * - "Valparaiso" (sin tilde) → "05"
 * - "Valparaíso" (con tilde) → "05"
 */
export function getRegionCodigoByNombre(nombre: string): string | null {
  if (!nombre) return null

  const nombreNormalized = normalizeString(nombre)

  // 1. Búsqueda exacta primero (más precisa)
  let region = REGIONES_CHILE.regiones.find((r) => {
    const nombreRegion = normalizeString(r.nombre)
    const nombreCorto = normalizeString(r.nombre_corto)
    return nombreRegion === nombreNormalized || nombreCorto === nombreNormalized
  })

  // 2. Si no encuentra, búsqueda parcial (el nombre contiene o está contenido)
  if (!region) {
    region = REGIONES_CHILE.regiones.find((r) => {
      const nombreRegion = normalizeString(r.nombre)
      const nombreCorto = normalizeString(r.nombre_corto)
      return nombreRegion.includes(nombreNormalized) || nombreNormalized.includes(nombreCorto)
    })
  }

  return region?.codigo || null
}

/**
 * Normaliza un valor de región a su código oficial
 *
 * Acepta códigos existentes O nombres para convertir.
 * Útil para procesar datos de usuarios que pueden venir en cualquier formato.
 *
 * @param value - Código ("13") o nombre ("Metropolitana", "Región Metropolitana")
 * @returns Código oficial o null si el valor no es válido
 *
 * @example
 * normalizeRegionValue("13") → "13" (código válido, se mantiene)
 * normalizeRegionValue("Metropolitana") → "13" (nombre convertido a código)
 * normalizeRegionValue("Región Metropolitana de Santiago") → "13"
 * normalizeRegionValue("Atlantida") → null (región inválida)
 * normalizeRegionValue("") → null (valor vacío)
 */
export function normalizeRegionValue(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  // Fast path: verificar si ya es un código válido
  // Esto maneja casos donde datos externos ya tienen códigos ("13", "05", etc.)
  if (getRegionByCodigo(trimmed)) {
    return trimmed
  }

  // Slow path: intentar conversión de nombre → código
  // Esto maneja casos donde datos externos tienen nombres ("Metropolitana", etc.)
  return getRegionCodigoByNombre(trimmed)
}
