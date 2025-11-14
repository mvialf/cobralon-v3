'use client'

import { type ParsedCustomer } from '@/lib/excel/customer-parser'
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

interface ImportPreviewTableProps {
  customers: ParsedCustomer[]
  validCount: number
  errorCount: number
}

export function ImportPreviewTable({ customers, validCount, errorCount }: ImportPreviewTableProps) {
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
      <div className="rounded-md border max-h-[400px] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Fila</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-24">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No hay datos para mostrar
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer, index) => (
                <TableRow
                  key={index}
                  className={!customer.isValid ? 'bg-destructive/10' : undefined}
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {customer.rowNumber}
                  </TableCell>
                  <TableCell>
                    {customer.isValid ? (
                      customer.data?.name
                    ) : (
                      <span className="text-muted-foreground italic">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {customer.isValid ? (
                      <code className="text-xs">{customer.data?.phone}</code>
                    ) : (
                      <span className="text-muted-foreground italic">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {customer.isValid ? (
                      customer.data?.email || (
                        <span className="text-muted-foreground italic">-</span>
                      )
                    ) : (
                      <span className="text-muted-foreground italic">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {customer.isValid ? (
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
                        {customer.errors.length > 0 && (
                          <div className="text-xs text-destructive mt-1">
                            {customer.errors.map((error, i) => (
                              <div key={i}>{error}</div>
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
          ? `Se importarán ${validCount} cliente${validCount === 1 ? '' : 's'} válido${validCount === 1 ? '' : 's'}.`
          : 'No hay clientes válidos para importar.'}
      </p>
    </div>
  )
}
