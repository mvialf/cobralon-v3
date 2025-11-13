import { useQuery } from '@tanstack/react-query'
import type { CalendarEvent } from '@/lib/types/calendar'

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
