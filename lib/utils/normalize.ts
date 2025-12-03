/**
 * Utilidades de normalización de texto para búsquedas
 *
 * Proporciona funciones para normalizar strings removiendo acentos/tildes,
 * permitiendo búsquedas insensibles a diacríticos.
 *
 * @example
 * // Búsqueda que encuentra "José García" buscando "jose garcia"
 * normalizeForSearch("José García") // "jose garcia"
 * normalizeForSearch("jose garcia") // "jose garcia"
 * textMatchesSearch("José García", "jose") // true
 */

/**
 * Normaliza un string para búsqueda: lowercase, trim, y remueve acentos/tildes.
 *
 * Usa Unicode Normalization Form D (NFD) para descomponer caracteres acentuados
 * en su forma base + diacrítico, luego remueve los diacríticos.
 *
 * @param str - String a normalizar
 * @returns String normalizado (lowercase, sin acentos, trimmed)
 *
 * @example
 * normalizeForSearch("José García") // "jose garcia"
 * normalizeForSearch("MARÍA") // "maria"
 * normalizeForSearch("Ñuñoa") // "nunoa"
 * normalizeForSearch("  Valparaíso  ") // "valparaiso"
 */
export function normalizeForSearch(str: string): string {
  if (!str) return ''

  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remueve diacríticos (acentos, tildes, etc.)
}

/**
 * Verifica si un texto contiene el término de búsqueda (insensible a acentos y mayúsculas).
 *
 * @param text - Texto donde buscar
 * @param searchTerm - Término a buscar
 * @returns true si el texto normalizado contiene el término normalizado
 *
 * @example
 * textMatchesSearch("José García", "jose") // true
 * textMatchesSearch("José García", "garcia") // true
 * textMatchesSearch("Ñuñoa", "nunoa") // true
 * textMatchesSearch("María", "maria") // true
 * textMatchesSearch("Pedro", "jose") // false
 */
export function textMatchesSearch(text: string, searchTerm: string): boolean {
  if (!searchTerm) return true // Empty search matches everything
  if (!text) return false

  return normalizeForSearch(text).includes(normalizeForSearch(searchTerm))
}

/**
 * Verifica si alguno de los valores contiene el término de búsqueda.
 * Útil para búsquedas multi-campo.
 *
 * @param values - Array de valores donde buscar (pueden ser null/undefined)
 * @param searchTerm - Término a buscar
 * @returns true si algún valor contiene el término de búsqueda
 *
 * @example
 * anyFieldMatchesSearch(["José García", "jose@email.com"], "jose") // true
 * anyFieldMatchesSearch(["Pedro", null, "Ñuñoa"], "nunoa") // true
 * anyFieldMatchesSearch(["Pedro", "López"], "garcia") // false
 */
export function anyFieldMatchesSearch(
  values: (string | null | undefined)[],
  searchTerm: string
): boolean {
  if (!searchTerm) return true

  const normalizedSearch = normalizeForSearch(searchTerm)

  return values.some((value) => {
    if (!value) return false
    return normalizeForSearch(value).includes(normalizedSearch)
  })
}
