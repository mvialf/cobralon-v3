import { toast } from 'sonner'

/**
 * Custom error class para errores de API con status code diferenciado
 *
 * @example
 * ```typescript
 * throw new ApiError('Email ya registrado', 409, 'EMAIL_DUPLICATE')
 * ```
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Helper para crear ApiError desde fetch Response
 *
 * Parsea el JSON del response y extrae error, code y details si existen.
 * Si el response no tiene JSON válido, usa el fallbackMessage.
 *
 * @param response - Fetch Response con error (response.ok === false)
 * @param fallbackMessage - Mensaje por defecto si backend no retorna mensaje
 * @returns Promise<ApiError> con status code y metadata
 *
 * @example
 * ```typescript
 * if (!response.ok) {
 *   throw await createApiError(response, 'Error al crear proyecto')
 * }
 * ```
 */
export async function createApiError(
  response: Response,
  fallbackMessage: string
): Promise<ApiError> {
  let errorData: any = {}

  try {
    errorData = await response.json()
  } catch {
    // Si response no tiene JSON válido, usar fallback
  }

  return new ApiError(
    errorData.error || errorData.message || fallbackMessage,
    response.status,
    errorData.code,
    errorData.details
  )
}

/**
 * Type guard para verificar si error es ApiError
 *
 * @param error - Error desconocido
 * @returns true si error es instancia de ApiError
 *
 * @example
 * ```typescript
 * if (isApiError(error)) {
 *   console.log('Status:', error.statusCode)
 * }
 * ```
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

/**
 * Helper para manejar errores en mutations con mensajes diferenciados por status code
 *
 * Maneja automáticamente:
 * - 409 Conflict → Mensaje custom o error.message
 * - 500+ Server Error → "Error del servidor. Intente más tarde"
 * - 401 Unauthorized → "Sesión expirada" (+ TODO: redirect a login)
 * - Otros ApiError → error.message del backend
 * - Error genérico → error.message (validaciones pre-fetch)
 * - Unknown → "Error inesperado"
 *
 * @param error - Error capturado en onError handler
 * @param customMessages - Mensajes custom opcionales por status code
 *
 * @example
 * ```typescript
 * // En mutation:
 * onError: (error) => {
 *   handleMutationError(error, {
 *     409: 'Este email ya está registrado'
 *   })
 * }
 * ```
 */
export function handleMutationError(
  error: unknown,
  customMessages?: {
    400?: string
    409?: string
    500?: string
    401?: string
  }
) {
  if (error instanceof ApiError) {
    // Errores de API con status code diferenciado
    if (error.statusCode === 400) {
      toast.error(customMessages?.[400] || error.message)
    } else if (error.statusCode === 409) {
      toast.error(customMessages?.[409] || error.message)
    } else if (error.statusCode >= 500) {
      toast.error(customMessages?.[500] || 'Error del servidor. Intente más tarde')
    } else if (error.statusCode === 401) {
      toast.error(customMessages?.[401] || 'Sesión expirada')
      // TODO: Implementar redirect a login cuando haya autenticación
    } else {
      toast.error(error.message)
    }
  } else if (error instanceof Error) {
    // Validaciones pre-fetch y otros errores de cliente
    toast.error(error.message)
  } else {
    // Errores desconocidos (network, etc)
    toast.error('Error inesperado')
  }
}
