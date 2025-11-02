'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Settings,
  ChevronUp,
  User2,
  FileText,
  ChevronDown,
  Phone,
  Users,
  FolderKanban,
  Wallet,
  BadgeCheck,
  MessageSquare,
  Table,
  Tags,
} from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ThemeToggle } from './theme-toggle'

type NavigationItem = {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
  items?: NavigationItem[]
}

const navigationItems: NavigationItem[] = [
  {
    title: 'Panel Principal',
    url: '/',
    icon: Home,
  },
  {
    title: 'Clientes',
    url: '/customer',
    icon: Users,
  },
  {
    title: 'Proyectos',
    url: '/projects',
    icon: FolderKanban,
  },
  {
    title: 'Pagos',
    url: '/payments',
    icon: Wallet,
    items: [
      {
        title: 'Todos los Pagos',
        url: '/payments',
        icon: Wallet,
      },
      {
        title: 'Cuotas Comercio',
        url: '/payments/installments',
        icon: BadgeCheck,
      },
    ],
  },
  {
    title: 'Ejemplos',
    url: '/examples',
    icon: FileText,
    items: [
      {
        title: 'DataTable',
        url: '/examples/data-table',
        icon: Table,
      },
      {
        title: 'Regional Inputs',
        url: '/examples/regional-inputs',
        icon: Phone,
      },
      {
        title: 'Dialogs',
        url: '/examples/dialogs',
        icon: MessageSquare,
      },
      {
        title: 'Combobox',
        url: '/examples/combobox',
        icon: ChevronDown,
      },
      {
        title: 'Team Tags',
        url: '/examples/team-tags',
        icon: Tags,
      },
    ],
  },
]

const settingsItems: NavigationItem[] = [
  {
    title: 'Configuración',
    url: '/settings',
    icon: Settings,
    items: [
      {
        title: 'General',
        url: '/settings',
        icon: Settings,
      },
      {
        title: 'Estados de Proyecto',
        url: '/settings/project-status',
        icon: BadgeCheck,
      },
      {
        title: 'Métodos de Pago',
        url: '/settings/payments',
        icon: Wallet,
      },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const allItems = [...navigationItems, ...settingsItems]

  // Helper para determinar si un item está activo
  const isItemActive = (item: NavigationItem): boolean => {
    // Comparar ruta exacta
    if (pathname === item.url) return true

    // Si tiene subitems, verificar si alguno está activo
    if (item.items) {
      return item.items.some((subItem) => pathname === subItem.url)
    }

    return false
  }

  return (
    <Sidebar variant="inset">
      <SidebarHeader className="pt-14">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Home className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Mi Aplicación</span>
                  <span className="text-xs">v1.0.0</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {allItems.map((item) => {
                // Si el item tiene subitems, renderizar como Collapsible
                if (item.items && item.items.length > 0) {
                  return (
                    <Collapsible key={item.title} asChild className="group/collapsible">
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton isActive={isItemActive(item)}>
                            <item.icon />
                            <span>{item.title}</span>
                            <ChevronDown className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.items.map((subItem) => (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton asChild isActive={pathname === subItem.url}>
                                  <Link href={subItem.url}>
                                    <subItem.icon />
                                    <span>{subItem.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  )
                }

                // Item simple sin subitems
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={pathname === item.url}>
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="pb-6">
                  <User2 /> Usuario
                  <ChevronUp className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="w-(--radix-popper-anchor-width)">
                <DropdownMenuItem>
                  <span>Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <span>Cuenta</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <span>Cerrar sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
          <SidebarMenuItem className="flex justify-end">
            <ThemeToggle />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
