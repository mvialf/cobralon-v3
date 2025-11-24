import {
  startOfWeek,
  endOfWeek,
  addDays,
  format,
  startOfMonth,
  endOfMonth,
  startOfDay,
} from 'date-fns'
import { es } from 'date-fns/locale'
import type { CalendarEvent } from '@/lib/types/calendar'

/**
 * Obtiene los 7 días de la semana para una fecha dada
 * Empieza en Lunes (locale: es)
 */
export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date, { locale: es, weekStartsOn: 1 }) // 1 = Lunes
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

/**
 * Obtiene los días del mes con padding (42 días = 6 semanas)
 * Incluye días del mes anterior y siguiente para completar el grid
 */
export function getMonthDays(date: Date): Date[] {
  const monthStart = startOfMonth(date)

  // Primer día del grid (inicio de la semana del primer día del mes)
  const gridStart = startOfWeek(monthStart, { locale: es, weekStartsOn: 1 })

  // Generar 42 días (6 semanas)
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
}

/**
 * Obtiene el rango de fechas visible para la vista actual
 */
export function getVisibleDateRange(
  date: Date,
  view: 'week' | 'month' | 'agenda'
): { start: Date; end: Date } {
  switch (view) {
    case 'week': {
      const start = startOfWeek(date, { locale: es, weekStartsOn: 1 })
      const end = endOfWeek(date, { locale: es, weekStartsOn: 1 })
      return { start, end }
    }
    case 'month': {
      const start = startOfMonth(date)
      const end = endOfMonth(date)
      return { start, end }
    }
    case 'agenda': {
      // Agenda muestra 30 días desde hoy
      const start = startOfDay(new Date())
      const end = addDays(start, 30)
      return { start, end }
    }
  }
}

/**
 * Filtra eventos que corresponden a un día específico
 *
 * IMPORTANTE: Compara solo la parte de fecha (YYYY-MM-DD) ignorando
 * completamente timezone. Esto evita que eventos en UTC se muestren
 * en el día incorrecto debido a la conversión a hora local.
 *
 * Ejemplo del bug que esto previene:
 * - scheduledDate: "2025-11-21T00:00:00.000Z" (UTC)
 * - En Chile (UTC-3): se convertiría a Nov 20 21:00
 * - Sin este fix: evento de día 21 aparecería en día 20
 */
export function getEventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  // Formatear el día a YYYY-MM-DD (ignora timezone)
  const dayStr = format(day, 'yyyy-MM-dd')

  return events.filter((event) => {
    // Extraer YYYY-MM-DD del scheduledDate
    // Manejar tanto Date (desde Prisma) como string (desde API JSON)
    const scheduledDate = event.data.scheduledDate
    const eventDateStr =
      scheduledDate instanceof Date
        ? format(scheduledDate, 'yyyy-MM-dd')
        : String(scheduledDate).substring(0, 10)
    return eventDateStr === dayStr
  })
}

/**
 * Formatea una fecha para display en el header
 */
export function formatDateDisplay(date: Date, view: 'week' | 'month' | 'agenda'): string {
  switch (view) {
    case 'week': {
      const start = startOfWeek(date, { locale: es, weekStartsOn: 1 })
      const end = endOfWeek(date, { locale: es, weekStartsOn: 1 })
      return `${format(start, 'd MMM', { locale: es })} - ${format(end, 'd MMM yyyy', { locale: es })}`
    }
    case 'month': {
      return format(date, 'MMMM yyyy', { locale: es })
    }
    case 'agenda': {
      return 'Próximos 30 días'
    }
  }
}

/**
 * Colores por tipo de evento (usa CSS variables del proyecto)
 */
export const EVENT_TYPE_COLORS = {
  project: 'hsl(var(--chart-1))', // Azul
  aftersale: 'hsl(var(--chart-2))', // Naranja
  visit: 'hsl(var(--chart-3))', // Verde
} as const

/**
 * Nombres de días de la semana (cortos)
 */
export const DAYS_OF_WEEK_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

/**
 * Navegar a siguiente/anterior periodo
 */
export function navigateDate(
  currentDate: Date,
  direction: 'prev' | 'next',
  view: 'week' | 'month' | 'agenda'
): Date {
  switch (view) {
    case 'week':
      return direction === 'next' ? addDays(currentDate, 7) : addDays(currentDate, -7)
    case 'month':
      return direction === 'next'
        ? new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
        : new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    case 'agenda':
      return direction === 'next' ? addDays(currentDate, 30) : addDays(currentDate, -30)
  }
}
