import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withLogging } from '@/lib/logger-middleware'
import { customerSchema, type CustomerFormData } from '@/lib/validations/customer-validations'
import { IMPORT_EXPORT_LIMITS } from '@/lib/constants/import-export-limits'

/**
 * POST /api/customers/import
 *
 * Importa múltiples clientes desde Excel
 *
 * Body:
 *   - customers: CustomerFormData[] (array de clientes validados)
 */
export const POST = withLogging(async (request, logger) => {
  const body = await request.json()
  const { customers } = body

  logger.info({ count: customers?.length || 0 }, 'Customer import requested')

  try {
    // Validación de entrada
    if (!Array.isArray(customers) || customers.length === 0) {
      logger.warn('Invalid or empty customers array')
      return NextResponse.json({ error: 'Debe proporcionar un array de clientes' }, { status: 400 })
    }

    if (customers.length > IMPORT_EXPORT_LIMITS.MAX_IMPORT_ROWS) {
      logger.warn({ count: customers.length }, 'Customer import row limit exceeded')
      return NextResponse.json(
        {
          error: `No se pueden importar más de ${IMPORT_EXPORT_LIMITS.MAX_IMPORT_ROWS} clientes por archivo`,
          limit: IMPORT_EXPORT_LIMITS.MAX_IMPORT_ROWS,
        },
        { status: 413 }
      )
    }

    logger.debug({ count: customers.length }, 'Validating customers')

    // Validar cada cliente con el schema de Zod
    const validatedCustomers: CustomerFormData[] = []
    const errors: { index: number; error: string }[] = []

    for (let i = 0; i < customers.length; i++) {
      const result = customerSchema.safeParse(customers[i])

      if (result.success) {
        validatedCustomers.push(result.data)
      } else {
        const errorMsg = result.error.errors.map((e) => e.message).join(', ')
        errors.push({ index: i, error: errorMsg })
        logger.warn({ index: i, error: errorMsg }, 'Customer validation failed')
      }
    }

    if (errors.length > 0) {
      logger.warn({ errorCount: errors.length }, 'Some customers failed validation')
      return NextResponse.json(
        {
          error: 'Algunos clientes tienen errores de validación',
          errors: errors.slice(0, IMPORT_EXPORT_LIMITS.MAX_ERROR_DETAILS),
          totalErrors: errors.length,
        },
        { status: 400 }
      )
    }

    logger.info(
      { count: validatedCustomers.length },
      'All customers validated, checking for duplicates'
    )

    // Verificar duplicados por email (solo los que tienen email)
    const customersWithEmail = validatedCustomers.filter((c) => c.email)

    if (customersWithEmail.length > 0) {
      const emails = customersWithEmail.map((c) => c.email!)
      const existingCustomers = await prisma.customer.findMany({
        where: { email: { in: emails } },
        select: { email: true },
      })

      if (existingCustomers.length > 0) {
        const duplicateEmails = existingCustomers.map((c) => c.email)
        logger.warn({ duplicateEmails }, 'Found duplicate emails in database')

        return NextResponse.json(
          {
            error: `Ya existen clientes con los siguientes emails: ${duplicateEmails.join(', ')}`,
            duplicates: duplicateEmails,
          },
          { status: 409 }
        )
      }
    }

    logger.info('No duplicates found, creating customers')

    // Crear clientes en batch usando transaction
    const created = await prisma.$transaction(
      validatedCustomers.map((customer) =>
        prisma.customer.create({
          data: {
            name: customer.name,
            phone: customer.phone,
            email: customer.email || null,
          },
        })
      )
    )

    logger.info(
      {
        imported: created.length,
        customerIds: created.map((c) => c.id),
      },
      'Customers imported successfully'
    )

    return NextResponse.json(
      {
        success: true,
        imported: created.length,
        customers: created,
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error({ err: error }, 'Error importing customers')
    return NextResponse.json({ error: 'Error al importar clientes' }, { status: 500 })
  }
})
