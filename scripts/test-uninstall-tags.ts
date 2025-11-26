import { prisma } from '@/lib/db'

async function test() {
  console.log('Testing UninstallTags M:M relation...\n')

  // 1. Check if tags exist
  const tags = await prisma.uninstallTag.findMany({ take: 2 })
  console.log(`1. Found ${tags.length} UninstallTags in DB`)

  // 2. Test reading a project with uninstallTags relation
  const project = await prisma.project.findFirst({
    include: {
      uninstallTags: {
        include: {
          uninstallTag: {
            include: { color: true },
          },
        },
      },
    },
  })

  if (project) {
    console.log(`2. Project "${project.projectNumber}" has:`)
    console.log(`   - ${project.uninstallTags.length} tags via M:M relation`)
  } else {
    console.log('2. No projects found in DB')
  }

  // 3. Test the query used in calendar-events
  const events = await prisma.projectEvent.findMany({
    take: 1,
    include: {
      project: {
        include: {
          uninstallTags: {
            include: {
              uninstallTag: {
                include: { color: true },
              },
            },
          },
        },
      },
    },
  })

  console.log(`3. Found ${events.length} ProjectEvents`)
  if (events.length > 0) {
    const tagCount = events[0].project.uninstallTags.length
    console.log(`   First event's project has ${tagCount} tags via M:M`)
  }

  // 4. Test pivot table
  const pivotCount = await prisma.projectUninstallTag.count()
  console.log(`4. ProjectUninstallTag pivot table has ${pivotCount} rows`)

  console.log('\n✅ All M:M relation queries work correctly!')
}

test()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
