'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import { ProtectedModule } from '@/components/auth/ProtectedModule'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Warehouse, AlertTriangle, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Lot {
  id: string
  lot_number: string
  olive_type: string
  state: string
  remaining_quantity_kg: number | null
}

interface StockItem {
  id: string
  article_id: string
  lot_id: string | null
  quantity: number
  warehouse: string
  updated_at: string
  article?: { code: string; name: string; min_stock: number }
  lot?: { lot_number: string; olive_type: string }
}

interface StockMovement {
  id: string
  article_id: string
  lot_id: string | null
  quantity: number
  movement_type: string
  reference_type: string | null
  notes: string | null
  created_at: string
  article?: { code: string; name: string }
  lot?: { lot_number: string }
}

interface Article {
  id: string
  code: string
  name: string
  min_stock: number
}

function StockArticlesPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const isNewOnlyMode = searchParams.get('action') === 'new'
  const [stocks, setStocks] = useState<StockItem[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [lots, setLots] = useState<Lot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const supabase = createClient()

  const [formData, setFormData] = useState({
    article_id: '',
    lot_id: '',
    quantity: '',
    movement_type: 'in',
    reference_type: '',
    notes: '',
  })

  const fetchStocks = async () => {
    setIsLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('stock') as any)
      .select(`
        *,
        article:articles(code, name, min_stock),
        lot:lots(lot_number, olive_type)
      `)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching stocks:', error)
    } else {
      setStocks(data || [])
    }
    setIsLoading(false)
  }

  const fetchMovements = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('stock_movements') as any)
      .select(`
        *,
        article:articles(code, name),
        lot:lots(lot_number)
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    setMovements(data || [])
  }

  const fetchArticles = async () => {
    const { data } = await supabase
      .from('articles')
      .select('id, code, name, min_stock')
      .eq('is_active', true)
      .order('name')
    setArticles(data || [])
  }

  const fetchLots = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('lots') as any)
      .select('id, lot_number, olive_type, state, remaining_quantity_kg')
      .neq('state', 'epuise')
      .eq('is_active', true)
      .order('purchase_date', { ascending: false })
    setLots(data || [])
  }

  useEffect(() => {
    fetchStocks()
    fetchMovements()
    fetchArticles()
    fetchLots()
  }, [])

  const resetForm = () => {
    setFormData({
      article_id: '',
      lot_id: '',
      quantity: '',
      movement_type: 'in',
      reference_type: '',
      notes: '',
    })
  }

  const handleCloseNewOnly = () => {
    router.replace('/')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.article_id || !formData.quantity) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }

    const quantity = parseInt(formData.quantity)
    const lotId = formData.lot_id || null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const movementPayload: Record<string, any> = {
      article_id: formData.article_id,
      quantity: formData.movement_type === 'out' ? -quantity : quantity,
      movement_type: formData.movement_type,
      reference_type: formData.reference_type || null,
      notes: formData.notes || null,
    }
    if (lotId) movementPayload.lot_id = lotId

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('stock_movements') as any).insert([movementPayload])

    if (error) {
      alert('Erreur lors de l\'enregistrement: ' + error.message)
      return
    }

    if (isNewOnlyMode) {
      setShowSuccess(true)
    } else {
      fetchStocks()
      fetchMovements()
      fetchLots()
      setIsDialogOpen(false)
      resetForm()
    }
  }

  const filteredStocks = stocks.filter(
    (stock) =>
      stock.article?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.article?.code?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Calculate stats
  const totalArticles = stocks.length
  const lowStock = stocks.filter(s => s.article && s.quantity <= s.article.min_stock && s.quantity > 0).length
  const outOfStock = stocks.filter(s => s.quantity <= 0).length

  // Mode formulaire seul via Actions
  if (isNewOnlyMode) {
    // Message de confirmation après création
    if (showSuccess) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <Card className="max-w-md mx-auto border-2 border-green-500">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Mouvement créé avec succès</h2>
              <p className="text-gray-600 mb-6">Le mouvement de stock a été enregistré.</p>
              <Button onClick={handleCloseNewOnly} className="bg-[#B8860B] hover:bg-[#9A7209]">
                OK
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Card className="max-w-2xl mx-auto border-2 border-[#B8860B]">
          <CardHeader className="border-b bg-[#B8860B] text-white rounded-t-lg">
            <CardTitle className="text-xl flex items-center gap-2">
              <Warehouse className="h-5 w-5" />
              Nouveau mouvement de stock
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Article *</Label>
                  <Select
                    value={formData.article_id}
                    onValueChange={(value) => setFormData({ ...formData, article_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un article" />
                    </SelectTrigger>
                    <SelectContent>
                      {articles.map((article) => (
                        <SelectItem key={article.id} value={article.id}>
                          {article.code} - {article.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>N° de Lot (traçabilité)</Label>
                  <Select
                    value={formData.lot_id || 'none'}
                    onValueChange={(value) => setFormData({ ...formData, lot_id: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un lot" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sans lot</SelectItem>
                      {lots.map((lot) => (
                        <SelectItem key={lot.id} value={lot.id}>
                          {lot.lot_number} ({lot.olive_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type de mouvement</Label>
                  <Select
                    value={formData.movement_type}
                    onValueChange={(value) => setFormData({ ...formData, movement_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in">Entrée</SelectItem>
                      <SelectItem value="out">Sortie</SelectItem>
                      <SelectItem value="adjustment">Ajustement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantité *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Référence</Label>
                <Select
                  value={formData.reference_type}
                  onValueChange={(value) => setFormData({ ...formData, reference_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Type de référence (optionnel)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="commande">Commande</SelectItem>
                    <SelectItem value="livraison">Livraison</SelectItem>
                    <SelectItem value="reception">Réception</SelectItem>
                    <SelectItem value="inventaire">Inventaire</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notes sur le mouvement"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleCloseNewOnly}>
                  Annuler
                </Button>
                <Button type="submit" className="bg-[#B8860B] hover:bg-[#9A7209]">
                  Enregistrer
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <ProtectedModule module="stocks" action="create">
                <Button
                  className="bg-[#B8860B] hover:bg-[#9A7209]"
                  onClick={() => {
                    resetForm()
                    setIsDialogOpen(true)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nouveau mouvement
                </Button>
              </ProtectedModule>
            </DialogTrigger>

          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nouveau mouvement de stock</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Article *</Label>
                  <Select
                    value={formData.article_id}
                    onValueChange={(value) => setFormData({ ...formData, article_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un article" />
                    </SelectTrigger>
                    <SelectContent>
                      {articles.map((article) => (
                        <SelectItem key={article.id} value={article.id}>
                          {article.code} - {article.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>N° de Lot (traçabilité)</Label>
                  <Select
                    value={formData.lot_id || 'none'}
                    onValueChange={(value) => setFormData({ ...formData, lot_id: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un lot" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sans lot</SelectItem>
                      {lots.map((lot) => (
                        <SelectItem key={lot.id} value={lot.id}>
                          {lot.lot_number} ({lot.olive_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type de mouvement</Label>
                  <Select
                    value={formData.movement_type}
                    onValueChange={(value) => setFormData({ ...formData, movement_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in">Entrée</SelectItem>
                      <SelectItem value="out">Sortie</SelectItem>
                      <SelectItem value="adjustment">Ajustement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantité *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Référence</Label>
                <Select
                  value={formData.reference_type}
                  onValueChange={(value) => setFormData({ ...formData, reference_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Type de référence (optionnel)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="commande">Commande</SelectItem>
                    <SelectItem value="livraison">Livraison</SelectItem>
                    <SelectItem value="reception">Réception</SelectItem>
                    <SelectItem value="inventaire">Inventaire</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notes sur le mouvement"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" className="bg-[#B8860B] hover:bg-[#9A7209]">
                  Enregistrer
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-2 border-[#B8860B]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total articles en stock</p>
                <p className="text-2xl font-bold text-[#B8860B]">{totalArticles}</p>
              </div>
              <Warehouse className="h-8 w-8 text-[#B8860B]" />
            </div>
          </CardContent>
        </Card>

        <Card className={`border-2 ${lowStock > 0 ? 'border-orange-500' : 'border-[#B8860B]'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Stock faible</p>
                <p className={`text-2xl font-bold ${lowStock > 0 ? 'text-orange-500' : 'text-[#B8860B]'}`}>{lowStock}</p>
              </div>
              <AlertTriangle className={`h-8 w-8 ${lowStock > 0 ? 'text-orange-500' : 'text-[#B8860B]'}`} />
            </div>
          </CardContent>
        </Card>

        <Card className={`border-2 ${outOfStock > 0 ? 'border-red-500' : 'border-[#B8860B]'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Rupture de stock</p>
                <p className={`text-2xl font-bold ${outOfStock > 0 ? 'text-red-500' : 'text-[#B8860B]'}`}>{outOfStock}</p>
              </div>
              <AlertTriangle className={`h-8 w-8 ${outOfStock > 0 ? 'text-red-500' : 'text-[#B8860B]'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-2 gap-6">
        {/* Stock Table */}
        <Card className="border-2 border-[#B8860B]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>État du stock</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#B8860B]" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Article</TableHead>
                    <TableHead>Lot</TableHead>
                    <TableHead className="text-center">Quantité</TableHead>
                    <TableHead className="text-center">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStocks.map((stock) => {
                    const minStock = stock.article?.min_stock || 0
                    const isLow = stock.quantity <= minStock && stock.quantity > 0
                    const isOut = stock.quantity <= 0

                    return (
                      <TableRow key={stock.id}>
                        <TableCell>
                          <div className="font-medium">{stock.article?.code}</div>
                          <div className="text-sm text-gray-500">{stock.article?.name}</div>
                        </TableCell>
                        <TableCell>
                          {stock.lot ? (
                            <Badge variant="outline">{stock.lot.lot_number}</Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-bold ${isOut ? 'text-red-600' : isLow ? 'text-orange-500' : 'text-[#B8860B]'}`}>
                            {stock.quantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {isOut ? (
                            <Badge className="bg-red-100 text-red-800">Rupture</Badge>
                          ) : isLow ? (
                            <Badge className="bg-orange-100 text-orange-800">Faible</Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800">OK</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent Movements */}
        <Card className="border-2 border-[#B8860B]">
          <CardHeader>
            <CardTitle>Derniers mouvements</CardTitle>
          </CardHeader>
          <CardContent>
            {movements.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Aucun mouvement enregistré
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {movements.map((movement) => (
                  <div
                    key={movement.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {movement.movement_type === 'in' ? (
                        <ArrowUpCircle className="h-5 w-5 text-[#B8860B]" />
                      ) : movement.movement_type === 'out' ? (
                        <ArrowDownCircle className="h-5 w-5 text-red-600" />
                      ) : (
                        <Warehouse className="h-5 w-5 text-blue-600" />
                      )}
                      <div>
                        <div className="font-medium">{movement.article?.code}</div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(movement.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        </div>
                      </div>
                    </div>
                    <div className={`font-bold ${movement.movement_type === 'in' ? 'text-[#B8860B]' : movement.movement_type === 'out' ? 'text-red-600' : 'text-blue-600'}`}>
                      {movement.movement_type === 'in' ? '+' : movement.movement_type === 'out' ? '' : ''}
                      {movement.quantity}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function StockArticlesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Chargement...</div>}>
      <StockArticlesPageContent />
    </Suspense>
  )
}
