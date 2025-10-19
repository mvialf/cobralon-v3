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
