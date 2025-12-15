'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSupabase, querySimple } from '@/hooks/useSupabase'
import { ProtectedModule } from '@/components/auth/ProtectedModule'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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
import {
  Plus,
  Search,
  Truck,
  Eye,
  FileText,
  TrendingUp,
  Route,
  MapPin,
  Clock,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Printer,
  Trash2,
} from 'lucide-react'
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

interface Client {
  code: string
  name: string
  contact_name: string | null
  phone: string | null
  address: string | null
  city: string | null
  gps_lat: number | null
  gps_lng: number | null
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
  client?: Client
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

interface ClientSimple {
  id: string
  code: string
  name: string
}

interface OptimizedDelivery {
  id: string
  delivery_number: string
  client_name: string
  client_code: string
  address: string
  city: string
  location: { latitude: number; longitude: number }
  total_ht: number
}

interface OptimizedRoute {
  deliveries: OptimizedDelivery[]
  totalDistance: number
  totalDuration: number
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
  const [clients, setClients] = useState<ClientSimple[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [viewDelivery, setViewDelivery] = useState<Delivery | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)

  // Route optimization state
  const [selectedDeliveries, setSelectedDeliveries] = useState<Set<string>>(new Set())
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizedRoute, setOptimizedRoute] = useState<OptimizedRoute | null>(null)
  const [isRouteDialogOpen, setIsRouteDialogOpen] = useState(false)

  const supabase = useSupabase()

