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
  ChevronDown,
  Building2,
  FileText,
  ClipboardList,
  PackageCheck,
  Factory,
  Leaf,
  Route,
  FolderTree,
  LucideIcon,
  Box,
  BarChart3,
  Layers,
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
  Route,
  FolderTree,
  Box,
  BarChart3,
  Layers,
}

interface Module {
  id: string
  code: string
  name: string
  icon: string | null
  path: string
  sort_order: number
}

// ===== GROUPE ACHATS =====
const achatsChildCodes = ['fournisseurs', 'fournitures', 'achats', 'receptions', 'lots']
const achatsChildLabels: Record<string, string> = {
  fournisseurs: 'Fournisseurs',
  fournitures: 'Fournitures',
  achats: 'Bon de Commande',
  receptions: 'Réception',
  lots: 'Lots',
}

// ===== GROUPE LIVRAISONS =====
const livraisonsChildCodes = ['livraisons', 'tournees', 'rblt', 'fiches-trajet']
const livraisonsChildLabels: Record<string, string> = {
  livraisons: 'BL - Bon de Livraison',
  tournees: 'BLT - Tournée de Livraison',
  rblt: 'RBLT - Retour Tournée',
  'fiches-trajet': 'FT - Fiche de Trajet',
}

// ===== GROUPE VENTES =====
const ventesChildCodes = ['ventes', 'articles-vendus']
const ventesChildLabels: Record<string, string> = {
  ventes: 'Ventes',
  'articles-vendus': 'Articles Vendus',
}

// ===== GROUPE CAISSE =====
const caisseChildCodes = ['caisse', 'factures', 'paiements', 'suivi-paiements']
const caisseChildLabels: Record<string, string> = {
  caisse: 'Caisse',
  factures: 'Facture',
  paiements: 'Paiements',
  'suivi-paiements': 'Suivi Paiements',
}

// ===== GROUPE ARTICLES =====
const articlesChildCodes = ['articles', 'categories', 'emballages', 'packs']
const articlesChildLabels: Record<string, string> = {
  articles: 'Articles',
  categories: 'Catégories',
  emballages: 'Emballages',
  packs: 'Packs',
}

