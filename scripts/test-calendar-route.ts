/**
 * Test directo de la lógica del endpoint calendar-events
 * para diagnosticar el error 500
 */

import { prisma } from '../lib/db'
import { calendarQuerySchema } from '../lib/validations/calendar-validations'

async function testCalendarRoute() {
  try {
    console.log('🧪 Testing calendar route logic...\n')

    const startParam = '2025-11-17T03:00:00.000Z'
    const endParam = '2025-11-24T02:59:59.999Z'

    // Step 1: Validación
    console.log('Step 1: Validating query params...')
    const validationResult = calendarQuerySchema.safeParse({
      start: startParam,
      end: endParam,
    })

    if (!validationResult.success) {
      console.error('❌ Validation failed:', validationResult.error.errors)
      return
    }
    console.log('✅ Validation passed')

    const { start, end } = validationResult.data
    console.log('Parsed dates:')
    console.log('  start:', start)
    console.log('  end:', end)

    // Step 2: Database query
    console.log('\nStep 2: Querying database...')
    const projectEvents = await prisma.projectEvent.findMany({
      where: {
        scheduledDate: {
          gte: start,
          lte: end,
        },
      },
      include: {
        project: {
          include: {
            customer: true,
            projectStatus: true,
          },
        },
      },
      orderBy: {
        scheduledDate: 'asc',
      },
    })

    console.log(`✅ Found ${projectEvents.length} events`)

    // Step 3: Transform to unified events
    console.log('\nStep 3: Transforming events...')
    const unifiedEvents = projectEvents.map((event) => ({
      type: 'project' as const,
      data: {
        ...event,
        project: {
          ...event.project,
          subtotal: Number(event.project.subtotal),
          taxRate: Number(event.project.taxRate),
          total: Number(event.project.total),
          balance: Number(event.project.balance),
          squareMeters: Number(event.project.squareMeters),
          totalAmount: event.project.totalAmount ? Number(event.project.totalAmount) : null,
          customer: {
            ...event.project.customer,
            creditBalance: Number(event.project.customer.creditBalance),
          },
        },
      },
    }))

    console.log('✅ Transformation successful')

    // Step 4: Test JSON serialization
    console.log('\nStep 4: Testing JSON serialization...')
    const jsonString = JSON.stringify({
      events: unifiedEvents,
      count: unifiedEvents.length,
    })

    console.log('✅ JSON serialization successful')
    console.log(`Response size: ${jsonString.length} bytes`)

    console.log('\n✅ All steps passed! Route should work.')
    console.log('\nResponse preview:')
    console.log(JSON.stringify({ count: unifiedEvents.length }, null, 2))
  } catch (error) {
    console.error('\n❌ Error occurred:', error)
    if (error instanceof Error) {
      console.error('Message:', error.message)
      console.error('Stack:', error.stack)
    }
  } finally {
    await prisma.$disconnect()
  }
}

testCalendarRoute()
