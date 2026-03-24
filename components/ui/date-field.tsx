import { type ControllerRenderProps } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { formatDateValue, parseDateValue } from '@/lib/utils'

interface DateFieldProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  field: ControllerRenderProps<any, any>
  className?: string
  disabled?: boolean
}

/**
 * Input de fecha para formularios con schema z.date()
 *
 * Encapsula la transformación Date <-> string del input HTML nativo.
 * Para schemas con z.string(), usar <Input type="date"> directamente.
 */
export function DateField({ field, className, disabled }: DateFieldProps) {
  return (
    <Input
      type="date"
      defaultValue={formatDateValue(field.value)}
      onBlur={(e) => field.onChange(parseDateValue(e.target.value))}
      name={field.name}
      className={className}
      disabled={disabled}
    />
  )
}
