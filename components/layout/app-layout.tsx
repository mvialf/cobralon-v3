'use client'

import type React from 'react'

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from './app-sidebar'
import { PageHeader } from './page-header'

interface AppLayoutProps {
  children: React.ReactNode
  pageTitle?: string
  pageDescription?: string
  breadcrumbs?: Array<{
    label: string
    href?: string
  }>
}

export function AppLayout({
  children,
  pageTitle = 'Dashboard',
  pageDescription,
  breadcrumbs,
}: AppLayoutProps) {
  return (
    <div className="min-h-screen w-full">
      {/* Content area with sidebar */}
      <SidebarProvider>
        <AppSidebar />

        {/* Main content */}
        <SidebarInset>
          <div className="p-6">
            {/* Page header with breadcrumbs */}
            <PageHeader title={pageTitle} description={pageDescription} breadcrumbs={breadcrumbs} />

            {/* Page content */}
            <div className="space-y-6">{children}</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
