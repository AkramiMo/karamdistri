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
import { Plus, Search, DollarSign, Eye, Trash2, Wallet } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Sale {
  id: string
  sale_number: string
  delivery_id: string | null
  client_id: string | null
  return_id: string | null
  rblt_number: string | null
  sale_date: string
  total_ht: number | null
  total_ttc: number | null
  amount_paid: number | null
  balance_due: number | null
  mb: number | null
  payment_method: string | null
  payment_status: string
  client?: { name: string; code: string }
  delivery?: { delivery_number: string }
  return?: { round?: { round_number: string } }
}

interface Delivery {
  id: string
  delivery_number: string
  client_id: string
  total_ht: number | null
  client?: { name: string }
}

interface SaleDelivery {
  delivery_number: string
  client_code: string
  recette_bl: number
  status: string
}

interface Client {
  id: string
  code: string
  name: string
}

const paymentStatusColors: Record<string, string> = {
  pending: 'bg-red-100 text-red-800',
  paid: 'bg-amber-100 text-[#9A7209]',
  partial: 'bg-blue-100 text-blue-800',
  returned: 'bg-orange-100 text-orange-800',
  cancelled: 'bg-red-100 text-red-800',
}

const paymentStatusLabels: Record<string, string> = {
  pending: 'Non réglée',
  paid: 'Réglée',
  partial: 'Partiellement réglée',
  returned: 'Retour',
  cancelled: 'Annulée',
}

const paymentMethodLabels: Record<string, string> = {
  cash: 'Espèces',
  check: 'Chèque',
  transfer: 'Virement',
  card: 'Carte',
}

const deliveryStatusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
  partial: 'bg-orange-100 text-orange-800',
  returned: 'bg-red-100 text-red-800',
}

