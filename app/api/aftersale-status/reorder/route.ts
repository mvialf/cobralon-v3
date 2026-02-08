import { STATUS_CONFIGS, createStatusReorderHandler } from '@/lib/api/status-route-factory'

const config = STATUS_CONFIGS.aftersale

export const POST = createStatusReorderHandler(config)
