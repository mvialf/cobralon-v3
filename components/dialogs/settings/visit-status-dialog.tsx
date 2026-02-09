import { createStatusDialog } from './create-status-dialog'
import { useCreateVisitStatus, useUpdateVisitStatus } from '@/hooks/queries/use-visit-statuses'
import type { VisitStatus } from '@/lib/validations/visit-status-validations'

export const VisitStatusDialog = createStatusDialog<VisitStatus>({
  useCreate: useCreateVisitStatus,
  useUpdate: useUpdateVisitStatus,
  entityLabel: 'visitas',
  placeholder: 'Ej: Agendada',
})
