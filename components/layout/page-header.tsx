import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

interface PageHeaderProps {
  title: string
  description?: string
  breadcrumbs?: Array<{
    label: string
    href?: string
  }>
  action?: React.ReactNode
}

export function PageHeader({ title, description, breadcrumbs, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 pb-6">
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((breadcrumb, index) => (
              <div key={index} className="flex items-center">
                <BreadcrumbItem>
                  {breadcrumb.href ? (
                    <BreadcrumbLink href={breadcrumb.href}>{breadcrumb.label}</BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
                {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
              </div>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      )}

      {/* Title, description and action button */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2 flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-balance">{title}</h1>
          {description && <p className="text-muted-foreground text-pretty">{description}</p>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  )
}
