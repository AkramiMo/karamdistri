'use client'

import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { useGlobalDialogs, DialogType } from '@/contexts/GlobalDialogsContext'
import {
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Warehouse,
  ShoppingCart,
  Truck,
  DollarSign,
  Package,
  Users,
  Wallet,
  FileText,
} from 'lucide-react'
import Link from 'next/link'

interface ActionItem {
  label: string
  prefix: string // Nouveau, Nouvelle, Nouvel
  dialogType?: DialogType
  href?: string // Pour les liens de navigation (comme "Voir Dette")
}

interface ActionModule {
  id: string
  label: string
  icon: React.ElementType
  actions: ActionItem[]
}

const modules: ActionModule[] = [
  {
    id: 'achats',
    label: 'Achat',
    icon: ClipboardList,
    actions: [
      { label: 'Fournisseur', prefix: 'Nouveau', href: '/fournisseurs?action=new' },
      { label: 'Fourniture', prefix: 'Nouvelle', href: '/fournitures?action=new' },
      { label: 'Bon Commande', prefix: 'Nouveau', href: '/achats?action=new' },
      { label: 'Réception', prefix: 'Nouvelle', href: '/receptions?action=new' },
      { label: 'Lot', prefix: 'Nouveau', href: '/lots?action=new' },
    ],
  },
  {
    id: 'stocks',
    label: 'Stock',
    icon: Warehouse,
    actions: [
      { label: 'Mouvement', prefix: 'Nouveau', href: '/stocks/articles?action=new' },
    ],
  },
  {
    id: 'commandes',
    label: 'Commandes',
    icon: ShoppingCart,
    actions: [
      { label: 'Commande', prefix: 'Nouvelle', href: '/commandes?action=new' },
    ],
  },
  {
    id: 'livraisons',
    label: 'Livraisons',
    icon: Truck,
    actions: [
      { label: 'BL', prefix: 'Nouveau', href: '/livraisons?action=new' },
      { label: 'Tournée', prefix: 'Nouvelle', href: '/tournees?action=new' },
      { label: 'RBLT', prefix: 'Nouveau', href: '/rblt?action=new' },
    ],
  },
  {
    id: 'ventes',
    label: 'Ventes',
    icon: DollarSign,
    actions: [
      { label: 'Vente', prefix: 'Nouvelle', href: '/ventes?action=new' },
    ],
  },
  {
    id: 'articles',
    label: 'Articles',
    icon: Package,
    actions: [
      { label: 'Article', prefix: 'Nouvel', href: '/articles?action=new' },
      { label: 'Catégorie', prefix: 'Nouvelle', href: '/categories?action=new' },
      { label: 'Emballage', prefix: 'Nouvel', href: '/emballages?action=new' },
      { label: 'Pack', prefix: 'Nouveau', href: '/packs?action=new' },
    ],
  },
  {
    id: 'clients',
    label: 'Clients',
    icon: Users,
    actions: [
      { label: 'Client', prefix: 'Nouveau', href: '/clients?action=new' },
    ],
  },
  {
    id: 'caisse',
    label: 'Caisse',
    icon: Wallet,
    actions: [
      { label: 'Facture', prefix: 'Nouvelle', href: '/factures?action=new' },
      { label: 'Paiement', prefix: 'Nouveau', href: '/paiements?action=new' },
    ],
  },
  {
    id: 'devis',
    label: 'Devis',
    icon: FileText,
    actions: [
      { label: 'Devis', prefix: 'Nouveau', href: '/devis/ddc?action=new' },
    ],
  },
]

export function ActionsBar() {
  const [expandedModule, setExpandedModule] = useState<string | null>(null)
  const [actionsOpen, setActionsOpen] = useState(true)
  const { openDialog } = useGlobalDialogs()
  const barRef = useRef<HTMLDivElement>(null)

  // Fermer le dropdown quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(event.target as Node)) {
        setExpandedModule(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleModule = (moduleId: string) => {
    setExpandedModule(expandedModule === moduleId ? null : moduleId)
  }

  const handleActionClick = (action: ActionItem) => {
    if (action.dialogType) {
      openDialog(action.dialogType)
      setExpandedModule(null) // Fermer le dropdown
    }
  }

  return (
    <div ref={barRef} className="bg-[#B8860B] text-white px-4 py-3">
      <div className="flex items-center gap-1 flex-wrap">
        <button
          onClick={() => setActionsOpen(!actionsOpen)}
          className="font-semibold mr-3 flex items-center gap-1 hover:bg-[#9A7209] px-3 py-1 rounded transition-colors"
        >
          Actions
          {actionsOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {actionsOpen && modules.map((module) => {
          const Icon = module.icon
          const isExpanded = expandedModule === module.id

          return (
            <div key={module.id} className="relative">
              <button
                onClick={() => toggleModule(module.id)}
                className={cn(
                  'flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors',
                  isExpanded
                    ? 'bg-[#9A7209] text-white'
                    : 'hover:bg-[#9A7209]/50 text-white/90'
                )}
              >
                <Icon className="h-4 w-4" />
                {module.label}
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>

              {/* Dropdown des actions */}
              {isExpanded && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border z-50 min-w-[200px]">
                  {module.actions.map((action, idx) => (
                    action.href ? (
                      <Link
                        key={idx}
                        href={action.href}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg"
                        onClick={() => setExpandedModule(null)}
                      >
                        <span className="text-[#B8860B] font-medium">{action.prefix}</span>
                        {action.label}
                      </Link>
                    ) : (
                      <button
                        key={idx}
                        onClick={() => handleActionClick(action)}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg"
                      >
                        <span className="text-[#B8860B] font-medium">{action.prefix}</span>
                        {action.label}
                      </button>
                    )
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
