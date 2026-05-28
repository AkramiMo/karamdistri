'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ProtectedModule } from '@/components/auth/ProtectedModule'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  Truck,
  Wallet,
  Receipt,
  TrendingUp,
  TrendingDown,
  Calendar,
  FileText,
  CreditCard,
  Banknote,
  CheckCircle2,
  AlertCircle,
  Printer,
  RefreshCw,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import Link from 'next/link'

interface Client {
  id: string
  code: string
  name: string
  contact_name: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  category: string | null
  gps_lat: number | null
  gps_lng: number | null
  logo_url: string | null
  local_image_url: string | null
  ice: string | null
  is_active: boolean
  created_at: string
}

interface Delivery {
  id: string
  delivery_number: string
  delivery_date: string | null
  status: string
  total_ht: number | null
  total_ttc: number | null
  amount_paid: number | null
  balance_due: number | null
  payment_status: string | null
  notes: string | null
}

interface Payment {
  id: string
  payment_number: string
  delivery_id: string | null
  amount: number
  payment_method: string
  payment_date: string
  reference: string | null
  notes: string | null
  created_at: string
  delivery?: { delivery_number: string }
}

interface Facture {
  id: string
  facture_number: string
  facture_date: string
  total_ht: number
  total_tva: number
  total_ttc: number
  status: string
  due_date: string | null
  notes: string | null
  delivery?: { delivery_number: string }
  amount_paid?: number
}

interface ClientBalance {
  // Section BL
  nb_bl: number
  total_bl: number
  reglement_bl: number
  reste_bl: number
  // Section Factures
  nb_factures: number
  total_factures: number
  reglement_factures: number
  reste_factures: number
  // Totaux
  total_due: number
  total_paid: number
  balance: number
}

const categoryLabels: Record<string, string> = {
  'FOD': 'Restaurant',
  'EPC': 'Epicerie',
  'DEP': 'Depot',
  'AUT': 'Autre',
  'MGZ': 'Magasin',
}

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  delivered: 'bg-amber-100 text-[#9A7209]',
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

const paymentStatusColors: Record<string, string> = {
  pending: 'bg-red-100 text-red-800',
  partial: 'bg-orange-100 text-orange-800',
  paid: 'bg-amber-100 text-[#9A7209]',
}

const paymentStatusLabels: Record<string, string> = {
  pending: 'Non paye',
  partial: 'Partiel',
  paid: 'Paye',
}

const paymentMethodLabels: Record<string, string> = {
  cash: 'Especes',
  check: 'Cheque',
  transfer: 'Virement',
  card: 'Carte',
}

const paymentMethodIcons: Record<string, React.ReactNode> = {
  cash: <Banknote className="h-4 w-4" />,
  check: <Receipt className="h-4 w-4" />,
  transfer: <Building2 className="h-4 w-4" />,
  card: <CreditCard className="h-4 w-4" />,
}

const factureStatusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  paid: 'bg-amber-100 text-[#9A7209]',
  partial: 'bg-orange-100 text-orange-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-red-200 text-red-900',
}

