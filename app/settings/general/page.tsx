'use client'

import { useState } from 'react'
import { Check, ChevronsUpDown, Settings2, RotateCcw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  IDIOMAS_DISPONIBLES,
  TIMEZONES_DISPONIBLES,
  PRIMER_DIA_OPCIONES,
} from '@/lib/paises-config'
import { getRegiones, getComunasByRegion } from '@/lib/regiones-chile'
import { Input } from '@/components/ui/input'
import { useConfiguration } from '@/hooks/use-configuration'
import { cn } from '@/lib/utils'

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
  const { pais, region, ciudad, comuna, modoPersonalizado, idioma, timezone, primerDia } =
    configuration

  // Estados para controlar apertura de popovers
  const [openPais, setOpenPais] = useState(false)
  const [openRegion, setOpenRegion] = useState(false)
  const [openComuna, setOpenComuna] = useState(false)
  const [openIdioma, setOpenIdioma] = useState(false)
  const [openTimezone, setOpenTimezone] = useState(false)
  const [openPrimerDia, setOpenPrimerDia] = useState(false)

  // Obtener datos de regiones/comunas
  const regiones = getRegiones()

  // Extraer código de región del texto seleccionado (ej: "Metropolitana (RM)" → "13")
  const regionCodigo =
    regiones.find((r) => `${r.nombre_corto} (${r.numero_romano})` === region)?.codigo || ''

  const comunasDisponibles = regionCodigo ? getComunasByRegion(regionCodigo) : []

  // Handler para cambio de región (limpia comuna)
  const handleRegionChange = (value: string) => {
    updateConfiguration({ region: value, comuna: '' })
    setOpenRegion(false)
  }

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
          <CardDescription>
            Configura las opciones relacionadas con tu ubicación y preferencias regionales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            {/* Ubicación en fila horizontal en desktop */}
            <div className="flex flex-col gap-4 md:flex-row">
              {/* Selector de País */}
              <div className="grid flex-1 gap-2">
                <Label>País</Label>
                <Popover open={openPais} onOpenChange={setOpenPais}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="input-like"
                      size="input"
                      role="combobox"
                      aria-expanded={openPais}
                    >
                      {pais ? paises.find((p) => p.value === pais)?.label : 'Selecciona un país...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar país..." />
                      <CommandList>
                        <CommandEmpty>No se encontró el país</CommandEmpty>
                        <CommandGroup>
                          {paises.map((p) => (
                            <CommandItem
                              key={p.value}
                              value={p.value}
                              onSelect={(currentValue) => {
                                updateConfiguration({ pais: currentValue })
                                setOpenPais(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  pais === p.value ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              {p.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Ubicación - Solo visible si país es Chile */}
              {pais === 'cl' && (
                <>
                  {/* Región */}
                  <div className="grid flex-1 gap-2">
                    <Label>Región</Label>
                    <Popover open={openRegion} onOpenChange={setOpenRegion}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="input-like"
                          size="input"
                          role="combobox"
                          aria-expanded={openRegion}
                        >
                          {region || 'Selecciona una región...'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[250px] p-0">
                        <Command>
                          <CommandInput placeholder="Buscar región..." />
                          <CommandList>
                            <CommandEmpty>No se encontró la región</CommandEmpty>
                            <CommandGroup>
                              {regiones.map((r) => {
                                const displayText = `${r.nombre_corto} (${r.numero_romano})`
                                return (
                                  <CommandItem
                                    key={r.codigo}
                                    value={displayText}
                                    onSelect={handleRegionChange}
                                  >
                                    <Check
                                      className={cn(
                                        'mr-2 h-4 w-4',
                                        region === displayText ? 'opacity-100' : 'opacity-0'
                                      )}
                                    />
                                    {displayText}
                                  </CommandItem>
                                )
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Ciudad - Input de texto libre */}
                  <div className="grid flex-1 gap-2">
                    <Label htmlFor="ciudad">
                      Ciudad <span className="text-muted-foreground text-xs">(opcional)</span>
                    </Label>
                    <Input
                      id="ciudad"
                      value={ciudad}
                      onChange={(e) => updateConfiguration({ ciudad: e.target.value })}
                    />
                  </div>

                  {/* Comuna */}
                  <div className="grid flex-1 gap-2">
                    <Label>Comuna</Label>
                    <Popover open={openComuna} onOpenChange={setOpenComuna}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="input-like"
                          size="input"
                          role="combobox"
                          aria-expanded={openComuna}
                          disabled={!regionCodigo}
                        >
                          {comuna ||
                            (regionCodigo
                              ? 'Selecciona una comuna...'
                              : 'Primero selecciona una región')}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[250px] p-0">
                        <Command>
                          <CommandInput placeholder="Buscar comuna..." />
                          <CommandList>
                            <CommandEmpty>No se encontró la comuna</CommandEmpty>
                            <CommandGroup>
                              {comunasDisponibles.map((c) => (
                                <CommandItem
                                  key={c.codigo}
                                  value={c.nombre}
                                  onSelect={(currentValue) => {
                                    updateConfiguration({ comuna: currentValue })
                                    setOpenComuna(false)
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      comuna === c.nombre ? 'opacity-100' : 'opacity-0'
                                    )}
                                  />
                                  {c.nombre}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {!regionCodigo && (
                      <p className="text-muted-foreground text-xs">
                        Selecciona primero una región para ver las comunas disponibles
                      </p>
                    )}
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
                    <Popover open={openIdioma} onOpenChange={setOpenIdioma}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="input-like"
                          size="input"
                          role="combobox"
                          aria-expanded={openIdioma}
                        >
                          {idioma || 'Selecciona un idioma...'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[200px] p-0">
                        <Command>
                          <CommandInput placeholder="Buscar idioma..." />
                          <CommandList>
                            <CommandEmpty>No se encontró el idioma</CommandEmpty>
                            <CommandGroup>
                              {IDIOMAS_DISPONIBLES.map((lang) => (
                                <CommandItem
                                  key={lang.value}
                                  value={lang.label}
                                  onSelect={(currentValue) => {
                                    updateConfiguration({ idioma: currentValue })
                                    setOpenIdioma(false)
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      idioma === lang.label ? 'opacity-100' : 'opacity-0'
                                    )}
                                  />
                                  {lang.label}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Zona Horaria */}
                  <div className="grid flex-1 gap-2">
                    <Label>Zona horaria</Label>
                    <Popover open={openTimezone} onOpenChange={setOpenTimezone}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="input-like"
                          size="input"
                          role="combobox"
                          aria-expanded={openTimezone}
                        >
                          {timezone
                            ? TIMEZONES_DISPONIBLES.find((tz) => tz.value === timezone)?.label
                            : 'Selecciona una zona horaria...'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0">
                        <Command>
                          <CommandInput placeholder="Buscar zona horaria..." />
                          <CommandList>
                            <CommandEmpty>No se encontró la zona horaria</CommandEmpty>
                            <CommandGroup>
                              {TIMEZONES_DISPONIBLES.map((tz) => (
                                <CommandItem
                                  key={tz.value}
                                  value={tz.value}
                                  onSelect={(currentValue) => {
                                    updateConfiguration({ timezone: currentValue })
                                    setOpenTimezone(false)
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      timezone === tz.value ? 'opacity-100' : 'opacity-0'
                                    )}
                                  />
                                  {tz.label}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Primer Día de la Semana */}
                  <div className="grid flex-1 gap-2">
                    <Label>Primer día de la semana</Label>
                    <Popover open={openPrimerDia} onOpenChange={setOpenPrimerDia}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="input-like"
                          size="input"
                          role="combobox"
                          aria-expanded={openPrimerDia}
                        >
                          {primerDia
                            ? PRIMER_DIA_OPCIONES.find((dia) => dia.value === primerDia)?.label
                            : 'Selecciona el primer día...'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[200px] p-0">
                        <Command>
                          <CommandInput placeholder="Buscar día..." />
                          <CommandList>
                            <CommandEmpty>No se encontró la opción</CommandEmpty>
                            <CommandGroup>
                              {PRIMER_DIA_OPCIONES.map((dia) => (
                                <CommandItem
                                  key={dia.value}
                                  value={dia.value}
                                  onSelect={(currentValue) => {
                                    updateConfiguration({ primerDia: currentValue })
                                    setOpenPrimerDia(false)
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      primerDia === dia.value ? 'opacity-100' : 'opacity-0'
                                    )}
                                  />
                                  {dia.label}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
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
