'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { AppLayout } from '@/components/layout/app-layout'
import { RutInput } from '@/components/ui/rut-input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { rutSchema, rutSchemaOptional, rutHelpers } from '@/lib/rut-validations'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2 } from 'lucide-react'

// Schema del formulario completo
const formSchema = z.object({
  rutObligatorio: rutSchema,
  rutOpcional: rutSchemaOptional,
  rutSinFormateo: rutSchema,
})

type FormValues = z.infer<typeof formSchema>

export default function RutInputExamplePage() {
  // Estado para ejemplos standalone
  const [standaloneRut, setStandaloneRut] = useState('')
  const [rutWithIcon, setRutWithIcon] = useState('')
  const [rutNoFormat, setRutNoFormat] = useState('')

  // Estado para resultado del form
  const [submittedData, setSubmittedData] = useState<FormValues | null>(null)

  // React Hook Form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      rutObligatorio: '',
      rutOpcional: '',
      rutSinFormateo: '',
    },
  })

  function onSubmit(data: FormValues) {
    console.log('Form submitted:', data)
    setSubmittedData(data)
  }

  return (
    <AppLayout
      pageTitle="RUT Input"
      pageDescription="Componente para RUT chileno con formateo y validación automática"
      breadcrumbs={[{ label: 'Ejemplos', href: '/ejemplos' }, { label: 'RUT Input' }]}
    >
      <div className="space-y-6">
        {/* 1. Uso Standalone Simple */}
        <Card>
          <CardHeader>
            <CardTitle>1. Uso Standalone Simple</CardTitle>
            <CardDescription>
              Input de RUT sin React Hook Form, con formateo automático
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">RUT</label>
              <RutInput
                placeholder="12.345.678-9"
                onRutChange={setStandaloneRut}
                className="mt-1.5"
              />
              <p className="text-muted-foreground mt-2 text-sm">
                Valor limpio: <code className="text-foreground">{standaloneRut || '(vacío)'}</code>
              </p>
              <p className="text-muted-foreground text-sm">
                Válido:{' '}
                <code className="text-foreground">
                  {rutHelpers.validate(standaloneRut) ? '✅ Sí' : '❌ No'}
                </code>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 2. Con Validación Visual */}
        <Card>
          <CardHeader>
            <CardTitle>2. Con Indicador de Validación</CardTitle>
            <CardDescription>Muestra un checkmark verde cuando el RUT es válido</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">RUT con validación visual</label>
              <RutInput
                placeholder="Escribe un RUT válido"
                onRutChange={setRutWithIcon}
                showValidationIcon
                className="mt-1.5"
              />
              <p className="text-muted-foreground mt-2 text-sm">
                Intenta escribir: <code className="text-foreground">12345678-9</code> o{' '}
                <code className="text-foreground">11111111-1</code>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 3. Sin Formateo On-Change */}
        <Card>
          <CardHeader>
            <CardTitle>3. Formateo Solo en Blur</CardTitle>
            <CardDescription>
              El RUT solo se formatea cuando pierdes el foco (útil para copy/paste)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">RUT (formatea solo en blur)</label>
              <RutInput
                placeholder="Escribe y haz click fuera"
                onRutChange={setRutNoFormat}
                formatOnChange={false}
                showValidationIcon
                className="mt-1.5"
              />
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* 4. Formulario Completo con React Hook Form */}
        <Card>
          <CardHeader>
            <CardTitle>4. Formulario con React Hook Form + Zod</CardTitle>
            <CardDescription>Integración completa con validación de formularios</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* RUT Obligatorio */}
                <FormField
                  control={form.control}
                  name="rutObligatorio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RUT (obligatorio)</FormLabel>
                      <FormControl>
                        <RutInput
                          value={field.value}
                          onRutChange={field.onChange}
                          showValidationIcon
                          placeholder="12.345.678-9"
                        />
                      </FormControl>
                      <FormDescription>
                        Este campo es obligatorio y debe ser un RUT válido
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* RUT Opcional */}
                <FormField
                  control={form.control}
                  name="rutOpcional"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RUT Opcional</FormLabel>
                      <FormControl>
                        <RutInput
                          value={field.value}
                          onRutChange={field.onChange}
                          placeholder="(opcional)"
                        />
                      </FormControl>
                      <FormDescription>
                        Este campo es opcional, pero si lo completas debe ser válido
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* RUT sin formateo on-change */}
                <FormField
                  control={form.control}
                  name="rutSinFormateo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RUT (sin formateo on-change)</FormLabel>
                      <FormControl>
                        <RutInput
                          value={field.value}
                          onRutChange={field.onChange}
                          formatOnChange={false}
                          showValidationIcon
                          placeholder="Formatea solo en blur"
                        />
                      </FormControl>
                      <FormDescription>Solo formatea cuando pierdes el foco</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2">
                  <Button type="submit">Enviar Formulario</Button>
                  <Button type="button" variant="outline" onClick={() => form.reset()}>
                    Limpiar
                  </Button>
                </div>
              </form>
            </Form>

            {/* Resultado del submit */}
            {submittedData && (
              <Alert className="mt-6">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-semibold mb-2">Formulario enviado:</p>
                  <pre className="text-xs bg-muted p-2 rounded">
                    {JSON.stringify(submittedData, null, 2)}
                  </pre>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Documentación de uso */}
        <Card>
          <CardHeader>
            <CardTitle>Cómo Usar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">1. Import básico:</h4>
              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                {`import { RutInput } from "@/components/ui/rut-input"
import { rutSchema } from "@/lib/rut-validations"`}
              </pre>
            </div>

            <div>
              <h4 className="font-semibold mb-2">2. Schema de Zod:</h4>
              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                {`const formSchema = z.object({
  rut: rutSchema,              // Obligatorio
  rutOpcional: rutSchemaOptional, // Opcional
})`}
              </pre>
            </div>

            <div>
              <h4 className="font-semibold mb-2">3. En tu formulario:</h4>
              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                {`<FormField
  control={form.control}
  name="rut"
  render={({ field }) => (
    <FormItem>
      <FormLabel>RUT</FormLabel>
      <FormControl>
        <RutInput
          value={field.value}
          onRutChange={field.onChange}
          showValidationIcon
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>`}
              </pre>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Props disponibles:</h4>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>
                  <code>onRutChange</code>: Callback que recibe el RUT limpio (sin puntos ni guión)
                </li>
                <li>
                  <code>showValidationIcon</code>: Muestra ✓ o ✗ según validez
                </li>
                <li>
                  <code>formatOnChange</code>: Si formatea mientras escribe (default: true)
                </li>
                <li>
                  <code>value</code>: Valor inicial (acepta formateado o limpio)
                </li>
                <li>
                  + todas las props de <code>{'<input>'}</code>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