const factureStatusLabels: Record<string, string> = {
  draft: 'Brouillon',
  sent: 'Envoyee',
  paid: 'Payee',
  partial: 'Partielle',
  overdue: 'En retard',
  cancelled: 'Annulee',
}

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string

  const [client, setClient] = useState<Client | null>(null)
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [factures, setFactures] = useState<Facture[]>([])
  const [balance, setBalance] = useState<ClientBalance>({
    // Section BL
    nb_bl: 0,
    total_bl: 0,
    reglement_bl: 0,
    reste_bl: 0,
    // Section Factures
    nb_factures: 0,
    total_factures: 0,
    reglement_factures: 0,
    reste_factures: 0,
    // Totaux
    total_due: 0,
    total_paid: 0,
    balance: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('info')

  const supabase = createClient()

  const fetchClientData = useCallback(async () => {
    if (!clientId) return

    setIsLoading(true)

    try {
      // Fetch client
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single()

      if (clientError) throw clientError
      setClient(clientData)

      // Fetch deliveries
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: deliveriesData } = await (supabase.from('deliveries') as any)
        .select('id, delivery_number, delivery_date, status, total_ht, total_ttc, amount_paid, balance_due, payment_status, notes')
        .eq('client_id', clientId)
        .order('delivery_date', { ascending: false })

      setDeliveries(deliveriesData || [])

      // Fetch payments
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: paymentsData } = await (supabase.from('payments') as any)
        .select('*, delivery:deliveries(delivery_number)')
        .eq('client_id', clientId)
        .order('payment_date', { ascending: false })

      setPayments(paymentsData || [])

      // Fetch factures with details
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: facturesData } = await (supabase.from('factures') as any)
        .select('id, facture_number, facture_date, total_ht, total_tva, total_ttc, status, due_date, notes, delivery:deliveries(delivery_number)')
        .eq('client_id', clientId)
        .order('facture_date', { ascending: false })

      // Fetch facture payments
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: facturePaymentsData } = await (supabase.from('facture_payments') as any)
        .select('amount, facture_id')

      // Calculate amount paid per facture
      const facturePaymentsMap: Record<string, number> = {}
      ;(facturePaymentsData || []).forEach((p: { amount: number; facture_id: string }) => {
        facturePaymentsMap[p.facture_id] = (facturePaymentsMap[p.facture_id] || 0) + (p.amount || 0)
      })

      // Add amount_paid to each facture
      const facturesWithPayments = (facturesData || []).map((f: Facture) => ({
        ...f,
        amount_paid: facturePaymentsMap[f.id] || 0,
      }))

      setFactures(facturesWithPayments)

      // === Section BL ===
      const nbBL = (deliveriesData || []).length
      const totalBL = (deliveriesData || []).reduce((sum: number, d: Delivery) => sum + (d.total_ht || 0), 0)
      const reglementBL = (deliveriesData || []).reduce((sum: number, d: Delivery) => sum + (d.amount_paid || 0), 0)
      const resteBL = totalBL - reglementBL

      // === Section Factures ===
      const nbFactures = (facturesData || []).length
      const totalFactures = (facturesData || []).reduce((sum: number, f: { total_ttc: number }) => sum + (f.total_ttc || 0), 0)
      const reglementFactures = (facturePaymentsData || []).reduce((sum: number, p: { amount: number }) => sum + (p.amount || 0), 0)
      const resteFactures = totalFactures - reglementFactures

      setBalance({
        // Section BL
        nb_bl: nbBL,
        total_bl: totalBL,
        reglement_bl: reglementBL,
        reste_bl: resteBL,
        // Section Factures
        nb_factures: nbFactures,
        total_factures: totalFactures,
        reglement_factures: reglementFactures,
        reste_factures: resteFactures,
        // Totaux
        total_due: totalBL + totalFactures,
        total_paid: reglementBL + reglementFactures,
        balance: resteBL + resteFactures,
      })
    } catch (error) {
      console.error('Error fetching client data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [clientId, supabase])

  useEffect(() => {
    fetchClientData()
  }, [fetchClientData])

  // Souscription en temps réel pour les paiements
  useEffect(() => {
    if (!clientId) return

    const paymentsChannel = supabase
      .channel(`payments-client-${clientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          // Rafraîchir les données quand un paiement est ajouté/modifié/supprimé
          fetchClientData()
        }
      )
      .subscribe()

    // Souscription aussi pour les livraisons (pour les mises à jour de amount_paid, balance_due)
    const deliveriesChannel = supabase
      .channel(`deliveries-client-${clientId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'deliveries',
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          fetchClientData()
        }
      )
      .subscribe()

    // Souscription pour les factures
    const facturesChannel = supabase
      .channel(`factures-client-${clientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'factures',
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          fetchClientData()
        }
      )
      .subscribe()

    // Souscription pour les paiements de factures
    const facturePaymentsChannel = supabase
      .channel(`facture-payments-client-${clientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'facture_payments',
        },
        () => {
          fetchClientData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(paymentsChannel)
      supabase.removeChannel(deliveriesChannel)
      supabase.removeChannel(facturesChannel)
      supabase.removeChannel(facturePaymentsChannel)
    }
  }, [clientId, supabase, fetchClientData])

  const formatPrice = (price: number | null) => {
    if (price === null) return '-'
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
    }).format(price)
  }

  const printAccountStatement = () => {
    if (!client) return

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Releve de compte - ${client.code}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #228B22; padding-bottom: 15px; margin-bottom: 20px; }
          .header h1 { color: #228B22; margin: 0; }
          .header p { margin: 5px 0; color: #666; }
          .client-info { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .client-info h2 { margin: 0 0 10px 0; }
          .summary { display: flex; gap: 20px; margin-bottom: 20px; }
          .summary-card { flex: 1; padding: 15px; border-radius: 8px; text-align: center; }
          .summary-card.due { background: #fef2f2; color: #dc2626; }
          .summary-card.paid { background: #f0fdf4; color: #16a34a; }
          .summary-card.balance { background: ${balance.balance > 0 ? '#fef2f2' : '#f0fdf4'}; }
          .summary-card p { margin: 0; }
          .summary-card .amount { font-size: 24px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background: #228B22; color: white; }
          tr:nth-child(even) { background: #f9f9f9; }
          .credit { color: #16a34a; }
          .debit { color: #dc2626; }
          .footer { margin-top: 30px; text-align: center; color: #888; font-size: 12px; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>KARAM Olives & Sauces</h1>
          <p>Releve de compte client</p>
        </div>

        <div class="client-info">
          <h2>${client.code} - ${client.name}</h2>
          <p>Adresse: ${client.address || '-'}, ${client.city || '-'}</p>
          <p>Tel: ${client.phone || '-'}</p>
          <p>Date d'impression: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: fr })}</p>
        </div>

        <div class="summary">
          <div class="summary-card due">
            <p>Total Facture</p>
            <p class="amount">${formatPrice(balance.total_due)}</p>
          </div>
          <div class="summary-card paid">
            <p>Total Paye</p>
            <p class="amount">${formatPrice(balance.total_paid)}</p>
          </div>
          <div class="summary-card balance" style="color: ${balance.balance > 0 ? '#dc2626' : '#16a34a'}">
            <p>Solde</p>
            <p class="amount">${formatPrice(balance.balance)}</p>
          </div>
        </div>

        <h3>Historique des transactions</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Reference</th>
              <th>Debit</th>
              <th>Credit</th>
            </tr>
          </thead>
          <tbody>
            ${[
              ...deliveries.filter(d => d.status === 'delivered').map(d => ({
                date: d.delivery_date || '',
                type: 'Livraison',
                reference: d.delivery_number,
                debit: (d.total_ht || 0) * 1.2,
                credit: 0,
                created_at: d.delivery_date,
              })),
              ...payments.map(p => ({
                date: p.payment_date,
                type: `Paiement (${paymentMethodLabels[p.payment_method]})`,
                reference: p.payment_number,
                debit: 0,
                credit: p.amount,
                created_at: p.payment_date,
              })),
            ]
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map(t => `
                <tr>
                  <td>${t.date ? format(new Date(t.date), 'dd/MM/yyyy', { locale: fr }) : '-'}</td>
                  <td>${t.type}</td>
                  <td>${t.reference}</td>
                  <td class="debit">${t.debit > 0 ? formatPrice(t.debit) : '-'}</td>
                  <td class="credit">${t.credit > 0 ? formatPrice(t.credit) : '-'}</td>
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

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.print()
    }
  }

  if (isLoading) {
    return (
      <ProtectedModule module="clients">
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </ProtectedModule>
    )
  }

  if (!client) {
    return (
      <ProtectedModule module="clients">
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">Client non trouve</p>
          <Link href="/clients">
            <Button variant="outline">Retour aux clients</Button>
          </Link>
        </div>
      </ProtectedModule>
    )
  }

  return (
    <ProtectedModule module="clients">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/clients">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">{client.code}</h1>
                <Badge className={client.is_active ? 'bg-amber-100 text-[#9A7209]' : 'bg-red-100 text-red-800'}>
                  {client.is_active ? 'Actif' : 'Inactif'}
                </Badge>
              </div>
              <p className="text-gray-500">{client.name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchClientData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
            <Button onClick={printAccountStatement} className="bg-blue-600 hover:bg-blue-700">
              <Printer className="h-4 w-4 mr-2" />
              Imprimer releve
            </Button>
          </div>
        </div>

        {/* Section BL */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Bons de Livraison (BL)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Nombre BL</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Truck className="h-6 w-6 text-purple-600" />
                  <span className="text-2xl font-bold">{balance.nb_bl}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total BL</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <FileText className="h-6 w-6 text-blue-600" />
                  <span className="text-xl font-bold text-blue-600">{formatPrice(balance.total_bl)}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Reglement BL</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-6 w-6 text-[#B8860B]" />
                  <span className="text-xl font-bold text-[#B8860B]">{formatPrice(balance.reglement_bl)}</span>
                </div>
              </CardContent>
            </Card>
            <Card className={balance.reste_bl > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Reste BL</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {balance.reste_bl > 0 ? (
                    <TrendingDown className="h-6 w-6 text-red-600" />
                  ) : (
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  )}
                  <span className={`text-xl font-bold ${balance.reste_bl > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatPrice(balance.reste_bl)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Section Factures */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Factures
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Nombre Factures</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Receipt className="h-6 w-6 text-indigo-600" />
                  <span className="text-2xl font-bold">{balance.nb_factures}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Factures</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <FileText className="h-6 w-6 text-blue-600" />
                  <span className="text-xl font-bold text-blue-600">{formatPrice(balance.total_factures)}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Reglement Factures</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-6 w-6 text-[#B8860B]" />
                  <span className="text-xl font-bold text-[#B8860B]">{formatPrice(balance.reglement_factures)}</span>
                </div>
              </CardContent>
            </Card>
            <Card className={balance.reste_factures > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Reste Factures</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {balance.reste_factures > 0 ? (
                    <TrendingDown className="h-6 w-6 text-red-600" />
                  ) : (
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  )}
                  <span className={`text-xl font-bold ${balance.reste_factures > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatPrice(balance.reste_factures)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="info" className="gap-2">
              <User className="h-4 w-4" />
              Informations
            </TabsTrigger>
            <TabsTrigger value="deliveries" className="gap-2">
              <Truck className="h-4 w-4" />
              Livraisons ({deliveries.length})
            </TabsTrigger>
            <TabsTrigger value="factures" className="gap-2">
              <FileText className="h-4 w-4" />
              Factures ({factures.length})
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-2">
              <Wallet className="h-4 w-4" />
              Paiements ({payments.length})
            </TabsTrigger>
            <TabsTrigger value="account" className="gap-2">
              <Receipt className="h-4 w-4" />
              Compte
            </TabsTrigger>
          </TabsList>

          {/* Info Tab */}
          <TabsContent value="info">
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">Informations generales</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Code client</p>
                          <p className="font-medium">{client.code}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Nom</p>
                          <p className="font-medium">{client.name}</p>
                        </div>
                      </div>
                      {client.contact_name && (
                        <div className="flex items-center gap-3">
                          <User className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">Contact</p>
                            <p className="font-medium">{client.contact_name}</p>
                          </div>
                        </div>
                      )}
                      {client.category && (
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">Categorie</p>
                            <p className="font-medium">{categoryLabels[client.category] || client.category}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">Contact</h3>
                    <div className="space-y-3">
                      {client.phone && (
                        <div className="flex items-center gap-3">
                          <Phone className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">Telephone</p>
                            <a href={`tel:${client.phone}`} className="font-medium text-blue-600 hover:underline">
                              {client.phone}
                            </a>
                          </div>
                        </div>
                      )}
                      {client.email && (
                        <div className="flex items-center gap-3">
                          <Mail className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">Email</p>
                            <a href={`mailto:${client.email}`} className="font-medium text-blue-600 hover:underline">
                              {client.email}
                            </a>
                          </div>
                        </div>
                      )}
                      {(client.address || client.city) && (
                        <div className="flex items-center gap-3">
                          <MapPin className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">Adresse</p>
                            <p className="font-medium">
                              {client.address}
                              {client.address && client.city && ', '}
                              {client.city}
                            </p>
                          </div>
                        </div>
                      )}
                      {client.ice && (
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">ICE</p>
                            <p className="font-medium">{client.ice}</p>
                          </div>
                        </div>
                      )}
                      {(client.gps_lat && client.gps_lng) && (
                        <div className="flex items-center gap-3">
                          <MapPin className="h-5 w-5 text-[#DAA520]" />
                          <div>
                            <p className="text-sm text-gray-500">Coordonnees GPS</p>
                            <p className="font-medium font-mono text-sm">
                              {client.gps_lat}, {client.gps_lng}
                            </p>
                            <a
                              href={`https://www.google.com/maps?q=${client.gps_lat},${client.gps_lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline"
                            >
                              Voir sur Google Maps
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Deliveries Tab */}
          <TabsContent value="deliveries">
            <Card>
              <CardContent className="pt-6">
                {deliveries.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Aucune livraison pour ce client
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>N BL</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Paiement</TableHead>
                        <TableHead className="text-right">Total HT</TableHead>
                        <TableHead className="text-right">Paye</TableHead>
                        <TableHead className="text-right">Reste</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveries.map((delivery) => {
                        const reste = (delivery.total_ht || 0) - (delivery.amount_paid || 0)
                        return (
                          <TableRow key={delivery.id}>
                            <TableCell className="font-medium">{delivery.delivery_number}</TableCell>
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
                            <TableCell>
                              <Badge className={paymentStatusColors[delivery.payment_status || 'pending']}>
                                {paymentStatusLabels[delivery.payment_status || 'pending']}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatPrice(delivery.total_ht || 0)}
                            </TableCell>
                            <TableCell className="text-right text-[#B8860B]">
                              {formatPrice(delivery.amount_paid || 0)}
                            </TableCell>
                            <TableCell className={`text-right font-semibold ${reste > 0 ? 'text-red-600' : 'text-[#B8860B]'}`}>
                              {formatPrice(reste)}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Factures Tab */}
          <TabsContent value="factures">
            <Card>
              <CardContent className="pt-6">
                {factures.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Aucune facture pour ce client
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>N Facture</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>BL</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Total HT</TableHead>
                        <TableHead className="text-right">TVA</TableHead>
                        <TableHead className="text-right">Total TTC</TableHead>
                        <TableHead className="text-right">Paye</TableHead>
                        <TableHead className="text-right">Reste</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {factures.map((facture) => {
                        const resteFacture = (facture.total_ttc || 0) - (facture.amount_paid || 0)
                        return (
                          <TableRow key={facture.id}>
                            <TableCell className="font-medium">{facture.facture_number}</TableCell>
                            <TableCell>
                              {facture.facture_date
                                ? format(new Date(facture.facture_date), 'dd/MM/yyyy', { locale: fr })
                                : '-'}
                            </TableCell>
                            <TableCell>
                              {facture.delivery?.delivery_number || '-'}
                            </TableCell>
                            <TableCell>
                              <Badge className={factureStatusColors[facture.status] || 'bg-gray-100 text-gray-800'}>
                                {factureStatusLabels[facture.status] || facture.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatPrice(facture.total_ht || 0)}
                            </TableCell>
                            <TableCell className="text-right text-gray-600">
                              {formatPrice(facture.total_tva || 0)}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-blue-600">
                              {formatPrice(facture.total_ttc || 0)}
                            </TableCell>
                            <TableCell className="text-right text-[#B8860B]">
                              {formatPrice(facture.amount_paid || 0)}
                            </TableCell>
                            <TableCell className={`text-right font-semibold ${resteFacture > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {formatPrice(resteFacture)}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <Card>
              <CardContent className="pt-6">
                {payments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Aucun paiement pour ce client
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>N Recu</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>BL</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">{payment.payment_number}</TableCell>
                          <TableCell>
                            {format(new Date(payment.payment_date), 'dd/MM/yyyy', { locale: fr })}
                          </TableCell>
                          <TableCell>
                            {payment.delivery?.delivery_number || '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {paymentMethodIcons[payment.payment_method]}
                              {paymentMethodLabels[payment.payment_method]}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {payment.reference || '-'}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-[#B8860B]">
                            {formatPrice(payment.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Total Facture</p>
                      <p className="text-xl font-bold text-blue-600">{formatPrice(balance.total_due)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Total Paye</p>
                      <p className="text-xl font-bold text-[#B8860B]">{formatPrice(balance.total_paid)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Solde</p>
                      <p className={`text-xl font-bold ${balance.balance > 0 ? 'text-red-600' : 'text-[#B8860B]'}`}>
                        {formatPrice(balance.balance)}
                      </p>
                    </div>
                  </div>

                  {/* Transactions */}
                  <div>
                    <h3 className="font-semibold mb-4">Historique des transactions</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead className="text-right">Debit</TableHead>
                          <TableHead className="text-right">Credit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[
                          ...deliveries.filter(d => d.status === 'delivered').map(d => ({
                            id: `d-${d.id}`,
                            date: d.delivery_date || '',
                            type: 'Livraison',
                            reference: d.delivery_number,
                            debit: (d.total_ht || 0) * 1.2,
                            credit: 0,
                          })),
                          ...payments.map(p => ({
                            id: `p-${p.id}`,
                            date: p.payment_date,
                            type: `Paiement (${paymentMethodLabels[p.payment_method]})`,
                            reference: p.payment_number,
                            debit: 0,
                            credit: p.amount,
                          })),
                        ]
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .map((transaction) => (
                            <TableRow key={transaction.id}>
                              <TableCell>
                                {transaction.date
                                  ? format(new Date(transaction.date), 'dd/MM/yyyy', { locale: fr })
                                  : '-'}
                              </TableCell>
                              <TableCell>{transaction.type}</TableCell>
                              <TableCell className="font-medium">{transaction.reference}</TableCell>
                              <TableCell className="text-right text-red-600">
                                {transaction.debit > 0 ? formatPrice(transaction.debit) : '-'}
                              </TableCell>
                              <TableCell className="text-right text-[#B8860B]">
                                {transaction.credit > 0 ? formatPrice(transaction.credit) : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedModule>
  )
}
