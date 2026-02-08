import {
  STATUS_CONFIGS,
  createStatusUpdateHandler,
  createStatusDeleteHandler,
} from '@/lib/api/status-route-factory'

const config = STATUS_CONFIGS.project

export const PUT = createStatusUpdateHandler(config)
export const DELETE = createStatusDeleteHandler(config)
