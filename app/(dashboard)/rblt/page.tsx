'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSupabase } from '@/hooks/useSupabase'
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
import {
  Plus,
  Search,
  Truck,
  Eye,
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  Trash2,
  RotateCcw,
  XCircle,
  User,
  Calendar,
  Package,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

// Interfaces

interface DeliveryRoundItem {
  id: string
  delivery_id: string
  sequence_order: number
  status: string
  delivered_at: string | null
  notes: string | null
  delivery?: {
    id: string
    delivery_number: string
    client_id: string
    total_ht: number | null
    status: string
    client?: {
      code: string
      name: string
      address: string | null
      city: string | null
    }
    delivery_items?: {
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
    }[]
  }
}

interface DeliveryRound {
  id: string
  round_number: string
  driver_id: string | null
  status: string
  round_date: string
  start_time: string | null
  end_time: string | null
  total_distance: number | null
  total_duration: number | null
  depot_lat: number | null
  depot_lng: number | null
  notes: string | null
  created_at: string
  driver?: {
    id: string
    full_name: string
    email: string
  }
  delivery_round_items?: DeliveryRoundItem[]
}

interface DeliveryReturnItem {
  id: string
  return_id: string
  delivery_item_id: string | null
  article_id: string
  quantity_returned: number
  unit_price: number | null
  return_reason: string | null
  article?: {
    code: string
    name: string
  }
}

interface DeliveryReturn {
  id: string
  return_number: string
  delivery_id: string | null
  round_id: string | null
  client_id: string
  return_date: string
  status: string
  return_reason: string | null
  total_ht: number | null
  notes: string | null
  user_id: string | null
  created_at: string
  delivery?: {
    delivery_number: string
  }
  round?: {
    id: string
    round_number: string
    round_date: string
    status: string
    driver?: { full_name: string }
    delivery_round_items?: {
      id: string
      delivery_id: string
      delivery?: {
        id: string
        delivery_number: string
        total_ht: number | null
        status: string
        delivery_items?: {
          id: string
          quantity_ordered: number
          quantity_delivered: number
          quantity_returned: number
          unit_price: number
        }[]
      }
    }[]
  }
  client?: {
    code: string
    name: string
  }
  delivery_return_items?: DeliveryReturnItem[]
}

// Constants

const returnStatusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  validated: 'bg-amber-100 text-[#9A7209]',
  cancelled: 'bg-red-100 text-red-800',
}

const returnStatusLabels: Record<string, string> = {
  pending: 'En attente',
  validated: 'Validé',
  cancelled: 'Annulé',
}

const returnReasons = [
  { value: 'damaged', label: 'Produit endommagé' },
  { value: 'expired', label: 'Produit périmé' },
  { value: 'wrong_product', label: 'Mauvais produit' },
  { value: 'excess', label: 'Excédent' },
  { value: 'quality', label: 'Problème qualité' },
  { value: 'other', label: 'Autre' },
]

const formatPrice = (price: number | null) => {
  if (price === null) return '-'
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
  }).format(price)
}

