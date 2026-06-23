'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ProtectedModule } from '@/components/auth/ProtectedModule'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { AlertTriangle, Trash2, RefreshCw, CheckCircle2, XCircle, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface TableInfo {
  name: string
  displayName: string
  description: string
  count: number
  level: number // Niveau de dépendance (1 = enfant, plus élevé = parent)
  category: 'transaction' | 'master' | 'system'
}

// Tables organisées par niveau de dépendance (supprimer niveau 1 en premier)
const TABLE_CONFIG: Omit<TableInfo, 'count'>[] = [
  // Niveau 1 - Tables enfants (lignes de documents)
  { name: 'client_quote_request_items', displayName: 'Lignes devis clients', description: 'Lignes des demandes de devis', level: 1, category: 'transaction' },
  { name: 'supplier_quote_response_items', displayName: 'Lignes réponses fournisseurs', description: 'Lignes des réponses devis', level: 1, category: 'transaction' },
  { name: 'supplier_quote_request_items', displayName: 'Lignes devis fournisseurs', description: 'Lignes des demandes devis fournisseurs', level: 1, category: 'transaction' },
  { name: 'delivery_return_items', displayName: 'Lignes retours', description: 'Articles retournés', level: 1, category: 'transaction' },
  { name: 'delivery_items', displayName: 'Lignes livraison', description: 'Articles des bons de livraison', level: 1, category: 'transaction' },
  { name: 'delivery_round_items', displayName: 'Lignes tournées', description: 'Livraisons par tournée', level: 1, category: 'transaction' },
  { name: 'order_items', displayName: 'Lignes commande', description: 'Articles des commandes', level: 1, category: 'transaction' },
  { name: 'purchase_order_items', displayName: 'Lignes BC fournisseur', description: 'Articles des bons de commande', level: 1, category: 'transaction' },
  { name: 'reception_items', displayName: 'Lignes réception', description: 'Articles des réceptions', level: 1, category: 'transaction' },
  { name: 'stock_movements', displayName: 'Mouvements stock', description: 'Historique des mouvements', level: 1, category: 'transaction' },
  { name: 'supply_stock_movements', displayName: 'Mouvements fournitures', description: 'Mouvements stock fournitures', level: 1, category: 'transaction' },
  { name: 'cash_register', displayName: 'Mouvements caisse', description: 'Entrées/sorties de caisse', level: 1, category: 'transaction' },
  { name: 'payments', displayName: 'Paiements', description: 'Paiements clients', level: 1, category: 'transaction' },
  { name: 'articles_vendus', displayName: 'Articles vendus', description: 'Historique ventes articles', level: 1, category: 'transaction' },
  { name: 'client_prices', displayName: 'Prix clients', description: 'Prix spéciaux par client', level: 1, category: 'transaction' },

  // Niveau 2 - Documents dépendants
  { name: 'fiches_trajet', displayName: 'Fiches trajet', description: 'Fiches de tournée', level: 2, category: 'transaction' },
  { name: 'delivery_returns', displayName: 'Retours livraison', description: 'Bons de retour', level: 2, category: 'transaction' },
  { name: 'delivery_rounds', displayName: 'Tournées', description: 'Tournées de livraison', level: 2, category: 'transaction' },
  { name: 'client_quote_requests', displayName: 'Devis clients', description: 'Demandes de devis', level: 2, category: 'transaction' },
  { name: 'supplier_quote_responses', displayName: 'Réponses fournisseurs', description: 'Réponses aux devis', level: 2, category: 'transaction' },
  { name: 'supplier_quote_requests', displayName: 'Devis fournisseurs', description: 'Demandes devis fournisseurs', level: 2, category: 'transaction' },
  { name: 'sales', displayName: 'Ventes', description: 'Enregistrements de ventes', level: 2, category: 'transaction' },
  { name: 'factures', displayName: 'Factures', description: 'Factures clients', level: 2, category: 'transaction' },
  { name: 'lots', displayName: 'Lots', description: 'Lots de produits (olives)', level: 2, category: 'transaction' },
  { name: 'stock', displayName: 'Stock', description: 'Quantités en stock', level: 2, category: 'transaction' },
  { name: 'supply_stock', displayName: 'Stock fournitures', description: 'Stock des fournitures', level: 2, category: 'transaction' },

  // Niveau 3 - Documents principaux
  { name: 'deliveries', displayName: 'Livraisons', description: 'Bons de livraison', level: 3, category: 'transaction' },
  { name: 'receptions', displayName: 'Réceptions', description: 'Bons de réception', level: 3, category: 'transaction' },

  // Niveau 4 - Commandes
  { name: 'orders', displayName: 'Commandes', description: 'Commandes clients', level: 4, category: 'transaction' },
  { name: 'purchase_orders', displayName: 'BC Fournisseurs', description: 'Bons de commande fournisseurs', level: 4, category: 'transaction' },

  // Niveau 5 - Données maîtres
  { name: 'articles', displayName: 'Articles', description: 'Catalogue produits', level: 5, category: 'master' },
  { name: 'clients', displayName: 'Clients', description: 'Fichier clients', level: 5, category: 'master' },
  { name: 'suppliers', displayName: 'Fournisseurs', description: 'Fichier fournisseurs', level: 5, category: 'master' },
  { name: 'supplies', displayName: 'Fournitures', description: 'Liste des fournitures', level: 5, category: 'master' },
  { name: 'packs', displayName: 'Packs', description: 'Packs produits', level: 5, category: 'master' },
  { name: 'emballages', displayName: 'Emballages (new)', description: 'Emballages consignés', level: 5, category: 'master' },

  // Niveau 6 - Références
  { name: 'categories', displayName: 'Catégories', description: 'Catégories de produits', level: 6, category: 'master' },
  { name: 'packagings', displayName: 'Emballages', description: 'Types d\'emballages', level: 6, category: 'master' },
  { name: 'supply_categories', displayName: 'Catégories fournitures', description: 'Catégories de fournitures', level: 6, category: 'master' },
]

