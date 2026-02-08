import {
  STATUS_CONFIGS,
  createStatusListHandler,
  createStatusCreateHandler,
} from '@/lib/api/status-route-factory'

const config = STATUS_CONFIGS.visit

export const GET = createStatusListHandler(config)
export const POST = createStatusCreateHandler(config)
