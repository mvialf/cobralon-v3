'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'

import {
  paymentToProjectSchema,
  type PaymentToProjectFormValues,
  type ProjectWithBalance,
} from '@/lib/validations/payment-validations'
import { formatCurrency } from '@/lib/format'
import { checkCreditEligibility } from '@/lib/business-logic/credit-eligibility'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormRoot,
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { ProjectSearchField } from '@/components/forms/search/project-search-field'
import { PaymentMethodFields } from '@/components/forms/fields/payment-method-fields'
import { PaymentAmountDateFields } from '@/components/forms/fields/payment-amount-date-fields'
import { CreditApplicationFields } from '@/components/forms/fields/credit-application-fields'

interface PaymentToProjectFormProps {
  onSubmit: (data: PaymentToProjectFormValues, project: ProjectWithBalance) => void | Promise<void>
  isSubmitting?: boolean
  preselectedProjectId?: string // ← NUEVO: Si viene, el proyecto está pre-seleccionado
}

/**
 * Formulario para "Pago a Proyecto" (1:1)
 *
 * Flujo simplificado donde:
 * 1. Usuario busca y selecciona un proyecto (combobox muestra cliente + proyecto)
 *    O el proyecto viene pre-seleccionado (desde tabla de proyectos)
 * 2. customerId y currency se derivan automáticamente del proyecto
 * 3. 100% del monto se asigna al proyecto
 * 4. Validación de monto vs balance se hace en submit con form.setError()
 */
export function PaymentToProjectForm({
  onSubmit,
  isSubmitting = false,
  preselectedProjectId,
}: PaymentToProjectFormProps) {
  // State para proyecto seleccionado (actualizado via callback de ProjectSearchField)
  const [selectedProject, setSelectedProject] = useState<ProjectWithBalance | null>(null)
  const [customerCreditBalance, setCustomerCreditBalance] = useState<number>(0)

  // Form setup
  const form = useForm<PaymentToProjectFormValues>({
    resolver: zodResolver(paymentToProjectSchema),
    defaultValues: {
      projectId: preselectedProjectId || '', // Pre-cargar si viene
      amount: 0,
      date: new Date(),
      paymentMethodId: '',
      creditApplied: 0, // ← Nuevo campo
      notes: '',
      selectedInstallments: 1, // Default: 1 cuota (contado)
    },
  })

  // Fetch payment methods
  const { data: paymentMethods = [] } = useQuery<
    Array<{
      id: string
      name: string
      active: boolean
      hasInstallments: boolean
      maxInstallments: number | null
    }>
  >({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const res = await fetch('/api/payment-methods')
      if (!res.ok) throw new Error('Error al cargar métodos de pago')
      const data = await res.json()
      return data.paymentMethods || []
    },
  })

  // Fetch customer credit cuando se selecciona proyecto
  const { data: customerCredit } = useQuery({
    queryKey: ['customer-credit', selectedProject?.customer.id],
    queryFn: async () => {
      if (!selectedProject?.customer.id) return null

      const res = await fetch(`/api/customers/${selectedProject.customer.id}/credit`)
      if (!res.ok) return null

      const data = await res.json()
      return data
    },
    enabled: !!selectedProject?.customer.id,
  })

  // Actualizar state de crédito cuando se obtiene la data
  useEffect(() => {
    if (customerCredit?.creditBalance !== undefined) {
      setCustomerCreditBalance(Number(customerCredit.creditBalance) || 0)
    }
  }, [customerCredit?.creditBalance])

  // Verificar elegibilidad de crédito
  const creditEligibility = selectedProject
    ? checkCreditEligibility(
        customerCreditBalance,
        selectedProject.balance,
        selectedProject.customer.id,
        selectedProject.customer.id // Son el mismo en este flujo
      )
    : { eligible: false, maxApplicable: 0 }

  // Submit handler
  const handleSubmit = (values: PaymentToProjectFormValues) => {
    if (!selectedProject) {
      form.setError('projectId', { message: 'Debe seleccionar un proyecto' })
      return
    }

    // Validar monto <= balance
    if (values.amount > selectedProject.balance) {
      form.setError('amount', {
        message: `El monto no puede ser mayor al balance pendiente (${formatCurrency(selectedProject.balance, selectedProject.currency)})`,
      })
      return
    }

    onSubmit(values, selectedProject)
  }

  return (
    <Form {...form}>
      <FormRoot onSubmit={form.handleSubmit(handleSubmit)}>
        {/* 1. Búsqueda de Proyecto + Cards de Balance */}
        <ProjectSearchField
          control={form.control}
          preselectedProjectId={preselectedProjectId}
          onProjectSelect={setSelectedProject}
        />

        {/* 2. Monto y Fecha */}
        <PaymentAmountDateFields
          control={form.control}
          currency={selectedProject?.currency}
          disabled={!selectedProject}
        />

        {/* 3. Método de Pago + Cuotas */}
        <PaymentMethodFields
          control={form.control}
          paymentMethods={paymentMethods}
          onPaymentMethodChange={() => form.setValue('selectedInstallments', 1)}
        />

        {/* 4. Crédito Disponible (condicional) */}
        {creditEligibility.eligible && selectedProject && (
          <CreditApplicationFields
            form={form}
            customerCredit={customerCreditBalance}
            projectBalance={selectedProject.balance}
            customerName={selectedProject.customer.name}
          />
        )}

        {/* 5. Notas (opcional) */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas (opcional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Notas adicionales sobre el pago..."
                  className="resize-none"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit button */}
        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={isSubmitting || !selectedProject}>
            {isSubmitting ? 'Registrando...' : 'Registrar Pago'}
          </Button>
        </div>
      </FormRoot>
    </Form>
  )
}
