import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { prisma } from '@/lib/db'
import { serialize } from '@/lib/utils/serialize'
import { CustomersPageClient } from './page-client'

/**
 * Obtiene datos iniciales de clientes para SSR
 * El queryKey DEBE coincidir exactamente con useCustomers hook
 */
async function getInitialCustomers() {
  const limit = 50
  const page = 1

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      take: limit,
      skip: 0,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        creditBalance: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.customer.count(),
  ])

  return serialize({
    customers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}

/**
 * Server Component para /customer
 *
 * Pre-carga la primera página de clientes en el servidor,
 * eliminando el "Cargando..." en la primera visita.
 *
 * El cliente (CustomersPageClient) usa los datos hidratados
 * y maneja paginación/búsqueda subsecuente via React Query.
 */
export default async function CustomersPage() {
  const queryClient = new QueryClient()

  // Prefetch con queryKey exacto que usa useCustomers
  await queryClient.prefetchQuery({
    queryKey: ['customers', { page: 1, limit: 50 }],
    queryFn: getInitialCustomers,
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CustomersPageClient />
    </HydrationBoundary>
  )
}
