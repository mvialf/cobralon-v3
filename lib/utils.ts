import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

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
 * @param value - Date string from HTML input (YYYY-MM-DD format)
 * @returns Valid Date object or undefined
 *
 * @example
 * parseDateValue('2025-04-29') // Date object
 * parseDateValue('') // undefined
 * parseDateValue('invalid') // undefined
 */
export function parseDateValue(value: string): Date | undefined {
  if (!value || value.trim() === '') {
    return undefined
  }

  const date = new Date(value)
  return isNaN(date.getTime()) ? undefined : date
}
