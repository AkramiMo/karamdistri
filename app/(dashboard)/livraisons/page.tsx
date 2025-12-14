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
import { Plus, Search, Truck, Eye, FileText, TrendingUp } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { generateDeliveryNotePDF } from '@/lib/pdf/invoice'

interface DeliveryItem {
  id: string
  article_id: string
  quantity_ordered: number
  quantity_delivered: number
  quantity_returned: number
  unit_price: number
  article?: {
    code: string
    name: string
    description: string | null
  }
}

interface Delivery {
  id: string
  delivery_number: string
  order_id: string | null
  client_id: string
  status: string
  delivery_date: string | null
  total_ht: number | null
  notes: string | null
  client?: {
    code: string
    name: string
    contact_name: string | null
    phone: string | null
    address: string | null
    city: string | null
  }
  order?: { order_number: string }
  delivery_items?: DeliveryItem[]
}

interface Order {
  id: string
  order_number: string
  client_id: string
  status: string
  total_ht: number
  client?: { name: string }
}

interface Client {
  id: string
  code: string
  name: string
}

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  delivered: 'bg-green-100 text-green-800',
  partial: 'bg-orange-100 text-orange-800',
  returned: 'bg-red-100 text-red-800',
}

const statusLabels: Record<string, string> = {
  pending: 'En attente',
  in_progress: 'En cours',
  delivered: 'Livree',
  partial: 'Partielle',
  returned: 'Retournee',
}

