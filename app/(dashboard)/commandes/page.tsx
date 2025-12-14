'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ProtectedModule } from '@/components/auth/ProtectedModule'
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
import { Plus, Search, Eye, ShoppingCart, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Order {
  id: string
  order_number: string
  client_id: string
  status: string
  order_date: string
  total_ht: number
  total_ttc: number
  notes: string | null
  client?: { name: string; code: string }
}

interface Client {
  id: string
  code: string
  name: string
}

interface Article {
  id: string
  code: string
  name: string
  price_ht: number
  tva_rate: number
}

interface OrderItem {
  article_id: string
  article_name: string
  quantity: number
  unit_price: number
  total_ht: number
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  confirmed: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

const statusLabels: Record<string, string> = {
  draft: 'Brouillon',
  confirmed: 'Confirmée',
  in_progress: 'En cours',
  delivered: 'Livrée',
  cancelled: 'Annulée',
}

export default function CommandesPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const supabase = createClient()

  const [formData, setFormData] = useState({
    client_id: '',
    order_date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [selectedArticle, setSelectedArticle] = useState('')
  const [selectedQuantity, setSelectedQuantity] = useState('1')

  const fetchOrders = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        client:clients(name, code)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching orders:', error)
    } else {
      setOrders(data || [])
    }
    setIsLoading(false)
  }

  const fetchClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, code, name')
      .eq('is_active', true)
      .order('name')
    setClients(data || [])
  }

  const fetchArticles = async () => {
    const { data } = await supabase
      .from('articles')
      .select('id, code, name, price_ht, tva_rate')
      .eq('is_active', true)
      .order('name')
    setArticles(data || [])
  }

  useEffect(() => {
    fetchOrders()
    fetchClients()
    fetchArticles()
  }, [])

  const generateOrderNumber = () => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `CMD-${year}${month}-${random}`
  }

  const addItem = () => {
    if (!selectedArticle || !selectedQuantity) return

    const article = articles.find(a => a.id === selectedArticle)
    if (!article) return

    const quantity = parseInt(selectedQuantity)
    const total_ht = article.price_ht * quantity

    setOrderItems([...orderItems, {
      article_id: article.id,
      article_name: article.name,
      quantity,
      unit_price: article.price_ht,
      total_ht,
    }])

    setSelectedArticle('')
    setSelectedQuantity('1')
  }

  const removeItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.client_id || orderItems.length === 0) {
      alert('Veuillez sélectionner un client et ajouter au moins un article')
      return
    }

    const total_ht = orderItems.reduce((sum, item) => sum + item.total_ht, 0)
    const total_tva = total_ht * 0.2 // 20% TVA
    const total_ttc = total_ht + total_tva

    // Create order
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: orderData, error: orderError } = await (supabase.from('orders') as any)
      .insert([{
        order_number: generateOrderNumber(),
        client_id: formData.client_id,
        order_date: formData.order_date,
        status: 'draft',
        total_ht,
        total_tva,
        total_ttc,
        notes: formData.notes || null,
      }])
      .select()
      .single()

    if (orderError) {
      console.error('Error creating order:', orderError)
      return
    }

    // Create order items
    const itemsToInsert = orderItems.map(item => ({
      order_id: orderData.id,
      article_id: item.article_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_percent: 0,
      total_ht: item.total_ht,
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('order_items') as any).insert(itemsToInsert)

    fetchOrders()
    setIsDialogOpen(false)
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      client_id: '',
      order_date: new Date().toISOString().split('T')[0],
      notes: '',
    })
    setOrderItems([])
    setSelectedArticle('')
    setSelectedQuantity('1')
  }

  const filteredOrders = orders.filter(
    (order) =>
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.client?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
    }).format(price)
  }

  return (
    <ProtectedModule module="commandes">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Commandes</h1>
            <p className="text-gray-500">Gérez vos commandes clients</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <ProtectedModule module="commandes" action="create">
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    resetForm()
                    setIsDialogOpen(true)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvelle commande
                </Button>
              </ProtectedModule>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nouvelle commande</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Client *</Label>
                    <Select
                      value={formData.client_id}
                      onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.code} - {client.name}
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

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Notes sur la commande"
                  />
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium mb-3">Articles</h3>
                  <div className="flex gap-2 mb-4">
                    <Select value={selectedArticle} onValueChange={setSelectedArticle}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Sélectionner un article" />
                      </SelectTrigger>
                      <SelectContent>
                        {articles.map((article) => (
                          <SelectItem key={article.id} value={article.id}>
                            {article.code} - {article.name} ({formatPrice(article.price_ht)})
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
                    <Button type="button" onClick={addItem} variant="outline">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {orderItems.length > 0 && (
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
                        {orderItems.map((item, index) => (
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
                            {formatPrice(orderItems.reduce((sum, item) => sum + item.total_ht, 0))}
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
                    Créer la commande
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Commandes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-8 w-8 text-green-600" />
                <span className="text-2xl font-bold">{orders.length}</span>
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
                {orders.filter((o) => o.status === 'draft' || o.status === 'confirmed').length}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                En cours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-blue-600">
                {orders.filter((o) => o.status === 'in_progress').length}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Livrées
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-green-600">
                {orders.filter((o) => o.status === 'delivered').length}
              </span>
            </CardContent>
          </Card>
        </div>

        {/* Search & Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher une commande..."
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
                Aucune commande trouvée
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Commande</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Total HT</TableHead>
                    <TableHead className="text-right">Total TTC</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        {order.order_number}
                      </TableCell>
                      <TableCell>{order.client?.name}</TableCell>
                      <TableCell>
                        {format(new Date(order.order_date), 'dd/MM/yyyy', {
                          locale: fr,
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[order.status]}>
                          {statusLabels[order.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPrice(order.total_ht)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPrice(order.total_ttc)}
                      </TableCell>
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
    </ProtectedModule>
  )
}
