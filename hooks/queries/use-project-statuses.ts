import { createStatusHooks, type StatusBase } from './create-status-hooks'

export type ProjectStatus = StatusBase

const hooks = createStatusHooks<ProjectStatus>({
  queryKey: 'project-statuses',
  endpoint: '/api/project-status',
  responseKey: 'projectStatuses',
  responseSingularKey: 'projectStatus',
  entityLabel: 'Estado',
})

export const useProjectStatuses = hooks.useStatuses
export const useCreateProjectStatus = hooks.useCreateStatus
export const useUpdateProjectStatus = hooks.useUpdateStatus
export const getInitialProjectStatus = hooks.getInitialStatus
export const getProjectStatusById = hooks.getStatusById
