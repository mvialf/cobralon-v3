import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { CalendarEvent, CalendarEventType } from '@/lib/types/calendar'

interface UseCalendarEventsParams {
  start: Date
  end: Date
}

interface CalendarEventsResponse {
  events: CalendarEvent[]
  count: number
}

async function fetchCalendarEvents(start: Date, end: Date): Promise<CalendarEventsResponse> {
  const params = new URLSearchParams({
    start: start.toISOString(),
    end: end.toISOString(),
  })

  const response = await fetch(`/api/calendar-events?${params}`)

  if (!response.ok) {
    throw new Error('Failed to fetch calendar events')
  }

  return response.json()
}

export function useCalendarEvents({ start, end }: UseCalendarEventsParams) {
  return useQuery({
    queryKey: ['calendar-events', start.toISOString(), end.toISOString()],
    queryFn: () => fetchCalendarEvents(start, end),
    staleTime: 5 * 60 * 1000, // 5 minutos
  })
}

// ============================================================================
// REORDER MUTATION
// ============================================================================

interface ReorderEventItem {
  id: string
  type: CalendarEventType
  order: number
}

interface ReorderEventsParams {
  events: ReorderEventItem[]
}

async function reorderCalendarEvents(params: ReorderEventsParams): Promise<void> {
  const response = await fetch('/api/calendar-events/reorder', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Error al reordenar eventos')
  }
}

/**
 * Hook para reordenar eventos del calendario
 * Usado para drag & drop dentro del mismo día
 */
export function useReorderEvents() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: reorderCalendarEvents,
    onSuccess: () => {
      // Invalidar cache de eventos para refrescar orden
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al reordenar eventos')
    },
  })
}
