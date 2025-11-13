'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Globe, ListTodo, CreditCard, Headphones } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { cn } from '@/lib/utils'

type SettingsSection = {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const settingsSections: SettingsSection[] = [
  {
    title: 'General',
    href: '/settings/general',
    icon: Globe,
  },
  {
    title: 'Project Status',
    href: '/settings/project-status',
    icon: ListTodo,
  },
  {
    title: 'Aftersale Status',
    href: '/settings/aftersale-status',
    icon: Headphones,
  },
  {
    title: 'Métodos de Pago',
    href: '/settings/payments',
    icon: CreditCard,
  },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <AppLayout
      pageTitle="Configuración"
      breadcrumbs={[{ label: 'Panel Principal', href: '/' }, { label: 'Configuración' }]}
    >
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        {/* Sidebar de secciones */}
        <nav className="flex flex-col gap-2">
          <div className="mb-2">
            <h3 className="mb-2 px-2 text-sm font-semibold">Secciones</h3>
          </div>
          {settingsSections.map((section) => {
            const Icon = section.icon
            const isActive = pathname === section.href

            return (
              <Link
                key={section.href}
                href={section.href}
                className={cn(
                  'flex items-start gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted',
                  isActive && 'bg-muted font-medium'
                )}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex-1">
                  <div className={cn('leading-tight', isActive && 'font-medium')}>
                    {section.title}
                  </div>
                </div>
              </Link>
            )
          })}
        </nav>

        {/* Contenido de la sección */}
        <div className="flex-1">{children}</div>
      </div>
    </AppLayout>
  )
}
