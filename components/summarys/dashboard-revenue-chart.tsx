'use client'

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

interface DashboardRevenuePoint {
  month: string
  label: string
  sales: number
  revenue: number
}

interface DashboardRevenueChartProps {
  data: DashboardRevenuePoint[]
  gridArea: string
  className?: string
}

function compactCurrency(value: number) {
  if (value >= 1_000_000) {
    return `$${Math.round(value / 1_000_000)}M`
  }

  if (value >= 1_000) {
    return `$${Math.round(value / 1_000)}K`
  }

  return `$${value}`
}

function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) {
    return null
  }

  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <div className="mb-1 font-medium">{label}</div>
      <div className="space-y-1">
        {payload.map((item) => (
          <div key={item.dataKey} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span
                className="size-2 rounded-sm"
                style={{ backgroundColor: item.color }}
                aria-hidden="true"
              />
              {item.name}
            </span>
            <span className="font-medium">{formatCurrency(Number(item.value ?? 0))}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DashboardRevenueChart({ data, gridArea, className }: DashboardRevenueChartProps) {
  const totalSales = data.reduce((sum, item) => sum + item.sales, 0)
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0)

  return (
    <Card className={cn('gap-2 h-full min-h-0', className)} style={{ gridArea }}>
      <CardHeader className="px-3 py-0">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Ventas vs Recaudación
          </CardTitle>
          <div className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="size-2 rounded-sm bg-chart-1" aria-hidden="true" />
              Ventas {formatCurrency(totalSales)}
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="size-2 rounded-sm bg-chart-3" aria-hidden="true" />
              Recaudación {formatCurrency(totalRevenue)}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 px-3 py-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tickMargin={6}
              className="text-xs text-muted-foreground"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickMargin={4}
              width={40}
              tickFormatter={compactCurrency}
              className="text-xs text-muted-foreground"
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--muted)' }} />
            <Bar name="Ventas" dataKey="sales" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
            <Bar name="Recaudación" dataKey="revenue" fill="var(--chart-3)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
