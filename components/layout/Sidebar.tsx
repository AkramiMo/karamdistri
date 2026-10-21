'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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
  History,
  CreditCard,
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
  History,
  CreditCard,
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
const achatsChildCodes = ['fournisseurs', 'fournitures', 'achats', 'receptions', 'lots', 'stat-br']
const achatsChildLabels: Record<string, string> = {
  fournisseurs: 'Fournisseurs',
  fournitures: 'Fournitures',
  achats: 'Bon de Commande',
  receptions: 'Réception',
  lots: 'Lots',
  'stat-br': 'Stat-BR',
}

// ===== GROUPE LIVRAISONS =====
const livraisonsChildCodes = ['livraisons', 'tournees', 'rblt', 'fiches-trajet', 'suivi-livraisons']
const livraisonsChildLabels: Record<string, string> = {
  livraisons: 'BL - Bon de Livraison',
  tournees: 'BLT - Tournée de Livraison',
  rblt: 'RBLT - Retour Tournée',
  'fiches-trajet': 'FT - Fiche de Trajet',
  'suivi-livraisons': 'Suivi Livraisons',
}

// ===== GROUPE VENTES =====
const ventesChildCodes = ['ventes', 'articles-vendus', 'ventes-kg']
const ventesChildLabels: Record<string, string> = {
  ventes: 'Ventes',
  'articles-vendus': 'Articles Vendus',
  'ventes-kg': 'Ventes en Kg',
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

// ===== GROUPE CLIENTS =====
const clientsChildCodes = ['clients', 'dette']
const clientsChildLabels: Record<string, string> = {
  clients: 'Clients',
  dette: 'Dette Clients',
}

// Tous les codes regroupés
const allGroupedCodes = [
  ...achatsChildCodes,
  ...livraisonsChildCodes,
  ...ventesChildCodes,
  ...caisseChildCodes,
  ...articlesChildCodes,
  ...clientsChildCodes,
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [modules, setModules] = useState<Module[]>([])
  const [achatsOpen, setAchatsOpen] = useState(false)
  const [livraisonsOpen, setLivraisonsOpen] = useState(false)
  const [ventesOpen, setVentesOpen] = useState(false)
  const [caisseOpen, setCaisseOpen] = useState(false)
  const [articlesOpen, setArticlesOpen] = useState(false)
  const [clientsOpen, setClientsOpen] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [consultationOpen, setConsultationOpen] = useState(true)
  const pathname = usePathname()
  const router = useRouter()
  const { canAccessModule, isAdmin } = usePermissions()
  const supabase = createClient()
  const sidebarRef = useRef<HTMLElement>(null)

  // Fermer les groupes déroulés quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setAchatsOpen(false)
        setLivraisonsOpen(false)
        setVentesOpen(false)
        setCaisseOpen(false)
        setArticlesOpen(false)
        setClientsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
    { id: '32', code: 'stat-br', name: 'Stat-BR', icon: 'BarChart3', path: '/stat-br', sort_order: 5 },
    // Stock
    { id: '27', code: 'stocks', name: 'Stock', icon: 'Warehouse', path: '/stocks', sort_order: 5 },
    // Commandes (indépendant)
    { id: '25', code: 'commandes', name: 'Commandes', icon: 'ShoppingCart', path: '/commandes', sort_order: 6 },
    // Livraisons group
    { id: '5', code: 'livraisons', name: 'Livraisons', icon: 'Truck', path: '/livraisons', sort_order: 6 },
    { id: '14', code: 'tournees', name: 'Tournées', icon: 'Route', path: '/tournees', sort_order: 7 },
    { id: '15', code: 'rblt', name: 'Retour Tournée', icon: 'Truck', path: '/rblt', sort_order: 8 },
    { id: '20', code: 'fiches-trajet', name: 'Fiche de Trajet', icon: 'FileText', path: '/fiches-trajet', sort_order: 9 },
    { id: '31', code: 'suivi-livraisons', name: 'Suivi Livraisons', icon: 'PackageSearch', path: '/suivi-livraisons', sort_order: 9 },
    // Ventes group
    { id: '6', code: 'ventes', name: 'Ventes', icon: 'DollarSign', path: '/ventes', sort_order: 10 },
    { id: '16', code: 'articles-vendus', name: 'Articles Vendus', icon: 'FileText', path: '/articles-vendus', sort_order: 11 },
    { id: '30', code: 'ventes-kg', name: 'Ventes en Kg', icon: 'Package', path: '/ventes-kg', sort_order: 12 },
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
    // Clients group
    { id: '2', code: 'clients', name: 'Clients', icon: 'Users', path: '/clients', sort_order: 20 },
    { id: '33', code: 'dette', name: 'Dette Clients', icon: 'CreditCard', path: '/clients/dette', sort_order: 21 },
    // Devis
    { id: '26', code: 'devis', name: 'Devis', icon: 'FileText', path: '/devis', sort_order: 21 },
    // Graphiques
    { id: '28', code: 'graphiques', name: 'Graphiques', icon: 'BarChart3', path: '/graphiques', sort_order: 22 },
    // Historique VALA
    { id: '31', code: 'historique-val', name: 'Historique VALA', icon: 'History', path: '/historique-val', sort_order: 23 },
    // Admin
    { id: '9', code: 'admin', name: 'Administration', icon: 'Settings', path: '/admin', sort_order: 99 },
  ]

  // Toujours utiliser le dashboard par défaut (path: '/dashboard')
  const dashboardDefault = defaultModules.find(m => m.code === 'dashboard')!

  // Si les modules viennent de la DB, remplacer/ajouter le dashboard par défaut
  const displayModules = modules.length > 0
    ? [dashboardDefault, ...modules.filter(m => m.code !== 'dashboard')]
    : defaultModules

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

  const clientsChildren = visibleModules
    .filter(m => clientsChildCodes.includes(m.code))
    .sort((a, b) => clientsChildCodes.indexOf(a.code) - clientsChildCodes.indexOf(b.code))

  // Modules de premier niveau (non groupés)
  const topLevelModules = visibleModules.filter(m =>
    !allGroupedCodes.includes(m.code) &&
    ['dashboard', 'admin', 'commandes', 'devis', 'stocks', 'graphiques', 'historique-val'].includes(m.code)
  )

  // Vérifier si un enfant est actif pour chaque groupe
  const isAchatsChildActive = achatsChildren.some(m => pathname === m.path || (m.path !== '/' && pathname.startsWith(m.path)))
  const isLivraisonsChildActive = livraisonsChildren.some(m => pathname === m.path || (m.path !== '/' && pathname.startsWith(m.path)))
  const isVentesChildActive = ventesChildren.some(m => pathname === m.path || (m.path !== '/' && pathname.startsWith(m.path)))
  const isCaisseChildActive = caisseChildren.some(m => pathname === m.path || (m.path !== '/' && pathname.startsWith(m.path)))
  const isArticlesChildActive = articlesChildren.some(m => pathname === m.path || (m.path !== '/' && pathname.startsWith(m.path)))
  const isClientsChildActive = clientsChildren.some(m => pathname === m.path || (m.path !== '/' && pathname.startsWith(m.path)))

  // Ouvrir automatiquement le groupe actif
  useEffect(() => {
    if (!initialized) {
      if (isAchatsChildActive) setAchatsOpen(true)
      if (isLivraisonsChildActive) setLivraisonsOpen(true)
      if (isVentesChildActive) setVentesOpen(true)
      if (isCaisseChildActive) setCaisseOpen(true)
      if (isArticlesChildActive) setArticlesOpen(true)
      if (isClientsChildActive) setClientsOpen(true)
      setInitialized(true)
    }
  }, [initialized, isAchatsChildActive, isLivraisonsChildActive, isVentesChildActive, isCaisseChildActive, isArticlesChildActive, isClientsChildActive])

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

    const handleGroupClick = () => {
      if (isChildActive) {
        // Si un enfant est actif, retourner au logo
        router.push('/')
        setIsOpen(false)
      } else {
        // Sinon, juste toggle le dropdown
        setIsOpen(!isOpen)
      }
    }

    return (
      <li>
        <button
          onClick={handleGroupClick}
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

              const handleChildClick = (e: React.MouseEvent) => {
                e.preventDefault()
                if (isChildItemActive) {
                  // Si déjà actif, retourner à l'accueil (logo)
                  router.push('/')
                } else {
                  router.push(child.path)
                }
              }

              return (
                <li key={child.id}>
                  <a
                    href={child.path}
                    onClick={handleChildClick}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium cursor-pointer',
                      isChildItemActive
                        ? 'bg-[#B8860B] text-white'
                        : 'text-[#4A3000] hover:bg-[#C4961A] hover:text-white'
                    )}
                  >
                    <ChildIcon size={16} />
                    <span>{labels[child.code] || child.name}</span>
                  </a>
                </li>
              )
            })}
          </ul>
        )}
      </li>
    )
  }

  // Rendre un module simple avec toggle
  const renderModule = (module: Module) => {
    const Icon = iconMap[module.icon || 'Package'] || Package
    const isActive = pathname === module.path || (module.path !== '/' && pathname.startsWith(module.path))

    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault()
      if (isActive) {
        // Si déjà actif, retourner à l'accueil (logo)
        router.push('/')
      } else {
        router.push(module.path)
      }
    }

    return (
      <li key={module.id}>
        <a
          href={module.path}
          onClick={handleClick}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer',
            isActive
              ? 'bg-[#B8860B] text-white'
              : 'text-white hover:bg-[#C4961A]'
          )}
          title={collapsed ? module.name : undefined}
        >
          <Icon size={20} />
          {!collapsed && <span>{module.name}</span>}
        </a>
      </li>
    )
  }

  // Trouver les modules spécifiques
  const dashboardModule = topLevelModules.find(m => m.code === 'dashboard')
  const stocksModule = topLevelModules.find(m => m.code === 'stocks')
  const commandesModule = topLevelModules.find(m => m.code === 'commandes')
  const devisModule = topLevelModules.find(m => m.code === 'devis')
  const graphiquesModule = topLevelModules.find(m => m.code === 'graphiques')
  const historiqueValModule = topLevelModules.find(m => m.code === 'historique-val')
  const adminModule = topLevelModules.find(m => m.code === 'admin')

  return (
    <aside
      ref={sidebarRef}
      className={cn(
        'h-screen bg-[#B8860B] text-white transition-all duration-300 flex flex-col',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo - même hauteur que Header (h-16) */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-[#9A7209]">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <img src="/Logo.png" alt="KARAM" className="w-10 h-10 rounded-full object-cover" />
            <span className="font-semibold">KARAM ERP</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-white hover:bg-[#9A7209]"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </Button>
      </div>

      {/* Titre Consultation - bouton toggle */}
      <button
        onClick={() => setConsultationOpen(!consultationOpen)}
        className="w-full px-4 py-3 bg-[#B8860B] hover:bg-[#9A7209] transition-colors flex items-center justify-between"
      >
        {!collapsed && (
          <span className="font-semibold text-white">Consultation</span>
        )}
        {!collapsed && (
          consultationOpen ? (
            <ChevronDown className="h-4 w-4 text-white" />
          ) : (
            <ChevronRight className="h-4 w-4 text-white" />
          )
        )}
      </button>

      {/* Navigation */}
      {consultationOpen && (
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

            {/* Livraisons */}
            {renderGroup('Livraisons', Truck, livraisonsOpen, setLivraisonsOpen, livraisonsChildren, livraisonsChildLabels, isLivraisonsChildActive)}

            {/* Ventes */}
            {renderGroup('Ventes', DollarSign, ventesOpen, setVentesOpen, ventesChildren, ventesChildLabels, isVentesChildActive)}

            {/* Caisse */}
            {renderGroup('Caisse', Wallet, caisseOpen, setCaisseOpen, caisseChildren, caisseChildLabels, isCaisseChildActive)}

            {/* Articles */}
            {renderGroup('Articles', Package, articlesOpen, setArticlesOpen, articlesChildren, articlesChildLabels, isArticlesChildActive)}

            {/* Clients */}
            {renderGroup('Clients', Users, clientsOpen, setClientsOpen, clientsChildren, clientsChildLabels, isClientsChildActive)}

            {/* Devis */}
            {devisModule && renderModule(devisModule)}

            {/* Graphiques */}
            {graphiquesModule && renderModule(graphiquesModule)}

            {/* Historique VALA */}
            {historiqueValModule && renderModule(historiqueValModule)}

            {/* Admin */}
            {adminModule && renderModule(adminModule)}
          </ul>
        </nav>
      )}

      {/* Footer - toujours visible en bas */}
      {!collapsed && (
        <div className="mt-auto h-16 px-4 flex items-center bg-[#DAA520] text-sm text-white font-medium">
          KARAM Olives & Sauces
        </div>
      )}
    </aside>
  )
}
