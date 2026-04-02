'use client'

import * as React from 'react'
import { Control } from 'react-hook-form'

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { FormGrid } from '@/components/ui/form-grid'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface ProjectDetailsFieldsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>
  windowsCountLabel?: string
  squareMetersLabel?: string
  descriptionLabel?: string
  descriptionPlaceholder?: string
  disabled?: boolean
}

/**
 * Componente reutilizable para campos de detalles de proyecto
 * Incluye: windowsCount + squareMeters (FormGrid 2) + description (Textarea)
 *
 * Renderiza:
 * - FormGrid(2): Elementos (number) + m² (number con decimales)
 * - Descripción (Textarea)
 *
 * Usado en ProjectForm para capturar detalles técnicos opcionales del proyecto.
 */
export function ProjectDetailsFields({
  control,
  windowsCountLabel = 'Elementos',
  squareMetersLabel = 'm²',
  descriptionLabel = 'Descripción',
  descriptionPlaceholder = 'Descripción detallada del proyecto',
  disabled,
}: ProjectDetailsFieldsProps) {
  return (
    <>
      <FormGrid columns={2}>
        {/* Elementos */}
        <FormField
          control={control}
          name="windowsCount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{windowsCountLabel}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  disabled={disabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* m² */}
        <FormField
          control={control}
          name="squareMeters"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{squareMetersLabel}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  disabled={disabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormGrid>

      {/* Descripción */}
      <FormField
        control={control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{descriptionLabel}</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                value={field.value ?? ''}
                placeholder={descriptionPlaceholder}
                rows={4}
                disabled={disabled}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}
