'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
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
import { Search, Plus, Printer, Banknote, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { fr } from 'date-fns/locale'
import { generatePaymentReceiptPDF } from '@/lib/pdf/paymentReceipt'
import { useCompanySettings } from '@/hooks/useCompanySettings'

interface PaymentRow {
  id: string
  payment_number: string
  amount: number
  payment_method: string
  payment_date: string
  reference: string | null
  notes: string | null
  delivery_id: string | null
  facture_id: string | null
  sale_id: string | null
  client_id: string | null
  supplier_id: string | null
  reception_id: string | null
  payment_type: 'client' | 'fournisseur'
  created_at: string
  client?: { name: string; code: string } | null
  supplier?: { name: string; code: string } | null
  delivery?: { delivery_number: string; delivery_date: string } | null
  facture?: { facture_number: string; facture_date: string } | null
  sale?: { sale_number: string; sale_date: string } | null
  reception?: { reception_number: string; reception_date: string } | null
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

interface DocumentNonRegle {
  id: string
  type: 'BL' | 'Facture'
  number: string
  date: string
  total: number
  balance_due: number
}

interface SupplierOption {
  id: string
  code: string
  name: string
}

interface ReceptionNonPayee {
  id: string
  reception_number: string
  reception_date: string
  total_ht: number
  supplier_id: string
}

const paymentMethodLabels: Record<string, string> = {
  cash: 'Espèces',
  cash_deposit: "Versement d'espèces",
  check: 'Chèque',
  transfer: 'Virement',
  card: 'Carte',
  other: 'Autre',
}

const paymentMethodColors: Record<string, string> = {
  cash: 'bg-green-100 text-green-800',
  cash_deposit: 'bg-teal-100 text-teal-800',
  check: 'bg-blue-100 text-blue-800',
  transfer: 'bg-purple-100 text-purple-800',
  card: 'bg-amber-100 text-[#9A7209]',
  other: 'bg-gray-100 text-gray-800',
}

export default function PaiementsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isNewOnlyMode, setIsNewOnlyMode] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [sales, setSales] = useState<SaleOption[]>([])
  const [linkToSale, setLinkToSale] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [documentsNonRegles, setDocumentsNonRegles] = useState<DocumentNonRegle[]>([])
  const [isLoadingDocs, setIsLoadingDocs] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState<PaymentRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  // Filtres
  const [filterType, setFilterType] = useState<'all' | 'client' | 'fournisseur'>('all')
  const [filterClientId, setFilterClientId] = useState<string>('')
  const [filterSupplierId, setFilterSupplierId] = useState<string>('')
  // Fournisseurs
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([])
  const [receptionsNonPayees, setReceptionsNonPayees] = useState<ReceptionNonPayee[]>([])
  const [isLoadingReceptions, setIsLoadingReceptions] = useState(false)

  // Ouvrir le dialog si ?action=new
  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setIsDialogOpen(true)
      setIsNewOnlyMode(true)
    }
  }, [searchParams])

  const [formData, setFormData] = useState({
    payment_type: 'client' as 'client' | 'fournisseur',
    client_id: '',
    supplier_id: '',
    reception_id: '',
    amount: '',
    payment_method: 'cash',
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    reference: '',
    sale_id: '',
    delivery_id: '',
    facture_id: '',
    document_type: '' as '' | 'BL' | 'Facture',
    notes: '',
    // Champs virement
    virement_compte: '',
    virement_ref: '',
    virement_date: '',
    // Champs chèque
    cheque_ref: '',
    cheque_banque: '',
    cheque_date_encaissement: '',
  })
  const supabase = createClient()
  const { companySettings } = useCompanySettings()

  const fetchPayments = async () => {
    setIsLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase
      .from('payments')
      .select(`
        *,
        client:clients(name, code),
        supplier:suppliers(name, code),
        delivery:deliveries(delivery_number, delivery_date),
        facture:factures(facture_number, facture_date),
        sale:sales(sale_number, sale_date),
        reception:receptions(reception_number, reception_date)
      `)
      .order('created_at', { ascending: false }) as any)

    if (error) {
      console.error('Error fetching payments:', error)
    } else {
      // S'assurer que payment_type a une valeur par défaut
      const paymentsWithType = (data || []).map((p: PaymentRow) => ({
        ...p,
        payment_type: p.payment_type || 'client'
      }))
      setPayments(paymentsWithType)
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

  const fetchSuppliers = async () => {
    const { data } = await supabase
      .from('suppliers')
      .select('id, code, name')
      .eq('is_active', true)
      .order('name')
    setSuppliers(data || [])
  }

  // Récupérer les réceptions non payées d'un fournisseur
  const fetchReceptionsNonPayees = async (supplierId: string) => {
    if (!supplierId) {
      setReceptionsNonPayees([])
      return
    }
    setIsLoadingReceptions(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase
        .from('receptions')
        .select('id, reception_number, reception_date, total_ht, supplier_id, payment_status')
        .eq('supplier_id', supplierId)
        .eq('payment_status', 'non_paye')
        .order('reception_date', { ascending: false }) as any)

      setReceptionsNonPayees(data || [])
    } catch (error) {
      console.error('Erreur lors de la récupération des réceptions:', error)
    } finally {
      setIsLoadingReceptions(false)
    }
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

  // Récupérer les BL et factures non réglés d'un client
  const fetchDocumentsNonRegles = async (clientId: string) => {
    if (!clientId) {
      setDocumentsNonRegles([])
      return
    }
    setIsLoadingDocs(true)
    try {
      const docs: DocumentNonRegle[] = []

      // Récupérer les BL non réglés (payment_status != 'paid')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: blData } = await (supabase
        .from('deliveries')
        .select('id, delivery_number, delivery_date, total_ttc, balance_due, payment_status')
        .eq('client_id', clientId)
        .neq('payment_status', 'paid')
        .gt('balance_due', 0)
        .order('delivery_date', { ascending: false }) as any)

      if (blData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        blData.forEach((bl: any) => {
          docs.push({
            id: bl.id,
            type: 'BL',
            number: bl.delivery_number,
            date: bl.delivery_date,
            total: bl.total_ttc || 0,
            balance_due: bl.balance_due || 0,
          })
        })
      }

      // Récupérer les factures non réglées (status != 'paid')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: factureData } = await (supabase
        .from('factures')
        .select('id, facture_number, facture_date, total_ttc, status')
        .eq('client_id', clientId)
        .neq('status', 'paid')
        .order('facture_date', { ascending: false }) as any)

      if (factureData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        factureData.forEach((f: any) => {
          docs.push({
            id: f.id,
            type: 'Facture',
            number: f.facture_number,
            date: f.facture_date,
            total: f.total_ttc || 0,
            balance_due: f.total_ttc || 0, // Pour les factures, on prend le total
          })
        })
      }

      setDocumentsNonRegles(docs)
    } catch (error) {
      console.error('Erreur lors de la récupération des documents:', error)
    } finally {
      setIsLoadingDocs(false)
    }
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

  const resetFormData = () => {
    setFormData({
      payment_type: 'client',
      client_id: '',
      supplier_id: '',
      reception_id: '',
      amount: '',
      payment_method: 'cash',
      payment_date: format(new Date(), 'yyyy-MM-dd'),
      reference: '',
      sale_id: '',
      delivery_id: '',
      facture_id: '',
      document_type: '',
      notes: '',
      virement_compte: '',
      virement_ref: '',
      virement_date: '',
      cheque_ref: '',
      cheque_banque: '',
      cheque_date_encaissement: '',
    })
    setLinkToSale(false)
    setSales([])
    setDocumentsNonRegles([])
    setReceptionsNonPayees([])
  }

  // Fonction pour mettre à jour amount_paid d'une livraison basée sur les paiements
  const updateDeliveryAmountPaid = async (deliveryId: string) => {
    try {
      // Récupérer tous les paiements liés à cette livraison
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount')
        .eq('delivery_id', deliveryId)

      if (paymentsError) {
        console.error('Error fetching delivery payments:', paymentsError)
        return
      }

      // Calculer le total payé
      const totalPaid = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

      // Récupérer les items de la livraison pour calculer la recette
      const { data: deliveryItems, error: itemsError } = await supabase
        .from('delivery_items')
        .select('quantity_delivered, quantity_returned, unit_price')
        .eq('delivery_id', deliveryId)

      if (itemsError) {
        console.error('Error fetching delivery items:', itemsError)
        return
      }

      // Calculer la recette (qté livrée - qté retournée) * prix unitaire
      const recette = deliveryItems?.reduce((sum, item) => {
        return sum + ((item.quantity_delivered - item.quantity_returned) * item.unit_price)
      }, 0) || 0

      // Calculer le solde et le statut
      const balanceDue = Math.max(0, recette - totalPaid)
      let paymentStatus = 'pending'
      if (balanceDue <= 0) {
        paymentStatus = 'paid'
      } else if (totalPaid > 0) {
        paymentStatus = 'partial'
      }

      // Mettre à jour la livraison
      const { error: updateError } = await supabase
        .from('deliveries')
        .update({
          amount_paid: totalPaid,
          balance_due: balanceDue,
          payment_status: paymentStatus,
        })
        .eq('id', deliveryId)

      if (updateError) {
        console.error('Error updating delivery amount_paid:', updateError)
      }
    } catch (err) {
      console.error('Exception in updateDeliveryAmountPaid:', err)
    }
  }

  // Fonction pour mettre à jour amount_paid des BL d'une facture
  const updateFactureDeliveriesAmountPaid = async (factureId: string, paymentAmount: number) => {
    try {
      // Récupérer les BL liés à cette facture via facture_deliveries
      const { data: factureDeliveries, error: fdError } = await supabase
        .from('facture_deliveries')
        .select('delivery_id')
        .eq('facture_id', factureId)

      let deliveryIds: string[] = []

      if (!fdError && factureDeliveries && factureDeliveries.length > 0) {
        deliveryIds = factureDeliveries.map(fd => fd.delivery_id)
      } else {
        // Fallback: récupérer le delivery_id directement depuis la facture (ancien format)
        const { data: facture } = await supabase
          .from('factures')
          .select('delivery_id')
          .eq('id', factureId)
          .single()

        if (facture?.delivery_id) {
          deliveryIds = [facture.delivery_id]
        }
      }

      if (deliveryIds.length === 0) {
        console.log('No deliveries linked to facture:', factureId)
        return
      }

      // Calculer la recette totale de tous les BL pour la répartition proportionnelle
      let totalRecette = 0
      const deliveriesData: { id: string; recette: number; currentPaid: number }[] = []

      for (const deliveryId of deliveryIds) {
        const { data: delivery } = await supabase
          .from('deliveries')
          .select('id, amount_paid')
          .eq('id', deliveryId)
          .single()

        if (!delivery) continue

        const { data: items } = await supabase
          .from('delivery_items')
          .select('quantity_delivered, quantity_returned, unit_price')
          .eq('delivery_id', deliveryId)

        if (!items) continue

        const recette = items.reduce((sum, item) => {
          return sum + ((item.quantity_delivered - item.quantity_returned) * item.unit_price)
        }, 0)

        totalRecette += recette
        deliveriesData.push({
          id: deliveryId,
          recette,
          currentPaid: delivery.amount_paid || 0,
        })
      }

      // Répartir le paiement PROPORTIONNELLEMENT sur tous les BL
      for (const delivery of deliveriesData) {
        // Calculer la part proportionnelle de ce BL
        const proportion = totalRecette > 0 ? delivery.recette / totalRecette : 0
        const amountToApply = Math.round(paymentAmount * proportion * 100) / 100

        if (amountToApply > 0) {
          const newAmountPaid = delivery.currentPaid + amountToApply
          const newBalanceDue = Math.max(0, delivery.recette - newAmountPaid)
          const newStatus = newBalanceDue <= 0 ? 'paid' : newAmountPaid > 0 ? 'partial' : 'pending'

          await supabase
            .from('deliveries')
            .update({
              amount_paid: newAmountPaid,
              balance_due: newBalanceDue,
              payment_status: newStatus,
            })
            .eq('id', delivery.id)
        }
      }

      // Mettre à jour le statut de la facture
      const { data: allPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('facture_id', factureId)

      const totalPaid = allPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

      const { data: facture } = await supabase
        .from('factures')
        .select('total_ttc')
        .eq('id', factureId)
        .single()

      if (facture) {
        const facturePaid = totalPaid >= (facture.total_ttc || 0)
        await supabase
          .from('factures')
          .update({ status: facturePaid ? 'paid' : totalPaid > 0 ? 'partial' : 'sent' })
          .eq('id', factureId)
      }

      // Mettre à jour le statut des ventes liées aux BL
      // Une vente peut avoir plusieurs BL de différents clients
      const updatedSaleIds = new Set<string>()

      for (const deliveryId of deliveryIds) {
        // Trouver la vente liée à ce BL
        const { data: sale } = await supabase
          .from('sales')
          .select('id')
          .eq('delivery_id', deliveryId)
          .single()

        if (sale && !updatedSaleIds.has(sale.id)) {
          updatedSaleIds.add(sale.id)

          // Récupérer TOUS les BL de cette vente (via articles_vendus)
          const { data: articlesVendus } = await supabase
            .from('articles_vendus')
            .select('delivery_id')
            .eq('sale_id', sale.id)

          const allDeliveryIds = [...new Set((articlesVendus || []).map(a => a.delivery_id).filter(Boolean))]

          if (allDeliveryIds.length > 0) {
            // Vérifier le statut de paiement de tous ces BL
            const { data: allDeliveries } = await supabase
              .from('deliveries')
              .select('payment_status')
              .in('id', allDeliveryIds)

            const statuses = (allDeliveries || []).map(d => d.payment_status)
            const allPaid = statuses.length > 0 && statuses.every(s => s === 'paid')
            const somePaid = statuses.some(s => s === 'paid' || s === 'partial')

            const saleStatus = allPaid ? 'paid' : somePaid ? 'partial' : 'pending'

            await supabase
              .from('sales')
              .update({ payment_status: saleStatus })
              .eq('id', sale.id)
          }
        }
      }
    } catch (err) {
      console.error('Exception in updateFactureDeliveriesAmountPaid:', err)
    }
  }

  // Fonction pour recalculer les BL d'une facture après suppression d'un paiement
  const recalculateFactureDeliveriesAfterDelete = async (factureId: string) => {
    try {
      // Récupérer les BL liés à cette facture
      const { data: factureDeliveries } = await supabase
        .from('facture_deliveries')
        .select('delivery_id')
        .eq('facture_id', factureId)

      let deliveryIds: string[] = []

      if (factureDeliveries && factureDeliveries.length > 0) {
        deliveryIds = factureDeliveries.map(fd => fd.delivery_id)
      } else {
        // Fallback sur l'ancien champ delivery_id
        const { data: facture } = await supabase
          .from('factures')
          .select('delivery_id')
          .eq('id', factureId)
          .single()

        if (facture?.delivery_id) {
          deliveryIds = [facture.delivery_id]
        }
      }

      if (deliveryIds.length === 0) return

      // Récupérer tous les paiements restants pour cette facture
      const { data: remainingPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('facture_id', factureId)

      const totalRemainingPaid = remainingPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

      // Calculer la recette totale de tous les BL
      let totalRecette = 0
      const deliveriesData: { id: string; recette: number }[] = []

      for (const deliveryId of deliveryIds) {
        const { data: items } = await supabase
          .from('delivery_items')
          .select('quantity_delivered, quantity_returned, unit_price')
          .eq('delivery_id', deliveryId)

        if (!items) continue

        const recette = items.reduce((sum, item) => {
          return sum + ((item.quantity_delivered - item.quantity_returned) * item.unit_price)
        }, 0)

        totalRecette += recette
        deliveriesData.push({ id: deliveryId, recette })
      }

      // Répartir le montant restant proportionnellement sur les BL
      for (const delivery of deliveriesData) {
        const proportion = totalRecette > 0 ? delivery.recette / totalRecette : 0
        const newAmountPaid = Math.round(totalRemainingPaid * proportion * 100) / 100
        const newBalanceDue = Math.max(0, delivery.recette - newAmountPaid)
        const newStatus = newBalanceDue <= 0 && delivery.recette > 0 ? 'paid' : newAmountPaid > 0 ? 'partial' : 'pending'

        await supabase
          .from('deliveries')
          .update({
            amount_paid: newAmountPaid,
            balance_due: newBalanceDue,
            payment_status: newStatus,
          })
          .eq('id', delivery.id)
      }

      // Mettre à jour le statut de la facture
      const { data: facture } = await supabase
        .from('factures')
        .select('total_ttc')
        .eq('id', factureId)
        .single()

      if (facture) {
        const facturePaid = totalRemainingPaid >= (facture.total_ttc || 0)
        await supabase
          .from('factures')
          .update({ status: facturePaid ? 'paid' : totalRemainingPaid > 0 ? 'partial' : 'sent' })
          .eq('id', factureId)
      }

      // Mettre à jour le statut des ventes liées aux BL
      const updatedSaleIds = new Set<string>()

      for (const deliveryId of deliveryIds) {
        const { data: sale } = await supabase
          .from('sales')
          .select('id')
          .eq('delivery_id', deliveryId)
          .single()

        if (sale && !updatedSaleIds.has(sale.id)) {
          updatedSaleIds.add(sale.id)

          const { data: articlesVendus } = await supabase
            .from('articles_vendus')
            .select('delivery_id')
            .eq('sale_id', sale.id)

          const allDeliveryIds = [...new Set((articlesVendus || []).map(a => a.delivery_id).filter(Boolean))]

          if (allDeliveryIds.length > 0) {
            const { data: allDeliveries } = await supabase
              .from('deliveries')
              .select('payment_status')
              .in('id', allDeliveryIds)

            const statuses = (allDeliveries || []).map(d => d.payment_status)
            const allPaid = statuses.length > 0 && statuses.every(s => s === 'paid')
            const somePaid = statuses.some(s => s === 'paid' || s === 'partial')

            const saleStatus = allPaid ? 'paid' : somePaid ? 'partial' : 'pending'

            await supabase
              .from('sales')
              .update({ payment_status: saleStatus })
              .eq('id', sale.id)
          }
        }
      }
    } catch (err) {
      console.error('Exception in recalculateFactureDeliveriesAfterDelete:', err)
    }
  }

  const handleCreatePayment = async () => {
    // Validation selon le type
    if (formData.payment_type === 'client' && !formData.client_id) return
    if (formData.payment_type === 'fournisseur' && !formData.supplier_id) return
    if (!formData.amount) return

    setIsSaving(true)
    try {
      const paymentNumber = await generatePaymentNumber()

      // Construire la référence avec les infos supplémentaires
      let reference = formData.reference || ''
      if (formData.payment_method === 'transfer' && formData.virement_ref) {
        reference = `Virement: ${formData.virement_ref} - Compte: ${formData.virement_compte || 'N/A'} - Date: ${formData.virement_date || 'N/A'}`
      } else if (formData.payment_method === 'check' && formData.cheque_ref) {
        reference = `Chèque: ${formData.cheque_ref} - Banque: ${formData.cheque_banque || 'N/A'} - Encaissement: ${formData.cheque_date_encaissement || 'N/A'}`
      }

      const paymentData: Record<string, unknown> = {
        payment_number: paymentNumber,
        payment_type: formData.payment_type,
        amount: parseFloat(formData.amount),
        payment_method: formData.payment_method,
        payment_date: formData.payment_date,
        reference: reference || null,
        notes: formData.notes || null,
      }

      if (formData.payment_type === 'client') {
        paymentData.client_id = formData.client_id
        paymentData.delivery_id = formData.document_type === 'BL' && formData.delivery_id ? formData.delivery_id : null
        paymentData.facture_id = formData.document_type === 'Facture' && formData.facture_id ? formData.facture_id : null
        paymentData.sale_id = linkToSale && formData.sale_id ? formData.sale_id : null
      } else {
        paymentData.supplier_id = formData.supplier_id
        paymentData.reception_id = formData.reception_id || null
      }

      const { error } = await supabase.from('payments').insert([paymentData])

      if (error) {
        console.error('Error creating payment:', error)
        alert('Erreur lors de la création du paiement')
      } else {
        // Note: Les triggers SQL s'occupent automatiquement de la mise à jour
        // des amount_paid, balance_due et payment_status des BL
        // - trigger_update_delivery_payment_insert pour les paiements directs sur BL
        // - trigger_sync_facture_payment pour les paiements sur factures (distribution proportionnelle)

        fetchPayments()
        if (isNewOnlyMode) {
          handleCloseNewOnly()
        } else {
          setIsDialogOpen(false)
          resetFormData()
        }
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleCloseNewOnly = () => {
    router.replace('/')
  }

  // Ouvrir le dialogue de modification
  const handleEditPayment = (payment: PaymentRow) => {
    setEditingPayment(payment)
    // Parser la référence pour extraire les détails virement/chèque
    let virement_compte = ''
    let virement_ref = ''
    let virement_date = ''
    let cheque_ref = ''
    let cheque_banque = ''
    let cheque_date_encaissement = ''

    if (payment.reference) {
      if (payment.payment_method === 'transfer' && payment.reference.startsWith('Virement:')) {
        const parts = payment.reference.split(' - ')
        virement_ref = parts[0]?.replace('Virement: ', '') || ''
        virement_compte = parts[1]?.replace('Compte: ', '') || ''
        virement_date = parts[2]?.replace('Date: ', '') || ''
      } else if (payment.payment_method === 'check' && payment.reference.startsWith('Chèque:')) {
        const parts = payment.reference.split(' - ')
        cheque_ref = parts[0]?.replace('Chèque: ', '') || ''
        cheque_banque = parts[1]?.replace('Banque: ', '') || ''
        cheque_date_encaissement = parts[2]?.replace('Encaissement: ', '') || ''
      }
    }

    setFormData({
      client_id: payment.client_id,
      amount: payment.amount.toString(),
      payment_method: payment.payment_method,
      payment_date: payment.payment_date,
      reference: payment.reference || '',
      sale_id: payment.sale_id || '',
      delivery_id: payment.delivery_id || '',
      facture_id: payment.facture_id || '',
      document_type: payment.delivery_id ? 'BL' : payment.facture_id ? 'Facture' : '',
      notes: payment.notes || '',
      virement_compte,
      virement_ref,
      virement_date,
      cheque_ref,
      cheque_banque,
      cheque_date_encaissement,
    })
    fetchDocumentsNonRegles(payment.client_id)
    setIsEditDialogOpen(true)
  }

  // Sauvegarder les modifications du paiement
  const handleUpdatePayment = async () => {
    if (!editingPayment || !formData.client_id || !formData.amount) return

    setIsSaving(true)
    try {
      // Construire la référence avec les infos supplémentaires
      let reference = formData.reference || ''
      if (formData.payment_method === 'transfer' && formData.virement_ref) {
        reference = `Virement: ${formData.virement_ref} - Compte: ${formData.virement_compte || 'N/A'} - Date: ${formData.virement_date || 'N/A'}`
      } else if (formData.payment_method === 'check' && formData.cheque_ref) {
        reference = `Chèque: ${formData.cheque_ref} - Banque: ${formData.cheque_banque || 'N/A'} - Encaissement: ${formData.cheque_date_encaissement || 'N/A'}`
      }

      const newAmount = parseFloat(formData.amount)

      // Mettre à jour le paiement
      const { error } = await supabase.from('payments').update({
        client_id: formData.client_id,
        amount: newAmount,
        payment_method: formData.payment_method,
        payment_date: formData.payment_date,
        reference: reference || null,
        delivery_id: formData.document_type === 'BL' && formData.delivery_id ? formData.delivery_id : null,
        facture_id: formData.document_type === 'Facture' && formData.facture_id ? formData.facture_id : null,
        sale_id: linkToSale && formData.sale_id ? formData.sale_id : null,
        notes: formData.notes || null,
      }).eq('id', editingPayment.id)

      if (error) {
        console.error('Error updating payment:', error)
        alert(`Erreur lors de la modification du paiement: ${error.message}`)
        return
      }

      // Mettre à jour l'entrée correspondante dans cash_register
      const { error: cashError } = await supabase.from('cash_register').update({
        amount: newAmount,
        transaction_date: formData.payment_date,
      }).eq('reference_id', editingPayment.id)

      if (cashError) {
        console.error('Error updating cash_register:', cashError)
      }

      // Mettre à jour amount_paid des livraisons concernées
      const oldDeliveryId = editingPayment.delivery_id
      const newDeliveryId = formData.document_type === 'BL' && formData.delivery_id ? formData.delivery_id : null

      // Si l'ancien BL est différent du nouveau, recalculer les deux
      if (oldDeliveryId && oldDeliveryId !== newDeliveryId) {
        await updateDeliveryAmountPaid(oldDeliveryId)
      }
      if (newDeliveryId) {
        await updateDeliveryAmountPaid(newDeliveryId)
      }

      fetchPayments()
      setIsEditDialogOpen(false)
      setEditingPayment(null)
      resetFormData()
    } finally {
      setIsSaving(false)
    }
  }

  // Supprimer un paiement
  const handleDeletePayment = async (payment: PaymentRow) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le paiement ${payment.payment_number} de ${formatPrice(payment.amount)} ?\n\nCette action supprimera également l'entrée correspondante dans la caisse.`)) {
      return
    }

    setIsDeleting(true)
    try {
      // D'abord supprimer l'entrée dans cash_register (liée par reference_id)
      const { error: cashError } = await supabase
        .from('cash_register')
        .delete()
        .eq('reference_id', payment.id)

      if (cashError) {
        console.error('Error deleting cash_register entry:', cashError)
      }

      // Sauvegarder les IDs avant la suppression
      const deliveryIdToUpdate = payment.delivery_id
      const factureIdToUpdate = payment.facture_id

      // Ensuite supprimer le paiement
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', payment.id)

      if (error) {
        console.error('Error deleting payment:', error)
        alert('Erreur lors de la suppression du paiement')
      } else {
        // Mettre à jour amount_paid de la livraison si un BL était lié
        if (deliveryIdToUpdate) {
          await updateDeliveryAmountPaid(deliveryIdToUpdate)
        }

        // Recalculer les BL de la facture si une facture était liée
        if (factureIdToUpdate) {
          await recalculateFactureDeliveriesAfterDelete(factureIdToUpdate)
        }

        fetchPayments()
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const openDialog = () => {
    setIsDialogOpen(true)
  }

  useEffect(() => {
    fetchPayments()
    fetchClients()
    fetchSuppliers()
  }, [])

  const getReference = (payment: PaymentRow): { label: string; type: string } => {
    if (payment.payment_type === 'fournisseur') {
      if (payment.reception?.reception_number) {
        return { label: payment.reception.reception_number, type: 'BR' }
      }
      return { label: '-', type: '' }
    }
    // Paiement client
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
    const formatted = price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    return `${formatted} MAD`
  }

  // Navigation du mois
  const navigateMonth = (direction: 'prev' | 'next') => {
    const [year, month] = selectedMonth.split('-').map(Number)
    let newYear = year
    let newMonth = month

    if (direction === 'prev') {
      newMonth--
      if (newMonth < 1) {
        newMonth = 12
        newYear--
      }
    } else {
      newMonth++
      if (newMonth > 12) {
        newMonth = 1
        newYear++
      }
    }

    setSelectedMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`)
  }

  // Obtenir la date effective du document (BL, Facture, Vente ou BR)
  const getDocumentDate = (p: PaymentRow): string | null => {
    if (p.reception?.reception_date) return p.reception.reception_date
    if (p.delivery?.delivery_date) return p.delivery.delivery_date
    if (p.facture?.facture_date) return p.facture.facture_date
    if (p.sale?.sale_date) return p.sale.sale_date
    return p.payment_date // Fallback sur la date de paiement si pas de document
  }

  // Filtrer par mois sélectionné, type, client/fournisseur et terme de recherche
  const filteredPayments = payments.filter((p) => {
    // Filtre par mois (basé sur la date du document: BL, Facture, Vente ou BR)
    const docDate = getDocumentDate(p)
    if (docDate) {
      const docMonth = docDate.substring(0, 7) // "YYYY-MM"
      if (docMonth !== selectedMonth) return false
    }

    // Filtre par type
    if (filterType !== 'all' && p.payment_type !== filterType) return false

    // Filtre par client spécifique
    if (filterClientId && p.client_id !== filterClientId) return false

    // Filtre par fournisseur spécifique
    if (filterSupplierId && p.supplier_id !== filterSupplierId) return false

    // Filtre par terme de recherche
    const term = searchTerm.toLowerCase()
    if (!term) return true

    const ref = getReference(p)
    return (
      p.payment_number.toLowerCase().includes(term) ||
      p.client?.name?.toLowerCase().includes(term) ||
      p.client?.code?.toLowerCase().includes(term) ||
      p.supplier?.name?.toLowerCase().includes(term) ||
      p.supplier?.code?.toLowerCase().includes(term) ||
      ref.label.toLowerCase().includes(term) ||
      (p.reference || '').toLowerCase().includes(term)
    )
  })

  // Calculer les totaux
  const totalClients = filteredPayments
    .filter(p => p.payment_type === 'client')
    .reduce((sum, p) => sum + (p.amount || 0), 0)
  const totalFournisseurs = filteredPayments
    .filter(p => p.payment_type === 'fournisseur')
    .reduce((sum, p) => sum + (p.amount || 0), 0)
  const soldeNet = totalClients - totalFournisseurs

  const handlePrintReceipt = async (payment: PaymentRow) => {
    const ref = getReference(payment)
    const isSupplier = payment.payment_type === 'fournisseur'

    const paymentData = {
      payment_number: payment.payment_number,
      payment_date: payment.payment_date,
      amount: payment.amount,
      payment_method: payment.payment_method,
      payment_type: payment.payment_type,
      reference: payment.reference,
      notes: payment.notes,
      client: !isSupplier ? {
        code: payment.client?.code || '',
        name: payment.client?.name || '',
      } : null,
      supplier: isSupplier ? {
        code: payment.supplier?.code || '',
        name: payment.supplier?.name || '',
      } : null,
      document: ref.type ? {
        type: ref.type as 'BL' | 'Facture' | 'Vente' | 'BR',
        number: ref.label,
      } : null,
    }
    await generatePaymentReceiptPDF(paymentData, companySettings, companySettings?.logo_url || undefined)
  }

  // Mode formulaire seul via Actions
  if (isNewOnlyMode) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) handleCloseNewOnly()
        }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
                    setFormData({
                      ...formData,
                      client_id: value,
                      sale_id: '',
                      delivery_id: '',
                      facture_id: '',
                      document_type: ''
                    })
                    fetchDocumentsNonRegles(value)
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

              {/* Documents non réglés */}
              {formData.client_id && (
                <div className="space-y-2">
                  <Label>Référence (BL / Facture non réglé)</Label>
                  {isLoadingDocs ? (
                    <div className="text-sm text-gray-500 py-2">Chargement...</div>
                  ) : (
                    <Select
                      value={formData.document_type === 'BL' ? formData.delivery_id : formData.facture_id}
                      onValueChange={(value) => {
                        const doc = documentsNonRegles.find(d => d.id === value)
                        if (doc) {
                          if (doc.type === 'BL') {
                            setFormData({
                              ...formData,
                              delivery_id: value,
                              facture_id: '',
                              document_type: 'BL',
                              amount: formData.amount || doc.balance_due.toString()
                            })
                          } else {
                            setFormData({
                              ...formData,
                              facture_id: value,
                              delivery_id: '',
                              document_type: 'Facture',
                              amount: formData.amount || doc.balance_due.toString()
                            })
                          }
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un document (optionnel)" />
                      </SelectTrigger>
                      <SelectContent>
                        {documentsNonRegles.length === 0 ? (
                          <div className="px-2 py-2 text-sm text-gray-500">Aucun document non réglé</div>
                        ) : (
                          documentsNonRegles.map((doc) => (
                            <SelectItem key={doc.id} value={doc.id}>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={doc.type === 'BL' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}>
                                  {doc.type}
                                </Badge>
                                <span className="font-mono text-sm">{doc.number}</span>
                                <span className="text-orange-600 font-medium text-sm">
                                  {formatPrice(doc.balance_due)}
                                </span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

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
                  onValueChange={(value) => setFormData({
                    ...formData,
                    payment_method: value,
                    virement_compte: '',
                    virement_ref: '',
                    virement_date: '',
                    cheque_ref: '',
                    cheque_banque: '',
                    cheque_date_encaissement: '',
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Espèces</SelectItem>
                    <SelectItem value="cash_deposit">Versement d'espèces</SelectItem>
                    <SelectItem value="transfer">Virement</SelectItem>
                    <SelectItem value="check">Chèque</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Champs Virement */}
              {formData.payment_method === 'transfer' && (
                <div className="space-y-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm font-medium text-purple-800">Détails du virement</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Compte</Label>
                      <Input
                        value={formData.virement_compte}
                        onChange={(e) => setFormData({ ...formData, virement_compte: e.target.value })}
                        placeholder="N° compte"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Référence</Label>
                      <Input
                        value={formData.virement_ref}
                        onChange={(e) => setFormData({ ...formData, virement_ref: e.target.value })}
                        placeholder="Réf. virement"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Date du virement</Label>
                    <Input
                      type="date"
                      value={formData.virement_date}
                      onChange={(e) => setFormData({ ...formData, virement_date: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Champs Chèque */}
              {formData.payment_method === 'check' && (
                <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-800">Détails du chèque</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">N° chèque *</Label>
                      <Input
                        value={formData.cheque_ref}
                        onChange={(e) => setFormData({ ...formData, cheque_ref: e.target.value })}
                        placeholder="N° chèque"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Banque</Label>
                      <Input
                        value={formData.cheque_banque}
                        onChange={(e) => setFormData({ ...formData, cheque_banque: e.target.value })}
                        placeholder="Nom banque"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Date d&apos;encaissement</Label>
                    <Input
                      type="date"
                      value={formData.cheque_date_encaissement}
                      onChange={(e) => setFormData({ ...formData, cheque_date_encaissement: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Date du paiement */}
              <div className="space-y-2">
                <Label>Date du paiement</Label>
                <Input
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optionnel"
                />
              </div>

              {/* Boutons */}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={handleCloseNewOnly}>
                  Annuler
                </Button>
                <Button
                  onClick={handleCreatePayment}
                  disabled={isSaving || !formData.client_id || !formData.amount}
                  className="bg-[#B8860B] hover:bg-[#9A7209]"
                >
                  {isSaving ? 'Enregistrement...' : 'Créer le paiement'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

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

        {/* Carte résumé du mois */}
        <Card className="border-2 border-[#B8860B] bg-gradient-to-r from-amber-50 to-yellow-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-green-600">
                    <Banknote className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Encaissements</p>
                    <p className="text-lg font-bold text-green-600">+{formatPrice(totalClients)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-red-600">
                    <Banknote className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Décaissements</p>
                    <p className="text-lg font-bold text-red-600">-{formatPrice(totalFournisseurs)}</p>
                  </div>
                </div>
                <div className="border-l-2 border-[#B8860B] pl-4">
                  <p className="text-xs text-gray-500">Solde</p>
                  <p className={`text-xl font-bold ${soldeNet >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {soldeNet >= 0 ? '+' : ''}{formatPrice(soldeNet)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateMonth('prev')}
                  className="p-2 rounded-full hover:bg-[#B8860B]/10 transition-colors"
                >
                  <ChevronLeft className="h-5 w-5 text-[#B8860B]" />
                </button>
                <span className="text-lg font-semibold text-gray-700 min-w-[140px] text-center">
                  {format(new Date(selectedMonth + '-01'), 'MMMM yyyy', { locale: fr })}
                </span>
                <button
                  onClick={() => navigateMonth('next')}
                  className="p-2 rounded-full hover:bg-[#B8860B]/10 transition-colors"
                >
                  <ChevronRight className="h-5 w-5 text-[#B8860B]" />
                </button>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">{filteredPayments.length} paiement{filteredPayments.length > 1 ? 's' : ''}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              {/* Ligne de recherche */}
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher par n° reçu, client, fournisseur, référence..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              {/* Ligne de filtres */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Filtre Type */}
                <Select
                  value={filterType}
                  onValueChange={(value: 'all' | 'client' | 'fournisseur') => {
                    setFilterType(value)
                    if (value === 'client') setFilterSupplierId('')
                    if (value === 'fournisseur') setFilterClientId('')
                  }}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="client">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        Clients
                      </span>
                    </SelectItem>
                    <SelectItem value="fournisseur">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        Fournisseurs
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Filtre Client */}
                {(filterType === 'all' || filterType === 'client') && (
                  <Select
                    value={filterClientId || '__all__'}
                    onValueChange={(v) => setFilterClientId(v === '__all__' ? '' : v)}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Tous les clients" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Tous les clients</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          <span className="font-mono text-xs text-gray-500 mr-1">{client.code}</span>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Filtre Fournisseur */}
                {(filterType === 'all' || filterType === 'fournisseur') && (
                  <Select
                    value={filterSupplierId || '__all__'}
                    onValueChange={(v) => setFilterSupplierId(v === '__all__' ? '' : v)}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Tous les fournisseurs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Tous les fournisseurs</SelectItem>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          <span className="font-mono text-xs text-gray-500 mr-1">{supplier.code}</span>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Bouton reset filtres */}
                {(filterType !== 'all' || filterClientId || filterSupplierId) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFilterType('all')
                      setFilterClientId('')
                      setFilterSupplierId('')
                    }}
                    className="text-gray-500"
                  >
                    Réinitialiser
                  </Button>
                )}
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
                      <TableHead>Type</TableHead>
                      <TableHead>Client / Fournisseur</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                      <TableHead>Référence</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment) => {
                      const ref = getReference(payment)
                      const isClient = payment.payment_type === 'client'
                      return (
                        <TableRow key={payment.id}>
                          <TableCell>
                            {format(new Date(payment.payment_date), 'dd/MM/yyyy', { locale: fr })}
                          </TableCell>
                          <TableCell className="font-mono font-medium">{payment.payment_number}</TableCell>
                          <TableCell>
                            <Badge className={isClient ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                              {isClient ? 'Client' : 'Fournisseur'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {isClient ? (
                              <>
                                <span className="font-mono text-xs text-gray-500">{payment.client?.code}</span>
                                <span className="ml-2">{payment.client?.name || '--'}</span>
                              </>
                            ) : (
                              <>
                                <span className="font-mono text-xs text-gray-500">{payment.supplier?.code}</span>
                                <span className="ml-2">{payment.supplier?.name || '--'}</span>
                              </>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={paymentMethodColors[payment.payment_method] || 'bg-gray-100 text-gray-800'}>
                              {paymentMethodLabels[payment.payment_method] || payment.payment_method}
                            </Badge>
                          </TableCell>
                          <TableCell className={`text-right font-bold ${isClient ? 'text-green-700' : 'text-red-600'}`}>
                            {isClient ? '+' : '-'}{formatPrice(payment.amount)}
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
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Imprimer le reçu"
                                onClick={() => handlePrintReceipt(payment)}
                              >
                                <Printer className="h-4 w-4 text-[#B8860B]" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Modifier"
                                onClick={() => handleEditPayment(payment)}
                              >
                                <Pencil className="h-4 w-4 text-blue-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Supprimer"
                                onClick={() => handleDeletePayment(payment)}
                                disabled={isDeleting}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
                <div className="flex justify-between items-center pt-4 border-t mt-4">
                  <div className="text-sm text-gray-500">
                    {filteredPayments.length} paiement{filteredPayments.length > 1 ? 's' : ''}
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <span className="text-gray-500">Clients:</span>
                      <span className="font-bold text-green-700 ml-2">+{formatPrice(totalClients)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Fournisseurs:</span>
                      <span className="font-bold text-red-600 ml-2">-{formatPrice(totalFournisseurs)}</span>
                    </div>
                    <div className="border-l pl-4">
                      <span className="text-gray-500">Solde:</span>
                      <span className={`font-bold ml-2 ${soldeNet >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {soldeNet >= 0 ? '+' : ''}{formatPrice(soldeNet)}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Dialog de création de paiement */}
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) resetFormData()
        }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouveau paiement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {/* Type de paiement */}
              <div className="space-y-2">
                <Label>Type de paiement *</Label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      payment_type: 'client',
                      supplier_id: '',
                      reception_id: '',
                    })}
                    className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                      formData.payment_type === 'client'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium">Client</div>
                    <div className="text-xs text-gray-500">Encaissement (+)</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      payment_type: 'fournisseur',
                      client_id: '',
                      delivery_id: '',
                      facture_id: '',
                      sale_id: '',
                      document_type: '',
                    })}
                    className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                      formData.payment_type === 'fournisseur'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium">Fournisseur</div>
                    <div className="text-xs text-gray-500">Décaissement (-)</div>
                  </button>
                </div>
              </div>

              {/* === SECTION CLIENT === */}
              {formData.payment_type === 'client' && (
                <>
                  {/* Client */}
                  <div className="space-y-2">
                    <Label>Client *</Label>
                    <Select
                      value={formData.client_id}
                      onValueChange={(value) => {
                        setFormData({
                          ...formData,
                          client_id: value,
                          sale_id: '',
                          delivery_id: '',
                          facture_id: '',
                          document_type: ''
                        })
                        fetchDocumentsNonRegles(value)
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

                  {/* Documents non réglés (BL / Factures) */}
                  {formData.client_id && (
                <div className="space-y-2">
                  <Label>Référence (BL / Facture non réglé)</Label>
                  {isLoadingDocs ? (
                    <div className="text-sm text-gray-500 py-2">Chargement...</div>
                  ) : (
                    <Select
                      value={formData.document_type === 'BL' ? formData.delivery_id : formData.facture_id}
                      onValueChange={(value) => {
                        const doc = documentsNonRegles.find(d => d.id === value)
                        if (doc) {
                          if (doc.type === 'BL') {
                            setFormData({
                              ...formData,
                              delivery_id: value,
                              facture_id: '',
                              document_type: 'BL',
                              amount: formData.amount || doc.balance_due.toString()
                            })
                          } else {
                            setFormData({
                              ...formData,
                              facture_id: value,
                              delivery_id: '',
                              document_type: 'Facture',
                              amount: formData.amount || doc.balance_due.toString()
                            })
                          }
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un document (optionnel)" />
                      </SelectTrigger>
                      <SelectContent>
                        {documentsNonRegles.length === 0 ? (
                          <div className="px-2 py-2 text-sm text-gray-500">Aucun document non réglé</div>
                        ) : (
                          documentsNonRegles.map((doc) => (
                            <SelectItem key={doc.id} value={doc.id}>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={doc.type === 'BL' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}>
                                  {doc.type}
                                </Badge>
                                <span className="font-mono text-sm">{doc.number}</span>
                                <span className="text-gray-500 text-xs">
                                  ({format(new Date(doc.date), 'dd/MM/yy', { locale: fr })})
                                </span>
                                <span className="text-orange-600 font-medium text-sm">
                                  {formatPrice(doc.balance_due)}
                                </span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                    </div>
                  )}
                </>
              )}

              {/* === SECTION FOURNISSEUR === */}
              {formData.payment_type === 'fournisseur' && (
                <>
                  {/* Fournisseur */}
                  <div className="space-y-2">
                    <Label>Fournisseur *</Label>
                    <Select
                      value={formData.supplier_id}
                      onValueChange={(value) => {
                        setFormData({
                          ...formData,
                          supplier_id: value,
                          reception_id: '',
                        })
                        fetchReceptionsNonPayees(value)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un fournisseur" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            <span className="font-mono text-xs text-gray-500 mr-2">{supplier.code}</span>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Réceptions non payées (BR) */}
                  {formData.supplier_id && (
                    <div className="space-y-2">
                      <Label>Bon de réception (BR) non payé</Label>
                      {isLoadingReceptions ? (
                        <div className="text-sm text-gray-500 py-2">Chargement...</div>
                      ) : (
                        <Select
                          value={formData.reception_id}
                          onValueChange={(value) => {
                            const reception = receptionsNonPayees.find(r => r.id === value)
                            if (reception) {
                              setFormData({
                                ...formData,
                                reception_id: value,
                                amount: formData.amount || reception.total_ht.toString()
                              })
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un BR (optionnel)" />
                          </SelectTrigger>
                          <SelectContent>
                            {receptionsNonPayees.length === 0 ? (
                              <div className="px-2 py-2 text-sm text-gray-500">Aucune réception non payée</div>
                            ) : (
                              receptionsNonPayees.map((reception) => (
                                <SelectItem key={reception.id} value={reception.id}>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="bg-orange-50 text-orange-700">
                                      BR
                                    </Badge>
                                    <span className="font-mono text-sm">{reception.reception_number}</span>
                                    <span className="text-gray-500 text-xs">
                                      ({format(new Date(reception.reception_date), 'dd/MM/yy', { locale: fr })})
                                    </span>
                                    <span className="text-red-600 font-medium text-sm">
                                      {formatPrice(reception.total_ht)}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}
                </>
              )}

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
                  onValueChange={(value) => setFormData({
                    ...formData,
                    payment_method: value,
                    // Reset les champs spécifiques
                    virement_compte: '',
                    virement_ref: '',
                    virement_date: '',
                    cheque_ref: '',
                    cheque_banque: '',
                    cheque_date_encaissement: '',
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Espèces</SelectItem>
                    <SelectItem value="cash_deposit">Versement d'espèces</SelectItem>
                    <SelectItem value="transfer">Virement</SelectItem>
                    <SelectItem value="check">Chèque</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Champs spécifiques Virement */}
              {formData.payment_method === 'transfer' && (
                <div className="space-y-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm font-medium text-purple-800">Détails du virement</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Compte destinataire</Label>
                      <Input
                        value={formData.virement_compte}
                        onChange={(e) => setFormData({ ...formData, virement_compte: e.target.value })}
                        placeholder="N° compte"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Référence virement</Label>
                      <Input
                        value={formData.virement_ref}
                        onChange={(e) => setFormData({ ...formData, virement_ref: e.target.value })}
                        placeholder="Réf. virement"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Date du virement</Label>
                    <Input
                      type="date"
                      value={formData.virement_date}
                      onChange={(e) => setFormData({ ...formData, virement_date: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Champs spécifiques Chèque */}
              {formData.payment_method === 'check' && (
                <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-800">Détails du chèque</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">N° du chèque *</Label>
                      <Input
                        value={formData.cheque_ref}
                        onChange={(e) => setFormData({ ...formData, cheque_ref: e.target.value })}
                        placeholder="N° chèque"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Banque</Label>
                      <Input
                        value={formData.cheque_banque}
                        onChange={(e) => setFormData({ ...formData, cheque_banque: e.target.value })}
                        placeholder="Nom de la banque"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Date d&apos;encaissement prévue</Label>
                    <Input
                      type="date"
                      value={formData.cheque_date_encaissement}
                      onChange={(e) => setFormData({ ...formData, cheque_date_encaissement: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Date du paiement */}
              <div className="space-y-2">
                <Label>Date du paiement</Label>
                <Input
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notes (optionnel)"
                />
              </div>

              {/* Boutons */}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => {
                  setIsDialogOpen(false)
                  resetFormData()
                }}>
                  Annuler
                </Button>
                <Button
                  onClick={handleCreatePayment}
                  disabled={isSaving || !formData.amount || (formData.payment_type === 'client' ? !formData.client_id : !formData.supplier_id)}
                  className={formData.payment_type === 'client' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                >
                  {isSaving ? 'Enregistrement...' : (formData.payment_type === 'client' ? 'Créer encaissement' : 'Créer décaissement')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog de modification de paiement */}
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          setIsEditDialogOpen(open)
          if (!open) {
            setEditingPayment(null)
            resetFormData()
          }
        }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifier le paiement {editingPayment?.payment_number}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {/* Client */}
              <div className="space-y-2">
                <Label>Client *</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => {
                    setFormData({
                      ...formData,
                      client_id: value,
                      sale_id: '',
                      delivery_id: '',
                      facture_id: '',
                      document_type: ''
                    })
                    fetchDocumentsNonRegles(value)
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
                  onValueChange={(value) => setFormData({
                    ...formData,
                    payment_method: value,
                    virement_compte: '',
                    virement_ref: '',
                    virement_date: '',
                    cheque_ref: '',
                    cheque_banque: '',
                    cheque_date_encaissement: '',
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Espèces</SelectItem>
                    <SelectItem value="cash_deposit">Versement d'espèces</SelectItem>
                    <SelectItem value="transfer">Virement</SelectItem>
                    <SelectItem value="check">Chèque</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Champs spécifiques Virement */}
              {formData.payment_method === 'transfer' && (
                <div className="space-y-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm font-medium text-purple-800">Détails du virement</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Compte</Label>
                      <Input
                        value={formData.virement_compte}
                        onChange={(e) => setFormData({ ...formData, virement_compte: e.target.value })}
                        placeholder="N° compte"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Référence</Label>
                      <Input
                        value={formData.virement_ref}
                        onChange={(e) => setFormData({ ...formData, virement_ref: e.target.value })}
                        placeholder="Réf. virement"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Date du virement</Label>
                    <Input
                      type="date"
                      value={formData.virement_date}
                      onChange={(e) => setFormData({ ...formData, virement_date: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Champs spécifiques Chèque */}
              {formData.payment_method === 'check' && (
                <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-800">Détails du chèque</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">N° chèque</Label>
                      <Input
                        value={formData.cheque_ref}
                        onChange={(e) => setFormData({ ...formData, cheque_ref: e.target.value })}
                        placeholder="N° chèque"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Banque</Label>
                      <Input
                        value={formData.cheque_banque}
                        onChange={(e) => setFormData({ ...formData, cheque_banque: e.target.value })}
                        placeholder="Nom banque"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Date d&apos;encaissement</Label>
                    <Input
                      type="date"
                      value={formData.cheque_date_encaissement}
                      onChange={(e) => setFormData({ ...formData, cheque_date_encaissement: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Date du paiement */}
              <div className="space-y-2">
                <Label>Date du paiement</Label>
                <Input
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notes (optionnel)"
                />
              </div>

              {/* Boutons */}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => {
                  setIsEditDialogOpen(false)
                  setEditingPayment(null)
                  resetFormData()
                }}>
                  Annuler
                </Button>
                <Button
                  onClick={handleUpdatePayment}
                  disabled={isSaving || !formData.client_id || !formData.amount}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedModule>
  )
}
