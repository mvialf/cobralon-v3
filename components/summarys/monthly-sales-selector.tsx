'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface MonthOption {
  value: string
  label: string
}

interface MonthlySalesSelectorProps {
  selectedMonth: string
  months: MonthOption[]
}

export function MonthlySalesSelector({ selectedMonth, months }: MonthlySalesSelectorProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleMonthChange = (month: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('month', month)

    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <Select value={selectedMonth} onValueChange={handleMonthChange}>
      <SelectTrigger
        aria-label="Seleccionar mes de ventas"
        className="h-auto w-fit border-0 bg-transparent px-0 py-0 text-sm font-medium text-muted-foreground shadow-none focus-visible:ring-0"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="start">
        {months.map((month) => (
          <SelectItem key={month.value} value={month.value}>
            {month.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
