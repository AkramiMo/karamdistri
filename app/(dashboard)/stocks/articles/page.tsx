'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
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

export default function StockArticlesPage() {
  const [stocks, setStocks] = useState<StockItem[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [lots, setLots] = useState<Lot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Submit clicked', formData)

    if (!formData.article_id || !formData.quantity) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }

    const quantity = parseInt(formData.quantity)
    const lotId = formData.lot_id || null

    // Create stock movement (without lot_id if column doesn't exist yet)
    const movementPayload: Record<string, unknown> = {
      article_id: formData.article_id,
      quantity: formData.movement_type === 'out' ? -quantity : quantity,
      movement_type: formData.movement_type,
      reference_type: formData.reference_type || null,
      notes: formData.notes || null,
    }

    // Only add lot_id if a lot is selected
    if (lotId) {
      movementPayload.lot_id = lotId
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: movementError } = await (supabase.from('stock_movements') as any).insert([movementPayload])

    if (movementError) {
      console.error('Error creating movement:', movementError)
      alert('Erreur lors de la création du mouvement: ' + movementError.message)
      return
    }

    // Update or create stock record
    const existingStock = stocks.find(s =>
      s.article_id === formData.article_id &&
      (s.lot_id === lotId || (!s.lot_id && !lotId))
    )

    if (existingStock) {
      const newQuantity = formData.movement_type === 'out'
        ? existingStock.quantity - quantity
        : existingStock.quantity + quantity

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase.from('stock') as any)
        .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
        .eq('id', existingStock.id)

      if (updateError) {
        console.error('Error updating stock:', updateError)
        alert('Erreur lors de la mise à jour du stock: ' + updateError.message)
        return
      }
    } else {
      const stockPayload: Record<string, unknown> = {
        article_id: formData.article_id,
        quantity: formData.movement_type === 'out' ? -quantity : quantity,
        warehouse: 'principal',
      }

      if (lotId) {
        stockPayload.lot_id = lotId
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await (supabase.from('stock') as any).insert([stockPayload])

      if (insertError) {
        console.error('Error creating stock:', insertError)
        alert('Erreur lors de la création du stock: ' + insertError.message)
        return
      }
    }

    fetchStocks()
    fetchMovements()
    fetchLots()
    setIsDialogOpen(false)
    resetForm()
  }

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

  const filteredStocks = stocks.filter(
    (stock) =>
      stock.article?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.article?.code?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Calculate stats
  const totalArticles = stocks.length
  const lowStock = stocks.filter(s => s.article && s.quantity <= s.article.min_stock && s.quantity > 0).length
  const outOfStock = stocks.filter(s => s.quantity <= 0).length

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
                  Mouvement de stock
                </Button>
              </ProtectedModule>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Articles en stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Warehouse className="h-8 w-8 text-blue-600" />
                <span className="text-2xl font-bold">{totalArticles}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Stock faible
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
                <span className="text-2xl font-bold text-yellow-600">{lowStock}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Rupture de stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-red-600">{outOfStock}</span>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>État des stocks</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher un article..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 mt-2"
                />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">Chargement...</div>
              ) : filteredStocks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Aucun article en stock
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Article</TableHead>
                      <TableHead>N° Lot</TableHead>
                      <TableHead className="text-right">Quantité</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStocks.map((stock) => {
                      const isLow = stock.article && stock.quantity <= stock.article.min_stock && stock.quantity > 0
                      const isOut = stock.quantity <= 0
                      return (
                        <TableRow key={stock.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{stock.article?.code}</div>
                              <div className="text-sm text-gray-500">{stock.article?.name}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {stock.lot ? (
                              <div className="font-mono text-xs text-blue-600">
                                {stock.lot.lot_number}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {stock.quantity}
                          </TableCell>
                          <TableCell>
                            {isOut ? (
                              <Badge className="bg-red-100 text-red-800">Rupture</Badge>
                            ) : isLow ? (
                              <Badge className="bg-yellow-100 text-yellow-800">Stock faible</Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-[#9A7209]">OK</Badge>
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

          <Card>
            <CardHeader>
              <CardTitle>Derniers mouvements</CardTitle>
            </CardHeader>
            <CardContent>
              {movements.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Aucun mouvement
                </div>
              ) : (
                <div className="space-y-3">
                  {movements.slice(0, 10).map((movement) => {
                    // Extraire le N° Vente depuis les notes (format: "Vente VTE-XXXX-XXXXXX - ...")
                    const saleMatch = movement.notes?.match(/Vente\s+(VTE-[\w-]+)/)
                    const saleNumber = saleMatch ? saleMatch[1] : null
                    return (
                    <div key={movement.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        {movement.movement_type === 'in' ? (
                          <ArrowUpCircle className="h-5 w-5 text-[#B8860B]" />
                        ) : movement.movement_type === 'out' ? (
                          <ArrowDownCircle className="h-5 w-5 text-red-600" />
                        ) : (
                          <Warehouse className="h-5 w-5 text-blue-600" />
                        )}
                        <div>
                          <div className="font-medium text-sm">{movement.article?.name}</div>
                          <div className="text-xs text-gray-500">
                            {format(new Date(movement.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                          </div>
                          {movement.lot && (
                            <div className="text-xs font-mono text-blue-500">Lot: {movement.lot.lot_number}</div>
                          )}
                          {saleNumber && (
                            <div className="text-xs font-mono text-red-500">{saleNumber}</div>
                          )}
                          {!saleNumber && movement.reference_type && (
                            <div className="text-xs text-gray-400">{movement.reference_type}</div>
                          )}
                        </div>
                      </div>
                      <div className={`font-bold ${movement.movement_type === 'in' ? 'text-[#B8860B]' : movement.movement_type === 'out' ? 'text-red-600' : 'text-blue-600'}`}>
                        {movement.movement_type === 'in' ? '+' : movement.movement_type === 'out' ? '' : ''}
                        {movement.quantity}
                      </div>
                    </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
  )
}
