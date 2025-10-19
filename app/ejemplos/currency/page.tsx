'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Settings, ArrowRight, CheckCircle2 } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { CurrencyInput } from '@/components/ui/currency-input'
import { useConfiguration } from '@/hooks/use-configuration'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export default function CurrencyExamplePage() {
  const { configuration } = useConfiguration()
  const [precio, setPrecio] = useState(125000)
  const [precioOverride, setPrecioOverride] = useState(1500.5)

  return (
    <AppLayout
      pageTitle="CurrencyInput - Demo"
      pageDescription="Ejemplo de CurrencyInput conectado a la configuración regional"
      breadcrumbs={[{ label: 'Ejemplos', href: '/ejemplos' }, { label: 'Currency Input' }]}
    >
      <div className="grid gap-6">
        {/* Alert de información */}
        <Alert>
          <CheckCircle2 className="size-4" />
          <AlertTitle>Sistema de Configuración Regional</AlertTitle>
          <AlertDescription>
            El CurrencyInput ahora se adapta automáticamente según el país configurado en{' '}
            <Link href="/configuracion" className="font-medium underline">
              /configuracion
            </Link>
            . Cambia el país allí y verás cómo se actualiza el formato aquí.
          </AlertDescription>
        </Alert>

        {/* Card con estado actual */}
        <Card>
          <CardHeader>
            <CardTitle>Configuración Actual</CardTitle>
            <CardDescription>
              Valores derivados automáticamente del país seleccionado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <Label className="text-muted-foreground text-xs">País</Label>
                <p className="font-medium text-sm">{configuration.pais.toUpperCase()}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Moneda</Label>
                <p className="font-medium text-sm">{configuration.currency}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Locale</Label>
                <p className="font-medium text-sm">{configuration.locale}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Timezone</Label>
                <p className="font-medium text-sm">{configuration.timezone}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card de demostración */}
        <Card>
          <CardHeader>
            <CardTitle>CurrencyInput con Configuración Automática</CardTitle>
            <CardDescription>
              Este input usa automáticamente currency={configuration.currency} y locale=
              {configuration.locale}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              {/* Ejemplo 1: Sin props (usa context) */}
              <div className="grid gap-2">
                <Label htmlFor="precio-auto">Precio (automático desde configuración)</Label>
                <CurrencyInput
                  id="precio-auto"
                  value={precio}
                  onChange={setPrecio}
                  placeholder="Ingresa un precio"
                />
                <p className="text-muted-foreground text-sm">
                  💡 Sin props de currency/locale → usa configuración global (
                  {configuration.currency})
                </p>
                <p className="text-muted-foreground text-sm">
                  Valor raw: <code className="rounded bg-muted px-1">{precio}</code>
                </p>
              </div>

              {/* Ejemplo 2: Con props override */}
              <div className="grid gap-2">
                <Label htmlFor="precio-override">Precio en EUR (override manual con props)</Label>
                <CurrencyInput
                  id="precio-override"
                  value={precioOverride}
                  onChange={setPrecioOverride}
                  currency="EUR"
                  locale="es-ES"
                  placeholder="Precio en euros"
                />
                <p className="text-muted-foreground text-sm">
                  💡 Con props currency=&quot;EUR&quot; locale=&quot;es-ES&quot; → ignora
                  configuración global
                </p>
                <p className="text-muted-foreground text-sm">
                  Valor raw: <code className="rounded bg-muted px-1">{precioOverride}</code>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card de testing */}
        <Card>
          <CardHeader>
            <CardTitle>Prueba el Sistema</CardTitle>
            <CardDescription>Sigue estos pasos para ver la configuración en acción</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="ml-4 list-decimal space-y-2 text-sm">
              <li>
                Observa el formato actual del primer input (
                {configuration.currency === 'CLP' ? 'sin decimales' : 'con decimales'})
              </li>
              <li>
                <Link
                  href="/configuracion"
                  className="inline-flex items-center gap-1 font-medium underline"
                >
                  Ve a Configuración
                  <ArrowRight className="size-3" />
                </Link>
              </li>
              <li>Cambia el país (cuando agregues Argentina, México, etc.)</li>
              <li>Vuelve a esta página</li>
              <li>
                El primer input ahora debería mostrar el formato de la nueva moneda automáticamente
              </li>
              <li>El segundo input (EUR) no cambia porque tiene props fijos</li>
            </ol>

            <div className="mt-4 flex gap-2">
              <Button asChild>
                <Link href="/configuracion">
                  <Settings className="mr-2 size-4" />
                  Ir a Configuración
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Card técnico */}
        <Card>
          <CardHeader>
            <CardTitle>Detalles Técnicos</CardTitle>
            <CardDescription>Cómo funciona la integración</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="mb-2 font-semibold">Prioridad de configuración:</h4>
                <code className="block rounded bg-muted p-2">
                  Props &gt; Context &gt; Defaults (EUR/es-ES)
                </code>
              </div>

              <div>
                <h4 className="mb-2 font-semibold">Context usado:</h4>
                <code className="block rounded bg-muted p-2">
                  ConfigurationProvider → ConfigurationContext → useConfiguration()
                </code>
              </div>

              <div>
                <h4 className="mb-2 font-semibold">Persistencia:</h4>
                <code className="block rounded bg-muted p-2">
                  localStorage (&apos;user-configuration&apos;) + Context API
                </code>
              </div>

              <div>
                <h4 className="mb-2 font-semibold">Monedas sin decimales:</h4>
                <code className="block rounded bg-muted p-2">CLP, JPY, KRW</code>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
