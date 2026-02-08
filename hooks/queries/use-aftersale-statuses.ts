import { createStatusHooks, type StatusBase } from './create-status-hooks'

export type AftersaleStatus = StatusBase

const hooks = createStatusHooks<AftersaleStatus>({
  queryKey: 'aftersale-statuses',
  endpoint: '/api/aftersale-status',
  responseKey: 'aftersaleStatuses',
  responseSingularKey: 'aftersaleStatus',
  entityLabel: 'Estado',
})

export const useAftersaleStatuses = hooks.useStatuses
export const useCreateAftersaleStatus = hooks.useCreateStatus
export const useUpdateAftersaleStatus = hooks.useUpdateStatus
export const getInitialAftersaleStatus = hooks.getInitialStatus
export const getAftersaleStatusById = hooks.getStatusById
