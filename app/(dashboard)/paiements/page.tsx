'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ProtectedModule } from '@/components/auth/ProtectedModule'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Search, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface PaymentRow {
  id: string
  payment_number: string
  amount: number
  payment_method: string
  payment_date: string
  reference: string | null
  delivery_id: string | null
  facture_id: string | null
  sale_id: string | null
  client_id: string
  created_at: string
  client?: { name: string; code: string }
  delivery?: { delivery_number: string } | null
  facture?: { facture_number: string } | null
  sale?: { sale_number: string } | null
}

interface ClientOption {
  id: string
  code: string
  name: string
}

interface SaleOption {
  id: string
  sale_number: string
  total_ttc: number
  balance_due: number
}

const paymentMethodLabels: Record<string, string> = {
  cash: 'Espèces',
  check: 'Chèque',
  transfer: 'Virement',
  card: 'Carte',
}

const paymentMethodColors: Record<string, string> = {
  cash: 'bg-green-100 text-green-800',
  check: 'bg-blue-100 text-blue-800',
  transfer: 'bg-purple-100 text-purple-800',
  card: 'bg-amber-100 text-[#9A7209]',
}

export default function PaiementsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [sales, setSales] = useState<SaleOption[]>([])
  const [linkToSale, setLinkToSale] = useState(false)
  const [formData, setFormData] = useState({
    client_id: '',
    amount: '',
    payment_method: 'cash',
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    reference: '',
    sale_id: '',
    notes: '',
  })
  const supabase = createClient()

  const fetchPayments = async () => {
    setIsLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase
      .from('payments')
      .select(`
        *,
        client:clients(name, code),
        delivery:deliveries(delivery_number),
        facture:factures(facture_number),
        sale:sales(sale_number)
      `)
      .order('created_at', { ascending: false }) as any)

    if (error) {
      console.error('Error fetching payments:', error)
    } else {
      setPayments(data || [])
    }
    setIsLoading(false)
  }

  const fetchClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, code, name')
      .order('name')
    setClients(data || [])
  }

  const fetchSalesForClient = async (clientId: string) => {
    if (!clientId) {
      setSales([])
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase
      .from('sales')
      .select('id, sale_number, total_ttc, balance_due')
      .eq('client_id', clientId)
      .gt('balance_due', 0)
      .order('created_at', { ascending: false }) as any)
    setSales(data || [])
  }

  const generatePaymentNumber = async (): Promise<string> => {
    const { data } = await supabase
      .from('payments')
      .select('payment_number')
      .like('payment_number', 'REC%')
      .order('payment_number', { ascending: false })
      .limit(1)

    if (data && data.length > 0) {
      const lastNum = parseInt(data[0].payment_number.replace('REC', ''), 10)
      return `REC${String(lastNum + 1).padStart(5, '0')}`
    }
    return 'REC00001'
  }

  const handleCreatePayment = async () => {
    if (!formData.client_id || !formData.amount) return

    setIsSaving(true)
    try {
      const paymentNumber = await generatePaymentNumber()

      const { error } = await supabase.from('payments').insert([{
        payment_number: paymentNumber,
        client_id: formData.client_id,
        amount: parseFloat(formData.amount),
        payment_method: formData.payment_method,
        payment_date: formData.payment_date,
        reference: formData.reference || null,
        sale_id: linkToSale && formData.sale_id ? formData.sale_id : null,
        notes: formData.notes || null,
      }])

      if (error) {
        console.error('Error creating payment:', error)
        alert('Erreur lors de la création du paiement')
      } else {
        setIsDialogOpen(false)
        setFormData({
          client_id: '',
          amount: '',
          payment_method: 'cash',
          payment_date: format(new Date(), 'yyyy-MM-dd'),
          reference: '',
          sale_id: '',
          notes: '',
        })
        setLinkToSale(false)
        setSales([])
        fetchPayments()
      }
    } finally {
      setIsSaving(false)
    }
  }

  const openDialog = () => {
    fetchClients()
    setIsDialogOpen(true)
  }

  useEffect(() => {
    fetchPayments()
  }, [])

  const getReference = (payment: PaymentRow): { label: string; type: string } => {
    if (payment.facture?.facture_number) {
      return { label: payment.facture.facture_number, type: 'Facture' }
    }
    if (payment.sale?.sale_number) {
      return { label: payment.sale.sale_number, type: 'Vente' }
    }
    if (payment.delivery?.delivery_number) {
      return { label: payment.delivery.delivery_number, type: 'BL' }
    }
    return { label: '-', type: '' }
  }

  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return '-'
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
    }).format(price)
  }

  const filteredPayments = payments.filter((p) => {
    const term = searchTerm.toLowerCase()
    const ref = getReference(p)
    return (
      p.payment_number.toLowerCase().includes(term) ||
      p.client?.name?.toLowerCase().includes(term) ||
      p.client?.code?.toLowerCase().includes(term) ||
      ref.label.toLowerCase().includes(term) ||
      (p.reference || '').toLowerCase().includes(term)
    )
  })

  const totalMontant = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0)

  return (
    <ProtectedModule module="paiements">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Paiements</h1>
            <p className="text-gray-500">Tous les reçus de paiement (BL, Factures et Ventes)</p>
          </div>
          <Button onClick={openDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau paiement
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par n° reçu, client, référence..."
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
            ) : filteredPayments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Aucun paiement</div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>N° Reçu</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                      <TableHead>Référence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment) => {
                      const ref = getReference(payment)
                      return (
                        <TableRow key={payment.id}>
                          <TableCell>
                            {format(new Date(payment.payment_date), 'dd/MM/yyyy', { locale: fr })}
                          </TableCell>
                          <TableCell className="font-mono font-medium">{payment.payment_number}</TableCell>
                          <TableCell>
                            <span className="font-mono text-xs text-gray-500">{payment.client?.code}</span>
                            <span className="ml-2">{payment.client?.name || '--'}</span>
                          </TableCell>
                          <TableCell>
                            <Badge className={paymentMethodColors[payment.payment_method] || 'bg-gray-100 text-gray-800'}>
                              {paymentMethodLabels[payment.payment_method] || payment.payment_method}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold text-green-700">
                            {formatPrice(payment.amount)}
                          </TableCell>
                          <TableCell>
                            {ref.type ? (
                              <span>
                                <span className="text-xs text-gray-500 mr-1">{ref.type}:</span>
                                <span className="font-mono text-sm">{ref.label}</span>
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
                <div className="flex justify-end pt-4 border-t mt-4">
                  <div className="text-sm text-gray-600">
                    Total: <span className="font-bold text-green-700 text-base ml-1">{formatPrice(totalMontant)}</span>
                    <span className="text-gray-400 ml-3">({filteredPayments.length} paiement{filteredPayments.length > 1 ? 's' : ''})</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Dialog de création de paiement */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nouveau paiement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {/* Client */}
              <div className="space-y-2">
                <Label>Client *</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => {
                    setFormData({ ...formData, client_id: value, sale_id: '' })
                    if (linkToSale) {
                      fetchSalesForClient(value)
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        <span className="font-mono text-xs text-gray-500 mr-2">{client.code}</span>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Montant */}
              <div className="space-y-2">
                <Label>Montant (MAD) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              {/* Mode de paiement */}
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

              {/* Date */}
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                />
              </div>

              {/* Référence */}
              <div className="space-y-2">
                <Label>Référence (N° chèque, virement...)</Label>
                <Input
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  placeholder="Optionnel"
                />
              </div>

              {/* Lier à une vente */}
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="linkToSale"
                  checked={linkToSale}
                  onCheckedChange={(checked) => {
                    setLinkToSale(checked === true)
                    if (checked && formData.client_id) {
                      fetchSalesForClient(formData.client_id)
                    } else {
                      setSales([])
                      setFormData({ ...formData, sale_id: '' })
                    }
                  }}
                />
                <Label htmlFor="linkToSale" className="cursor-pointer">
                  Lier à une vente
                </Label>
              </div>

              {/* Sélection de la vente */}
              {linkToSale && (
                <div className="space-y-2">
                  <Label>Vente</Label>
                  <Select
                    value={formData.sale_id}
                    onValueChange={(value) => setFormData({ ...formData, sale_id: value })}
                    disabled={!formData.client_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={formData.client_id ? "Sélectionner une vente" : "Sélectionnez d'abord un client"} />
                    </SelectTrigger>
                    <SelectContent>
                      {sales.length === 0 ? (
                        <div className="px-2 py-1 text-sm text-gray-500">Aucune vente avec solde</div>
                      ) : (
                        sales.map((sale) => (
                          <SelectItem key={sale.id} value={sale.id}>
                            <span className="font-mono">{sale.sale_number}</span>
                            <span className="ml-2 text-gray-500">
                              (Solde: {new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(sale.balance_due)})
                            </span>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Boutons */}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button
                  onClick={handleCreatePayment}
                  disabled={isSaving || !formData.client_id || !formData.amount}
                >
                  {isSaving ? 'Enregistrement...' : 'Créer'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedModule>
  )
}
