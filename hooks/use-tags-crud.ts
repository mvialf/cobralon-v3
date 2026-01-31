/**
 * Hook genérico para CRUD de tags con API REST.
 * Parametrizado por endpoint, responseKey y entityLabel.
 */

import { useState, useCallback, useEffect } from 'react'
import type { UninstallTag, TagColor } from '@/components/custom/tag-system/types'

export interface UseTagsCrudConfig {
  endpoint: string // '/api/team-tags' | '/api/uninstall-tags'
  responseKey: string // 'teamTags' | 'uninstallTags'
  entityLabel: string // 'integrante' | 'tag' (para mensajes de error)
}

interface UseTagsCrudOptions {
  initialSelected?: UninstallTag[]
  autoFetch?: boolean
}

export interface UseTagsCrudReturn {
  availableTags: UninstallTag[]
  availableColors: TagColor[]
  selectedTags: UninstallTag[]
  loading: boolean
  error: string | null
  setSelectedTags: (tags: UninstallTag[]) => void
  createTag: (name: string, abbreviation: string, colorId: string) => Promise<void>
  editTag: (tagId: string, name: string, abbreviation: string, colorId: string) => Promise<void>
  deleteTag: (tagId: string) => Promise<void>
  refreshTags: () => Promise<void>
  refreshColors: () => Promise<void>
}

export function useTagsCrud(
  config: UseTagsCrudConfig,
  options: UseTagsCrudOptions = {}
): UseTagsCrudReturn {
  const { endpoint, responseKey, entityLabel } = config
  const { initialSelected = [], autoFetch = true } = options

  const [availableTags, setAvailableTags] = useState<UninstallTag[]>([])
  const [availableColors, setAvailableColors] = useState<TagColor[]>([])
  const [selectedTags, setSelectedTags] = useState<UninstallTag[]>(initialSelected)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshTags = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch(`${endpoint}?includeColor=true`)
      if (!res.ok) throw new Error(`Error al cargar ${entityLabel}s`)

      const data = await res.json()
      setAvailableTags(data[responseKey] || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      console.error(`Error cargando ${entityLabel}s:`, err)
    } finally {
      setLoading(false)
    }
  }, [endpoint, responseKey, entityLabel])

  const refreshColors = useCallback(async () => {
    try {
      const res = await fetch('/api/badge-colors')
      if (!res.ok) throw new Error('Error al cargar colores')

      const data = await res.json()
      setAvailableColors(data.badgeColors || [])
    } catch (err) {
      console.error('Error cargando colores:', err)
    }
  }, [])

  const createTag = useCallback(
    async (name: string, abbreviation: string, colorId: string) => {
      try {
        setError(null)

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, abbreviation, colorId }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || `Error al crear ${entityLabel}`)
        }

        await refreshTags()
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : `Error al crear ${entityLabel}`
        setError(errorMessage)
        throw err
      }
    },
    [endpoint, entityLabel, refreshTags]
  )

  const editTag = useCallback(
    async (tagId: string, name: string, abbreviation: string, colorId: string) => {
      try {
        setError(null)

        const res = await fetch(`${endpoint}/${tagId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, abbreviation, colorId }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || `Error al editar ${entityLabel}`)
        }

        await refreshTags()
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : `Error al editar ${entityLabel}`
        setError(errorMessage)
        throw err
      }
    },
    [endpoint, entityLabel, refreshTags]
  )

  const deleteTag = useCallback(
    async (tagId: string) => {
      try {
        setError(null)

        const res = await fetch(`${endpoint}/${tagId}`, {
          method: 'DELETE',
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || `Error al eliminar ${entityLabel}`)
        }

        setSelectedTags((prev) => prev.filter((t) => t.id !== tagId))
        await refreshTags()
      } catch (err) {
        const msg = err instanceof Error ? err.message : `Error al eliminar ${entityLabel}`
        setError(msg)
        throw err
      }
    },
    [endpoint, entityLabel, refreshTags]
  )

  useEffect(() => {
    if (autoFetch) {
      refreshTags()
      refreshColors()
    }
  }, [autoFetch, refreshTags, refreshColors])

  return {
    availableTags,
    availableColors,
    selectedTags,
    loading,
    error,
    setSelectedTags,
    createTag,
    editTag,
    deleteTag,
    refreshTags,
    refreshColors,
  }
}