export default function RBLTPage() {
  const supabase = useSupabase()

  // Data state
  const [rounds, setRounds] = useState<DeliveryRound[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // RBLT state
  const [returns, setReturns] = useState<DeliveryReturn[]>([])
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false)
  const [isViewReturnDialogOpen, setIsViewReturnDialogOpen] = useState(false)
  const [viewingReturn, setViewingReturn] = useState<DeliveryReturn | null>(null)
  const [returnSearchTerm, setReturnSearchTerm] = useState('')
  const [returnStatusFilter, setReturnStatusFilter] = useState<string>('all')
  const [returnFormData, setReturnFormData] = useState({
    return_date: new Date().toISOString().split('T')[0],
    notes: '',
  })
  const [selectedRoundForReturn, setSelectedRoundForReturn] = useState<string>('')

  // BLT detail states (same logic as livraisons BLT)
  const [expandedDeliveryId, setExpandedDeliveryId] = useState<string | null>(null)
  const [editingItems, setEditingItems] = useState<Record<string, { quantity_returned: number }>>({})

  // Fetch rounds
  const fetchRounds = useCallback(async () => {
    const { data, error } = await supabase
      .from('delivery_rounds')
      .select(`
        *,
        driver:users!delivery_rounds_driver_id_fkey(id, full_name, email),
        delivery_round_items(
          *,
          delivery:deliveries(
            id,
            delivery_number,
            client_id,
            total_ht,
            balance_due,
            amount_paid,
            payment_status,
            status,
            client:clients(code, name, address, city),
            delivery_items(id, article_id, quantity_ordered, quantity_delivered, quantity_returned, unit_price, article:articles(code, name, description, cr))
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching rounds:', error)
    } else {
      setRounds(data || [])
    }
  }, [supabase])

  // Fetch returns
  const fetchReturns = useCallback(async () => {
    const { data, error } = await supabase
      .from('delivery_returns')
      .select(`
        *,
        delivery:deliveries(delivery_number),
        client:clients(code, name),
        round:delivery_rounds(id, round_number, round_date, status),
        delivery_return_items(
          *,
          article:articles(code, name)
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching returns:', error)
    } else {
      setReturns(data || [])
    }
  }, [supabase])

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await Promise.all([fetchRounds(), fetchReturns()])
      setIsLoading(false)
    }
    loadData()
  }, [fetchRounds, fetchReturns])

  const generateReturnNumber = async (): Promise<string> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('delivery_returns') as any)
      .select('return_number')
      .like('return_number', 'RBLT%')
      .order('return_number', { ascending: false })
      .limit(1)

    if (data && data.length > 0) {
      const lastNum = parseInt(data[0].return_number.replace('RBLT', ''))
      if (!isNaN(lastNum)) {
        return `RBLT${String(lastNum + 1).padStart(4, '0')}`
      }
    }
    return 'RBLT0001'
  }

  // Get returned items from the selected BLT automatically
  const getReturnedItemsFromRound = (roundId: string) => {
    const round = rounds.find(r => r.id === roundId)
    if (!round?.delivery_round_items) return []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: { article_id: string; article_code: string; article_name: string; quantity_returned: number; unit_price: number; delivery_number: string; client_name: string; delivery_id: string }[] = []

    for (const ri of round.delivery_round_items) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const delivery = ri.delivery as any
      if (!delivery?.delivery_items) continue

      for (const di of delivery.delivery_items) {
        if (di.quantity_returned > 0) {
          items.push({
            article_id: di.article_id || di.id,
            article_code: di.article?.code || '',
            article_name: di.article?.name || '',
            quantity_returned: di.quantity_returned,
            unit_price: di.unit_price || 0,
            delivery_number: delivery.delivery_number,
            client_name: delivery.client?.name || '',
            delivery_id: delivery.id,
          })
        }
      }
    }
    return items
  }

  const selectedRoundReturnedItems = selectedRoundForReturn ? getReturnedItemsFromRound(selectedRoundForReturn) : []
  const selectedRoundTotalHt = selectedRoundReturnedItems.reduce((sum, item) => sum + (item.quantity_returned * item.unit_price), 0)

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedRoundForReturn) {
      alert('Veuillez sélectionner une tournée')
      return
    }

    const fullRound = rounds.find(r => r.id === selectedRoundForReturn)
    if (!fullRound) {
      alert('Tournée introuvable')
      return
    }

    const roundItems = fullRound.delivery_round_items || []

    // Calculer total articles (somme qté livrée)
    const totalArticles = roundItems.reduce((sum, ri) => {
      const items = ri.delivery?.delivery_items || []
      return sum + items.reduce((s, di) => s + (di.quantity_delivered || 0), 0)
    }, 0)

    // Calculer articles retournés (somme qté retournée)
    const totalReturned = roundItems.reduce((sum, ri) => {
      const items = ri.delivery?.delivery_items || []
      return sum + items.reduce((s, di) => s + (di.quantity_returned || 0), 0)
    }, 0)

    // Nombre de BL
    const nbBL = roundItems.length

    // Valeur BLT
    const valeurBLT = roundItems.reduce((sum, ri) => sum + (ri.delivery?.total_ht || 0), 0)

    // Recette BLT (livrée - retournée)
    const recetteBLT = roundItems.reduce((sum, ri) => {
      const items = ri.delivery?.delivery_items || []
      return sum + items.reduce((s, di) => s + ((di.quantity_delivered - di.quantity_returned) * di.unit_price), 0)
    }, 0)

    // Valeur retour
    const valeurRetour = roundItems.reduce((sum, ri) => {
      const items = ri.delivery?.delivery_items || []
      return sum + items.reduce((s, di) => s + (di.quantity_returned * di.unit_price), 0)
    }, 0)

    // Client (si un seul BL)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clientId = nbBL === 1 ? (roundItems[0].delivery as any)?.client_id || null : null

    const returnNumber = await generateReturnNumber()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: returnData, error: returnError } = await (supabase.from('delivery_returns') as any)
      .insert([{
        return_number: returnNumber,
        delivery_id: null,
        round_id: selectedRoundForReturn,
        client_id: clientId,
        return_date: fullRound.round_date,
        status: 'pending',
        return_reason: null,
        total_ht: valeurRetour,
        notes: returnFormData.notes || null,
      }])
      .select()
      .single()

    if (returnError) {
      console.error('Error creating return:', returnError)
      alert(`Erreur: ${returnError.message}`)
      return
    }

    // Collecter tous les articles retournés depuis le BLT
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const returnItemsData: any[] = []
    for (const ri of roundItems) {
      const items = ri.delivery?.delivery_items || []
      for (const di of items) {
        if (di.quantity_returned > 0) {
          returnItemsData.push({
            return_id: returnData.id,
            article_id: di.article_id,
            quantity_returned: di.quantity_returned,
            unit_price: di.unit_price,
            return_reason: null,
          })
        }
      }
    }

    if (returnItemsData.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('delivery_return_items') as any).insert(returnItemsData)
    }

    await fetchReturns()
    await fetchRounds()
    setIsReturnDialogOpen(false)
    resetReturnForm()
  }

  const handleValidateReturn = async (returnId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('delivery_returns') as any)
      .update({ status: 'validated' })
      .eq('id', returnId)

    if (error) {
      console.error('Error validating return:', error)
      alert(`Erreur validation: ${error.message}`)
      return
    }

    // Créer automatiquement une vente à partir du RBLT validé
    const ret = returns.find(r => r.id === returnId)
    if (!ret) {
      console.error('Return not found in state:', returnId)
      alert('Erreur: retour introuvable')
      return
    }

    const fullRound = rounds.find(r => r.id === ret.round_id)
    if (!fullRound) {
      console.error('Round not found for return:', ret.round_id)
      alert('Erreur: tournée introuvable')
      return
    }

    const roundItems = fullRound.delivery_round_items || []

    // Recette BLT = somme (qté livrée - qté retournée) * prix unitaire
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recetteBLT = roundItems.reduce((sum: number, ri: any) => {
      const items = ri.delivery?.delivery_items || []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return sum + items.reduce((s: number, di: any) => s + ((di.quantity_delivered - di.quantity_returned) * di.unit_price), 0)
    }, 0)

    // RNET-BLT = somme des amount_paid (encaissements)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rnetBLT = roundItems.reduce((sum: number, ri: any) => sum + ((ri.delivery as any)?.amount_paid || 0), 0)

    // Calculer MB (Marge Bénéficiaire) = somme((Prix HT - CR) × quantité vendue)
    let calculatedMB = 0
    for (const ri of roundItems) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const delivery = ri.delivery as any
      if (!delivery?.delivery_items) continue
      for (const di of delivery.delivery_items) {
        const qtySold = (di.quantity_delivered || 0) - (di.quantity_returned || 0)
        if (qtySold > 0) {
          // Récupérer le CR de l'article
          const articleCR = di.article?.cr || 0
          // MB = (Prix unitaire - CR) × quantité vendue
          calculatedMB += (di.unit_price - articleCR) * qtySold
        }
      }
    }

    // Générer numéro de vente
    const year = new Date().getFullYear()
    const prefix = `VTE-${year}-`
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: lastSale } = await (supabase.from('sales') as any)
      .select('sale_number')
      .like('sale_number', `${prefix}%`)
      .order('sale_number', { ascending: false })
      .limit(1)

    let saleNumber = `${prefix}000001`
    if (lastSale && lastSale.length > 0) {
      const lastNum = parseInt(lastSale[0].sale_number.replace(prefix, '')) || 0
      saleNumber = `${prefix}${(lastNum + 1).toString().padStart(6, '0')}`
    }

    // Déterminer le statut initial
    // Si RNET-BLT = 0 → En attente (pending)
    // Si RNET-BLT >= Recette BLT → Réglée (paid)
    // Sinon → Partiellement réglée (partial)
    let paymentStatus = 'pending'
    if (rnetBLT > 0 && rnetBLT >= recetteBLT) {
      paymentStatus = 'paid'
    } else if (rnetBLT > 0) {
      paymentStatus = 'partial'
    }

    // Client: si 1 seul BL, on utilise le client_id du BL, sinon null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const saleClientId = roundItems.length === 1 ? (roundItems[0].delivery as any)?.client_id || null : null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: saleData, error: saleError } = await (supabase.from('sales') as any).insert([{
      sale_number: saleNumber,
      delivery_id: null,
      client_id: saleClientId,
      return_id: returnId,
      rblt_number: ret.return_number,
      sale_date: ret.return_date,
      total_ht: recetteBLT,
      total_ttc: recetteBLT,  // Recette BLT (déjà TTC car prix de vente)
      amount_paid: rnetBLT,   // RNET-BLT = montant encaissé
      balance_due: Math.max(0, recetteBLT - rnetBLT),  // Solde restant
      mb: calculatedMB,
      payment_method: null,
      payment_status: paymentStatus,
    }]).select().single()

    if (saleError) {
      console.error('Error creating sale:', saleError)
      alert(`Erreur création vente: ${saleError.message}`)
    }

    // Insérer les articles vendus dans articles_vendus
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const articlesVendusData: any[] = []
    for (const ri of roundItems) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const delivery = ri.delivery as any
      if (!delivery?.delivery_items) continue
      for (const di of delivery.delivery_items) {
        const qtySold = (di.quantity_delivered || 0) - (di.quantity_returned || 0)
        if (qtySold > 0) {
          articlesVendusData.push({
            sale_id: saleData?.id || null,
            sale_date: ret.return_date,
            sale_number: saleNumber,
            article_id: di.article_id,
            article_code: di.article?.code || '',
            client_id: delivery.client_id,
            client_code: delivery.client?.code || '',
            quantity_sold: qtySold,
            delivery_id: delivery.id,
          })
        }
      }
    }

    if (articlesVendusData.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: avError } = await (supabase.from('articles_vendus') as any).insert(articlesVendusData)
      if (avError) {
        console.error('Error inserting articles vendus:', avError)
        alert(`Erreur insertion articles vendus: ${avError.message}`)
      }
      // Note: La déduction du stock se fait lors de la validation du BLT (tournée)
    } else {
      console.warn('No articles vendus to insert - all qtySold <= 0')
    }

    // Ajouter automatiquement à la caisse
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: cashError } = await (supabase.from('cash_register') as any).insert([{
      operation_type: 'in',
      category: 'vente',
      amount: rnetBLT,
      reference: saleNumber,
      reference_id: saleData?.id || null,
      notes: `Vente ${saleNumber} - RBLT ${ret.return_number}`,
      transaction_date: ret.return_date,
    }])

    if (cashError) {
      console.error('Error inserting cash register:', cashError)
    }

    await fetchReturns()
    await fetchRounds()
  }

  const handleCancelReturn = async (returnId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir annuler ce retour ?')) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('delivery_returns') as any)
      .update({ status: 'cancelled' })
      .eq('id', returnId)
    if (!error) fetchReturns()
  }

  const handleDeleteReturn = async (returnId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce retour ?')) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('delivery_return_items') as any).delete().eq('return_id', returnId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('delivery_returns') as any).delete().eq('id', returnId)
    if (!error) fetchReturns()
  }

  const handleViewReturn = (ret: DeliveryReturn) => {
    setViewingReturn(ret)
    setExpandedDeliveryId(null)
    setEditingItems({})
    setIsViewReturnDialogOpen(true)
  }

  // Edit quantity returned for a delivery item (same logic as BLT in livraisons)
  const handleQuantityReturnedChange = (itemId: string, value: string) => {
    const qty = parseInt(value) || 0
    setEditingItems(prev => ({
      ...prev,
      [itemId]: { quantity_returned: qty },
    }))
  }

  // Save updated quantity_returned for a delivery item
  const handleUpdateDeliveryItem = async (
    itemId: string,
    newQtyReturned: number,
    deliveryId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    allDeliveryItems: any[]
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('delivery_items') as any)
      .update({ quantity_returned: newQtyReturned })
      .eq('id', itemId)

    if (error) {
      console.error('Error updating delivery item:', error)
      alert('Erreur lors de la mise à jour')
      return
    }

    // Determine new delivery status based on returned quantities
    let totalDelivered = 0
    let totalReturned = 0
    for (const di of allDeliveryItems) {
      const qtyDel = di.quantity_delivered || 0
      const qtyRet = di.id === itemId ? newQtyReturned : (di.quantity_returned || 0)
      totalDelivered += qtyDel
      totalReturned += qtyRet
    }

    let newStatus = 'delivered'
    if (totalReturned > 0 && totalReturned >= totalDelivered) {
      newStatus = 'returned'
    } else if (totalReturned > 0) {
      newStatus = 'partial'
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('deliveries') as any)
      .update({ status: newStatus })
      .eq('id', deliveryId)

    // Clear editing state for this item
    setEditingItems(prev => {
      const next = { ...prev }
      delete next[itemId]
      return next
    })

    // Refresh data
    await fetchRounds()
    await fetchReturns()
  }

  // Validate a BL (set all items as delivered, same logic as BLT in livraisons)
  const handleValidateBL = async (
    roundItemId: string,
    deliveryId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deliveryItems: any[]
  ) => {
    let totalDelivered = 0
    let totalReturned = 0
    for (const di of deliveryItems) {
      totalDelivered += di.quantity_delivered || 0
      totalReturned += di.quantity_returned || 0
    }

    let newStatus = 'delivered'
    if (totalReturned > 0 && totalReturned >= totalDelivered) {
      newStatus = 'returned'
    } else if (totalReturned > 0) {
      newStatus = 'partial'
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('delivery_round_items') as any)
      .update({ status: newStatus })
      .eq('id', roundItemId)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('deliveries') as any)
      .update({ status: newStatus })
      .eq('id', deliveryId)

    await fetchRounds()
    await fetchReturns()
  }

  const resetReturnForm = () => {
    setReturnFormData({
      return_date: new Date().toISOString().split('T')[0],
      notes: '',
    })
    setSelectedRoundForReturn('')
  }

  const filteredReturns = returns.filter((ret) => {
    const matchesSearch =
      ret.return_number.toLowerCase().includes(returnSearchTerm.toLowerCase()) ||
      ret.client?.name?.toLowerCase().includes(returnSearchTerm.toLowerCase()) ||
      ret.delivery?.delivery_number?.toLowerCase().includes(returnSearchTerm.toLowerCase())
    const matchesStatus = returnStatusFilter === 'all' || ret.status === returnStatusFilter
    return matchesSearch && matchesStatus
  })

  const returnStats = {
    total: returns.length,
    pending: returns.filter(r => r.status === 'pending').length,
    validated: returns.filter(r => r.status === 'validated').length,
    totalValue: returns.filter(r => r.status !== 'cancelled').reduce((sum, r) => sum + (r.total_ht || 0), 0),
  }

  if (isLoading) {
    return (
      <ProtectedModule module="rblt">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-[#B8860B]" />
        </div>
      </ProtectedModule>
    )
  }

  return (
    <ProtectedModule module="rblt">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Retour Tournée</h1>
            <p className="text-gray-500">Gérez les retours de marchandises par tournée</p>
          </div>

          <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-[#B8860B] hover:bg-[#9A7209]"
                onClick={() => {
                  resetReturnForm()
                  setIsReturnDialogOpen(true)
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nouveau Retour
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Créer un bon de retour (RBLT)</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleReturnSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>BLT (Tournée) *</Label>
                  <Select
                    value={selectedRoundForReturn}
                    onValueChange={(value) => setSelectedRoundForReturn(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une tournée terminée" />
                    </SelectTrigger>
                    <SelectContent>
                      {rounds.filter(r => r.status === 'completed').map((round) => (
                        <SelectItem key={round.id} value={round.id}>
                          {round.round_number} - {format(new Date(round.round_date), 'dd/MM/yyyy', { locale: fr })} - {round.driver?.full_name || 'Non assigné'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="return_date">Date de retour</Label>
                  <Input
                    id="return_date"
                    type="date"
                    value={returnFormData.return_date}
                    onChange={(e) =>
                      setReturnFormData({ ...returnFormData, return_date: e.target.value })
                    }
                    required
                  />
                </div>

                {selectedRoundForReturn && (
                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-3">Articles retournés (depuis le BLT)</h3>
                    {selectedRoundReturnedItems.length === 0 ? (
                      <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                        Aucun article retourné dans cette tournée
                      </div>
                    ) : (
                      <>
                        <div className="overflow-x-auto border rounded-lg">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-gray-50">
                                <TableHead>BL</TableHead>
                                <TableHead>Client</TableHead>
                                <TableHead>Article</TableHead>
                                <TableHead className="text-center">Qté retour</TableHead>
                                <TableHead className="text-right">Prix U.</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedRoundReturnedItems.map((item, index) => (
                                <TableRow key={index}>
                                  <TableCell className="font-mono text-sm">{item.delivery_number}</TableCell>
                                  <TableCell>{item.client_name}</TableCell>
                                  <TableCell>
                                    <span className="font-medium">{item.article_code}</span>
                                    <span className="text-gray-500 ml-1">{item.article_name}</span>
                                  </TableCell>
                                  <TableCell className="text-center font-medium text-red-600">{item.quantity_returned}</TableCell>
                                  <TableCell className="text-right">{formatPrice(item.unit_price)}</TableCell>
                                  <TableCell className="text-right font-medium text-red-600">
                                    {formatPrice(item.quantity_returned * item.unit_price)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        <div className="flex justify-end mt-2">
                          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                            <span className="text-sm text-gray-600">Total retour: </span>
                            <span className="font-bold text-red-600">{formatPrice(selectedRoundTotalHt)}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="return_notes">Notes</Label>
                  <Input
                    id="return_notes"
                    value={returnFormData.notes}
                    onChange={(e) =>
                      setReturnFormData({ ...returnFormData, notes: e.target.value })
                    }
                    placeholder="Notes (optionnel)"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    onClick={() => setIsReturnDialogOpen(false)}
                    className="bg-[#B8860B] hover:bg-[#9A7209]"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    className="bg-[#B8860B] hover:bg-[#9A7209]"
                    disabled={!selectedRoundForReturn}
                  >
                    Créer le retour
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-2 border-[#B8860B]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-gray-600">
                Total Retours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <RotateCcw className="h-8 w-8 text-red-600" />
                <span className="text-2xl font-bold">{returnStats.total}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2 border-[#B8860B]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-gray-600">
                En attente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-yellow-600">{returnStats.pending}</span>
            </CardContent>
          </Card>
          <Card className="border-2 border-[#B8860B]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-gray-600">
                Validés
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-[#B8860B]">{returnStats.validated}</span>
            </CardContent>
          </Card>
          <Card className="border-2 border-[#B8860B]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-gray-600">
                Valeur Retours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-red-600" />
                <span className="text-xl font-bold text-red-600">
                  {formatPrice(returnStats.totalValue)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filters */}
        <Card className="border-2 border-[#B8860B]">
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par numéro, client ou BL..."
                  value={returnSearchTerm}
                  onChange={(e) => setReturnSearchTerm(e.target.value)}
                  className="pl-10 border-2 border-[#B8860B]"
                />
              </div>
              <Select value={returnStatusFilter} onValueChange={setReturnStatusFilter}>
                <SelectTrigger className="w-full md:w-48 border-2 border-[#B8860B]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="validated">Validé</SelectItem>
                  <SelectItem value="cancelled">Annulé</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchReturns}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualiser
              </Button>
            </div>
          </CardHeader>
          <CardContent>
              <div className="overflow-x-auto border-2 border-[#B8860B] rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>N° RBLT</TableHead>
                      <TableHead>N° BLT</TableHead>
                      <TableHead className="text-center">Nombre BL</TableHead>
                      <TableHead className="text-center">Nombre articles</TableHead>
                      <TableHead className="text-center">Articles retour</TableHead>
                      <TableHead className="text-right">Valeur BLT</TableHead>
                      <TableHead className="text-right">Valeur retour</TableHead>
                      <TableHead className="text-right">Recette BLT</TableHead>
                      <TableHead className="text-right">RNET-BLT</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReturns.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-8 text-gray-500">
                          Aucun retour trouvé
                        </TableCell>
                      </TableRow>
                    ) : filteredReturns.map((ret) => {
                      // Utiliser les données rounds (fetchRounds) au lieu de ret.round (imbrication profonde)
                      const fullRound = rounds.find(r => r.id === ret.round_id)
                      const roundItems = fullRound?.delivery_round_items || []
                      const nbBL = roundItems.length
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const nbArticles = roundItems.reduce((sum: number, ri: any) => {
                        const items = ri.delivery?.delivery_items || []
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        return sum + items.reduce((s: number, di: any) => s + (di.quantity_delivered || 0), 0)
                      }, 0)
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const valeurBLT = roundItems.reduce((sum: number, ri: any) => sum + (ri.delivery?.total_ht || 0), 0)
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const recetteBLT = roundItems.reduce((sum: number, ri: any) => {
                        const items = ri.delivery?.delivery_items || []
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        return sum + items.reduce((s: number, di: any) => s + ((di.quantity_delivered - di.quantity_returned) * di.unit_price), 0)
                      }, 0)
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const articlesRetour = roundItems.reduce((sum: number, ri: any) => {
                        const items = ri.delivery?.delivery_items || []
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        return sum + items.reduce((s: number, di: any) => s + (di.quantity_returned || 0), 0)
                      }, 0)
                      const valeurRetour = ret.total_ht || 0
                      const difference = valeurBLT - recetteBLT

                      return (
                      <TableRow key={ret.id}>
                        <TableCell>
                          {format(new Date(ret.return_date), 'dd/MM/yyyy', { locale: fr })}
                        </TableCell>
                        <TableCell className="font-mono font-medium">
                          {ret.return_number}
                        </TableCell>
                        <TableCell className="font-mono">
                          {ret.round?.round_number || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{nbBL}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {nbArticles}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-red-600 border-red-300">
                            {articlesRetour}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatPrice(valeurBLT)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-red-600">
                          {formatPrice(valeurRetour)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-[#B8860B]">
                          {formatPrice(recetteBLT)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-700">
                          {(() => {
                            // RNET-BLT = somme des amount_paid (encaissements)
                            const totalEncaisse = roundItems.reduce((sum: number, ri: any) => {
                              const amountPaid = (ri.delivery as any)?.amount_paid || 0
                              return sum + amountPaid
                            }, 0)
                            return formatPrice(totalEncaisse)
                          })()}
                        </TableCell>
                        <TableCell>
                          <Badge className={returnStatusColors[ret.status]}>
                            {returnStatusLabels[ret.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Voir détails"
                              onClick={() => handleViewReturn(ret)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {ret.status === 'pending' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Valider"
                                onClick={() => handleValidateReturn(ret.id)}
                              >
                                <CheckCircle2 className="h-4 w-4 text-[#B8860B]" />
                              </Button>
                            )}
                            {ret.status === 'pending' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Annuler"
                                onClick={() => handleCancelReturn(ret.id)}
                              >
                                <XCircle className="h-4 w-4 text-orange-600" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Supprimer"
                              onClick={() => handleDeleteReturn(ret.id)}
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
              </div>
          </CardContent>
        </Card>

        {/* View Return Dialog - Same logic as BLT in livraisons */}
        <Dialog open={isViewReturnDialogOpen} onOpenChange={setIsViewReturnDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-xl">
                <RotateCcw className="h-6 w-6 text-red-600" />
                Bon de Retour {viewingReturn?.return_number}
                {viewingReturn && (
                  <Badge className={`ml-2 ${returnStatusColors[viewingReturn.status]}`}>
                    {returnStatusLabels[viewingReturn.status]}
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            {viewingReturn && (() => {
              const fullRound = rounds.find(r => r.id === viewingReturn.round_id)
              const roundItems = fullRound?.delivery_round_items || []
              const valeurBLT = roundItems.reduce((sum, ri) => sum + (ri.delivery?.total_ht || 0), 0)
              const recetteBLT = roundItems.reduce((sum, ri) => {
                const items = ri.delivery?.delivery_items || []
                return sum + items.reduce((s, di) => s + ((di.quantity_delivered - di.quantity_returned) * di.unit_price), 0)
              }, 0)
              const totalReste = roundItems.reduce((sum, ri) => sum + ((ri.delivery as any)?.balance_due || 0), 0)
              const totalArticles = roundItems.reduce((sum, ri) => {
                const items = ri.delivery?.delivery_items || []
                return sum + items.reduce((s, di) => s + (di.quantity_delivered || 0), 0)
              }, 0)
              const articlesRetournes = roundItems.reduce((sum, ri) => {
                const items = ri.delivery?.delivery_items || []
                return sum + items.reduce((s, di) => s + (di.quantity_returned || 0), 0)
              }, 0)

              return (
              <div className="space-y-6">
                {/* Header Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                      <Calendar className="h-4 w-4" />
                      Date
                    </div>
                    <p className="font-medium">
                      {format(new Date(viewingReturn.return_date), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                      <Truck className="h-4 w-4" />
                      N° BLT
                    </div>
                    <p className="font-medium font-mono">
                      {viewingReturn.round?.round_number || '-'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                      <Truck className="h-4 w-4" />
                      Livraisons
                    </div>
                    <p className="font-medium">
                      {roundItems.length} BL
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                      <CheckCircle2 className="h-4 w-4" />
                      Statut
                    </div>
                    <Badge className={returnStatusColors[viewingReturn.status]}>
                      {returnStatusLabels[viewingReturn.status]}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-amber-50 border border-[#B8860B] rounded-lg p-3">
                    <div className="flex items-center gap-2 text-[#B8860B] text-sm mb-1">
                      <Package className="h-4 w-4" />
                      Val BLT
                    </div>
                    <p className="font-semibold text-[#B8860B]">{formatPrice(valeurBLT)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                      <Package className="h-4 w-4" />
                      Total articles
                    </div>
                    <p className="text-xl font-bold">{totalArticles}</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-red-600 text-sm mb-1">
                      <RotateCcw className="h-4 w-4" />
                      Articles retournés
                    </div>
                    <p className="text-xl font-bold text-red-600">{articlesRetournes}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                      <TrendingUp className="h-4 w-4" />
                      Valeur Retour
                    </div>
                    <p className="font-medium text-red-600">{formatPrice(viewingReturn.total_ht || 0)}</p>
                  </div>
                </div>

                {/* Articles retournés */}
                <div className="border rounded-xl overflow-hidden">
                  <div className="bg-red-50 px-4 py-3 border-b border-red-200">
                    <h3 className="font-semibold text-red-700 flex items-center gap-2">
                      <RotateCcw className="h-5 w-5" />
                      Articles retournés
                    </h3>
                  </div>
                  {(() => {
                    // Collecter tous les articles retournés de la tournée
                    const returnedItems: { deliveryNumber: string; clientCode: string; clientName: string; articleCode: string; articleName: string; quantity: number }[] = []
                    for (const ri of roundItems) {
                      const delivery = ri.delivery as any
                      if (!delivery?.delivery_items) continue
                      for (const di of delivery.delivery_items) {
                        if (di.quantity_returned > 0) {
                          returnedItems.push({
                            deliveryNumber: delivery.delivery_number,
                            clientCode: delivery.client?.code || '',
                            clientName: delivery.client?.name || '',
                            articleCode: di.article?.code || '',
                            articleName: di.article?.name || '',
                            quantity: di.quantity_returned,
                          })
                        }
                      }
                    }

                    if (returnedItems.length === 0) {
                      return (
                        <div className="text-center py-8 text-gray-500">
                          Aucun article retourné dans cette tournée
                        </div>
                      )
                    }

                    return (
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead className="text-center">Quantité</TableHead>
                            <TableHead>Article</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>N° BL</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {returnedItems.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell className="text-center font-bold text-red-600">
                                {item.quantity}
                              </TableCell>
                              <TableCell>
                                <span className="font-medium">{item.articleCode}</span>
                                <span className="text-gray-500 ml-2">{item.articleName}</span>
                              </TableCell>
                              <TableCell>
                                <span className="font-medium">{item.clientCode}</span>
                                <span className="text-gray-500 ml-2">{item.clientName}</span>
                              </TableCell>
                              <TableCell className="font-mono font-medium">
                                {item.deliveryNumber}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )
                  })()}
                </div>

                {/* Notes */}
                {viewingReturn.notes && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <h3 className="font-semibold text-yellow-800 mb-2">Notes</h3>
                    <p className="text-sm text-gray-700">{viewingReturn.notes}</p>
                  </div>
                )}

                {/* Recette BLT & RNET-BLT */}
                <div className="flex justify-end">
                  <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-[#B8860B] rounded-xl p-4 w-auto space-y-2">
                    <div className="flex items-center gap-4">
                      <h3 className="text-lg font-bold text-[#B8860B]">Recette BLT</h3>
                      <p className="text-2xl font-bold text-[#B8860B]">{formatPrice(recetteBLT)}</p>
                    </div>
                    <div className="flex items-center gap-4 border-t border-[#B8860B] pt-2">
                      <h3 className="text-lg font-bold text-green-700">RNET-BLT</h3>
                      <p className="text-2xl font-bold text-green-700">{formatPrice(
                        roundItems.reduce((sum, ri) => sum + ((ri.delivery as any)?.amount_paid || 0), 0)
                      )}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap justify-end gap-3 pt-4 border-t">
                  <Button className="bg-[#B8860B] hover:bg-[#9A7209]" onClick={() => setIsViewReturnDialogOpen(false)}>
                    Fermer
                  </Button>
                  {viewingReturn.status === 'pending' && (
                    <Button
                      className="bg-[#B8860B] hover:bg-[#9A7209]"
                      onClick={() => {
                        handleValidateReturn(viewingReturn.id)
                        setIsViewReturnDialogOpen(false)
                      }}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Valider le retour
                    </Button>
                  )}
                </div>
              </div>
              )
            })()}
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedModule>
  )
}
