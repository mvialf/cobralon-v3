import { createStatusHooks, type StatusBase } from './create-status-hooks'

export type VisitStatus = StatusBase

const hooks = createStatusHooks<VisitStatus>({
  queryKey: 'visit-statuses',
  endpoint: '/api/visit-status',
  responseKey: 'visitStatuses',
  responseSingularKey: 'visitStatus',
  entityLabel: 'Estado',
})

export const useVisitStatuses = hooks.useStatuses
export const useCreateVisitStatus = hooks.useCreateStatus
export const useUpdateVisitStatus = hooks.useUpdateStatus
export const getInitialVisitStatus = hooks.getInitialStatus
export const getVisitStatusById = hooks.getStatusById