// Tous les codes regroupés
const allGroupedCodes = [
  ...achatsChildCodes,
  ...livraisonsChildCodes,
  ...ventesChildCodes,
  ...caisseChildCodes,
  ...articlesChildCodes,
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [modules, setModules] = useState<Module[]>([])
  const [achatsOpen, setAchatsOpen] = useState(false)
  const [livraisonsOpen, setLivraisonsOpen] = useState(false)
  const [ventesOpen, setVentesOpen] = useState(false)
  const [caisseOpen, setCaisseOpen] = useState(false)
  const [articlesOpen, setArticlesOpen] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const pathname = usePathname()
  const { canAccessModule, isAdmin } = usePermissions()
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
    // Achats group
    { id: '10', code: 'fournisseurs', name: 'Fournisseurs', icon: 'Factory', path: '/fournisseurs', sort_order: 1 },
    { id: '13', code: 'fournitures', name: 'Fournitures', icon: 'Leaf', path: '/fournitures', sort_order: 2 },
    { id: '11', code: 'achats', name: 'Bon de Commande', icon: 'ClipboardList', path: '/achats', sort_order: 3 },
    { id: '12', code: 'receptions', name: 'Réception', icon: 'PackageCheck', path: '/receptions', sort_order: 4 },
    { id: '29', code: 'lots', name: 'Lots', icon: 'Layers', path: '/lots', sort_order: 5 },
    // Stock
    { id: '27', code: 'stocks', name: 'Stock', icon: 'Warehouse', path: '/stocks', sort_order: 5 },
    // Commandes (indépendant)
    { id: '25', code: 'commandes', name: 'Commandes', icon: 'ShoppingCart', path: '/commandes', sort_order: 6 },
    // Productions
    { id: '22', code: 'productions', name: 'Productions', icon: 'Factory', path: '/productions', sort_order: 5 },
    // Livraisons group
    { id: '5', code: 'livraisons', name: 'Livraisons', icon: 'Truck', path: '/livraisons', sort_order: 6 },
    { id: '14', code: 'tournees', name: 'Tournées', icon: 'Route', path: '/tournees', sort_order: 7 },
    { id: '15', code: 'rblt', name: 'Retour Tournée', icon: 'Truck', path: '/rblt', sort_order: 8 },
    { id: '20', code: 'fiches-trajet', name: 'Fiche de Trajet', icon: 'FileText', path: '/fiches-trajet', sort_order: 9 },
    // Ventes group
    { id: '6', code: 'ventes', name: 'Ventes', icon: 'DollarSign', path: '/ventes', sort_order: 10 },
    { id: '16', code: 'articles-vendus', name: 'Articles Vendus', icon: 'FileText', path: '/articles-vendus', sort_order: 11 },
    // Caisse group
    { id: '8', code: 'caisse', name: 'Caisse', icon: 'Wallet', path: '/caisse', sort_order: 12 },
    { id: '17', code: 'factures', name: 'Factures', icon: 'FileText', path: '/factures', sort_order: 13 },
    { id: '19', code: 'paiements', name: 'Paiements', icon: 'Wallet', path: '/paiements', sort_order: 14 },
    { id: '18', code: 'suivi-paiements', name: 'Suivi Paiements', icon: 'Wallet', path: '/suivi-paiements', sort_order: 15 },
    // Articles group
    { id: '3', code: 'articles', name: 'Articles', icon: 'Package', path: '/articles', sort_order: 16 },
    { id: '21', code: 'categories', name: 'Catégories', icon: 'FolderTree', path: '/categories', sort_order: 17 },
    { id: '23', code: 'emballages', name: 'Emballages', icon: 'Box', path: '/emballages', sort_order: 18 },
    { id: '24', code: 'packs', name: 'Packs', icon: 'Package', path: '/packs', sort_order: 19 },
    // Clients
    { id: '2', code: 'clients', name: 'Clients', icon: 'Users', path: '/clients', sort_order: 20 },
    // Devis
    { id: '26', code: 'devis', name: 'Devis', icon: 'FileText', path: '/devis', sort_order: 21 },
    // Graphiques
    { id: '28', code: 'graphiques', name: 'Graphiques', icon: 'BarChart3', path: '/graphiques', sort_order: 22 },
    // Admin
    { id: '9', code: 'admin', name: 'Administration', icon: 'Settings', path: '/admin', sort_order: 99 },
  ]

  const displayModules = modules.length > 0 ? modules : defaultModules

  // Filtrer les modules selon les permissions
  const visibleModules = displayModules.filter((module) => {
    if (isAdmin) return true
    if (module.code === 'dashboard') return true
    return canAccessModule(module.code)
  })

  // Séparer les modules par groupe
  const achatsChildren = visibleModules
    .filter(m => achatsChildCodes.includes(m.code))
    .sort((a, b) => achatsChildCodes.indexOf(a.code) - achatsChildCodes.indexOf(b.code))

  const livraisonsChildren = visibleModules
    .filter(m => livraisonsChildCodes.includes(m.code))
    .sort((a, b) => livraisonsChildCodes.indexOf(a.code) - livraisonsChildCodes.indexOf(b.code))

  const ventesChildren = visibleModules
    .filter(m => ventesChildCodes.includes(m.code))
    .sort((a, b) => ventesChildCodes.indexOf(a.code) - ventesChildCodes.indexOf(b.code))

  const caisseChildren = visibleModules
    .filter(m => caisseChildCodes.includes(m.code))
    .sort((a, b) => caisseChildCodes.indexOf(a.code) - caisseChildCodes.indexOf(b.code))

  const articlesChildren = visibleModules
    .filter(m => articlesChildCodes.includes(m.code))
    .sort((a, b) => articlesChildCodes.indexOf(a.code) - articlesChildCodes.indexOf(b.code))

  // Modules de premier niveau (non groupés)
  const topLevelModules = visibleModules.filter(m =>
    !allGroupedCodes.includes(m.code) &&
    ['dashboard', 'productions', 'clients', 'admin', 'commandes', 'devis', 'stocks', 'graphiques'].includes(m.code)
  )

  // Vérifier si un enfant est actif pour chaque groupe
  const isAchatsChildActive = achatsChildren.some(m => pathname === m.path || (m.path !== '/' && pathname.startsWith(m.path)))
  const isLivraisonsChildActive = livraisonsChildren.some(m => pathname === m.path || (m.path !== '/' && pathname.startsWith(m.path)))
  const isVentesChildActive = ventesChildren.some(m => pathname === m.path || (m.path !== '/' && pathname.startsWith(m.path)))
  const isCaisseChildActive = caisseChildren.some(m => pathname === m.path || (m.path !== '/' && pathname.startsWith(m.path)))
  const isArticlesChildActive = articlesChildren.some(m => pathname === m.path || (m.path !== '/' && pathname.startsWith(m.path)))

  // Ouvrir automatiquement le groupe actif
  useEffect(() => {
    if (!initialized) {
      if (isAchatsChildActive) setAchatsOpen(true)
      if (isLivraisonsChildActive) setLivraisonsOpen(true)
      if (isVentesChildActive) setVentesOpen(true)
      if (isCaisseChildActive) setCaisseOpen(true)
      if (isArticlesChildActive) setArticlesOpen(true)
      setInitialized(true)
    }
  }, [initialized, isAchatsChildActive, isLivraisonsChildActive, isVentesChildActive, isCaisseChildActive, isArticlesChildActive])

  // Composant pour rendre un groupe déroulant
  const renderGroup = (
    groupName: string,
    icon: LucideIcon,
    isOpen: boolean,
    setIsOpen: (open: boolean) => void,
    children: Module[],
    labels: Record<string, string>,
    isChildActive: boolean
  ) => {
    if (children.length === 0) return null
    const Icon = icon

    return (
      <li>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
            isChildActive
              ? 'bg-[#B8860B] text-white'
              : 'text-white hover:bg-[#C4961A]'
          )}
          title={collapsed ? groupName : undefined}
        >
          <Icon size={20} />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{groupName}</span>
              <ChevronDown
                size={16}
                className={cn(
                  'transition-transform duration-200',
                  isOpen ? 'rotate-180' : ''
                )}
              />
            </>
          )}
        </button>

        {isOpen && !collapsed && (
          <ul className="ml-4 mt-1 space-y-1 border-l border-[#B8860B] pl-2">
            {children.map((child) => {
              const ChildIcon = iconMap[child.icon || 'Package'] || Package
              const isChildItemActive = pathname === child.path || (child.path !== '/' && pathname.startsWith(child.path))

              return (
                <li key={child.id}>
                  <Link
                    href={child.path}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium',
                      isChildItemActive
                        ? 'bg-[#B8860B] text-white'
                        : 'text-[#4A3000] hover:bg-[#C4961A] hover:text-white'
                    )}
                  >
                    <ChildIcon size={16} />
                    <span>{labels[child.code] || child.name}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </li>
    )
  }

  // Rendre un module simple
  const renderModule = (module: Module) => {
    const Icon = iconMap[module.icon || 'Package'] || Package
    const isActive = pathname === module.path || (module.path !== '/' && pathname.startsWith(module.path))

    return (
      <li key={module.id}>
        <Link
          href={module.path}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
            isActive
              ? 'bg-[#B8860B] text-white'
              : 'text-white hover:bg-[#C4961A]'
          )}
          title={collapsed ? module.name : undefined}
        >
          <Icon size={20} />
          {!collapsed && <span>{module.name}</span>}
        </Link>
      </li>
    )
  }

  // Trouver les modules spécifiques
  const dashboardModule = topLevelModules.find(m => m.code === 'dashboard')
  const stocksModule = topLevelModules.find(m => m.code === 'stocks')
  const commandesModule = topLevelModules.find(m => m.code === 'commandes')
  const productionsModule = topLevelModules.find(m => m.code === 'productions')
  const clientsModule = topLevelModules.find(m => m.code === 'clients')
  const devisModule = topLevelModules.find(m => m.code === 'devis')
  const graphiquesModule = topLevelModules.find(m => m.code === 'graphiques')
  const adminModule = topLevelModules.find(m => m.code === 'admin')

  return (
    <aside
      className={cn(
        'h-screen bg-[#DAA520] text-white transition-all duration-300 flex flex-col',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-[#B8860B]">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <img src="/logo.jpg" alt="KARAM" className="w-10 h-10 rounded-full object-cover" />
            <span className="font-semibold">Gestion ERP</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-white hover:bg-[#B8860B]"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {/* Dashboard */}
          {dashboardModule && renderModule(dashboardModule)}

          {/* Achats */}
          {renderGroup('Achats', ClipboardList, achatsOpen, setAchatsOpen, achatsChildren, achatsChildLabels, isAchatsChildActive)}

          {/* Stock */}
          {stocksModule && renderModule(stocksModule)}

          {/* Commandes */}
          {commandesModule && renderModule(commandesModule)}

          {/* Productions */}
          {productionsModule && renderModule(productionsModule)}

          {/* Livraisons */}
          {renderGroup('Livraisons', Truck, livraisonsOpen, setLivraisonsOpen, livraisonsChildren, livraisonsChildLabels, isLivraisonsChildActive)}

          {/* Ventes */}
          {renderGroup('Ventes', DollarSign, ventesOpen, setVentesOpen, ventesChildren, ventesChildLabels, isVentesChildActive)}

          {/* Caisse */}
          {renderGroup('Caisse', Wallet, caisseOpen, setCaisseOpen, caisseChildren, caisseChildLabels, isCaisseChildActive)}

          {/* Articles */}
          {renderGroup('Articles', Package, articlesOpen, setArticlesOpen, articlesChildren, articlesChildLabels, isArticlesChildActive)}

          {/* Clients */}
          {clientsModule && renderModule(clientsModule)}

          {/* Devis */}
          {devisModule && renderModule(devisModule)}

          {/* Graphiques */}
          {graphiquesModule && renderModule(graphiquesModule)}

          {/* Admin */}
          {adminModule && renderModule(adminModule)}
        </ul>
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="h-16 px-4 flex items-center border-t border-[#B8860B] text-xs text-white">
          KARAM Olives & Sauces
        </div>
      )}
    </aside>
  )
}
