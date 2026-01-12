import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { prisma } from '@/lib/db'
import { serialize } from '@/lib/utils/serialize'
import { PaymentsPageClient } from './page-client'

/**
 * Obtiene datos iniciales de pagos para SSR
 * El queryKey DEBE coincidir exactamente con usePayments hook
 *
 * NOTA: No incluimos facets en SSR porque son costosos de calcular
 * y solo se usan cuando el usuario aplica filtros.
 */
async function getInitialPayments() {
  const limit = 50
  const page = 1

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      take: limit,
      skip: 0,
      orderBy: { date: 'desc' },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        paymentMethod: {
          select: {
            id: true,
            name: true,
            icon: true,
          },
        },
        allocations: {
          select: {
            id: true,
            allocatedAmount: true,
            project: {
              select: {
                id: true,
                projectNumber: true,
                projectName: true,
                totalAmount: true,
                currency: true,
              },
            },
          },
          orderBy: {
            project: {
              createdAt: 'asc',
            },
          },
        },
      },
    }),
    prisma.payment.count(),
  ])

  return serialize({
    payments,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    // facets se cargan en cliente cuando se usan filtros
  })
}

/**
 * Server Component para /payments
 *
 * Pre-carga la primera página de pagos en el servidor,
 * eliminando el "Cargando..." en la primera visita.
 *
 * Los facets para filtros se cargan en el cliente bajo demanda.
 */
export default async function PaymentsPage() {
  const queryClient = new QueryClient()

  // Prefetch con queryKey exacto que usa usePayments
  await queryClient.prefetchQuery({
    queryKey: ['payments', { page: 1, limit: 50 }],
    queryFn: getInitialPayments,
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PaymentsPageClient />
    </HydrationBoundary>
  )
}
