import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely formats a Date object to ISO date string (YYYY-MM-DD) for HTML date inputs.
 * Returns empty string if the date is invalid or undefined.
 *
 * @param date - Date object to format
 * @returns ISO date string (YYYY-MM-DD) or empty string
 *
 * @example
 * formatDateValue(new Date('2025-04-29')) // '2025-04-29'
 * formatDateValue(new Date('invalid')) // ''
 * formatDateValue(undefined) // ''
 */
export function formatDateValue(date: Date | undefined | null): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return ''
  }
  return date.toISOString().split('T')[0]
}

/**
 * Safely parses a date string from HTML date input to Date object.
 * Returns undefined if the string is empty or results in an invalid date.
 *
 * Parses the date as LOCAL time to avoid timezone offset issues.
 * Without this, dates in timezones with negative UTC offsets (like Chile UTC-3)
 * would be interpreted as the previous day.
 *
 * @param value - Date string from HTML input (YYYY-MM-DD format)
 * @returns Valid Date object or undefined
 *
 * @example
 * parseDateValue('2025-04-29') // Date object at local midnight
 * parseDateValue('') // undefined
 * parseDateValue('invalid') // undefined
 */
export function parseDateValue(value: string): Date | undefined {
  if (!value || value.trim() === '') {
    return undefined
  }

  // Parse as local time by splitting the date components
  // This avoids timezone issues where '2025-04-29' is interpreted as UTC midnight
  const [year, month, day] = value.split('-').map(Number)

  if (!year || !month || !day) {
    return undefined
  }

  // Create date using local timezone (month is 0-indexed)
  const date = new Date(year, month - 1, day)
  return isNaN(date.getTime()) ? undefined : date
}

/**
 * Formats a Date or string to 'YYYY-MM-DD' for HTML date inputs.
 * If the value is already a correctly formatted string, returns it as-is (avoids timezone bugs).
 *
 * Use this for event form schemas that use z.string() for dates.
 * For schemas using z.date(), use formatDateValue() instead.
 *
 * @param date - Date object or date string
 * @returns 'YYYY-MM-DD' string or empty string
 */
export function formatDateForInput(date: Date | string): string {
  if (!date) return ''
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date
  }
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'yyyy-MM-dd')
}
