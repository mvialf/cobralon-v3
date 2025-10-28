/**
 * Hook para manejo de Team Tags con API REST
 * Adaptado de CalReact useUninstallTags (Firebase → API Routes)
 */

import { useState, useCallback, useEffect } from 'react'
import type { TeamTag, TagColor } from '@/components/custom/tag-system/types'

interface UseTeamTagsOptions {
  initialSelected?: TeamTag[]
  autoFetch?: boolean // Auto-fetch al montar (default: true)
}

interface UseTeamTagsReturn {
  // Estado
  availableTags: TeamTag[]
  availableColors: TagColor[]
  selectedTags: TeamTag[]
  loading: boolean
  error: string | null

  // Setters
  setSelectedTags: (tags: TeamTag[]) => void

  // CRUD Operations
  createTag: (name: string, abbreviation: string, colorId: string) => Promise<void>
  editTag: (tagId: string, name: string, abbreviation: string, colorId: string) => Promise<void>
  deleteTag: (tagId: string) => Promise<void>
  refreshTags: () => Promise<void>
  refreshColors: () => Promise<void>

  // Helpers
  selectTag: (tag: TeamTag) => void
  unselectTag: (tagId: string) => void
  toggleTag: (tag: TeamTag) => void
  isTagSelected: (tagId: string) => boolean
  clearSelectedTags: () => void
}

export function useTeamTags(options: UseTeamTagsOptions = {}): UseTeamTagsReturn {
  const { initialSelected = [], autoFetch = true } = options

  const [availableTags, setAvailableTags] = useState<TeamTag[]>([])
  const [availableColors, setAvailableColors] = useState<TagColor[]>([])
  const [selectedTags, setSelectedTags] = useState<TeamTag[]>(initialSelected)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch team tags desde API
  const refreshTags = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch('/api/team-tags?includeColor=true')
      if (!res.ok) throw new Error('Error al cargar team tags')

      const data = await res.json()
      setAvailableTags(data.teamTags || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      console.error('Error cargando team tags:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch colores desde API
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

  // Create tag
  const createTag = useCallback(
    async (name: string, abbreviation: string, colorId: string) => {
      try {
        setError(null)

        const res = await fetch('/api/team-tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, abbreviation, colorId }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Error al crear tag')
        }

        await refreshTags()
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error al crear tag'
        setError(errorMessage)
        throw err
      }
    },
    [refreshTags]
  )

  // Edit tag
  const editTag = useCallback(
    async (tagId: string, name: string, abbreviation: string, colorId: string) => {
      try {
        setError(null)

        const res = await fetch(`/api/team-tags/${tagId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, abbreviation, colorId }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Error al editar tag')
        }

        await refreshTags()
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error al editar tag'
        setError(errorMessage)
        throw err
      }
    },
    [refreshTags]
  )

  // Delete tag
  const deleteTag = useCallback(
    async (tagId: string) => {
      try {
        setError(null)

        const res = await fetch(`/api/team-tags/${tagId}`, {
          method: 'DELETE',
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Error al eliminar tag')
        }

        // Remover de seleccionadas si estaba seleccionada
        setSelectedTags((prev) => prev.filter((t) => t.id !== tagId))

        await refreshTags()
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error al eliminar tag'
        setError(errorMessage)
        throw err
      }
    },
    [refreshTags]
  )

  // Selection helpers
  const selectTag = useCallback((tag: TeamTag) => {
    setSelectedTags((prev) => {
      if (prev.some((t) => t.id === tag.id)) return prev
      return [...prev, tag]
    })
  }, [])

  const unselectTag = useCallback((tagId: string) => {
    setSelectedTags((prev) => prev.filter((t) => t.id !== tagId))
  }, [])

  const toggleTag = useCallback((tag: TeamTag) => {
    setSelectedTags((prev) => {
      const isSelected = prev.some((t) => t.id === tag.id)
      if (isSelected) {
        return prev.filter((t) => t.id !== tag.id)
      } else {
        return [...prev, tag]
      }
    })
  }, [])

  const isTagSelected = useCallback(
    (tagId: string) => {
      return selectedTags.some((t) => t.id === tagId)
    },
    [selectedTags]
  )

  const clearSelectedTags = useCallback(() => {
    setSelectedTags([])
  }, [])

  // Auto-fetch al montar
  useEffect(() => {
    if (autoFetch) {
      refreshTags()
      refreshColors()
    }
  }, [autoFetch, refreshTags, refreshColors])

  return {
    // Estado
    availableTags,
    availableColors,
    selectedTags,
    loading,
    error,

    // Setters
    setSelectedTags,

    // CRUD
    createTag,
    editTag,
    deleteTag,
    refreshTags,
    refreshColors,

    // Helpers
    selectTag,
    unselectTag,
    toggleTag,
    isTagSelected,
    clearSelectedTags,
  }
}
