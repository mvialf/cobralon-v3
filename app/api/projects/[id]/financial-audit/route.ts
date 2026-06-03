import { NextResponse } from 'next/server'

import { withApiHandler } from '@/lib/api-handler'
import { getProjectFinancialAudit } from '@/lib/use-cases/projects/get-project-financial-audit'

export const GET = withApiHandler(
  async (_request, logger, { params }) => {
    const audit = await getProjectFinancialAudit(params.id)
    logger.info({ projectId: params.id }, 'Project financial audit fetched successfully')
    return NextResponse.json(audit)
  },
  {
    validateUuidParams: ['id'],
    fallbackError: 'Error al obtener auditoria financiera del proyecto',
  }
)