export default function LivraisonsPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [viewDelivery, setViewDelivery] = useState<Delivery | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const supabase = createClient()

  const [formData, setFormData] = useState({
    order_id: '',
    client_id: '',
    delivery_date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  const fetchDeliveries = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('deliveries')
      .select(`
        *,
        client:clients(code, name, contact_name, phone, address, city),
        order:orders(order_number),
        delivery_items(
          id,
          article_id,
          quantity_ordered,
          quantity_delivered,
          quantity_returned,
          unit_price,
          article:articles(code, name, description)
        )
      `)
      .order('delivery_date', { ascending: false })

    if (error) {
      console.error('Error fetching deliveries:', error)
    } else {
      setDeliveries(data || [])
    }
    setIsLoading(false)
  }

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('id, order_number, client_id, status, total_ht, client:clients(name)')
      .in('status', ['confirmed', 'in_progress'])
      .order('order_date', { ascending: false })
    setOrders(data || [])
  }

  const fetchClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, code, name')
      .eq('is_active', true)
      .order('name')
    setClients(data || [])
  }

  useEffect(() => {
    fetchDeliveries()
    fetchOrders()
    fetchClients()
  }, [])

  const generateDeliveryNumber = () => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `BL-${year}${month}-${random}`
  }

  const handleOrderSelect = (orderId: string) => {
    const order = orders.find(o => o.id === orderId)
    if (order) {
      setFormData({
        ...formData,
        order_id: orderId,
        client_id: order.client_id,
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.client_id) {
      alert('Veuillez selectionner un client')
      return
    }

    const selectedOrder = orders.find(o => o.id === formData.order_id)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('deliveries') as any).insert([{
      delivery_number: generateDeliveryNumber(),
      order_id: formData.order_id || null,
      client_id: formData.client_id,
      delivery_date: formData.delivery_date,
      status: 'pending',
      total_ht: selectedOrder?.total_ht || 0,
      notes: formData.notes || null,
    }])

    if (error) {
      console.error('Error creating delivery:', error)
      return
    }

    fetchDeliveries()
    setIsDialogOpen(false)
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      order_id: '',
      client_id: '',
      delivery_date: new Date().toISOString().split('T')[0],
      notes: '',
    })
  }

  const handleViewDelivery = (delivery: Delivery) => {
    setViewDelivery(delivery)
    setIsViewDialogOpen(true)
  }

  const handleGeneratePDF = (delivery: Delivery) => {
    if (!delivery.client || !delivery.delivery_items) return

    // Transform delivery data for PDF generation
    const orderData = {
      id: delivery.id,
      order_number: delivery.delivery_number,
      order_date: delivery.delivery_date || new Date().toISOString(),
      status: delivery.status,
      total_ht: delivery.total_ht || 0,
      total_tva: (delivery.total_ht || 0) * 0.2,
      total_ttc: (delivery.total_ht || 0) * 1.2,
      notes: delivery.notes,
      client: {
        code: delivery.client.code,
        name: delivery.client.name,
        contact_name: delivery.client.contact_name,
        phone: delivery.client.phone,
        email: null,
        address: delivery.client.address,
        city: delivery.client.city,
      },
      order_items: delivery.delivery_items.map(item => ({
        article: {
          code: item.article?.code || '',
          name: item.article?.name || '',
          description: item.article?.description || null,
        },
        quantity: item.quantity_delivered,
        unit_price: item.unit_price,
        total_ht: item.quantity_delivered * item.unit_price,
      })),
    }

    generateDeliveryNotePDF(orderData)
  }

  const handleStatusChange = async (deliveryId: string, newStatus: string) => {
    const { error } = await supabase
      .from('deliveries')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', deliveryId)

    if (error) {
      console.error('Error updating status:', error)
    } else {
      fetchDeliveries()
      setIsViewDialogOpen(false)
    }
  }

  const filteredDeliveries = deliveries.filter(
    (delivery) => {
      const matchesSearch = delivery.delivery_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        delivery.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        delivery.client?.code?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || delivery.status === statusFilter
      return matchesSearch && matchesStatus
    }
  )

  const formatPrice = (price: number | null) => {
    if (price === null) return '-'
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
    }).format(price)
  }

  // Calculate statistics
  const totalCA = deliveries.reduce((sum, d) => sum + (d.total_ht || 0), 0)
  const deliveredCount = deliveries.filter(d => d.status === 'delivered').length
  const pendingCount = deliveries.filter(d => d.status === 'pending' || d.status === 'in_progress').length

  return (
    <ProtectedModule module="livraisons">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Livraisons</h1>
            <p className="text-gray-500">Gerez vos bons de livraison</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <ProtectedModule module="livraisons" action="create">
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    resetForm()
                    setIsDialogOpen(true)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nouveau BL
                </Button>
              </ProtectedModule>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Nouveau bon de livraison</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Commande (optionnel)</Label>
                  <Select
                    value={formData.order_id}
                    onValueChange={handleOrderSelect}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selectionner une commande" />
                    </SelectTrigger>
                    <SelectContent>
                      {orders.map((order) => (
                        <SelectItem key={order.id} value={order.id}>
                          {order.order_number} - {order.client?.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Client *</Label>
                  <Select
                    value={formData.client_id}
                    onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selectionner un client" />
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
                  <Label htmlFor="delivery_date">Date de livraison</Label>
                  <Input
                    id="delivery_date"
                    type="date"
                    value={formData.delivery_date}
                    onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Notes sur la livraison"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" className="bg-green-600 hover:bg-green-700">
                    Creer le BL
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
                Total Livraisons
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Truck className="h-8 w-8 text-purple-600" />
                <span className="text-2xl font-bold">{deliveries.length}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                En cours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-yellow-600">
                {pendingCount}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Livrees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-green-600">
                {deliveredCount}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                CA Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-green-600" />
                <span className="text-xl font-bold text-green-600">
                  {formatPrice(totalCA)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par N BL ou client..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="in_progress">En cours</SelectItem>
                  <SelectItem value="delivered">Livree</SelectItem>
                  <SelectItem value="partial">Partielle</SelectItem>
                  <SelectItem value="returned">Retournee</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Chargement...</div>
            ) : filteredDeliveries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Aucune livraison pour le moment
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N BL</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Commande</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Articles</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Total HT</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDeliveries.map((delivery) => (
                    <TableRow key={delivery.id}>
                      <TableCell className="font-medium">{delivery.delivery_number}</TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{delivery.client?.code}</span>
                          <span className="text-gray-500 ml-2">{delivery.client?.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{delivery.order?.order_number || '-'}</TableCell>
                      <TableCell>
                        {delivery.delivery_date
                          ? format(new Date(delivery.delivery_date), 'dd/MM/yyyy', { locale: fr })
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {delivery.delivery_items?.length || 0} articles
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[delivery.status]}>
                          {statusLabels[delivery.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatPrice(delivery.total_ht)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDelivery(delivery)}
                            title="Voir details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleGeneratePDF(delivery)}
                            title="Telecharger BL"
                          >
                            <FileText className="h-4 w-4 text-purple-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* View Delivery Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-purple-600" />
                Bon de Livraison {viewDelivery?.delivery_number}
              </DialogTitle>
            </DialogHeader>
            {viewDelivery && (
              <div className="space-y-6">
                {/* Delivery Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-700">Client</h3>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="font-medium">{viewDelivery.client?.code} - {viewDelivery.client?.name}</p>
                      {viewDelivery.client?.phone && (
                        <p className="text-sm text-gray-600">Tel: {viewDelivery.client.phone}</p>
                      )}
                      {viewDelivery.client?.address && (
                        <p className="text-sm text-gray-600">{viewDelivery.client.address}</p>
                      )}
                      {viewDelivery.client?.city && (
                        <p className="text-sm text-gray-600">{viewDelivery.client.city}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-700">Details</h3>
                    <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                      <p className="text-sm">
                        <span className="text-gray-600">Date:</span>{' '}
                        {viewDelivery.delivery_date
                          ? format(new Date(viewDelivery.delivery_date), 'dd MMMM yyyy', { locale: fr })
                          : '-'}
                      </p>
                      <p className="text-sm">
                        <span className="text-gray-600">Commande:</span>{' '}
                        {viewDelivery.order?.order_number || 'Directe'}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 text-sm">Statut:</span>
                        <Badge className={statusColors[viewDelivery.status]}>
                          {statusLabels[viewDelivery.status]}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Articles livres</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Designation</TableHead>
                        <TableHead className="text-center">Qte</TableHead>
                        <TableHead className="text-right">Prix Unit.</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewDelivery.delivery_items?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-sm">
                            {item.article?.code}
                          </TableCell>
                          <TableCell>
                            {item.article?.description || item.article?.name}
                          </TableCell>
                          <TableCell className="text-center">
                            {item.quantity_delivered}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatPrice(item.unit_price)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatPrice(item.quantity_delivered * item.unit_price)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total HT:</span>
                      <span className="font-medium">{formatPrice(viewDelivery.total_ht)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">TVA (20%):</span>
                      <span className="font-medium">{formatPrice((viewDelivery.total_ht || 0) * 0.2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Total TTC:</span>
                      <span className="text-green-600">{formatPrice((viewDelivery.total_ht || 0) * 1.2)}</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {viewDelivery.notes && (
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Notes</h3>
                    <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{viewDelivery.notes}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="flex gap-2">
                    <Label className="text-sm text-gray-600">Changer le statut:</Label>
                    <Select
                      value={viewDelivery.status}
                      onValueChange={(value) => handleStatusChange(viewDelivery.id, value)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">En attente</SelectItem>
                        <SelectItem value="in_progress">En cours</SelectItem>
                        <SelectItem value="delivered">Livree</SelectItem>
                        <SelectItem value="partial">Partielle</SelectItem>
                        <SelectItem value="returned">Retournee</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleGeneratePDF(viewDelivery)}
                      className="gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Telecharger BL
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsViewDialogOpen(false)}
                    >
                      Fermer
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedModule>
  )
}
