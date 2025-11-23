import { prisma } from '../lib/db'

async function testCalendarAPI() {
  try {
    console.log('Testing calendar API...')

    const start = new Date('2025-11-17T03:00:00.000Z')
    const end = new Date('2025-11-24T02:59:59.999Z')

    console.log('Fetching ProjectEvents...')
    console.log('Start:', start)
    console.log('End:', end)

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

    console.log('✅ Success! Found', projectEvents.length, 'events')
    console.log('Events:', JSON.stringify(projectEvents, null, 2))

    // Check if there are ANY events in the database
    const totalEvents = await prisma.projectEvent.count()
    console.log('\nTotal ProjectEvents in DB:', totalEvents)
  } catch (error) {
    console.error('❌ Error:', error)
    if (error instanceof Error) {
      console.error('Message:', error.message)
      console.error('Stack:', error.stack)
    }
  } finally {
    await prisma.$disconnect()
  }
}

testCalendarAPI()
