import { createStatusDialog } from './create-status-dialog'
import {
  useCreateAftersaleStatus,
  useUpdateAftersaleStatus,
} from '@/hooks/queries/use-aftersale-statuses'
import type { AftersaleStatus } from '@/lib/validations/aftersale-status-validations'

export const AftersaleStatusDialog = createStatusDialog<AftersaleStatus>({
  useCreate: useCreateAftersaleStatus,
  useUpdate: useUpdateAftersaleStatus,
  entityLabel: 'casos de postventa',
})
