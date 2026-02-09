import { createStatusDialog } from './create-status-dialog'
import {
  useCreateProjectStatus,
  useUpdateProjectStatus,
} from '@/hooks/queries/use-project-statuses'
import type { ProjectStatus } from '@/lib/validations/project-status-validations'

export const ProjectStatusDialog = createStatusDialog<ProjectStatus>({
  useCreate: useCreateProjectStatus,
  useUpdate: useUpdateProjectStatus,
  entityLabel: 'proyectos',
})
