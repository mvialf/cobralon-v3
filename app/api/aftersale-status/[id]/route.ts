import {
  STATUS_CONFIGS,
  createStatusUpdateHandler,
  createStatusDeleteHandler,
} from '@/lib/api/status-route-factory'

const config = STATUS_CONFIGS.aftersale

export const PUT = createStatusUpdateHandler(config)
export const DELETE = createStatusDeleteHandler(config)
