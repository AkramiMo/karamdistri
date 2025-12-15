'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { usePermissions } from '@/hooks/usePermissions'
import { cn } from '@/lib/utils'
import {
  Users,
  Package,
  ShoppingCart,
  Truck,
  DollarSign,
  Warehouse,
  Wallet,
  Settings,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  Building2,
  FileText,
  ClipboardList,
  PackageCheck,
  Factory,
  Leaf,
  LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

// Mapping des icônes
const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  Truck,
  DollarSign,
  Warehouse,
  Wallet,
  Settings,
  Building2,
  FileText,
  ClipboardList,
  PackageCheck,
  Factory,
  Leaf,
}

interface Module {
  id: string
  code: string
  name: string
  icon: string | null
  path: string
  sort_order: number
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [modules, setModules] = useState<Module[]>([])
  const pathname = usePathname()
  const { canAccessModule, isAdmin, isLoading } = usePermissions()
  const supabase = createClient()

  useEffect(() => {
    const fetchModules = async () => {
      const { data } = await supabase
        .from('modules')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

      if (data) {
        setModules(data)
      }
    }

    fetchModules()
  }, [supabase])

  // Modules par défaut si la DB n'est pas encore configurée
  const defaultModules: Module[] = [
    { id: '1', code: 'dashboard', name: 'Tableau de bord', icon: 'LayoutDashboard', path: '/dashboard', sort_order: 0 },
    { id: '2', code: 'clients', name: 'Clients', icon: 'Users', path: '/clients', sort_order: 1 },
    { id: '3', code: 'articles', name: 'Articles', icon: 'Package', path: '/articles', sort_order: 2 },
    { id: '4', code: 'commandes', name: 'Commandes', icon: 'ShoppingCart', path: '/commandes', sort_order: 3 },
    { id: '5', code: 'livraisons', name: 'Livraisons', icon: 'Truck', path: '/livraisons', sort_order: 4 },
    { id: '6', code: 'ventes', name: 'Ventes', icon: 'DollarSign', path: '/ventes', sort_order: 5 },
    { id: '7', code: 'stocks', name: 'Stocks', icon: 'Warehouse', path: '/stocks', sort_order: 6 },
    { id: '8', code: 'caisse', name: 'Caisse', icon: 'Wallet', path: '/caisse', sort_order: 7 },
    { id: '10', code: 'fournisseurs', name: 'Fournisseurs', icon: 'Factory', path: '/fournisseurs', sort_order: 8 },
    { id: '13', code: 'fournitures', name: 'Fournitures', icon: 'Leaf', path: '/fournitures', sort_order: 9 },
    { id: '11', code: 'achats', name: 'Bons de Commande', icon: 'ClipboardList', path: '/achats', sort_order: 10 },
    { id: '12', code: 'receptions', name: 'Réceptions', icon: 'PackageCheck', path: '/receptions', sort_order: 11 },
    { id: '9', code: 'admin', name: 'Administration', icon: 'Settings', path: '/admin', sort_order: 99 },
  ]

  const displayModules = modules.length > 0 ? modules : defaultModules

  // Filtrer les modules selon les permissions
  const visibleModules = displayModules.filter((module) => {
    if (isAdmin) return true
    if (module.code === 'dashboard') return true // Dashboard toujours visible
    return canAccessModule(module.code)
  })

  return (
    <aside
      className={cn(
        'h-screen bg-green-800 text-white transition-all duration-300 flex flex-col',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="p-4 flex items-center justify-between border-b border-green-700">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <span className="text-green-800 font-bold text-sm">KARAM</span>
            </div>
            <span className="font-semibold">Gestion ERP</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-white hover:bg-green-700"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {visibleModules.map((module) => {
            const Icon = iconMap[module.icon || 'Package'] || Package
            const isActive = pathname === module.path ||
              (module.path !== '/' && pathname.startsWith(module.path))

            return (
              <li key={module.id}>
                <Link
                  href={module.path}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                    isActive
                      ? 'bg-green-600 text-white'
                      : 'text-green-100 hover:bg-green-700'
                  )}
                  title={collapsed ? module.name : undefined}
                >
                  <Icon size={20} />
                  {!collapsed && <span>{module.name}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-green-700 text-xs text-green-300">
          KARAM Olives & Sauces
        </div>
      )}
    </aside>
  )
}
