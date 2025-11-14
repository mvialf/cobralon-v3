'use client'

import { type ParsedProject } from '@/lib/excel/project-parser'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatCurrency } from '@/lib/format'

interface ImportPreviewTableProps {
  projects: ParsedProject[]
  validCount: number
  errorCount: number
}

export function ImportPreviewTable({ projects, validCount, errorCount }: ImportPreviewTableProps) {
  return (
    <div className="space-y-4">
      {/* Resumen */}
      <div className="flex items-center gap-4">
        <Badge variant="default" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          {validCount} válidos
        </Badge>

        {errorCount > 0 && (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            {errorCount} con errores
          </Badge>
        )}
      </div>

      {/* Alerta si hay errores */}
      {errorCount > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Se encontraron {errorCount} filas con errores. Revisa los detalles y corrige el archivo
            Excel antes de importar, o importa solo los registros válidos.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabla de preview */}
      <div className="rounded-md border max-h-[500px] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Fila</TableHead>
              <TableHead>N° Proyecto</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Comuna</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead className="w-32">Estado Validación</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No hay datos para mostrar
                </TableCell>
              </TableRow>
            ) : (
              projects.map((project, index) => (
                <TableRow
                  key={index}
                  className={!project.isValid ? 'bg-destructive/10' : undefined}
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {project.rowNumber}
                  </TableCell>
                  <TableCell className="font-medium">
                    {project.isValid ? (
                      project.data?.projectNumber
                    ) : (
                      <span className="text-muted-foreground italic">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {project.isValid ? (
                      project.data?.customerName
                    ) : (
                      <span className="text-muted-foreground italic">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {project.isValid ? (
                      project.data?.comuna
                    ) : (
                      <span className="text-muted-foreground italic">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {project.isValid ? (
                      <Badge variant="outline" className="whitespace-nowrap">
                        {project.data?.projectStatusName}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground italic">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {project.isValid ? (
                      <span className="font-mono text-sm">
                        {formatCurrency(project.data?.subtotal || 0)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {project.isValid ? (
                      <Badge variant="default" className="gap-1 whitespace-nowrap">
                        <CheckCircle2 className="h-3 w-3" />
                        Válido
                      </Badge>
                    ) : (
                      <div className="space-y-1">
                        <Badge variant="destructive" className="gap-1 whitespace-nowrap">
                          <XCircle className="h-3 w-3" />
                          Error
                        </Badge>
                        {project.errors.length > 0 && (
                          <div className="text-xs text-destructive mt-1 max-w-xs">
                            {project.errors.map((error, i) => (
                              <div key={i} className="truncate" title={error}>
                                • {error}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mensaje informativo */}
      <p className="text-sm text-muted-foreground">
        {validCount > 0
          ? `Se importarán ${validCount} proyecto${validCount === 1 ? '' : 's'} válido${validCount === 1 ? '' : 's'}.`
          : 'No hay proyectos válidos para importar.'}
      </p>
    </div>
  )
}
