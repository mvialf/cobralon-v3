'use client'

import { type ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import useMeasure from 'react-use-measure'

// Altura estimada de cada item (py-2 = 16px + 2 lineas texto ~32px + border 1px)
const ITEM_HEIGHT = 52

interface DashboardListItem {
  id: string
  left: ReactNode
  right: ReactNode
}

interface DashboardListProps {
  title: string
  items: DashboardListItem[]
  emptyMessage?: string
  linkHref: string
  linkLabel: string
  gridArea: string
  className?: string
}

export function DashboardList({
  title,
  items,
  emptyMessage = 'Sin datos',
  linkHref,
  linkLabel,
  gridArea,
  className,
}: DashboardListProps) {
  const [ref, bounds] = useMeasure()

  const visibleCount =
    bounds.height > 0
      ? Math.max(1, Math.floor(bounds.height / ITEM_HEIGHT))
      : Math.min(5, items.length)

  const displayItems = items.slice(0, visibleCount)

  return (
    <Card className={cn('gap-1.5 h-full flex flex-col', className)} style={{ gridArea }}>
      <CardHeader className="px-3 py-0 shrink-0">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-0 py-0 flex-1 flex flex-col min-h-0">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground px-4">{emptyMessage}</p>
        ) : (
          <div ref={ref} className="flex-1 overflow-hidden">
            <div className="divide-y">
              {displayItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between w-full py-2 px-4">
                  <div className="flex items-center">{item.left}</div>
                  {item.right}
                </div>
              ))}
            </div>
          </div>
        )}
        <Link
          href={linkHref}
          className="flex items-center gap-1 text-sm text-primary hover:underline mt-1 px-4 shrink-0"
        >
          {linkLabel} <ArrowRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  )
}
