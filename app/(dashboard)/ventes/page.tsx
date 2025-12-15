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
import { Plus, Search, DollarSign, Eye, Trash2 } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Sale {
  id: string
  sale_number: string
  delivery_id: string | null
  client_id: string
  sale_date: string
  total_ht: number | null
  total_ttc: number | null
  payment_method: string | null
  payment_status: string
  client?: { name: string; code: string }
  delivery?: { delivery_number: string }
}

interface Delivery {
  id: string
  delivery_number: string
  client_id: string
  total_ht: number | null
  client?: { name: string }
}

interface Client {
  id: string
  code: string
  name: string
}

const paymentStatusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  partial: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

const paymentStatusLabels: Record<string, string> = {
  pending: 'En attente',
  partial: 'Partiel',
  paid: 'Payé',
  cancelled: 'Annulé',
}

const paymentMethodLabels: Record<string, string> = {
  cash: 'Espèces',
  check: 'Chèque',
  transfer: 'Virement',
  card: 'Carte',
}

export default function VentesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [viewingSale, setViewingSale] = useState<Sale | null>(null)
  const [selectedSales, setSelectedSales] = useState<Set<string>>(new Set())
  const supabase = createClient()

  const [formData, setFormData] = useState({
    delivery_id: '',
    client_id: '',
    sale_date: new Date().toISOString().split('T')[0],
    total_ht: '',
    payment_method: 'cash',
    payment_status: 'pending',
  })

  const fetchSales = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        client:clients(name, code),
        delivery:deliveries(delivery_number)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching sales:', error)
    } else {
      setSales(data || [])
    }
    setIsLoading(false)
  }

  const fetchDeliveries = async () => {
    const { data } = await supabase
      .from('deliveries')
      .select('id, delivery_number, client_id, total_ht, client:clients(name)')
      .eq('status', 'delivered')
      .order('created_at', { ascending: false })
    setDeliveries(data || [])
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
    fetchSales()
    fetchDeliveries()
    fetchClients()
  }, [])

  const generateSaleNumber = () => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `VTE-${year}${month}-${random}`
  }

  const handleDeliverySelect = (deliveryId: string) => {
    const delivery = deliveries.find(d => d.id === deliveryId)
    if (delivery) {
      setFormData({
        ...formData,
        delivery_id: deliveryId,
        client_id: delivery.client_id,
        total_ht: delivery.total_ht?.toString() || '',
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.client_id || !formData.total_ht) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }

    const total_ht = parseFloat(formData.total_ht)
    const total_ttc = total_ht * 1.2 // 20% TVA

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('sales') as any).insert([{
      sale_number: generateSaleNumber(),
      delivery_id: formData.delivery_id || null,
      client_id: formData.client_id,
      sale_date: formData.sale_date,
      total_ht,
      total_ttc,
      payment_method: formData.payment_method,
      payment_status: formData.payment_status,
    }])

    if (error) {
      console.error('Error creating sale:', error)
      return
    }

    fetchSales()
    setIsDialogOpen(false)
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      delivery_id: '',
      client_id: '',
      sale_date: new Date().toISOString().split('T')[0],
      total_ht: '',
      payment_method: 'cash',
      payment_status: 'pending',
    })
  }

  const handleViewSale = (sale: Sale) => {
    setViewingSale(sale)
    setIsViewDialogOpen(true)
  }

  // Selection handlers
  const toggleSaleSelection = (saleId: string) => {
    const newSelected = new Set(selectedSales)
    if (newSelected.has(saleId)) {
      newSelected.delete(saleId)
    } else {
      newSelected.add(saleId)
    }
    setSelectedSales(newSelected)
  }

  const handleDeleteSale = async (saleId: string, saleNumber: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la vente ${saleNumber} ?`)) {
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('sales') as any).delete().eq('id', saleId)

    if (error) {
      console.error('Error deleting sale:', error)
      alert('Erreur lors de la suppression de la vente')
    } else {
      fetchSales()
      selectedSales.delete(saleId)
      setSelectedSales(new Set(selectedSales))
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedSales.size === 0) {
      alert('Veuillez sélectionner au moins une vente')
      return
    }

    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${selectedSales.size} vente(s) ?`)) {
      return
    }

    const idsToDelete = Array.from(selectedSales)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('sales') as any)
      .delete()
      .in('id', idsToDelete)

    if (error) {
      console.error('Error deleting sales:', error)
      alert('Erreur lors de la suppression des ventes')
    } else {
      fetchSales()
      setSelectedSales(new Set())
    }
  }

  const filteredSales = sales.filter(
    (sale) =>
      sale.sale_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.client?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatPrice = (price: number | null) => {
    if (price === null) return '-'
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
    }).format(price)
  }

  // Calculate stats
  const today = new Date().toISOString().split('T')[0]
  const todaySales = sales.filter(s => s.sale_date === today)
  const todayTotal = todaySales.reduce((sum, s) => sum + (s.total_ttc || 0), 0)

  const thisMonth = new Date().toISOString().slice(0, 7)
  const monthSales = sales.filter(s => s.sale_date.startsWith(thisMonth))
  const monthTotal = monthSales.reduce((sum, s) => sum + (s.total_ttc || 0), 0)

  return (
    <ProtectedModule module="ventes">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ventes</h1>
            <p className="text-gray-500">Gérez vos ventes et encaissements</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <ProtectedModule module="ventes" action="create">
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    resetForm()
                    setIsDialogOpen(true)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvelle vente
                </Button>
              </ProtectedModule>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nouvelle vente</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Bon de livraison (optionnel)</Label>
                  <Select
                    value={formData.delivery_id}
                    onValueChange={handleDeliverySelect}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un BL" />
                    </SelectTrigger>
                    <SelectContent>
                      {deliveries.map((delivery) => (
                        <SelectItem key={delivery.id} value={delivery.id}>
                          {delivery.delivery_number} - {delivery.client?.name}
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sale_date">Date de vente</Label>
                    <Input
                      id="sale_date"
                      type="date"
                      value={formData.sale_date}
                      onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="total_ht">Montant HT (DH) *</Label>
                    <Input
                      id="total_ht"
                      type="number"
                      step="0.01"
                      value={formData.total_ht}
                      onChange={(e) => setFormData({ ...formData, total_ht: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Mode de paiement</Label>
                    <Select
                      value={formData.payment_method}
                      onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Espèces</SelectItem>
                        <SelectItem value="check">Chèque</SelectItem>
                        <SelectItem value="transfer">Virement</SelectItem>
                        <SelectItem value="card">Carte</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Statut paiement</Label>
                    <Select
                      value={formData.payment_status}
                      onValueChange={(value) => setFormData({ ...formData, payment_status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">En attente</SelectItem>
                        <SelectItem value="partial">Partiel</SelectItem>
                        <SelectItem value="paid">Payé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" className="bg-green-600 hover:bg-green-700">
                    Créer la vente
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
                Ventes du jour
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DollarSign className="h-6 w-6 text-green-600" />
                <span className="text-2xl font-bold">{formatPrice(todayTotal)}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Ventes du mois
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-green-600">{formatPrice(monthTotal)}</span>
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
                {sales.filter((s) => s.payment_status === 'pending').length}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Encaissées
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-blue-600">
                {sales.filter((s) => s.payment_status === 'paid').length}
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
                  placeholder="Rechercher une vente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              {selectedSales.size > 0 && (
                <Button
                  variant="destructive"
                  onClick={handleDeleteSelected}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Supprimer ({selectedSales.size})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Chargement...</div>
            ) : filteredSales.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Aucune vente pour le moment
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedSales.size === filteredSales.length && filteredSales.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedSales(new Set(filteredSales.map(s => s.id)))
                          } else {
                            setSelectedSales(new Set())
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>N° Vente</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>BL</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Paiement</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Total TTC</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => (
                    <TableRow key={sale.id} className={selectedSales.has(sale.id) ? 'bg-red-50' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={selectedSales.has(sale.id)}
                          onCheckedChange={() => toggleSaleSelection(sale.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{sale.sale_number}</TableCell>
                      <TableCell>{sale.client?.name}</TableCell>
                      <TableCell>{sale.delivery?.delivery_number || '-'}</TableCell>
                      <TableCell>
                        {format(new Date(sale.sale_date), 'dd/MM/yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        {sale.payment_method ? paymentMethodLabels[sale.payment_method] : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={paymentStatusColors[sale.payment_status]}>
                          {paymentStatusLabels[sale.payment_status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatPrice(sale.total_ttc)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewSale(sale)}
                            title="Voir détails"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteSale(sale.id, sale.sale_number)}
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
          </CardContent>
        </Card>

        {/* View Sale Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Vente {viewingSale?.sale_number}
              </DialogTitle>
            </DialogHeader>
            {viewingSale && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-700">Client</h3>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="font-medium">{viewingSale.client?.code} - {viewingSale.client?.name}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-700">Détails</h3>
                    <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                      <p className="text-sm">
                        <span className="text-gray-600">Date:</span>{' '}
                        {format(new Date(viewingSale.sale_date), 'dd MMMM yyyy', { locale: fr })}
                      </p>
                      {viewingSale.delivery && (
                        <p className="text-sm">
                          <span className="text-gray-600">BL:</span>{' '}
                          {viewingSale.delivery.delivery_number}
                        </p>
                      )}
                      <p className="text-sm">
                        <span className="text-gray-600">Mode:</span>{' '}
                        {viewingSale.payment_method ? paymentMethodLabels[viewingSale.payment_method] : '-'}
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-gray-600 text-sm">Statut:</span>
                        <Badge className={paymentStatusColors[viewingSale.payment_status]}>
                          {paymentStatusLabels[viewingSale.payment_status]}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total HT:</span>
                        <span className="font-medium">{formatPrice(viewingSale.total_ht)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">TVA (20%):</span>
                        <span className="font-medium">{formatPrice((viewingSale.total_ht || 0) * 0.2)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold border-t pt-2">
                        <span>Total TTC:</span>
                        <span className="text-green-600">{formatPrice(viewingSale.total_ttc)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setIsViewDialogOpen(false)}
                  >
                    Fermer
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
