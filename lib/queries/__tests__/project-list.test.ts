import { Prisma } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/db'
import { queryProjectList } from '../project-list'

vi.mock('@/lib/db', () => ({
  prisma: { $queryRaw: vi.fn().mockResolvedValue([]) },
}))

describe('Ordenamiento por destacado en SQL', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each(['asc', 'desc'] as const)(
    'debe ordenar por flagStatus en %s antes de paginar',
    async (sortOrder) => {
      await queryProjectList({
        page: 2,
        limit: 50,
        search: '',
        customerId: '',
        statusIds: [],
        filterByNullStatus: false,
        actualStatusIds: [],
        projectState: 'all',
        sortBy: 'flagStatus',
        sortOrder,
      })

      const [strings, ...values] = vi.mocked(prisma.$queryRaw).mock.calls[0]
      const query = Prisma.sql(strings as TemplateStringsArray, ...values)
      expect(query.sql).toMatch(
        new RegExp(
          `ORDER BY p\\."flagStatus" ${sortOrder.toUpperCase()}\\s+LIMIT \\?\\s+OFFSET \\?`
        )
      )
      expect(query.values).toEqual([50, 50])
    }
  )
})
