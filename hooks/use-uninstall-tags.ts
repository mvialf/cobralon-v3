/**
 * Hook para manejo de Uninstall Tags.
 * Wrapper sobre useTagsCrud parametrizado para /api/uninstall-tags.
 */

import type { UninstallTag } from '@/components/custom/tag-system/types'
import { useTagsCrud, type UseTagsCrudReturn } from './use-tags-crud'

interface UseUninstallTagsOptions {
  initialSelected?: UninstallTag[]
  autoFetch?: boolean
}

export function useUninstallTags(options: UseUninstallTagsOptions = {}): UseTagsCrudReturn {
  return useTagsCrud(
    { endpoint: '/api/uninstall-tags', responseKey: 'uninstallTags', entityLabel: 'tag' },
    options
  )
}
