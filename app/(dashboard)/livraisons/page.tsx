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
import { Plus, Search, Truck, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Delivery {
  id: string
  delivery_number: string
  order_id: string | null
  client_id: string
  status: string
  delivery_date: string | null
  total_ht: number | null
  notes: string | null
  client?: { name: string; code: string }
  order?: { order_number: string }
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
  returned: 'bg-red-100 text-red-800',
}

const statusLabels: Record<string, string> = {
  pending: 'En attente',
  in_progress: 'En cours',
  delivered: 'Livrée',
  returned: 'Retournée',
}

export default function LivraisonsPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
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
        client:clients(name, code),
        order:orders(order_number)
      `)
      .order('created_at', { ascending: false })

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
      alert('Veuillez sélectionner un client')
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

  const filteredDeliveries = deliveries.filter(
    (delivery) =>
      delivery.delivery_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.client?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatPrice = (price: number | null) => {
    if (price === null) return '-'
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
    }).format(price)
  }

  return (
    <ProtectedModule module="livraisons">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Livraisons</h1>
            <p className="text-gray-500">Gérez vos bons de livraison</p>
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
                      <SelectValue placeholder="Sélectionner une commande" />
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
                    Créer le BL
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
                {deliveries.filter((d) => d.status === 'pending' || d.status === 'in_progress').length}
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
                {deliveries.filter((d) => d.status === 'delivered').length}
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
                  placeholder="Rechercher un bon de livraison..."
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
            ) : filteredDeliveries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Aucune livraison pour le moment
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° BL</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Commande</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Total HT</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDeliveries.map((delivery) => (
                    <TableRow key={delivery.id}>
                      <TableCell className="font-medium">{delivery.delivery_number}</TableCell>
                      <TableCell>{delivery.client?.name}</TableCell>
                      <TableCell>{delivery.order?.order_number || '-'}</TableCell>
                      <TableCell>
                        {delivery.delivery_date
                          ? format(new Date(delivery.delivery_date), 'dd/MM/yyyy', { locale: fr })
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[delivery.status]}>
                          {statusLabels[delivery.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatPrice(delivery.total_ht)}</TableCell>
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
