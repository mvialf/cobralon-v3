'use client'

import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'

import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'

const tricks = [
  { label: 'Kickflip', value: 'kickflip' },
  { label: 'Heelflip', value: 'heelflip' },
  { label: 'Tre Flip', value: 'tre-flip' },
  { label: 'FS 540', value: 'fs-540' },
  { label: 'Casper flip 360 flip', value: 'casper-flip-360-flip' },
  { label: 'Kickflip Backflip', value: 'kickflip-backflip' },
  { label: '360 Varial McTwist', value: '360-varial-mc-twist' },
  { label: 'The 900', value: 'the-900' },
]

function ComboboxDemo() {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')

  return (
    <div className="mx-auto w-full max-w-md">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {value ? tricks.find((trick) => trick.value === value)?.label : 'Select trick...'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0">
          <Command>
            <CommandInput placeholder="Search trick..." />
            <CommandList>
              <CommandEmpty>No trick found.</CommandEmpty>
              <CommandGroup>
                {tricks.map((trick) => (
                  <CommandItem
                    key={trick.value}
                    value={trick.value}
                    onSelect={(currentValue) => {
                      setValue(currentValue === value ? '' : currentValue)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn('mr-2 h-4 w-4', value === trick.value ? 'opacity-100' : 'opacity-0')}
                    />
                    {trick.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value && (
        <div className="mt-4 rounded-lg border bg-muted/40 p-4">
          <p className="text-sm">
            <strong>Selected trick:</strong> {tricks.find((t) => t.value === value)?.label}
          </p>
        </div>
      )}
    </div>
  )
}

export default function ComboboxDemoPage() {
  return (
    <AppLayout
      pageTitle="Combobox Demo"
      pageDescription="Combobox con Command + Popover (shadcn/ui)"
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Ejemplos', href: '/ejemplos' },
        { label: 'Combobox' },
      ]}
    >
      <div className="flex flex-col gap-6">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Combobox básico</h2>
            <p className="text-sm text-muted-foreground">
              Combobox construido con Command + Popover de shadcn/ui. Funciona perfectamente con React 19.
            </p>
          </div>
          <ComboboxDemo />
        </div>

        <div className="rounded-lg border bg-muted/50 p-6">
          <h3 className="mb-2 font-semibold">Características</h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>✅ Basado en cmdk (librería de Vercel)</li>
            <li>✅ Filtrado en tiempo real mientras escribes</li>
            <li>✅ Teclado accesible (flechas, Enter, Esc)</li>
            <li>✅ Compatible con React 19 + Next.js 15</li>
            <li>✅ Sin bugs de pérdida de caracteres</li>
          </ul>
        </div>

        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 dark:border-yellow-900 dark:bg-yellow-950">
          <h3 className="mb-2 font-semibold text-yellow-900 dark:text-yellow-100">
            ⚠️ Migración desde @diceui/combobox
          </h3>
          <div className="space-y-2 text-sm text-yellow-800 dark:text-yellow-200">
            <p>
              Este componente reemplaza al anterior que usaba <code>@diceui/combobox</code>, el cual tenía un bug con React 19 donde se perdían caracteres al escribir.
            </p>
            <p>
              <strong>Solución:</strong> Usar el patrón oficial de shadcn/ui con Command + Popover, que está basado en cmdk y funciona correctamente.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
