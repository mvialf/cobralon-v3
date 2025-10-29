import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Code, Settings, BookOpen, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  return (
    <AppLayout
      pageTitle="Panel Principal"
      pageDescription="Bienvenido a tu aplicación SaaS"
      breadcrumbs={[{ label: 'Panel Principal', href: '/' }]}
    >
      <div className="grid gap-6">
        {/* Hero/Welcome Card */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl">🚀 Bienvenido a tu SaaS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Template profesional construido con Next.js 15, React 19, shadcn/ui y Tailwind CSS v4.
              Layout completo, 50+ componentes UI y sistema de configuración incluidos.
            </p>
            <div>
              <h3 className="font-semibold mb-2">Primeros Pasos:</h3>
              <ol className="space-y-2 list-decimal list-inside text-sm">
                <li>
                  Explora <code className="text-primary">/examples</code> para ver componentes y
                  patrones en acción
                </li>
                <li>
                  Personaliza la navegación en{' '}
                  <code className="text-xs bg-muted px-1 rounded">
                    components/layout/app-sidebar.tsx
                  </code>
                </li>
                <li>
                  Configura tu base de datos en{' '}
                  <code className="text-xs bg-muted px-1 rounded">prisma/schema.prisma</code>
                </li>
                <li>
                  Adapta esta página (
                  <code className="text-xs bg-muted px-1 rounded">app/page.tsx</code>) según tu
                  proyecto
                </li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Ejemplos Card */}
          <Card>
            <CardHeader>
              <Code className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Ejemplos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Catálogo de componentes, formularios y patrones listos para usar
              </p>
              <Link
                href="/examples"
                className="text-sm text-primary flex items-center hover:underline"
              >
                Ver ejemplos <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </CardContent>
          </Card>

          {/* Configuración Card */}
          <Card>
            <CardHeader>
              <Settings className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Configuración</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Personaliza tu perfil, tema y preferencias de la aplicación
              </p>
              <Link
                href="/settings"
                className="text-sm text-primary flex items-center hover:underline"
              >
                Ir a configuración <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </CardContent>
          </Card>

          {/* Documentación Card */}
          <Card>
            <CardHeader>
              <BookOpen className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Documentación</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Guías de arquitectura, patrones y decisiones técnicas
              </p>
              <a
                href="/docs/template"
                className="text-sm text-primary flex items-center hover:underline"
              >
                Leer documentación <ArrowRight className="ml-1 h-4 w-4" />
              </a>
            </CardContent>
          </Card>
        </div>

        {/* Stack Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Stack Tecnológico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-semibold mb-1">Frontend</div>
                <div className="text-muted-foreground">Next.js 15, React 19</div>
              </div>
              <div>
                <div className="font-semibold mb-1">UI</div>
                <div className="text-muted-foreground">shadcn/ui, Tailwind v4</div>
              </div>
              <div>
                <div className="font-semibold mb-1">Database</div>
                <div className="text-muted-foreground">Prisma + PostgreSQL</div>
              </div>
              <div>
                <div className="font-semibold mb-1">Validación</div>
                <div className="text-muted-foreground">Zod + React Hook Form</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
