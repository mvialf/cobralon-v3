/**
 * Hook para manejo de Team Tags.
 * Wrapper sobre useTagsCrud parametrizado para /api/team-tags.
 */

import type { UninstallTag } from '@/components/custom/tag-system/types'
import { useTagsCrud, type UseTagsCrudReturn } from './use-tags-crud'

export type TeamTag = UninstallTag

interface UseTeamTagsOptions {
  initialSelected?: TeamTag[]
  autoFetch?: boolean
}

export function useTeamTags(options: UseTeamTagsOptions = {}): UseTagsCrudReturn {
  return useTagsCrud(
    { endpoint: '/api/team-tags', responseKey: 'teamTags', entityLabel: 'integrante' },
    options
  )
}