const deliveryStatusLabels: Record<string, string> = {
  pending: 'En attente',
  in_progress: 'En cours',
  delivered: 'Livrée',
  partial: 'Partielle',
  returned: 'Retournée',
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
  const [saleDeliveries, setSaleDeliveries] = useState<SaleDelivery[]>([])
  const [isLoadingDeliveries, setIsLoadingDeliveries] = useState(false)
  const [selectedSales, setSelectedSales] = useState<Set<string>>(new Set())
  const supabase = createClient()

  const [formData, setFormData] = useState({
    delivery_id: '',
    client_id: '',
    sale_date: new Date().toISOString().split('T')[0],
    total_ht: '',
    payment_method: 'cash',
    payment_status: 'paid',
  })

  const fetchSales = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        client:clients(name, code),
        delivery:deliveries(delivery_number),
        return:delivery_returns(round:delivery_rounds(round_number))
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

  // Generate unique sequential sale/invoice number from database
  const generateSaleNumber = async (): Promise<string> => {
    const year = new Date().getFullYear()
    const prefix = `VTE-${year}-`

    try {
      // Query the last sale number for this year
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('sales') as any)
        .select('sale_number')
        .like('sale_number', `${prefix}%`)
        .order('sale_number', { ascending: false })
        .limit(1)

      if (data && data.length > 0) {
        // Extract number from last sale_number (e.g., "VTE-2025-000123" -> 123)
        const lastNumber = parseInt(data[0].sale_number.replace(prefix, '')) || 0
        return `${prefix}${(lastNumber + 1).toString().padStart(6, '0')}`
      }

      // First sale of the year
      return `${prefix}000001`
    } catch (err) {
      console.error('Error generating sale number:', err)
      // Fallback to timestamp-based
      const timestamp = Date.now().toString().slice(-6)
      return `${prefix}${timestamp}`
    }
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

    // Generate sequential sale number
    const saleNumber = await generateSaleNumber()

    const selectedClient = clients.find(c => c.id === formData.client_id)

    // Récupérer les montants payés de la livraison si elle existe
    let amountPaid = 0
    let balanceDue = total_ttc
    let paymentStatus = formData.payment_status

    if (formData.delivery_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: deliveryData } = await (supabase.from('deliveries') as any)
        .select('amount_paid, balance_due, payment_status')
        .eq('id', formData.delivery_id)
        .single()

      if (deliveryData) {
        amountPaid = deliveryData.amount_paid || 0
        balanceDue = deliveryData.balance_due ?? total_ttc
        paymentStatus = deliveryData.payment_status || formData.payment_status
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: saleData, error } = await (supabase.from('sales') as any).insert([{
      sale_number: saleNumber,
      delivery_id: formData.delivery_id || null,
      client_id: formData.client_id,
      sale_date: formData.sale_date,
      total_ht,
      total_ttc,
      amount_paid: amountPaid,
      balance_due: balanceDue,
      payment_method: formData.payment_method,
      payment_status: paymentStatus,
    }]).select().single()

    if (error) {
      console.error('Error creating sale:', error)
      alert(`Erreur création vente: ${error.message}`)
      return
    }

    // Insérer les articles vendus dans articles_vendus si un BL est lié
    let calculatedMB = 0
    if (saleData && formData.delivery_id) {
      // Récupérer les articles du BL avec le CR
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: deliveryItems, error: diError } = await (supabase
        .from('delivery_items')
        .select('id, article_id, quantity_delivered, quantity_returned, unit_price, article:articles(code, name, cr)')
        .eq('delivery_id', formData.delivery_id) as any)

      if (diError) {
        console.error('Error fetching delivery items:', diError)
      } else if (deliveryItems && deliveryItems.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const articlesVendusData: any[] = []
        for (const di of deliveryItems) {
          const qtySold = (di.quantity_delivered || 0) - (di.quantity_returned || 0)
          if (qtySold > 0) {
            // Calculer la marge pour cet article: (Prix HT - CR) * quantité
            const articleCR = di.article?.cr || 0
            const articleMarge = (di.unit_price - articleCR) * qtySold
            calculatedMB += articleMarge

            articlesVendusData.push({
              sale_id: saleData.id,
              sale_date: formData.sale_date,
              sale_number: saleNumber,
              article_id: di.article_id,
              article_code: di.article?.code || '',
              client_id: formData.client_id,
              client_code: selectedClient?.code || '',
              quantity_sold: qtySold,
              delivery_id: formData.delivery_id,
            })
          }
        }
        if (articlesVendusData.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: avError } = await (supabase.from('articles_vendus') as any).insert(articlesVendusData)
          if (avError) {
            console.error('Error inserting articles vendus:', avError)
          }

          // Déduire du stock chaque article vendu
          for (const av of articlesVendusData) {
            // Mouvement de stock (sortie)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from('stock_movements') as any).insert([{
              article_id: av.article_id,
              quantity: -av.quantity_sold,
              movement_type: 'out',
              reference_type: 'vente',
              reference_id: saleData.id,
              notes: `Vente ${saleNumber} - ${av.article_code}`,
            }])

            // Mettre à jour le stock
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: existingStock } = await (supabase.from('stock') as any)
              .select('id, quantity')
              .eq('article_id', av.article_id)
              .eq('warehouse', 'principal')
              .single()

            if (existingStock) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (supabase.from('stock') as any)
                .update({ quantity: existingStock.quantity - av.quantity_sold, updated_at: new Date().toISOString() })
                .eq('id', existingStock.id)
            } else {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (supabase.from('stock') as any).insert([{
                article_id: av.article_id,
                quantity: -av.quantity_sold,
                warehouse: 'principal',
              }])
            }
          }
        }

        // Mettre à jour la vente avec le MB calculé
        if (calculatedMB !== 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('sales') as any)
            .update({ mb: calculatedMB })
            .eq('id', saleData.id)
        }
      }
    }

    // Ajouter automatiquement à la caisse
    const clientName = selectedClient?.name || ''
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('cash_register') as any).insert([{
      operation_type: 'in',
      category: 'vente',
      amount: total_ttc,
      reference: saleNumber,
      reference_id: saleData?.id || null,
      notes: `Vente ${saleNumber} - ${clientName}`,
      transaction_date: formData.sale_date,
    }])

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
      payment_status: 'paid',
    })
  }

  const fetchSaleDeliveries = async (sale: Sale) => {
    setIsLoadingDeliveries(true)
    setSaleDeliveries([])

    try {
      // Si la vente a un return_id (RBLT), charger les BL depuis le round
      if (sale.return_id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: returnData } = await (supabase
          .from('delivery_returns')
          .select('round_id')
          .eq('id', sale.return_id)
          .single() as any)

        if (returnData?.round_id) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: roundItems } = await (supabase
            .from('delivery_round_items')
            .select(`
              delivery:deliveries(
                delivery_number,
                status,
                client:clients(code),
                delivery_items(
                  quantity_delivered,
                  quantity_returned,
                  unit_price
                )
              )
            `)
            .eq('round_id', returnData.round_id) as any)

          if (roundItems) {
            const deliveriesList: SaleDelivery[] = roundItems
              .filter((item: any) => item.delivery)
              .map((item: any) => {
                const recetteBL = item.delivery.delivery_items?.reduce(
                  (sum: number, di: any) => sum + ((di.quantity_delivered - di.quantity_returned) * di.unit_price),
                  0
                ) || 0
                return {
                  delivery_number: item.delivery.delivery_number,
                  client_code: item.delivery.client?.code || '-',
                  recette_bl: recetteBL,
                  status: item.delivery.status || 'pending',
                }
              })
            setSaleDeliveries(deliveriesList)
          }
        }
      }
      // Sinon charger le BL unique si delivery_id existe
      else if (sale.delivery_id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: deliveryData } = await (supabase
          .from('deliveries')
          .select(`
            delivery_number,
            status,
            client:clients(code),
            delivery_items(
              quantity_delivered,
              quantity_returned,
              unit_price
            )
          `)
          .eq('id', sale.delivery_id)
          .single() as any)

        if (deliveryData) {
          const recetteBL = deliveryData.delivery_items?.reduce(
            (sum: number, di: any) => sum + ((di.quantity_delivered - di.quantity_returned) * di.unit_price),
            0
          ) || 0
          setSaleDeliveries([{
            delivery_number: deliveryData.delivery_number,
            client_code: deliveryData.client?.code || '-',
            recette_bl: recetteBL,
            status: deliveryData.status || 'pending',
          }])
        }
      }
    } catch (error) {
      console.error('Error fetching sale deliveries:', error)
    }
    setIsLoadingDeliveries(false)
  }

  const handleViewSale = (sale: Sale) => {
    setViewingSale(sale)
    setSaleDeliveries([])
    setIsViewDialogOpen(true)
    fetchSaleDeliveries(sale)
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
      sale.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.rblt_number?.toLowerCase().includes(searchTerm.toLowerCase())
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

          <ProtectedModule module="ventes" action="create">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className="bg-[#B8860B] hover:bg-[#9A7209]"
                  onClick={() => {
                    resetForm()
                    setIsDialogOpen(true)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvelle vente
                </Button>
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
                        <SelectItem value="paid">Réglée</SelectItem>
                        <SelectItem value="partial">Partiellement réglée</SelectItem>
                        <SelectItem value="returned">Retour</SelectItem>
                        <SelectItem value="cancelled">Annulée</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" className="bg-[#B8860B] hover:bg-[#9A7209]">
                    Créer la vente
                  </Button>
                </div>
              </form>
            </DialogContent>
            </Dialog>
          </ProtectedModule>
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
                <DollarSign className="h-6 w-6 text-[#B8860B]" />
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
              <span className="text-2xl font-bold text-[#B8860B]">{formatPrice(monthTotal)}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Réglées
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-[#B8860B]">
                {sales.filter((s) => s.payment_status === 'paid').length}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Part. réglées
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-blue-600">
                {sales.filter((s) => s.payment_status === 'partial').length}
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
                    <TableHead>Date</TableHead>
                    <TableHead>N° Vente</TableHead>
                    <TableHead>Code Client</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>BL</TableHead>
                    <TableHead className="text-right">Recette</TableHead>
                    <TableHead className="text-right">Encaissé</TableHead>
                    <TableHead className="text-right">Solde</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Total HT</TableHead>
                    <TableHead className="text-right">MB</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>
                        {format(new Date(sale.sale_date), 'dd/MM/yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell className="font-medium">{sale.sale_number}</TableCell>
                      <TableCell className="font-mono text-sm">{sale.client?.code || sale.rblt_number || '--'}</TableCell>
                      <TableCell>{sale.client?.name || (sale.rblt_number ? '---' : '--')}</TableCell>
                      <TableCell className="font-mono text-sm">{sale.return?.round?.round_number || sale.delivery?.delivery_number || '-'}</TableCell>
                      <TableCell className="text-right">{formatPrice(sale.total_ttc)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatPrice(sale.amount_paid || 0)}</TableCell>
                      <TableCell className="text-right text-red-600">{formatPrice(sale.balance_due || 0)}</TableCell>
                      <TableCell>
                        <Badge className={paymentStatusColors[sale.payment_status]}>
                          {paymentStatusLabels[sale.payment_status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatPrice(sale.total_ht)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {sale.mb !== null ? formatPrice(sale.mb) : '-'}
                      </TableCell>
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
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-[#B8860B]" />
                Vente {viewingSale?.sale_number}
              </DialogTitle>
            </DialogHeader>
            {viewingSale && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-700">Client</h3>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="font-medium">
                        {viewingSale.client?.code || viewingSale.rblt_number || '--'} - {viewingSale.client?.name || (viewingSale.rblt_number ? '---' : '--')}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-700">Détails</h3>
                    <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                      <p className="text-sm">
                        <span className="text-gray-600">Date:</span>{' '}
                        {format(new Date(viewingSale.sale_date), 'dd MMMM yyyy', { locale: fr })}
                      </p>
                      <p className="text-sm">
                        <span className="text-gray-600">{viewingSale.return?.round ? 'BLT:' : 'BL:'}</span>{' '}
                        <span className="font-mono">{viewingSale.return?.round?.round_number || viewingSale.delivery?.delivery_number || '-'}</span>
                      </p>
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

                {/* Bons de Livraison */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-700 mb-3">Bons de Livraison</h3>
                  {isLoadingDeliveries ? (
                    <div className="text-center py-4 text-gray-500">Chargement...</div>
                  ) : saleDeliveries.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">Aucun BL</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>N° BL</TableHead>
                          <TableHead>Code Client</TableHead>
                          <TableHead className="text-right">Recette BL</TableHead>
                          <TableHead>Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {saleDeliveries.map((delivery, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-mono text-sm">{delivery.delivery_number}</TableCell>
                            <TableCell className="font-mono text-sm">{delivery.client_code}</TableCell>
                            <TableCell className="text-right font-medium">{formatPrice(delivery.recette_bl)}</TableCell>
                            <TableCell>
                              <Badge className={deliveryStatusColors[delivery.status] || 'bg-gray-100 text-gray-800'}>
                                {deliveryStatusLabels[delivery.status] || delivery.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total HT:</span>
                        <span className="text-[#B8860B]">{formatPrice(viewingSale.total_ht)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold">
                        <span>Marge (MB):</span>
                        <span className={viewingSale.mb !== null && viewingSale.mb >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {viewingSale.mb !== null ? formatPrice(viewingSale.mb) : '-'}
                        </span>
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
