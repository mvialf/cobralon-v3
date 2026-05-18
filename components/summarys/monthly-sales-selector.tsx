'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const MONTHS = [
  { index: 0, label: 'Ene' },
  { index: 1, label: 'Feb' },
  { index: 2, label: 'Mar' },
  { index: 3, label: 'Abr' },
  { index: 4, label: 'May' },
  { index: 5, label: 'Jun' },
  { index: 6, label: 'Jul' },
  { index: 7, label: 'Ago' },
  { index: 8, label: 'Sep' },
  { index: 9, label: 'Oct' },
  { index: 10, label: 'Nov' },
  { index: 11, label: 'Dic' },
]

interface MonthOption {
  value: string
  label: string
}

interface MonthlySalesSelectorProps {
  selectedMonth: string
  months: MonthOption[]
}

function getYearFromValue(value: string) {
  return Number(value.slice(0, 4))
}

function getMonthValue(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`
}

export function MonthlySalesSelector({ selectedMonth, months }: MonthlySalesSelectorProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const [visibleYear, setVisibleYear] = useState(getYearFromValue(selectedMonth))

  const selectedLabel = months.find((month) => month.value === selectedMonth)?.label

  const availableMonthValues = useMemo(() => new Set(months.map((month) => month.value)), [months])

  const availableYears = useMemo(
    () => Array.from(new Set(months.map((month) => getYearFromValue(month.value)))).sort(),
    [months]
  )

  const minYear = availableYears[0] ?? visibleYear
  const maxYear = availableYears[availableYears.length - 1] ?? visibleYear

  useEffect(() => {
    if (open) {
      setVisibleYear(getYearFromValue(selectedMonth))
    }
  }, [open, selectedMonth])

  const handleMonthChange = (month: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('month', month)

    setOpen(false)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Seleccionar mes de ventas"
          className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <span>{selectedLabel ?? selectedMonth}</span>
          <ChevronDown className="size-4 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            aria-label="Ver año anterior"
            disabled={visibleYear <= minYear}
            onClick={() => setVisibleYear((year) => Math.max(minYear, year - 1))}
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="text-sm font-medium">{visibleYear}</div>
          <button
            type="button"
            aria-label="Ver año siguiente"
            disabled={visibleYear >= maxYear}
            onClick={() => setVisibleYear((year) => Math.min(maxYear, year + 1))}
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1">
          {MONTHS.map((month) => {
            const value = getMonthValue(visibleYear, month.index)
            const isSelected = value === selectedMonth
            const isAvailable = availableMonthValues.has(value)

            return (
              <button
                key={month.label}
                type="button"
                disabled={!isAvailable}
                onClick={() => handleMonthChange(value)}
                className={cn(
                  'h-9 rounded-md text-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:text-muted-foreground disabled:opacity-50',
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground'
                )}
              >
                {month.label}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
