'use client'

import { Settings2, RotateCcw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Combobox } from '@/components/ui/combobox'
import {
  IDIOMAS_DISPONIBLES,
  TIMEZONES_DISPONIBLES,
  PRIMER_DIA_OPCIONES,
} from '@/lib/paises-config'
import { getRegiones } from '@/lib/regiones-chile'
import { useConfiguration } from '@/hooks/use-configuration'

const paises = [
  {
    value: 'cl',
    label: 'Chile',
  },
]

export default function GeneralSettingsPage() {
  // Hook de configuración global
  const { configuration, updateConfiguration } = useConfiguration()

  // Destructuring para facilitar lectura
  const { pais, region, modoPersonalizado, idioma, timezone, primerDia } = configuration

  // Obtener datos de regiones
  const regiones = getRegiones()

  // Handler para activar modo personalizado
  const activarModoPersonalizado = () => {
    updateConfiguration({ modoPersonalizado: true })
  }

  // Handler para restaurar configuración automática
  const restaurarAutomatico = () => {
    updateConfiguration({ modoPersonalizado: false })
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuración Regional</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            {/* Ubicación en fila horizontal en desktop */}
            <div className="flex flex-col gap-4 md:flex-row">
              {/* Selector de País */}
              <div className="grid flex-1 gap-2">
                <Label>País</Label>
                <Combobox
                  value={pais}
                  onValueChange={(value) => updateConfiguration({ pais: value })}
                  options={paises}
                  getOptionValue={(p) => p.value}
                  getOptionLabel={(p) => p.label}
                  placeholder="Selecciona un país..."
                  searchPlaceholder="Buscar país..."
                  emptyMessage="No se encontró el país"
                  contentWidth="200px"
                />
              </div>

              {/* Ubicación - Solo visible si país es Chile */}
              {pais === 'cl' && (
                <>
                  {/* Región */}
                  <div className="grid flex-1 gap-2">
                    <Label>Región</Label>
                    <Combobox
                      value={region}
                      onValueChange={(value) => updateConfiguration({ region: value })}
                      options={regiones.map((r) => ({
                        codigo: r.codigo,
                        displayText: `${r.nombre_corto} (${r.numero_romano})`,
                      }))}
                      getOptionValue={(r) => r.codigo}
                      getOptionLabel={(r) => r.displayText}
                      placeholder="Selecciona una región..."
                      searchPlaceholder="Buscar región..."
                      emptyMessage="No se encontró la región"
                      contentWidth="250px"
                    />
                  </div>
                </>
              )}
            </div>

            <Separator />

            {/* Configuración Automática o Personalizada */}
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">
                  {modoPersonalizado ? 'Configuración Personalizada' : 'Configuración Automática'}
                </h3>
                {modoPersonalizado ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={restaurarAutomatico}
                    className="gap-2"
                  >
                    <RotateCcw className="size-4" />
                    Restaurar automático
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={activarModoPersonalizado}
                    className="gap-2"
                  >
                    <Settings2 className="size-4" />
                    Personalizar
                  </Button>
                )}
              </div>

              {/* Modo Automático: valores read-only */}
              {!modoPersonalizado && (
                <div className="flex flex-col gap-4 rounded-lg border bg-muted/40 p-4 md:flex-row">
                  <div className="grid flex-1 gap-2">
                    <Label className="text-muted-foreground text-xs">Idioma</Label>
                    <p className="font-medium text-sm">{idioma}</p>
                  </div>
                  <div className="grid flex-1 gap-2">
                    <Label className="text-muted-foreground text-xs">Zona horaria</Label>
                    <p className="font-medium text-sm">
                      {TIMEZONES_DISPONIBLES.find((t) => t.value === timezone)?.label || timezone}
                    </p>
                  </div>
                  <div className="grid flex-1 gap-2">
                    <Label className="text-muted-foreground text-xs">Primer día de la semana</Label>
                    <p className="font-medium text-sm capitalize">{primerDia}</p>
                  </div>
                </div>
              )}

              {/* Modo Personalizado: campos editables */}
              {modoPersonalizado && (
                <div className="flex flex-col gap-4 md:flex-row">
                  {/* Idioma */}
                  <div className="grid flex-1 gap-2">
                    <Label>Idioma</Label>
                    <Combobox
                      value={idioma}
                      onValueChange={(value) => updateConfiguration({ idioma: value })}
                      options={IDIOMAS_DISPONIBLES}
                      getOptionValue={(lang) => lang.label}
                      getOptionLabel={(lang) => lang.label}
                      placeholder="Selecciona un idioma..."
                      searchPlaceholder="Buscar idioma..."
                      emptyMessage="No se encontró el idioma"
                      contentWidth="200px"
                    />
                  </div>

                  {/* Zona Horaria */}
                  <div className="grid flex-1 gap-2">
                    <Label>Zona horaria</Label>
                    <Combobox
                      value={timezone}
                      onValueChange={(value) => updateConfiguration({ timezone: value })}
                      options={TIMEZONES_DISPONIBLES}
                      getOptionValue={(tz) => tz.value}
                      getOptionLabel={(tz) => tz.label}
                      placeholder="Selecciona una zona horaria..."
                      searchPlaceholder="Buscar zona horaria..."
                      emptyMessage="No se encontró la zona horaria"
                      contentWidth="300px"
                    />
                  </div>

                  {/* Primer Día de la Semana */}
                  <div className="grid flex-1 gap-2">
                    <Label>Primer día de la semana</Label>
                    <Combobox
                      value={primerDia}
                      onValueChange={(value) => updateConfiguration({ primerDia: value })}
                      options={PRIMER_DIA_OPCIONES}
                      getOptionValue={(dia) => dia.value}
                      getOptionLabel={(dia) => dia.label}
                      placeholder="Selecciona el primer día..."
                      searchPlaceholder="Buscar día..."
                      emptyMessage="No se encontró la opción"
                      contentWidth="200px"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Info adicional */}
            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="text-muted-foreground text-sm">
                💡 <strong>Tip:</strong> La configuración automática aplica los valores más comunes
                para el país seleccionado. Puedes personalizarla si tus necesidades son diferentes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
