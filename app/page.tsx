import { AppLayout } from '@/components/layout/app-layout'
import { Card } from '@/components/ui/card'

export default function HomePage() {
  return (
    <AppLayout
      pageTitle="Panel Principal"
      pageDescription="Página en construcción"
      breadcrumbs={[{ label: 'Panel Principal', href: '/' }]}
    >
      <div>
        <Card className="p-4">Página en construcción</Card>
      </div>
    </AppLayout>
  )
}