export default function InitializationPage() {
  const [tables, setTables] = useState<TableInfo[]>([])
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteProgress, setDeleteProgress] = useState<{ current: string; completed: string[]; failed: string[] }>({
    current: '',
    completed: [],
    failed: [],
  })
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const supabase = createClient()

  // Charger les compteurs
  useEffect(() => {
    const fetchCounts = async () => {
      setIsLoading(true)
      const results: TableInfo[] = []

      for (const config of TABLE_CONFIG) {
        try {
          const { count } = await supabase
            .from(config.name)
            .select('*', { count: 'exact', head: true })

          results.push({
            ...config,
            count: count || 0,
          })
        } catch {
          results.push({
            ...config,
            count: 0,
          })
        }
      }

      setTables(results)
      setIsLoading(false)
    }

    fetchCounts()
  }, [supabase])

  // Toggle sélection d'une table
  const toggleTable = (tableName: string) => {
    const newSelected = new Set(selectedTables)
    if (newSelected.has(tableName)) {
      newSelected.delete(tableName)
    } else {
      newSelected.add(tableName)
    }
    setSelectedTables(newSelected)
  }

  // Sélectionner toutes les tables transactionnelles
  const selectAllTransactions = () => {
    const transactionTables = tables.filter(t => t.category === 'transaction').map(t => t.name)
    setSelectedTables(new Set(transactionTables))
  }

  // Sélectionner tout
  const selectAll = () => {
    setSelectedTables(new Set(tables.map(t => t.name)))
  }

  // Désélectionner tout
  const deselectAll = () => {
    setSelectedTables(new Set())
  }

  // Supprimer les tables sélectionnées dans l'ordre correct
  const handleDelete = async () => {
    setShowConfirmDialog(false)
    setIsDeleting(true)
    setDeleteProgress({ current: '', completed: [], failed: [] })

    // Trier les tables par niveau (les enfants en premier)
    const tablesToDelete = tables
      .filter(t => selectedTables.has(t.name))
      .sort((a, b) => a.level - b.level)

    const completed: string[] = []
    const failed: string[] = []

    for (const table of tablesToDelete) {
      setDeleteProgress(prev => ({ ...prev, current: table.displayName }))

      try {
        const { error } = await supabase
          .from(table.name)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000') // Supprimer tout

        if (error) throw error
        completed.push(table.name)
      } catch (err) {
        console.error(`Erreur suppression ${table.name}:`, err)
        failed.push(table.name)
      }

      setDeleteProgress({ current: '', completed, failed })
    }

    // Recharger les compteurs
    setIsDeleting(false)
    setSelectedTables(new Set())

    // Refresh counts
    const results: TableInfo[] = []
    for (const config of TABLE_CONFIG) {
      try {
        const { count } = await supabase
          .from(config.name)
          .select('*', { count: 'exact', head: true })
        results.push({ ...config, count: count || 0 })
      } catch {
        results.push({ ...config, count: 0 })
      }
    }
    setTables(results)
  }

  // Grouper les tables par catégorie
  const transactionTables = tables.filter(t => t.category === 'transaction')
  const masterTables = tables.filter(t => t.category === 'master')

  return (
    <ProtectedModule module="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Initialisation des tables</h1>
            <p className="text-gray-500">Vider les tables dans le bon ordre (respect des clés étrangères)</p>
          </div>
        </div>

        {/* Avertissement */}
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-amber-800">Attention - Action irréversible</h3>
                <p className="text-sm text-amber-700 mt-1">
                  Cette action supprimera définitivement toutes les données des tables sélectionnées.
                  Les tables sont automatiquement vidées dans l&apos;ordre correct pour respecter les contraintes
                  de clés étrangères.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions rapides */}
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={selectAllTransactions} disabled={isLoading || isDeleting}>
            Sélectionner transactions
          </Button>
          <Button variant="outline" onClick={selectAll} disabled={isLoading || isDeleting}>
            Tout sélectionner
          </Button>
          <Button variant="outline" onClick={deselectAll} disabled={isLoading || isDeleting}>
            Tout désélectionner
          </Button>
          <Button
            variant="destructive"
            onClick={() => setShowConfirmDialog(true)}
            disabled={isLoading || isDeleting || selectedTables.size === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Vider {selectedTables.size} table(s)
          </Button>
        </div>

        {/* Progression de suppression */}
        {isDeleting && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                <span className="text-blue-800">
                  Suppression en cours: <strong>{deleteProgress.current}</strong>
                </span>
              </div>
              {deleteProgress.completed.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {deleteProgress.completed.map(name => (
                    <span key={name} className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                      <CheckCircle2 className="h-3 w-3" />
                      {tables.find(t => t.name === name)?.displayName}
                    </span>
                  ))}
                </div>
              )}
              {deleteProgress.failed.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {deleteProgress.failed.map(name => (
                    <span key={name} className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded text-sm">
                      <XCircle className="h-3 w-3" />
                      {tables.find(t => t.name === name)?.displayName}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="text-center py-8 text-gray-500">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
            Chargement des tables...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tables transactionnelles */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tables transactionnelles</CardTitle>
                <CardDescription>Documents et mouvements (commandes, livraisons, etc.)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {transactionTables.map(table => (
                    <label
                      key={table.name}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedTables.has(table.name)
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      } ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Checkbox
                        checked={selectedTables.has(table.name)}
                        onCheckedChange={() => toggleTable(table.name)}
                        disabled={isDeleting}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">{table.displayName}</span>
                          <span className={`text-sm font-semibold ${table.count > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                            {table.count}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">{table.description}</p>
                      </div>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                        N{table.level}
                      </span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tables maîtres */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Données de référence</CardTitle>
                <CardDescription>Clients, articles, fournisseurs et catégories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {masterTables.map(table => (
                    <label
                      key={table.name}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedTables.has(table.name)
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      } ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Checkbox
                        checked={selectedTables.has(table.name)}
                        onCheckedChange={() => toggleTable(table.name)}
                        disabled={isDeleting}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">{table.displayName}</span>
                          <span className={`text-sm font-semibold ${table.count > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                            {table.count}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">{table.description}</p>
                      </div>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                        N{table.level}
                      </span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Légende */}
        <Card>
          <CardContent className="pt-6">
            <h4 className="font-medium text-gray-900 mb-2">Ordre de suppression</h4>
            <p className="text-sm text-gray-600">
              Les tables sont supprimées par niveau croissant (N1 → N6) pour respecter les contraintes
              de clés étrangères. Les tables enfants (N1) sont vidées en premier, puis les tables parentes.
            </p>
            <div className="flex gap-4 mt-3 text-xs text-gray-500">
              <span>N1-N2: Lignes de documents</span>
              <span>N3-N4: Documents</span>
              <span>N5-N6: Données maîtres</span>
            </div>
          </CardContent>
        </Card>

        {/* Dialog de confirmation */}
        {showConfirmDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowConfirmDialog(false)} />
            <div className="relative bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-red-600 mb-2">
                <AlertTriangle className="h-5 w-5" />
                Confirmer la suppression
              </h3>
              <div className="text-sm text-gray-600 mb-4">
                <p>
                  Vous êtes sur le point de supprimer toutes les données de {selectedTables.size} table(s).
                  Cette action est <strong className="text-red-600">irréversible</strong>.
                </p>
                <p className="mt-3 font-medium">Tables sélectionnées:</p>
                <ul className="mt-2 list-disc list-inside text-sm max-h-48 overflow-y-auto">
                  {tables
                    .filter(t => selectedTables.has(t.name))
                    .sort((a, b) => a.level - b.level)
                    .map(t => (
                      <li key={t.name}>
                        {t.displayName} ({t.count} enregistrements)
                      </li>
                    ))}
                </ul>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                  Annuler
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  Confirmer la suppression
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedModule>
  )
}
