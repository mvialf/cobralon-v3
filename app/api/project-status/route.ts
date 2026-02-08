import {
  STATUS_CONFIGS,
  createStatusListHandler,
  createStatusCreateHandler,
} from '@/lib/api/status-route-factory'

const config = STATUS_CONFIGS.project

export const GET = createStatusListHandler(config)
export const POST = createStatusCreateHandler(config)
