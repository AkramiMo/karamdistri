'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Eye, FileText, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface PurchaseOrder {
  id: string
  po_number: string
  supplier_id: string
  status: string
  order_date: string
  total_ht: number | null
  supplier?: { name: string; code: string }
}

interface Supplier {
  id: string
  code: string
  name: string
}

interface Article {
  id: string
  code: string
  name: string
  price_ht: number
}

interface POItem {
  article_id: string
  article_name: string
  quantity: number
  unit_price: number
  total_ht: number
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  partial: 'bg-yellow-100 text-yellow-800',
  received: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

const statusLabels: Record<string, string> = {
  draft: 'Brouillon',
  sent: 'Envoyée',
  partial: 'Partielle',
  received: 'Reçue',
  cancelled: 'Annulée',
}

export default function AchatsPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const supabase = createClient()

  const [formData, setFormData] = useState({
    supplier_id: '',
    order_date: new Date().toISOString().split('T')[0],
  })

  const [poItems, setPOItems] = useState<POItem[]>([])
  const [selectedArticle, setSelectedArticle] = useState('')
  const [selectedQuantity, setSelectedQuantity] = useState('1')
  const [selectedPrice, setSelectedPrice] = useState('')

  const fetchPurchaseOrders = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`*, supplier:suppliers(name, code)`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching purchase orders:', error)
    } else {
      setPurchaseOrders(data || [])
    }
    setIsLoading(false)
  }

  const fetchSuppliers = async () => {
    const { data } = await supabase
      .from('suppliers')
      .select('id, code, name')
      .eq('is_active', true)
      .order('name')
    setSuppliers(data || [])
  }

  const fetchArticles = async () => {
    const { data } = await supabase
      .from('articles')
      .select('id, code, name, price_ht')
      .eq('is_active', true)
      .order('name')
    setArticles(data || [])
  }

  useEffect(() => {
    fetchPurchaseOrders()
    fetchSuppliers()
    fetchArticles()
  }, [])

  const generatePONumber = () => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `BC-${year}${month}-${random}`
  }

  const addItem = () => {
    if (!selectedArticle || !selectedQuantity || !selectedPrice) return

    const article = articles.find(a => a.id === selectedArticle)
    if (!article) return

    const quantity = parseInt(selectedQuantity)
    const unit_price = parseFloat(selectedPrice)
    const total_ht = unit_price * quantity

    setPOItems([...poItems, {
      article_id: article.id,
      article_name: article.name,
      quantity,
      unit_price,
      total_ht,
    }])

    setSelectedArticle('')
    setSelectedQuantity('1')
    setSelectedPrice('')
  }

  const removeItem = (index: number) => {
    setPOItems(poItems.filter((_, i) => i !== index))
  }

  const handleArticleSelect = (articleId: string) => {
    const article = articles.find(a => a.id === articleId)
    if (article) {
      setSelectedArticle(articleId)
      setSelectedPrice(article.price_ht.toString())
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.supplier_id) {
      alert('Veuillez sélectionner un fournisseur')
      return
    }

    const total_ht = poItems.reduce((sum, item) => sum + item.total_ht, 0)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('purchase_orders') as any).insert([{
      po_number: generatePONumber(),
      supplier_id: formData.supplier_id,
      order_date: formData.order_date,
      status: 'draft',
      total_ht,
    }])

    if (error) {
      console.error('Error creating purchase order:', error)
      return
    }

    fetchPurchaseOrders()
    setIsDialogOpen(false)
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      supplier_id: '',
      order_date: new Date().toISOString().split('T')[0],
    })
    setPOItems([])
    setSelectedArticle('')
    setSelectedQuantity('1')
    setSelectedPrice('')
  }

  const filteredOrders = purchaseOrders.filter(
    (order) =>
      order.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatPrice = (price: number | null) => {
    if (price === null) return '-'
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
    }).format(price)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Achats</h1>
          <p className="text-gray-500">Gérez vos bons de commande fournisseurs</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                resetForm()
                setIsDialogOpen(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nouveau bon de commande
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouveau bon de commande fournisseur</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fournisseur *</Label>
                  <Select
                    value={formData.supplier_id}
                    onValueChange={(value) => setFormData({ ...formData, supplier_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un fournisseur" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.code} - {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="order_date">Date de commande</Label>
                  <Input
                    id="order_date"
                    type="date"
                    value={formData.order_date}
                    onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">Articles</h3>
                <div className="flex gap-2 mb-4">
                  <Select value={selectedArticle} onValueChange={handleArticleSelect}>
                    <SelectTrigger className="flex-1">
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
                  <Input
                    type="number"
                    min="1"
                    value={selectedQuantity}
                    onChange={(e) => setSelectedQuantity(e.target.value)}
                    className="w-24"
                    placeholder="Qté"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    value={selectedPrice}
                    onChange={(e) => setSelectedPrice(e.target.value)}
                    className="w-32"
                    placeholder="Prix"
                  />
                  <Button type="button" onClick={addItem} variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {poItems.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Article</TableHead>
                        <TableHead className="text-right">Qté</TableHead>
                        <TableHead className="text-right">Prix unit.</TableHead>
                        <TableHead className="text-right">Total HT</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {poItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.article_name}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{formatPrice(item.unit_price)}</TableCell>
                          <TableCell className="text-right">{formatPrice(item.total_ht)}</TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(index)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={3} className="text-right font-medium">
                          Total HT:
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatPrice(poItems.reduce((sum, item) => sum + item.total_ht, 0))}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" className="bg-green-600 hover:bg-green-700">
                  Créer le BC
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total BC
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileText className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold">{purchaseOrders.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              En attente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-yellow-600">
              {purchaseOrders.filter((o) => o.status === 'draft' || o.status === 'sent').length}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Partielles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-blue-600">
              {purchaseOrders.filter((o) => o.status === 'partial').length}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Reçues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-green-600">
              {purchaseOrders.filter((o) => o.status === 'received').length}
            </span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher un bon de commande..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Chargement...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucun bon de commande trouvé
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° BC</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Total HT</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.po_number}</TableCell>
                    <TableCell>{order.supplier?.name}</TableCell>
                    <TableCell>
                      {format(new Date(order.order_date), 'dd/MM/yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[order.status]}>
                        {statusLabels[order.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatPrice(order.total_ht)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
