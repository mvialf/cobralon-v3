'use client'

import { useState } from 'react'
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
  Headphones,
  PanelRightOpen,
  PanelRightClose,
  Calendar,
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
  useSidebar,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
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
    title: 'Visitas',
    url: '/visits',
    icon: Calendar,
  },
  {
    title: 'Proyectos',
    url: '/projects',
    icon: FolderKanban,
  },
  {
    title: 'Postventas',
    url: '/aftersales',
    icon: Headphones,
  },
  {
    title: 'Calendario',
    url: '/calendar',
    icon: Calendar,
  },
  {
    title: 'Pagos',
    url: '/payments',
    icon: Wallet,
    items: [
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
        title: 'Estados del Sistema',
        url: '/settings/status-config',
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
  const { state, toggleSidebar, setOpen } = useSidebar()
  const allItems = [...navigationItems, ...settingsItems]
  const [isHovering, setIsHovering] = useState(false)

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

  // Handlers para hover-expand
  const handleMouseEnter = () => {
    if (state === 'collapsed') {
      setIsHovering(true)
      setOpen(true)
    }
  }

  const handleMouseLeave = () => {
    if (isHovering) {
      setIsHovering(false)
      setOpen(false)
    }
  }

  return (
    <Sidebar
      variant="inset"
      collapsible="icon"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
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
                        <div className="relative flex items-center">
                          {/* Área principal: navegable */}
                          <SidebarMenuButton
                            asChild
                            isActive={isItemActive(item)}
                            className="w-full pr-8"
                          >
                            <Link href={item.url}>
                              <item.icon />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuButton>

                          {/* Chevron separado: controla expand/collapse */}
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute right-1 h-8 w-8 p-0 hover:bg-transparent"
                            >
                              <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                              <span className="sr-only">Expandir {item.title}</span>
                            </Button>
                          </CollapsibleTrigger>
                        </div>

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
          <SidebarMenuItem className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="hidden md:flex"
              aria-label="Colapsar sidebar"
            >
              {state === 'expanded' ? (
                <PanelRightClose className="h-4 w-4" />
              ) : (
                <PanelRightOpen className="h-4 w-4" />
              )}
            </Button>
            <ThemeToggle />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
