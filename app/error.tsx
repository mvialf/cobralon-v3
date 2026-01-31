'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Error boundary caught:', error)
  }, [error])

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Algo salió mal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Ocurrió un error inesperado. Puedes intentar recargar la página.
          </p>
          {error.digest && (
            <p className="text-muted-foreground text-xs font-mono">Código: {error.digest}</p>
          )}
          <Button onClick={reset}>Reintentar</Button>
        </CardContent>
      </Card>
    </div>
  )
}
