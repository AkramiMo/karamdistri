'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ProtectedModule } from '@/components/auth/ProtectedModule'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, CreditCard, FileText, Truck, Loader2, Download, Banknote, Calendar } from 'lucide-react'
import { generateSituationClientPDF } from '@/lib/pdf/situationClient'
import { useCompanySettings } from '@/hooks/useCompanySettings'
import { format, startOfMonth, endOfMonth, startOfYear } from 'date-fns'

interface Client {
  id: string
  code: string
  name: string
  phone: string | null
  address: string | null
  city: string | null
  ice: string | null
}

interface Facture {
  id: string
  facture_number: string
  facture_date: string
  total_ttc: number
  status: string
  due_date: string | null
  delivery_numbers?: string[]
}

interface Delivery {
  id: string
  delivery_number: string
  delivery_date: string
  total_ht: number
  amount_paid: number
  balance_due: number
  payment_status: string
}

interface Payment {
  id: string
  payment_number: string
  payment_date: string
  amount: number
  payment_method: string
  reference: string | null
  delivery_number?: string | null
  facture_number?: string | null
}

interface ClientDebt {
  client: Client
  totalDebt: number
  unpaidInvoices: Facture[]
  unpaidDeliveries: Delivery[]
  payments: Payment[]
}

const formatCurrency = (amount: number) => {
  const formatted = amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${formatted} MAD`
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

const statusLabels: Record<string, string> = {
  draft: 'Brouillon',
  sent: 'Envoyée',
  partial: 'Partiel',
  partially_paid: 'Partiel',
  overdue: 'En retard',
  pending: 'En attente',
  paid: 'Payé',
  unpaid: 'Non payé',
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  partial: 'bg-yellow-100 text-yellow-800',
  partially_paid: 'bg-yellow-100 text-yellow-800',
  overdue: 'bg-red-100 text-red-800',
  pending: 'bg-orange-100 text-orange-800',
  paid: 'bg-green-100 text-green-800',
  unpaid: 'bg-red-100 text-red-800',
}

const paymentMethodLabels: Record<string, string> = {
  cash: 'Espèces',
  cash_deposit: "Versement d'espèces",
  check: 'Chèque',
  transfer: 'Virement',
  card: 'Carte',
}

export default function DettePage() {
  const [clientDebts, setClientDebts] = useState<ClientDebt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClient, setSelectedClient] = useState<ClientDebt | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('summary')
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  // Filtres de période
  const today = new Date()
  const [dateFrom, setDateFrom] = useState(format(startOfYear(today), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(today, 'yyyy-MM-dd'))

  const supabase = createClient()
  const { companySettings } = useCompanySettings()

  const fetchClientDebts = async () => {
    setIsLoading(true)

    try {
      // Récupérer tous les clients avec plus de détails
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, code, name, phone, address, city, ice')
        .eq('is_active', true)
        .order('code')

      if (clientsError) {
        console.error('Error fetching clients:', clientsError)
        return
      }

      // Récupérer toutes les factures non payées dans la période
      const { data: unpaidInvoices, error: invoicesError } = await supabase
        .from('factures')
        .select('id, facture_number, facture_date, total_ttc, status, due_date, client_id')
        .neq('status', 'paid')
        .neq('status', 'cancelled')
        .gte('facture_date', dateFrom)
        .lte('facture_date', dateTo)

      if (invoicesError) {
        console.error('Error fetching invoices:', invoicesError)
        return
      }

      // Récupérer tous les BL liés à des factures (via facture_deliveries) avec les infos du BL
      const { data: factureDeliveries, error: fdError } = await supabase
        .from('facture_deliveries')
        .select('facture_id, delivery_id, deliveries(delivery_number)')

      if (fdError) {
        console.error('Error fetching facture_deliveries:', fdError)
        return
      }

      const deliveryIdsInFactures = new Set(factureDeliveries?.map(fd => fd.delivery_id) || [])

      // Créer un map facture_id -> delivery_numbers
      const factureDeliveryMap: Record<string, string[]> = {}
      factureDeliveries?.forEach(fd => {
        if (!factureDeliveryMap[fd.facture_id]) {
          factureDeliveryMap[fd.facture_id] = []
        }
        const deliveryNumber = (fd.deliveries as any)?.delivery_number
        if (deliveryNumber) {
          factureDeliveryMap[fd.facture_id].push(deliveryNumber)
        }
      })

      // Récupérer tous les BL non payés dans la période
      const { data: allDeliveries, error: deliveriesError } = await supabase
        .from('deliveries')
        .select('id, delivery_number, delivery_date, total_ht, amount_paid, balance_due, payment_status, client_id')
        .neq('payment_status', 'paid')
        .gte('delivery_date', dateFrom)
        .lte('delivery_date', dateTo)

      if (deliveriesError) {
        console.error('Error fetching deliveries:', deliveriesError)
        return
      }

      // Filtrer les BL qui ne sont pas dans une facture
      const unpaidDeliveriesNotInFacture = allDeliveries?.filter(
        d => !deliveryIdsInFactures.has(d.id)
      ) || []

      // Collecter tous les IDs de BL et factures de la période
      const allDeliveryIds = allDeliveries?.map(d => d.id) || []
      const allFactureIds = unpaidInvoices?.map(f => f.id) || []

      // Récupérer les paiements liés aux BL de la période
      let linkedPayments: any[] = []

      if (allDeliveryIds.length > 0) {
        const { data: deliveryPayments, error: dpError } = await supabase
          .from('payments')
          .select('id, payment_number, payment_date, amount, payment_method, reference, client_id, delivery_id, facture_id, deliveries(delivery_number), factures(facture_number)')
          .in('delivery_id', allDeliveryIds)
          .order('payment_date', { ascending: false })

        if (!dpError && deliveryPayments) {
          linkedPayments = [...linkedPayments, ...deliveryPayments]
        }
      }

      // Récupérer les paiements liés aux factures de la période
      if (allFactureIds.length > 0) {
        const { data: facturePayments, error: fpError } = await supabase
          .from('payments')
          .select('id, payment_number, payment_date, amount, payment_method, reference, client_id, delivery_id, facture_id, deliveries(delivery_number), factures(facture_number)')
          .in('facture_id', allFactureIds)
          .order('payment_date', { ascending: false })

        if (!fpError && facturePayments) {
          // Éviter les doublons (paiements déjà ajoutés via delivery_id)
          const existingIds = new Set(linkedPayments.map(p => p.id))
          facturePayments.forEach(p => {
            if (!existingIds.has(p.id)) {
              linkedPayments.push(p)
            }
          })
        }
      }

      // Trier par date décroissante
      linkedPayments.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())

      // Calculer la dette par client
      const debtsByClient: Record<string, ClientDebt> = {}

      clients?.forEach(client => {
        debtsByClient[client.id] = {
          client,
          totalDebt: 0,
          unpaidInvoices: [],
          unpaidDeliveries: [],
          payments: [],
        }
      })

      // Ajouter les factures impayées
      unpaidInvoices?.forEach(invoice => {
        if (debtsByClient[invoice.client_id]) {
          debtsByClient[invoice.client_id].unpaidInvoices.push({
            id: invoice.id,
            facture_number: invoice.facture_number,
            facture_date: invoice.facture_date,
            total_ttc: Number(invoice.total_ttc),
            status: invoice.status,
            due_date: invoice.due_date,
            delivery_numbers: factureDeliveryMap[invoice.id] || [],
          })
          debtsByClient[invoice.client_id].totalDebt += Number(invoice.total_ttc)
        }
      })

      // Ajouter les BL non payés (hors facture)
      unpaidDeliveriesNotInFacture.forEach(delivery => {
        if (debtsByClient[delivery.client_id]) {
          // Calculer le solde dû : utiliser balance_due seulement s'il est > 0, sinon calculer
          const calculatedBalance = delivery.total_ht - (delivery.amount_paid || 0)
          const balanceDue = (delivery.balance_due && delivery.balance_due > 0) ? delivery.balance_due : calculatedBalance
          debtsByClient[delivery.client_id].unpaidDeliveries.push({
            id: delivery.id,
            delivery_number: delivery.delivery_number,
            delivery_date: delivery.delivery_date,
            total_ht: Number(delivery.total_ht),
            amount_paid: Number(delivery.amount_paid || 0),
            balance_due: Number(balanceDue),
            payment_status: delivery.payment_status,
          })
          debtsByClient[delivery.client_id].totalDebt += Number(balanceDue)
        }
      })

      // Ajouter les paiements liés aux BL/factures de la période
      linkedPayments.forEach(payment => {
        if (payment.client_id && debtsByClient[payment.client_id]) {
          debtsByClient[payment.client_id].payments.push({
            id: payment.id,
            payment_number: payment.payment_number,
            payment_date: payment.payment_date,
            amount: Number(payment.amount),
            payment_method: payment.payment_method,
            reference: payment.reference,
            delivery_number: (payment.deliveries as any)?.delivery_number || null,
            facture_number: (payment.factures as any)?.facture_number || null,
          })
        }
      })

      // Filtrer uniquement les clients avec dette > 0 et trier par dette décroissante
      const clientsWithDebt = Object.values(debtsByClient)
        .filter(cd => cd.totalDebt > 0)
        .sort((a, b) => b.totalDebt - a.totalDebt)

      setClientDebts(clientsWithDebt)
    } catch (error) {
      console.error('Error calculating debts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchClientDebts()
  }, [dateFrom, dateTo])

  const handleRowClick = (clientDebt: ClientDebt) => {
    setSelectedClient(clientDebt)
    setActiveTab('summary')
    setIsDetailOpen(true)
  }

  const handleGeneratePDF = async () => {
    if (!selectedClient) return

    setIsGeneratingPDF(true)
    try {
      await generateSituationClientPDF(
        {
          client: selectedClient.client,
          period: { from: dateFrom, to: dateTo },
          deliveries: selectedClient.unpaidDeliveries,
          factures: selectedClient.unpaidInvoices,
          payments: selectedClient.payments,
          totalDebt: selectedClient.totalDebt,
        },
        '/Logo.png',
        {
          ice: companySettings?.ice,
          if_number: companySettings?.if_number,
          tp: companySettings?.patente,
        }
      )
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Erreur lors de la génération du PDF')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  // Calculer le vrai solde dû (totalDebt - paiements sur factures)
  const getRealDebt = (cd: ClientDebt) => {
    const facturePayments = cd.payments
      .filter(p => p.facture_number)
      .reduce((sum, p) => sum + p.amount, 0)
    return cd.totalDebt - facturePayments
  }

  const filteredDebts = clientDebts.filter(cd => {
    const search = searchTerm.toLowerCase().trim()
    const hasDebt = getRealDebt(cd) > 0
    return hasDebt && (!search ||
      cd.client.code.toLowerCase().includes(search) ||
      cd.client.name.toLowerCase().includes(search))
  })

  const totalGlobalDebt = filteredDebts.reduce((sum, cd) => sum + getRealDebt(cd), 0)

  // Période rapide
  const setPeriodThisMonth = () => {
    setDateFrom(format(startOfMonth(today), 'yyyy-MM-dd'))
    setDateTo(format(endOfMonth(today), 'yyyy-MM-dd'))
  }

  const setPeriodThisYear = () => {
    setDateFrom(format(startOfYear(today), 'yyyy-MM-dd'))
    setDateTo(format(today, 'yyyy-MM-dd'))
  }

  const setPeriodAll = () => {
    setDateFrom('2020-01-01')
    setDateTo(format(today, 'yyyy-MM-dd'))
  }

  return (
    <ProtectedModule module="clients">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dette Clients</h1>
            <p className="text-gray-500">
              Suivi des créances clients ({filteredDebts.length} clients avec dette)
            </p>
          </div>
        </div>

        {/* Filtres de période */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Filtrer par période
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Du</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Au</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={setPeriodThisMonth}>
                  Ce mois
                </Button>
                <Button variant="outline" size="sm" onClick={setPeriodThisYear}>
                  Cette année
                </Button>
                <Button variant="outline" size="sm" onClick={setPeriodAll}>
                  Tout
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Card */}
        <Card className="bg-red-50 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Total des créances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-red-600" />
              <span className="text-2xl font-bold text-red-700">{formatCurrency(totalGlobalDebt)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Search & Table */}
        <Card>
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher par code ou nom client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-gray-500">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Chargement des données...
              </div>
            ) : filteredDebts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? 'Aucun client trouvé' : 'Aucune dette client pour cette période'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code Client</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead className="text-right">Valeur Dette</TableHead>
                      <TableHead className="text-center">Factures</TableHead>
                      <TableHead className="text-center">BL</TableHead>
                      <TableHead className="text-center">Paiements</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDebts.map((cd) => (
                      <TableRow
                        key={cd.client.id}
                        className="cursor-pointer hover:bg-amber-50"
                        onClick={() => handleRowClick(cd)}
                      >
                        <TableCell className="font-medium">{cd.client.code}</TableCell>
                        <TableCell>{cd.client.name}</TableCell>
                        <TableCell className="text-right font-semibold text-red-600">
                          {formatCurrency(getRealDebt(cd))}
                        </TableCell>
                        <TableCell className="text-center">
                          {cd.unpaidInvoices.length > 0 ? (
                            <Badge variant="outline" className="bg-blue-50">
                              {cd.unpaidInvoices.length}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {cd.unpaidDeliveries.length > 0 ? (
                            <Badge variant="outline" className="bg-orange-50">
                              {cd.unpaidDeliveries.length}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {cd.payments.length > 0 ? (
                            <Badge variant="outline" className="bg-green-50">
                              {cd.payments.length}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Modal */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-[90vw] w-[900px] max-h-[90vh] overflow-y-auto resize overflow-auto min-w-[400px] min-h-[300px]">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-red-600" />
                  Situation - {selectedClient?.client.name}
                </DialogTitle>
                <Button
                  onClick={handleGeneratePDF}
                  disabled={isGeneratingPDF}
                  className="bg-[#B8860B] hover:bg-[#9A7209]"
                >
                  {isGeneratingPDF ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Télécharger PDF
                </Button>
              </div>
            </DialogHeader>

            {selectedClient && (
              <div className="space-y-6">
                {/* Résumé */}
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-red-600">
                        Code: <span className="font-medium">{selectedClient.client.code}</span>
                        {selectedClient.client.phone && (
                          <span className="ml-4">Tél: {selectedClient.client.phone}</span>
                        )}
                      </p>
                      <p className="text-lg font-semibold text-red-700">{selectedClient.client.name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Période: {formatDate(dateFrom)} - {formatDate(dateTo)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-red-600">Solde dû</p>
                      <p className="text-2xl font-bold text-red-700">{formatCurrency(getRealDebt(selectedClient))}</p>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="summary" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Résumé
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Documents
                    </TabsTrigger>
                    <TabsTrigger value="payments" className="flex items-center gap-2">
                      <Banknote className="h-4 w-4" />
                      Paiements ({selectedClient.payments.length})
                    </TabsTrigger>
                  </TabsList>

                  {/* Summary Tab */}
                  <TabsContent value="summary" className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="pt-4">
                          <p className="text-sm text-gray-500">Factures impayées</p>
                          <p className="text-xl font-bold text-blue-600">{selectedClient.unpaidInvoices.length}</p>
                          <p className="text-sm text-gray-600">
                            {formatCurrency(selectedClient.unpaidInvoices.reduce((sum, f) => sum + f.total_ttc, 0))}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <p className="text-sm text-gray-500">BL non encaissés</p>
                          <p className="text-xl font-bold text-orange-600">{selectedClient.unpaidDeliveries.length}</p>
                          <p className="text-sm text-gray-600">
                            {formatCurrency(selectedClient.unpaidDeliveries.reduce((sum, d) => sum + d.balance_due, 0))}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <p className="text-sm text-gray-500">Paiements reçus</p>
                          <p className="text-xl font-bold text-green-600">{selectedClient.payments.length}</p>
                          <p className="text-sm text-gray-600">
                            {formatCurrency(selectedClient.payments.reduce((sum, p) => sum + p.amount, 0))}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  {/* Documents Tab */}
                  <TabsContent value="documents" className="space-y-4">
                    {/* Factures */}
                    {selectedClient.unpaidInvoices.length > 0 && (
                      <div>
                        <h3 className="font-medium mb-3 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          Factures non réglées ({selectedClient.unpaidInvoices.length})
                        </h3>
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-blue-50">
                                <TableHead>N° Facture</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>BL Liés</TableHead>
                                <TableHead>Échéance</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead className="text-right">Montant TTC</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedClient.unpaidInvoices.map((invoice) => (
                                <TableRow key={invoice.id}>
                                  <TableCell className="font-medium">{invoice.facture_number}</TableCell>
                                  <TableCell>{formatDate(invoice.facture_date)}</TableCell>
                                  <TableCell className="text-xs text-gray-600">
                                    {invoice.delivery_numbers?.length
                                      ? invoice.delivery_numbers.join(' ')
                                      : ''}
                                  </TableCell>
                                  <TableCell>
                                    {invoice.due_date ? formatDate(invoice.due_date) : '-'}
                                  </TableCell>
                                  <TableCell>
                                    <Badge className={statusColors[invoice.status] || 'bg-gray-100'}>
                                      {statusLabels[invoice.status] || invoice.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right font-semibold">
                                    {formatCurrency(invoice.total_ttc)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}

                    {/* BL */}
                    {selectedClient.unpaidDeliveries.length > 0 && (
                      <div>
                        <h3 className="font-medium mb-3 flex items-center gap-2">
                          <Truck className="h-4 w-4 text-orange-600" />
                          BL non encaissés ({selectedClient.unpaidDeliveries.length})
                        </h3>
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-orange-50">
                                <TableHead>N° BL</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Montant</TableHead>
                                <TableHead className="text-right">Payé</TableHead>
                                <TableHead className="text-right">Reste</TableHead>
                                <TableHead>Statut</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedClient.unpaidDeliveries.map((delivery) => (
                                <TableRow key={delivery.id}>
                                  <TableCell className="font-medium">{delivery.delivery_number}</TableCell>
                                  <TableCell>{formatDate(delivery.delivery_date)}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(delivery.total_ht)}</TableCell>
                                  <TableCell className="text-right text-green-600">{formatCurrency(delivery.amount_paid)}</TableCell>
                                  <TableCell className="text-right font-semibold text-red-600">{formatCurrency(delivery.balance_due)}</TableCell>
                                  <TableCell>
                                    <Badge className={statusColors[delivery.payment_status] || 'bg-gray-100'}>
                                      {statusLabels[delivery.payment_status] || delivery.payment_status}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* Payments Tab */}
                  <TabsContent value="payments">
                    {selectedClient.payments.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        Aucun paiement pour cette période
                      </div>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-green-50">
                              <TableHead>N° Paiement</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead className="text-right">Montant</TableHead>
                              <TableHead>Méthode</TableHead>
                              <TableHead>Référence</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedClient.payments.map((payment) => (
                              <TableRow key={payment.id}>
                                <TableCell className="font-medium">{payment.payment_number}</TableCell>
                                <TableCell>{formatDate(payment.payment_date)}</TableCell>
                                <TableCell className="text-right font-semibold text-green-600">
                                  {formatCurrency(payment.amount)}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {paymentMethodLabels[payment.payment_method] || payment.payment_method}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-gray-500">
                                  {payment.facture_number || payment.delivery_number || payment.reference || '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <div className="p-3 bg-green-50 border-t text-right">
                          <span className="text-sm text-gray-600">Total paiements: </span>
                          <span className="font-bold text-green-700">
                            {formatCurrency(selectedClient.payments.reduce((sum, p) => sum + p.amount, 0))}
                          </span>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedModule>
  )
}
