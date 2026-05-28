'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ProtectedModule } from '@/components/auth/ProtectedModule'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Search } from 'lucide-react'
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
  client_id: string
  created_at: string
  client?: { name: string; code: string }
  delivery?: { delivery_number: string } | null
  facture?: { facture_number: string } | null
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
        facture:factures(facture_number)
      `)
      .order('created_at', { ascending: false }) as any)

    if (error) {
      console.error('Error fetching payments:', error)
    } else {
      setPayments(data || [])
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchPayments()
  }, [])

  const getReference = (payment: PaymentRow): { label: string; type: string } => {
    if (payment.facture?.facture_number) {
      return { label: payment.facture.facture_number, type: 'Facture' }
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paiements</h1>
          <p className="text-gray-500">Tous les reçus de paiement (BL et Factures)</p>
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
                      <TableHead>Référence BL / Facture</TableHead>
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
      </div>
    </ProtectedModule>
  )
}
