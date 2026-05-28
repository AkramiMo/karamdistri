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
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Search, Wallet, Plus, AlertTriangle, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface FactureRow {
  id: string
  facture_number: string
  facture_date: string
  client_id: string
  total_ttc: number
  due_date: string | null
  status: string
  client?: { name: string; code: string }
}

interface Payment {
  id: string
  payment_number: string
  amount: number
  payment_method: string
  payment_date: string
  reference: string | null
  notes: string | null
  created_at: string
}

const paymentMethodLabels: Record<string, string> = {
  cash: 'Espèces',
  check: 'Chèque',
  transfer: 'Virement',
  card: 'Carte',
}

export default function SuiviPaiementsPage() {
  const [factures, setFactures] = useState<FactureRow[]>([])
  const [paymentsMap, setPaymentsMap] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isPayDialogOpen, setIsPayDialogOpen] = useState(false)
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false)
  const [selectedFacture, setSelectedFacture] = useState<FactureRow | null>(null)
  const [facturePayments, setFacturePayments] = useState<Payment[]>([])
  const supabase = createClient()

  const [payForm, setPayForm] = useState({
    amount: '',
    payment_method: 'cash',
    payment_date: new Date().toISOString().split('T')[0],
    reference: '',
  })

  const fetchData = async () => {
    setIsLoading(true)

    // Fetch factures
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: facturesData } = await (supabase
      .from('factures')
      .select('id, facture_number, facture_date, client_id, total_ttc, due_date, status, client:clients(name, code)')
      .order('facture_date', { ascending: false }) as any)

    setFactures(facturesData || [])

    // Fetch sum of payments per facture
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: paymentsData } = await (supabase
      .from('payments')
      .select('facture_id, amount') as any)

    const map: Record<string, number> = {}
    if (paymentsData) {
      for (const p of paymentsData) {
        if (p.facture_id) {
          map[p.facture_id] = (map[p.facture_id] || 0) + (p.amount || 0)
        }
      }
    }
    setPaymentsMap(map)

    setIsLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const getPaye = (factureId: string) => paymentsMap[factureId] || 0
  const getReste = (facture: FactureRow) => Math.round(((facture.total_ttc || 0) - getPaye(facture.id)) * 100) / 100

  const getPaymentStatus = (facture: FactureRow): { label: string; color: string } => {
    const paye = getPaye(facture.id)
    const reste = getReste(facture)

    if (facture.status === 'cancelled') return { label: 'Annulée', color: 'bg-red-200 text-red-900' }
    if (paye === 0) {
      // Check overdue
      if (facture.due_date) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        if (new Date(facture.due_date) < today) {
          return { label: 'En retard', color: 'bg-red-100 text-red-800' }
        }
      }
      return { label: 'Non payée', color: 'bg-gray-100 text-gray-800' }
    }
    if (reste <= 0) return { label: 'Payée', color: 'bg-amber-100 text-[#9A7209]' }
    // Check overdue for partial
    if (facture.due_date) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (new Date(facture.due_date) < today) {
        return { label: 'Partielle / Retard', color: 'bg-red-100 text-red-800' }
      }
    }
    return { label: 'Partielle', color: 'bg-orange-100 text-orange-800' }
  }

  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return '-'
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
    }).format(price)
  }

  const handleOpenPay = (facture: FactureRow) => {
    setSelectedFacture(facture)
    const reste = getReste(facture)
    setPayForm({
      amount: reste > 0 ? reste.toString() : '',
      payment_method: 'cash',
      payment_date: new Date().toISOString().split('T')[0],
      reference: facture.facture_number,
    })
    setIsPayDialogOpen(true)
  }

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFacture) return

    const amount = parseFloat(payForm.amount)
    if (!amount || amount <= 0) {
      alert('Veuillez saisir un montant valide')
      return
    }

    // Generate payment number
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: numData } = await (supabase as any).rpc('generate_payment_number')
    const paymentNumber = numData || `REC${Date.now()}`

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('payments') as any).insert([{
      payment_number: paymentNumber,
      client_id: selectedFacture.client_id,
      facture_id: selectedFacture.id,
      amount,
      payment_method: payForm.payment_method,
      payment_date: payForm.payment_date,
      reference: payForm.reference || null,
    }])

    if (error) {
      console.error('Error creating payment:', error)
      alert(`Erreur: ${error.message}`)
      return
    }

    // Update facture status based on payment
    const newPaye = getPaye(selectedFacture.id) + amount
    const newReste = (selectedFacture.total_ttc || 0) - newPaye
    let newStatus = selectedFacture.status
    if (newReste <= 0) {
      newStatus = 'paid'
    } else if (newPaye > 0 && selectedFacture.status !== 'cancelled') {
      newStatus = 'partial'
    }

    if (newStatus !== selectedFacture.status) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('factures') as any).update({ status: newStatus }).eq('id', selectedFacture.id)
    }

    // Ajouter à la caisse
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('cash_register') as any).insert([{
      operation_type: 'in',
      category: 'vente',
      amount,
      reference: selectedFacture.facture_number,
      transaction_date: payForm.payment_date,
    }])

    setIsPayDialogOpen(false)
    fetchData()
  }

  const handleViewHistory = async (facture: FactureRow) => {
    setSelectedFacture(facture)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase
      .from('payments')
      .select('id, payment_number, amount, payment_method, payment_date, reference, notes, created_at')
      .eq('facture_id', facture.id)
      .order('payment_date', { ascending: false }) as any)
    setFacturePayments(data || [])
    setIsHistoryDialogOpen(true)
  }

  const filteredFactures = factures.filter(
    (f) =>
      f.facture_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.client?.code?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Stats
  const totalTTC = factures.reduce((sum, f) => sum + (f.total_ttc || 0), 0)
  const totalPaye = factures.reduce((sum, f) => sum + getPaye(f.id), 0)
  const totalReste = Math.round((totalTTC - totalPaye) * 100) / 100
  const overdueCount = factures.filter(f => {
    const status = getPaymentStatus(f)
    return status.label.includes('Retard')
  }).length

  return (
    <ProtectedModule module="suivi-paiements">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suivi Paiements Factures</h1>
          <p className="text-gray-500">Suivi des paiements et encaissements par facture</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total TTC</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-[#B8860B]">{formatPrice(totalTTC)}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Payé</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-green-700">{formatPrice(totalPaye)}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Reste</CardTitle>
            </CardHeader>
            <CardContent>
              <span className={`text-2xl font-bold ${totalReste > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                {formatPrice(totalReste)}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Factures en retard</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {overdueCount > 0 && <AlertTriangle className="h-5 w-5 text-red-500" />}
                <span className={`text-2xl font-bold ${overdueCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                  {overdueCount}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par n° facture, client..."
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
            ) : filteredFactures.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Aucune facture</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Facture</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Total TTC</TableHead>
                    <TableHead className="text-right">Payé</TableHead>
                    <TableHead className="text-right">Reste</TableHead>
                    <TableHead>Échéance</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFactures.map((facture) => {
                    const paye = getPaye(facture.id)
                    const reste = getReste(facture)
                    const status = getPaymentStatus(facture)

                    return (
                      <TableRow key={facture.id}>
                        <TableCell className="font-medium">{facture.facture_number}</TableCell>
                        <TableCell>
                          <div>
                            <span className="font-mono text-xs text-gray-500">{facture.client?.code}</span>
                            <span className="ml-2">{facture.client?.name || '--'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatPrice(facture.total_ttc)}</TableCell>
                        <TableCell className="text-right text-green-700 font-medium">{formatPrice(paye)}</TableCell>
                        <TableCell className={`text-right font-bold ${reste > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                          {formatPrice(reste)}
                        </TableCell>
                        <TableCell>
                          {facture.due_date
                            ? format(new Date(facture.due_date), 'dd/MM/yyyy', { locale: fr })
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className={status.color}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewHistory(facture)}
                              title="Historique paiements"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {reste > 0 && facture.status !== 'cancelled' && (
                              <ProtectedModule module="suivi-paiements" action="create">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-[#B8860B] hover:text-[#9A7209]"
                                  onClick={() => handleOpenPay(facture)}
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Payer
                                </Button>
                              </ProtectedModule>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Payment Dialog */}
        <Dialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-[#B8860B]" />
                Enregistrer un paiement
              </DialogTitle>
            </DialogHeader>
            {selectedFacture && (
              <form onSubmit={handleSubmitPayment} className="space-y-4">
                <div className="bg-gray-50 p-3 rounded-lg space-y-1 text-sm">
                  <p><span className="text-gray-600">Facture:</span> <span className="font-medium">{selectedFacture.facture_number}</span></p>
                  <p><span className="text-gray-600">Client:</span> {selectedFacture.client?.name}</p>
                  <p><span className="text-gray-600">Total TTC:</span> <span className="font-medium">{formatPrice(selectedFacture.total_ttc)}</span></p>
                  <p><span className="text-gray-600">Déjà payé:</span> <span className="text-green-700 font-medium">{formatPrice(getPaye(selectedFacture.id))}</span></p>
                  <p><span className="text-gray-600">Reste à payer:</span> <span className="text-red-600 font-bold">{formatPrice(getReste(selectedFacture))}</span></p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pay_amount">Montant (MAD) *</Label>
                  <Input
                    id="pay_amount"
                    type="number"
                    step="0.01"
                    max={getReste(selectedFacture)}
                    value={payForm.amount}
                    onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Mode de paiement</Label>
                  <Select
                    value={payForm.payment_method}
                    onValueChange={(value) => setPayForm({ ...payForm, payment_method: value })}
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
                  <Label htmlFor="pay_date">Date de paiement</Label>
                  <Input
                    id="pay_date"
                    type="date"
                    value={payForm.payment_date}
                    onChange={(e) => setPayForm({ ...payForm, payment_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pay_reference">Référence (N° chèque, virement...)</Label>
                  <Input
                    id="pay_reference"
                    value={payForm.reference}
                    onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })}
                    placeholder="Optionnel"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsPayDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" className="bg-[#B8860B] hover:bg-[#9A7209]">
                    Enregistrer le paiement
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* History Dialog */}
        <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-[#B8860B]" />
                Historique paiements - {selectedFacture?.facture_number}
              </DialogTitle>
            </DialogHeader>
            {selectedFacture && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <p className="text-xs text-gray-500">Total TTC</p>
                    <p className="font-bold text-lg">{formatPrice(selectedFacture.total_ttc)}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg text-center">
                    <p className="text-xs text-gray-500">Payé</p>
                    <p className="font-bold text-lg text-green-700">{formatPrice(getPaye(selectedFacture.id))}</p>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg text-center">
                    <p className="text-xs text-gray-500">Reste</p>
                    <p className="font-bold text-lg text-red-600">{formatPrice(getReste(selectedFacture))}</p>
                  </div>
                </div>

                {facturePayments.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">Aucun paiement enregistré</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>N° Reçu</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead>Référence</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {facturePayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            {format(new Date(payment.payment_date), 'dd/MM/yyyy', { locale: fr })}
                          </TableCell>
                          <TableCell className="font-mono text-sm">{payment.payment_number}</TableCell>
                          <TableCell>{paymentMethodLabels[payment.payment_method] || payment.payment_method}</TableCell>
                          <TableCell className="text-sm text-gray-600">{payment.reference || '-'}</TableCell>
                          <TableCell className="text-right font-bold text-green-700">
                            {formatPrice(payment.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                <div className="flex justify-end pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsHistoryDialogOpen(false)}>
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
