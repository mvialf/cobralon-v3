import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createApiError, handleMutationError } from '@/lib/errors'
import { useDebounce } from '@/hooks/use-debounce'

/**
 * Hooks de React Query para Customers
 *
 * Convenciones:
 * - Query keys: ['customers'] para list, ['customers', id] para single
 * - Mutations invalidan queries relacionadas automáticamente
 * - Delete usa optimistic updates para UX más rápida
 *
 * IMPORTANTE:
 * - Customer tiene validación de email único (backend retorna 409 en duplicados)
 * - Phone es campo obligatorio
 * - Email es opcional pero validado si se proporciona
 */

// ============================================================================
// TYPES
// ============================================================================

/** Customer básico */
export interface Customer {
  id: string
  name: string
  email: string | null
  phone: string
  creditBalance: number
  totalProjects: number
  activeProjects: number
  createdAt: Date
  updatedAt: Date
}

/** Customer simplificado para combobox */
export interface CustomerListItem {
  id: string
  name: string
  phone: string
}

/** Params para GET /api/customers */
export interface CustomersQueryParams {
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  withPendingBalance?: boolean
}

/** Respuesta de GET /api/customers */
export interface CustomersResponse {
  customers: Customer[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/** Respuesta de GET /api/customers/list */
export interface CustomersListResponse {
  customers: CustomerListItem[]
}

/** Datos para POST /api/customers */
export interface CreateCustomerData {
  name: string
  phone: string
  email?: string
}

/** Datos para PUT /api/customers/[id] */
export interface UpdateCustomerData {
  id: string
  name?: string
  phone?: string
  email?: string | null
}

// ============================================================================
// QUERY: GET LIST
// ============================================================================

/**
 * Hook para obtener lista de clientes con paginación y búsqueda
 *
 * @param params - Filtros opcionales
 * @param params.page - Número de página (default: 1)
 * @param params.limit - Registros por página (default: 10, max: 100)
 * @param params.search - Búsqueda por nombre, email o teléfono
 *
 * @returns Query con customers y paginación
 *
 * **OPTIMIZACIONES:**
 * - `placeholderData: keepPreviousData` → Smooth transitions entre páginas (mantiene datos anteriores mientras carga)
 * - Cache de 1 minuto → Balance entre frescura y performance
 * - Query keys por página → Cada página se cachea individualmente
 *
 * @example
 * ```tsx
 * const { data, isLoading, isPlaceholderData } = useCustomers({
 *   page: 1,
 *   limit: 20,
 *   search: 'Juan'
 * })
 *
 * // Prefetch página siguiente para mejor UX
 * const queryClient = useQueryClient()
 * queryClient.prefetchQuery({
 *   queryKey: ['customers', { ...params, page: params.page + 1 }],
 *   queryFn: () => fetchCustomers({ ...params, page: params.page + 1 })
 * })
 * ```
 */
export function useCustomers(params: CustomersQueryParams = {}) {
  return useQuery({
    queryKey: ['customers', params],
    queryFn: async (): Promise<CustomersResponse> => {
      const searchParams = new URLSearchParams()

      if (params.page) searchParams.set('page', String(params.page))
      if (params.limit) searchParams.set('limit', String(params.limit))
      if (params.search) searchParams.set('search', params.search)
      if (params.sortBy) searchParams.set('sortBy', params.sortBy)
      if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder)
      if (params.withPendingBalance) searchParams.set('withPendingBalance', 'true')

      const response = await fetch(`/api/customers?${searchParams}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al cargar clientes')
      }

      return response.json()
    },
    placeholderData: keepPreviousData, // ← Mantener datos anteriores durante transición
    staleTime: 60 * 1000, // 1 minuto - datos cambian ocasionalmente
    gcTime: 5 * 60 * 1000, // 5 minutos en cache
  })
}

// ============================================================================
// QUERY: GET SIMPLE LIST (para combobox)
// ============================================================================

/**
 * Hook para obtener lista simple de clientes (solo id, name, phone)
 * Optimizado para uso en combobox y formularios
 *
 * @returns Query con lista simplificada de customers
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useCustomersList()
 * const customers = data?.customers || []
 * ```
 */
export function useCustomersList() {
  return useQuery({
    queryKey: ['customers-list'],
    queryFn: async (): Promise<CustomersListResponse> => {
      const response = await fetch('/api/customers/list')

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al cargar lista de clientes')
      }

      return response.json()
    },
    staleTime: 2 * 60 * 1000, // 2 minutos - data relativamente estable
    gcTime: 10 * 60 * 1000, // 10 minutos en cache
  })
}

// ============================================================================
// QUERY: GET SINGLE
// ============================================================================

/**
 * Hook para obtener un cliente específico por ID
 *
 * @param id - UUID del cliente
 *
 * @returns Query con customer individual
 *
 * **ENABLED:** Solo se ejecuta si `id` está definido
 *
 * @example
 * ```tsx
 * const { data: customer, isLoading } = useCustomer(customerId)
 * ```
 */
export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: ['customers', id],
    queryFn: async (): Promise<Customer> => {
      if (!id) throw new Error('ID de cliente requerido')

      const response = await fetch(`/api/customers/${id}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al cargar cliente')
      }

      return response.json()
    },
    enabled: !!id, // Solo ejecutar si hay ID
    staleTime: 5 * 60 * 1000, // 5 minutos
  })
}

// ============================================================================
// MUTATION: CREATE
// ============================================================================

/**
 * Hook para crear un nuevo cliente
 *
 * **VALIDACIONES BACKEND:**
 * - `name` obligatorio (no vacío)
 * - `phone` obligatorio (no vacío)
 * - `email` opcional pero validado si se proporciona (formato + único)
 *
 * **INVALIDACIONES AUTOMÁTICAS:**
 * - `['customers']` → Refetch lista de clientes
 * - `['customers-list']` → Refetch lista simple (combobox)
 *
 * @returns Mutation object
 *
 * @example
 * ```tsx
 * const createCustomer = useCreateCustomer()
 *
 * const handleSubmit = async (data: CreateCustomerData) => {
 *   try {
 *     await createCustomer.mutateAsync(data)
 *     // Success toast automático
 *   } catch (error) {
 *     // Error toast automático
 *   }
 * }
 * ```
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateCustomerData): Promise<Customer> => {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw await createApiError(response, 'Error al crear cliente')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customers-list'] })
      toast.success('Cliente creado exitosamente')
    },
    onError: (error) => {
      handleMutationError(error, {
        409: 'Este email ya está registrado',
      })
    },
  })
}

// ============================================================================
// MUTATION: UPDATE
// ============================================================================

/**
 * Hook para actualizar un cliente existente
 *
 * **VALIDACIONES BACKEND:**
 * - `phone` no puede estar vacío si se actualiza
 * - `email` validado si se proporciona (formato + único en otros customers)
 *
 * **INVALIDACIONES:**
 * - `['customers']` → Refetch lista
 * - `['customers', id]` → Refetch customer específico
 * - `['customers-list']` → Refetch lista simple
 *
 * @returns Mutation object
 *
 * @example
 * ```tsx
 * const updateCustomer = useUpdateCustomer()
 *
 * updateCustomer.mutate({
 *   id: 'abc-123',
 *   name: 'Nuevo nombre',
 *   email: 'nuevo@email.com'
 * })
 * ```
 */
export function useUpdateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateCustomerData): Promise<Customer> => {
      const response = await fetch(`/api/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw await createApiError(response, 'Error al actualizar cliente')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customers-list'] })
      toast.success('Cliente actualizado exitosamente')
    },
    onError: (error) => {
      handleMutationError(error, {
        409: 'Este email ya está registrado por otro cliente',
      })
    },
  })
}

// ============================================================================
// MUTATION: DELETE (con Optimistic Update)
// ============================================================================

/**
 * Hook para eliminar un cliente
 *
 * **COMPORTAMIENTO:**
 * - Hard delete (elimina registro completamente de DB)
 * - Optimistic update: Remueve de UI inmediatamente (rollback automático si falla)
 * - ⚠️ **IMPORTANTE:** Si customer tiene projects relacionados, el DELETE puede fallar por constraint
 *
 * **INVALIDACIONES:**
 * - `['customers']` → Refetch lista de clientes
 * - `['customers-list']` → Refetch lista simple
 *
 * @returns Mutation object
 *
 * @example
 * ```tsx
 * const deleteCustomer = useDeleteCustomer()
 *
 * <Button
 *   onClick={() => deleteCustomer.mutate(customer.id)}
 *   disabled={deleteCustomer.isPending && deleteCustomer.variables === customer.id}
 * >
 *   {deleteCustomer.isPending && deleteCustomer.variables === customer.id
 *     ? <Loader2 className="animate-spin" />
 *     : 'Eliminar'}
 * </Button>
 * ```
 */
export function useDeleteCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`/api/customers/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw await createApiError(response, 'Error al eliminar cliente')
      }
    },
    // ✅ Optimistic update: remover del UI inmediatamente
    onMutate: async (id) => {
      // Cancel in-flight queries para evitar override
      await queryClient.cancelQueries({ queryKey: ['customers'] })

      // Snapshot del estado anterior (para rollback si falla)
      const previousData = queryClient.getQueryData(['customers'])

      // Optimistic update: remover customer de todas las queries
      queryClient.setQueriesData<CustomersResponse>({ queryKey: ['customers'] }, (old) => {
        if (!old) return old
        return {
          ...old,
          customers: old.customers.filter((c) => c.id !== id),
          pagination: {
            ...old.pagination,
            total: old.pagination.total - 1,
          },
        }
      })

      return { previousData }
    },
    onError: (error, _id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['customers'], context.previousData)
      }
      handleMutationError(error)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customers-list'] })
      toast.success('Cliente eliminado exitosamente')
    },
  })
}

// ============================================================================
// QUERY: CHECK DUPLICATE
// ============================================================================

/** Respuesta de GET /api/customers/check-duplicate */
export interface DuplicateCustomerMatch {
  id: string
  name: string
  phone: string
}

/**
 * Hook para verificar si ya existe un cliente con nombre similar.
 * Aplica debounce de 500ms y solo busca con >= 4 caracteres.
 *
 * @param name - Nombre a verificar
 * @param excludeId - ID a excluir (para edición)
 * @returns Query con lista de clientes similares
 */
export function useCheckDuplicateCustomer(name: string, excludeId?: string) {
  const debouncedName = useDebounce(name, 500)

  return useQuery({
    queryKey: ['customers-check-duplicate', debouncedName, excludeId],
    queryFn: async (): Promise<DuplicateCustomerMatch[]> => {
      const params = new URLSearchParams({ name: debouncedName })
      if (excludeId) params.set('excludeId', excludeId)

      const response = await fetch(`/api/customers/check-duplicate?${params}`)

      if (!response.ok) return []

      const data = await response.json()
      return data.customers
    },
    enabled: debouncedName.length >= 4,
    staleTime: 30 * 1000,
  })
}