  const [formData, setFormData] = useState({
    order_id: '',
    client_id: '',
    delivery_date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)

    try {
      // Fetch all data in parallel for faster loading
      const [deliveriesResult, ordersResult, clientsResult] = await Promise.all([
        querySimple(() =>
          supabase
            .from('deliveries')
            .select(`
              id, delivery_number, order_id, client_id, status, delivery_date, total_ht, notes,
              client:clients(code, name, contact_name, phone, address, city, gps_lat, gps_lng),
              order:orders(order_number)
            `)
            .order('delivery_date', { ascending: false })
            .limit(30)
        ),
        querySimple(() =>
          supabase
            .from('orders')
            .select('id, order_number, client_id, status, total_ht, client:clients(name)')
            .in('status', ['confirmed', 'in_progress'])
            .order('order_date', { ascending: false })
            .limit(30)
        ),
        querySimple(() =>
          supabase
            .from('clients')
            .select('id, code, name')
            .eq('is_active', true)
            .order('name')
            .limit(100)
        ),
      ])

      if (deliveriesResult.error) {
        console.error('Deliveries query error:', deliveriesResult.error)
        throw new Error(`Erreur livraisons: ${deliveriesResult.error.message || 'Erreur inconnue'}`)
      }

      setDeliveries((deliveriesResult.data as Delivery[]) || [])
      setOrders((ordersResult.data as Order[]) || [])
      setClients((clientsResult.data as ClientSimple[]) || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      setLoadError(error instanceof Error ? error.message : 'Erreur de chargement')
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

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

    fetchData()
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
    if (!delivery.client) {
      alert('Donnees client manquantes pour generer le PDF')
      return
    }

    if (!delivery.delivery_items || delivery.delivery_items.length === 0) {
      alert('Aucun article dans cette livraison pour generer le PDF')
      return
    }

    try {
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
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Erreur lors de la generation du PDF')
    }
  }

  const handleStatusChange = async (deliveryId: string, newStatus: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('deliveries') as any)
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', deliveryId)

    if (error) {
      console.error('Error updating status:', error)
    } else {
      fetchData()
      setIsViewDialogOpen(false)
    }
  }

  const handleDeleteDelivery = async (deliveryId: string, deliveryNumber: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la livraison ${deliveryNumber} ?`)) {
      return
    }

    // First delete delivery items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('delivery_items') as any).delete().eq('delivery_id', deliveryId)

    // Then delete the delivery
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('deliveries') as any).delete().eq('id', deliveryId)

    if (error) {
      console.error('Error deleting delivery:', error)
      alert('Erreur lors de la suppression de la livraison')
    } else {
      fetchData()
      if (viewDelivery?.id === deliveryId) {
        setIsViewDialogOpen(false)
      }
    }
  }

  // Selection handlers
  const toggleDeliverySelection = (deliveryId: string) => {
    const newSelected = new Set(selectedDeliveries)
    if (newSelected.has(deliveryId)) {
      newSelected.delete(deliveryId)
    } else {
      newSelected.add(deliveryId)
    }
    setSelectedDeliveries(newSelected)
  }

  const selectAllPending = () => {
    const pendingIds = filteredDeliveries
      .filter(d => d.status === 'pending' || d.status === 'in_progress')
      .map(d => d.id)
    setSelectedDeliveries(new Set(pendingIds))
  }

  const clearSelection = () => {
    setSelectedDeliveries(new Set())
    setOptimizedRoute(null)
  }

  // Route optimization
  const optimizeRoute = async () => {
    if (selectedDeliveries.size === 0) {
      alert('Veuillez selectionner au moins une livraison')
      return
    }

    setIsOptimizing(true)

    try {
      const selectedList = deliveries.filter(d => selectedDeliveries.has(d.id))

      // Prepare data for optimization
      const deliveriesData = selectedList.map(d => ({
        id: d.id,
        delivery_number: d.delivery_number,
        client_name: d.client?.name || '',
        client_code: d.client?.code || '',
        address: d.client?.address || '',
        city: d.client?.city || '',
        location: {
          latitude: d.client?.gps_lat || 0,
          longitude: d.client?.gps_lng || 0,
        },
        total_ht: d.total_ht || 0,
      }))

      const response = await fetch('/api/route-optimization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveries: deliveriesData }),
      })

      if (!response.ok) {
        throw new Error('Erreur lors de l\'optimisation')
      }

      const result = await response.json()
      setOptimizedRoute(result)
      setIsRouteDialogOpen(true)
    } catch (error) {
      console.error('Route optimization error:', error)
      alert('Erreur lors de l\'optimisation du trajet')
    } finally {
      setIsOptimizing(false)
    }
  }

  // Generate daily route sheet
  const generateRouteSheet = () => {
    if (!optimizedRoute) return

    // Create printable HTML
    const today = new Date()
    const dateStr = format(today, 'dd MMMM yyyy', { locale: fr })

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Fiche de Tournee - ${dateStr}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #228B22; border-bottom: 2px solid #228B22; padding-bottom: 10px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .summary { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .summary-item { display: inline-block; margin-right: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background: #228B22; color: white; }
          tr:nth-child(even) { background: #f9f9f9; }
          .order-num { font-weight: bold; color: #228B22; font-size: 18px; }
          .signature-box { border: 1px solid #ddd; height: 60px; margin-top: 5px; }
          .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <h1>KARAM Olives & Sauces - Fiche de Tournee</h1>
        <div class="header">
          <div><strong>Date:</strong> ${dateStr}</div>
          <div><strong>Livreur:</strong> _____________________</div>
        </div>
        <div class="summary">
          <div class="summary-item"><strong>Livraisons:</strong> ${optimizedRoute.deliveries.length}</div>
          <div class="summary-item"><strong>Distance:</strong> ${optimizedRoute.totalDistance} km</div>
          <div class="summary-item"><strong>Duree estimee:</strong> ${Math.floor(optimizedRoute.totalDuration / 60)}h ${optimizedRoute.totalDuration % 60}min</div>
          <div class="summary-item"><strong>Total:</strong> ${optimizedRoute.deliveries.reduce((sum, d) => sum + d.total_ht, 0).toFixed(2)} MAD</div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 40px;">#</th>
              <th>N BL</th>
              <th>Client</th>
              <th>Adresse</th>
              <th>Montant</th>
              <th style="width: 100px;">Signature</th>
            </tr>
          </thead>
          <tbody>
            ${optimizedRoute.deliveries.map((d, i) => `
              <tr>
                <td class="order-num">${i + 1}</td>
                <td>${d.delivery_number}</td>
                <td><strong>${d.client_code}</strong><br/>${d.client_name}</td>
                <td>${d.address || ''}<br/>${d.city || ''}</td>
                <td>${d.total_ht.toFixed(2)} MAD</td>
                <td><div class="signature-box"></div></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          <p>Document genere le ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: fr })}</p>
          <p>KARAM Olives & Sauces - Zone Industrielle, Marrakech</p>
        </div>
      </body>
      </html>
    `

    // Open print window
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const filteredDeliveries = deliveries.filter(
    (delivery) => {
      const matchesSearch = delivery.delivery_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        delivery.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        delivery.client?.code?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || delivery.status === statusFilter
      const matchesDate = !dateFilter || delivery.delivery_date === dateFilter
      return matchesSearch && matchesStatus && matchesDate
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

          <div className="flex gap-2">
            {selectedDeliveries.size > 0 && (
              <>
                <Button
                  variant="outline"
                  onClick={clearSelection}
                  className="gap-2"
                >
                  Annuler ({selectedDeliveries.size})
                </Button>
                <Button
                  onClick={optimizeRoute}
                  disabled={isOptimizing}
                  className="bg-blue-600 hover:bg-blue-700 gap-2"
                >
                  {isOptimizing ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Route className="h-4 w-4" />
                  )}
                  Optimiser trajet
                </Button>
              </>
            )}

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
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                En attente
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
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par N BL ou client..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-44"
                placeholder="Filtrer par date"
              />
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
              <Button variant="outline" onClick={selectAllPending} className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Selectionner en attente
              </Button>
              <Button variant="ghost" size="icon" onClick={fetchData} title="Actualiser">
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadError ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 mb-4">{loadError}</p>
                <Button onClick={fetchData} variant="outline">
                  Reessayer
                </Button>
              </div>
            ) : isLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-spin" />
                <p className="text-gray-500">Chargement...</p>
              </div>
            ) : filteredDeliveries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Aucune livraison trouvee
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedDeliveries.size === filteredDeliveries.length && filteredDeliveries.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedDeliveries(new Set(filteredDeliveries.map(d => d.id)))
                          } else {
                            setSelectedDeliveries(new Set())
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>N BL</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Ville</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Articles</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Total HT</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDeliveries.map((delivery) => (
                    <TableRow
                      key={delivery.id}
                      className={selectedDeliveries.has(delivery.id) ? 'bg-blue-50' : ''}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedDeliveries.has(delivery.id)}
                          onCheckedChange={() => toggleDeliverySelection(delivery.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{delivery.delivery_number}</TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{delivery.client?.code}</span>
                          <span className="text-gray-500 ml-2">{delivery.client?.name}</span>
                          {delivery.client?.gps_lat && (
                            <span title="GPS disponible"><MapPin className="inline h-3 w-3 text-green-500 ml-1" /></span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {delivery.client?.city || '-'}
                      </TableCell>
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
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteDelivery(delivery.id, delivery.delivery_number)}
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <div className="mt-4 text-sm text-gray-500 text-right">
              {filteredDeliveries.length} livraison(s) affichee(s)
              {selectedDeliveries.size > 0 && ` - ${selectedDeliveries.size} selectionnee(s)`}
            </div>
          </CardContent>
        </Card>

        {/* View Delivery Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-purple-600" />
                Bon de Livraison {viewDelivery?.delivery_number}
              </DialogTitle>
            </DialogHeader>
            {viewDelivery && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 text-sm">Statut:</span>
                        <Badge className={statusColors[viewDelivery.status]}>
                          {statusLabels[viewDelivery.status]}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Articles livres</h3>
                  <div className="overflow-x-auto">
                  <Table className="min-w-full">
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
                </div>

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

                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="flex gap-2">
                    <Label className="text-sm text-gray-600">Statut:</Label>
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

        {/* Optimized Route Dialog */}
        <Dialog open={isRouteDialogOpen} onOpenChange={setIsRouteDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Route className="h-5 w-5 text-blue-600" />
                Trajet Optimise - Fiche du Jour
              </DialogTitle>
            </DialogHeader>
            {optimizedRoute && (
              <div className="space-y-6">
                {/* Summary */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <Truck className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-blue-600">{optimizedRoute.deliveries.length}</p>
                    <p className="text-sm text-gray-600">Livraisons</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <MapPin className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-600">{optimizedRoute.totalDistance} km</p>
                    <p className="text-sm text-gray-600">Distance</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg text-center">
                    <Clock className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-orange-600">
                      {Math.floor(optimizedRoute.totalDuration / 60)}h {optimizedRoute.totalDuration % 60}min
                    </p>
                    <p className="text-sm text-gray-600">Duree estimee</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg text-center">
                    <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-purple-600">
                      {formatPrice(optimizedRoute.deliveries.reduce((sum, d) => sum + d.total_ht, 0))}
                    </p>
                    <p className="text-sm text-gray-600">Total</p>
                  </div>
                </div>

                {/* Route Order */}
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3">Ordre de livraison optimise</h3>
                  <div className="space-y-2">
                    {optimizedRoute.deliveries.map((delivery, index) => (
                      <div
                        key={delivery.id}
                        className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{delivery.delivery_number}</span>
                            <Badge variant="outline">{delivery.client_code}</Badge>
                          </div>
                          <p className="text-sm text-gray-600">{delivery.client_name}</p>
                          <p className="text-xs text-gray-500">
                            {delivery.address && `${delivery.address}, `}{delivery.city}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">{formatPrice(delivery.total_ht)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setIsRouteDialogOpen(false)}
                  >
                    Fermer
                  </Button>
                  <Button
                    onClick={generateRouteSheet}
                    className="bg-blue-600 hover:bg-blue-700 gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Imprimer Fiche du Jour
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedModule>
  )
}
