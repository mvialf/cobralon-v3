/**
 * Colores de borde lateral para diferenciar tipos de eventos en el calendario.
 *
 * Estos colores permiten identificación visual instantánea del tipo de evento
 * sin necesidad de leer el contenido.
 */
export const EVENT_TYPE_BORDER_COLORS = {
  project: 'border-l-8 border-l-blue-500',
  aftersale: 'border-l-8 border-l-green-500',
  visit: 'border-l-8 border-l-orange-500',
} as const

export type EventType = keyof typeof EVENT_TYPE_BORDER_COLORS
