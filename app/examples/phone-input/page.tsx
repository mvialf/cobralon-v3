'use client'

import { useState } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { PhoneInput } from '@/components/ui/phone-input'

export default function PhoneInputExamplePage() {
  const [phoneDefault, setPhoneDefault] = useState('')
  const [phoneChile, setPhoneChile] = useState('')
  const [phoneValidation, setPhoneValidation] = useState('')
  const [phoneNoPrefix, setPhoneNoPrefix] = useState('')
  const [phoneNoAutoAdd, setPhoneNoAutoAdd] = useState('')

  return (
    <AppLayout
      pageTitle="Phone Input - Ejemplos"
      pageDescription="Componente de entrada de teléfono con validación y formato internacional"
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Ejemplos', href: '/examples' },
        { label: 'Phone Input' },
      ]}
    >
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        {/* Ejemplo 1: Default (lee del contexto) */}
        <Card>
          <CardHeader>
            <CardTitle>Default (desde configuración)</CardTitle>
            <CardDescription>
              Lee el país por defecto del contexto de configuración global (
              <code>useConfiguration</code>)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone-default">Teléfono</Label>
              <PhoneInput
                id="phone-default"
                value={phoneDefault}
                onChange={setPhoneDefault}
                placeholder="Ingrese su número"
              />
            </div>
            <div className="rounded-md bg-muted p-3">
              <p className="text-sm">
                <strong>Valor:</strong> <code>{phoneDefault || '(vacío)'}</code>
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Formato E.164 estándar internacional
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Ejemplo 2: Chile explícito */}
        <Card>
          <CardHeader>
            <CardTitle>Chile Explícito (CL)</CardTitle>
            <CardDescription>
              Override manual del país con prop <code>defaultCountry="CL"</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone-chile">Teléfono (Chile)</Label>
              <PhoneInput
                id="phone-chile"
                value={phoneChile}
                onChange={setPhoneChile}
                defaultCountry="CL"
              />
            </div>
            <div className="rounded-md bg-muted p-3">
              <p className="text-sm">
                <strong>Valor:</strong> <code>{phoneChile || '(vacío)'}</code>
              </p>
              <p className="mt-2 text-xs text-muted-foreground">Código de país: +56 (Chile)</p>
            </div>
          </CardContent>
        </Card>

        {/* Ejemplo 3: Con validación visual */}
        <Card>
          <CardHeader>
            <CardTitle>Con Validación Visual</CardTitle>
            <CardDescription>
              Muestra ícono de validación en tiempo real con <code>showValidationIcon</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone-validation">Teléfono</Label>
              <PhoneInput
                id="phone-validation"
                value={phoneValidation}
                onChange={setPhoneValidation}
                showValidationIcon
                placeholder="Ej: +56 9 8765 4321"
              />
            </div>
            <div className="rounded-md bg-muted p-3">
              <p className="text-sm">
                <strong>Valor:</strong> <code>{phoneValidation || '(vacío)'}</code>
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                ✓ verde = válido (9 dígitos) | ✗ rojo = inválido
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Válidos: 9 1234 5678 (celular), 2 2345 6789 (fijo RM), 32 234 5678 (fijo región)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Ejemplo 4: Sin prefijo visual */}
        <Card>
          <CardHeader>
            <CardTitle>Sin Prefijo Visual</CardTitle>
            <CardDescription>
              Ocultar el prefijo +56 con <code>showCountryPrefix={'{false}'}</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone-no-prefix">Teléfono</Label>
              <PhoneInput
                id="phone-no-prefix"
                value={phoneNoPrefix}
                onChange={setPhoneNoPrefix}
                showCountryPrefix={false}
                placeholder="9 1234 5678"
              />
            </div>
            <div className="rounded-md bg-muted p-3">
              <p className="text-sm">
                <strong>Valor:</strong> <code>{phoneNoPrefix || '(vacío)'}</code>
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                El prefijo +56 se agrega automáticamente al value, pero no es visible
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Ejemplo 5: Sin auto-add de prefijo */}
        <Card>
          <CardHeader>
            <CardTitle>Sin Auto-Add de Prefijo</CardTitle>
            <CardDescription>
              Usuario debe escribir el prefijo manualmente con{' '}
              <code>autoAddPrefix={'{false}'}</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone-no-auto">Teléfono</Label>
              <PhoneInput
                id="phone-no-auto"
                value={phoneNoAutoAdd}
                onChange={setPhoneNoAutoAdd}
                autoAddPrefix={false}
                showValidationIcon
                placeholder="+56 9 1234 5678"
              />
            </div>
            <div className="rounded-md bg-muted p-3">
              <p className="text-sm">
                <strong>Valor:</strong> <code>{phoneNoAutoAdd || '(vacío)'}</code>
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Usuario debe incluir +56 manualmente. Útil para números internacionales.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Características */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Características</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc space-y-2 text-sm">
            <li>
              <strong>Centralizado:</strong> Lee el país por defecto de{' '}
              <code>useConfiguration()</code>
            </li>
            <li>
              <strong>Prefijo visual fijo:</strong> Muestra +56 fijo en el input (configurable con{' '}
              <code>showCountryPrefix</code>)
            </li>
            <li>
              <strong>Auto-add de prefijo:</strong> Agrega +56 automáticamente si el usuario no lo
              incluye (configurable con <code>autoAddPrefix</code>)
            </li>
            <li>
              <strong>Validación visual (opcional):</strong> Muestra ✓ verde o ✗ rojo en tiempo real
              con <code>showValidationIcon</code>
            </li>
            <li>
              <strong>Enfocado en Chile:</strong> Optimizado para apps chilenas (código +56)
            </li>
            <li>
              <strong>Sin selector internacional:</strong> Campo simple sin complejidad innecesaria
            </li>
            <li>
              <strong>Ligero:</strong> Sin flags (~20KB vs ~70KB con selector completo)
            </li>
            <li>
              <strong>Validación estricta:</strong> Solo acepta números chilenos válidos (+56 +
              exactamente 9 dígitos)
            </li>
            <li>
              <strong>Acepta todos los tipos:</strong> Celular (9), Fijo RM (2), Fijo regiones
              (32-75)
            </li>
            <li>
              <strong>Consistente:</strong> API igual a RutInput y CurrencyInput
            </li>
            <li>
              <strong>Formato E.164:</strong> Retorna número en formato estándar internacional (ej:{' '}
              +56912345678)
            </li>
            <li>
              <strong>Accesible:</strong> Usa <code>aria-invalid</code> para screen readers
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Uso */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Uso</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-md bg-muted p-4 text-sm">
            {`import { PhoneInput } from '@/components/ui/phone-input'

function MyForm() {
  const [phone, setPhone] = useState('')

  return (
    <PhoneInput
      value={phone}
      onChange={setPhone}
      showValidationIcon      // Opcional: muestra ✓ o ✗
      showCountryPrefix       // Default: true - Muestra +56 fijo
      autoAddPrefix           // Default: true - Agrega +56 si falta
      defaultCountry="CL"     // Opcional: lee de configuración si se omite
    />
  )
}

// Con React Hook Form
<FormField
  control={form.control}
  name="phone"
  render={({ field }) => (
    <PhoneInput
      {...field}
      showValidationIcon
      showCountryPrefix={true}  // Prefijo visual
      autoAddPrefix={true}      // Auto-add prefijo
    />
  )}
/>`}
          </pre>
        </CardContent>
      </Card>
    </AppLayout>
  )
}
