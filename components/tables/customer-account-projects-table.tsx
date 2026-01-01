'use client'

import { formatCurrency } from '@/lib/format'

interface ProjectRow {
  projectNumber: string
  projectName: string | null
  totalAmount: number
}

interface CustomerAccountProjectsTableProps {
  projects: ProjectRow[]
  currency: string
}

/**
 * Tabla simple de proyectos seleccionados para estado de cuenta
 *
 * | Proyecto  | Valor      |
 * |-----------|------------|
 * | P-16398   | $500,000   |
 * | P-16399   | $800,000   |
 *
 * Usa estilos CSS capture para consistencia con CaptureDialog
 */
export function CustomerAccountProjectsTable({
  projects,
  currency,
}: CustomerAccountProjectsTableProps) {
  if (projects.length === 0) {
    return (
      <div className="text-capture-foreground text-sm py-4 text-center">
        No hay proyectos seleccionados
      </div>
    )
  }

  return (
    <div className="bg-transparent">
      <div className="text-capture-foreground text-md font-normal pb-2">Proyectos</div>

      <div className="overflow-hidden">
        <table className="w-full border border-capture-border shadow-capture rounded-md">
          <thead className="bg-capture-border">
            <tr className="border-b">
              <th className="py-2 px-4 text-capture-foreground bg-transparent text-left text-sm">
                Proyecto
              </th>
              <th className="w-32 py-2 px-4 text-capture-foreground bg-transparent text-right text-sm">
                Valor
              </th>
            </tr>
          </thead>
          <tbody className="bg-pay-card">
            {projects.map((project) => (
              <tr key={project.projectNumber} className="border-b last:border-b-0">
                <td className="py-2 px-4 text-capture-foreground text-sm">
                  <span className="font-medium">P-{project.projectNumber}</span>
                  {project.projectName && (
                    <span className="text-capture-foreground/70 ml-2">{project.projectName}</span>
                  )}
                </td>
                <td className="py-2 px-4 font-medium text-capture-foreground text-right text-sm">
                  {formatCurrency(project.totalAmount, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
