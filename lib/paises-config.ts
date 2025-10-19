export type PaisConfig = {
  nombre: string
  currency: string // Código ISO 4217 (CLP, ARS, USD, etc.)
  locale: string // Locale para formateo (es-CL, es-AR, en-US, etc.)
  idioma: string
  timezone: string
  primerDia: 'lunes' | 'domingo'
}

export const PAISES_CONFIG: Record<string, PaisConfig> = {
  cl: {
    nombre: 'Chile',
    currency: 'CLP',
    locale: 'es-CL',
    idioma: 'Español',
    timezone: 'America/Santiago',
    primerDia: 'lunes',
  },
  // Fácil agregar más países en el futuro:
  // ar: {
  //   nombre: 'Argentina',
  //   currency: 'ARS',
  //   locale: 'es-AR',
  //   idioma: 'Español',
  //   timezone: 'America/Buenos_Aires',
  //   primerDia: 'lunes',
  // },
  // mx: {
  //   nombre: 'México',
  //   currency: 'MXN',
  //   locale: 'es-MX',
  //   idioma: 'Español',
  //   timezone: 'America/Mexico_City',
  //   primerDia: 'domingo',
  // },
}

export const IDIOMAS_DISPONIBLES = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
  { value: 'pt', label: 'Português' },
]

export const TIMEZONES_DISPONIBLES = [
  { value: 'America/Santiago', label: 'Santiago (Chile)' },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires (Argentina)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (Brasil)' },
  { value: 'America/Mexico_City', label: 'Ciudad de México (México)' },
  { value: 'America/New_York', label: 'Nueva York (USA)' },
  { value: 'Europe/Madrid', label: 'Madrid (España)' },
]

export const PRIMER_DIA_OPCIONES = [
  { value: 'lunes', label: 'Lunes' },
  { value: 'domingo', label: 'Domingo' },
]
