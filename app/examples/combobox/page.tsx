'use client'

import { useState } from 'react'

import { AppLayout } from '@/components/layout/app-layout'
import { Combobox } from '@/components/ui/combobox'

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
  const [value, setValue] = useState('')

  return (
    <div className="mx-auto w-full max-w-md">
      <Combobox
        value={value}
        onValueChange={setValue}
        options={tricks}
        getOptionValue={(trick) => trick.value}
        getOptionLabel={(trick) => trick.label}
        placeholder="Select trick..."
        searchPlaceholder="Search trick..."
        emptyMessage="No trick found."
        contentWidth="400px"
      />

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
        { label: 'Ejemplos', href: '/examples' },
        { label: 'Combobox' },
      ]}
    >
      <div className="flex flex-col gap-6">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Combobox básico</h2>
            <p className="text-sm text-muted-foreground">
              Combobox construido con Command + Popover de shadcn/ui. Funciona perfectamente con
              React 19.
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
              Este componente reemplaza al anterior que usaba <code>@diceui/combobox</code>, el cual
              tenía un bug con React 19 donde se perdían caracteres al escribir.
            </p>
            <p>
              <strong>Solución:</strong> Usar el patrón oficial de shadcn/ui con Command + Popover,
              que está basado en cmdk y funciona correctamente.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
