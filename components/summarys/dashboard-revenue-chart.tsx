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
  salesSubtotal: number
  revenue: number
}

interface DashboardRevenueChartProps {
  data: DashboardRevenuePoint[]
  gridArea: string
  className?: string
}

interface SalesSubtotalOverlayInput {
  x: number
  y: number
  width: number
  height: number
  sales: number
  salesSubtotal: number
}

interface SalesSubtotalOverlayRect {
  x: number
  y: number
  width: number
  height: number
}

interface SalesBarShapeProps {
  x?: number | string
  y?: number | string
  width?: number | string
  height?: number | string
  fill?: string
  payload?: Partial<DashboardRevenuePoint>
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

function toFiniteNumber(value: number | string | undefined) {
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : 0
}

export function calculateSalesSubtotalOverlay({
  x,
  y,
  width,
  height,
  sales,
  salesSubtotal,
}: SalesSubtotalOverlayInput): SalesSubtotalOverlayRect | null {
  if (sales <= 0 || salesSubtotal <= 0 || height <= 0 || width <= 0) {
    return null
  }

  const ratio = Math.min(salesSubtotal / sales, 1)
  const overlayHeight = height * ratio

  return {
    x,
    y: y + height - overlayHeight,
    width,
    height: overlayHeight,
  }
}

function SalesBarShape({ x, y, width, height, fill, payload }: SalesBarShapeProps) {
  const rect = {
    x: toFiniteNumber(x),
    y: toFiniteNumber(y),
    width: toFiniteNumber(width),
    height: toFiniteNumber(height),
  }
  const sales = Number(payload?.sales ?? 0)
  const salesSubtotal = Number(payload?.salesSubtotal ?? 0)
  const overlay = calculateSalesSubtotalOverlay({ ...rect, sales, salesSubtotal })

  if (rect.width <= 0 || rect.height <= 0) {
    return null
  }

  return (
    <g>
      <rect
        x={rect.x}
        y={rect.y}
        width={rect.width}
        height={rect.height}
        fill={fill}
        rx={3}
        ry={3}
      />
      {overlay ? (
        <rect
          x={overlay.x}
          y={overlay.y}
          width={overlay.width}
          height={overlay.height}
          fill="var(--chart-6)"
          rx={2}
          ry={2}
        />
      ) : null}
    </g>
  )
}

function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) {
    return null
  }

  const point = payload[0]?.payload as Partial<DashboardRevenuePoint> | undefined
  const sales = Number(point?.sales ?? 0)
  const salesSubtotal = Number(point?.salesSubtotal ?? 0)
  const revenue = Number(point?.revenue ?? 0)

  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <div className="mb-1 font-medium">{label}</div>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-2 text-muted-foreground">
            <span className="size-2 rounded-sm bg-chart-1" aria-hidden="true" />
            Ventas
          </span>
          <span className="font-medium">{formatCurrency(sales)}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-2 text-muted-foreground">
            <span className="size-2 rounded-sm bg-chart-6" aria-hidden="true" />
            Subtotal ventas
          </span>
          <span className="font-medium">{formatCurrency(salesSubtotal)}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-2 text-muted-foreground">
            <span className="size-2 rounded-sm bg-chart-3" aria-hidden="true" />
            Recaudación
          </span>
          <span className="font-medium">{formatCurrency(revenue)}</span>
        </div>
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
            <Bar name="Ventas" dataKey="sales" fill="var(--chart-1)" shape={<SalesBarShape />} />
            <Bar name="Recaudación" dataKey="revenue" fill="var(--chart-3)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
