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
  Pencil,
  Navigation,
  Building,
  Link2,
  Wallet,
  Receipt,
  CreditCard,
  Banknote,
  Building2,
  RotateCcw,
  Play,
  XCircle,
  User,
  Calendar,
  Package,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { generateDeliveryNotePDF } from '@/lib/pdf/invoice'
import { useCompanySettings } from '@/hooks/useCompanySettings'

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
  total_ttc?: number | null
  amount_paid?: number | null
  balance_due?: number | null
  payment_status?: string | null
  notes: string | null
  client?: Client
  order?: { order_number: string }
  delivery_items?: DeliveryItem[]
}

interface Payment {
  id: string
  payment_number: string
  client_id: string
  delivery_id: string | null
  amount: number
  payment_method: string
  payment_date: string
  reference: string | null
  notes: string | null
  created_at: string
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
  usingGoogle?: boolean
}

// BLT - Tournée interfaces
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
    client?: {
      code: string
      name: string
      address: string | null
      city: string | null
      gps_lat: number | null
      gps_lng: number | null
    }
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

interface Driver {
  id: string
  full_name: string
  email: string
}

// RBLT - Retour interfaces
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
  client?: {
    code: string
    name: string
  }
  delivery_return_items?: DeliveryReturnItem[]
}

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  partial: 'bg-orange-100 text-orange-800',
  returned: 'bg-pink-100 text-pink-800',
  cancelled: 'bg-red-100 text-red-800',
}

const statusLabels: Record<string, string> = {
  pending: 'En attente',
  in_progress: 'En cours',
  delivered: 'Livrée',
  partial: 'Partiellement livrée',
  returned: 'Retournée',
  cancelled: 'Annulée',
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

// BLT status colors and labels
const roundStatusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-amber-100 text-[#9A7209]',
  cancelled: 'bg-red-100 text-red-800',
}

const roundStatusLabels: Record<string, string> = {
  pending: 'En attente',
  in_progress: 'En cours',
  completed: 'Terminee',
  cancelled: 'Annulee',
}

const itemStatusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  delivered: 'bg-amber-100 text-[#9A7209]',
  partial: 'bg-orange-100 text-orange-800',
  returned: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-300 text-gray-600',
}

const itemStatusLabels: Record<string, string> = {
  pending: 'A livrer',
  delivered: 'Livre',
  partial: 'Partiel',
  returned: 'Retourne',
  cancelled: 'Annule',
}

// RBLT status colors and labels
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

type TabType = 'bl' | 'blt' | 'rblt'

export default function LivraisonsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('bl')
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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingDelivery, setEditingDelivery] = useState<Delivery | null>(null)
  const [editFormData, setEditFormData] = useState({
    delivery_date: '',
    notes: '',
    status: '',
    order_id: '',
  })
  const [editItems, setEditItems] = useState<DeliveryItem[]>([])

  // Route optimization state
  const [selectedDeliveries, setSelectedDeliveries] = useState<Set<string>>(new Set())
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizedRoute, setOptimizedRoute] = useState<OptimizedRoute | null>(null)
  const [isRouteDialogOpen, setIsRouteDialogOpen] = useState(false)
  const [useCurrentLocation, setUseCurrentLocation] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isGettingLocation, setIsGettingLocation] = useState(false)

  // Payment state
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [paymentDelivery, setPaymentDelivery] = useState<Delivery | null>(null)
  const [paymentFormData, setPaymentFormData] = useState({
    amount: 0,
    payment_method: 'cash',
    payment_date: new Date().toISOString().split('T')[0],
    reference: '',
    notes: '',
  })
  const [deliveryPayments, setDeliveryPayments] = useState<Payment[]>([])
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false)
  const [lastPayment, setLastPayment] = useState<Payment | null>(null)

  // BLT - Tournée state
  const [rounds, setRounds] = useState<DeliveryRound[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [availableDeliveries, setAvailableDeliveries] = useState<Delivery[]>([])
  const [isRoundDialogOpen, setIsRoundDialogOpen] = useState(false)
  const [isViewRoundDialogOpen, setIsViewRoundDialogOpen] = useState(false)
  const [viewingRound, setViewingRound] = useState<DeliveryRound | null>(null)
  const [expandedDeliveryId, setExpandedDeliveryId] = useState<string | null>(null)
  const [editingItems, setEditingItems] = useState<Record<string, { quantity_returned: number }>>({})
  const [roundSearchTerm, setRoundSearchTerm] = useState('')
  const [roundStatusFilter, setRoundStatusFilter] = useState<string>('all')
  const [roundFormData, setRoundFormData] = useState({
    driver_id: '',
    round_date: new Date().toISOString().split('T')[0],
    notes: '',
  })
  const [selectedRoundDeliveries, setSelectedRoundDeliveries] = useState<string[]>([])

  // RBLT - Retour state
  const [returns, setReturns] = useState<DeliveryReturn[]>([])
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false)
  const [isViewReturnDialogOpen, setIsViewReturnDialogOpen] = useState(false)
  const [viewingReturn, setViewingReturn] = useState<DeliveryReturn | null>(null)
  const [returnSearchTerm, setReturnSearchTerm] = useState('')
  const [returnStatusFilter, setReturnStatusFilter] = useState<string>('all')
  const [returnFormData, setReturnFormData] = useState({
    delivery_id: '',
    client_id: '',
    return_date: new Date().toISOString().split('T')[0],
    return_reason: '',
    notes: '',
  })
  const [returnItems, setReturnItems] = useState<{ article_id: string; quantity: number; reason: string; unit_price: number }[]>([])
  const [selectedDeliveryForReturn, setSelectedDeliveryForReturn] = useState<Delivery | null>(null)
  const [selectedRoundForReturn, setSelectedRoundForReturn] = useState<string>('')

  const supabase = useSupabase()
  const { companySettings } = useCompanySettings()

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
              id, delivery_number, order_id, client_id, status, delivery_date, total_ht, total_ttc, amount_paid, balance_due, payment_status, notes,
              client:clients(code, name, contact_name, phone, address, city, gps_lat, gps_lng),
              order:orders(order_number),
              delivery_items(id, article_id, quantity_ordered, quantity_delivered, quantity_returned, unit_price, article:articles(code, name, description))
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

  // BLT - Fetch rounds
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
            status,
            client:clients(code, name, address, city, gps_lat, gps_lng),
            delivery_items(id, article_id, quantity_ordered, quantity_delivered, quantity_returned, unit_price, article:articles(code, name, description))
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

  const fetchDrivers = useCallback(async () => {
    const { data } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('is_active', true)
      .order('full_name')
    setDrivers(data || [])
  }, [supabase])

  const fetchAvailableDeliveries = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('deliveries') as any)
      .select(`
        id,
        delivery_number,
        client_id,
        status,
        total_ht,
        delivery_date,
        client:clients(code, name, address, city, gps_lat, gps_lng)
      `)
      .in('status', ['pending', 'in_progress'])
      .order('delivery_date', { ascending: true })

    const assignedDeliveryIds = rounds
      .filter(r => r.status !== 'completed' && r.status !== 'cancelled')
      .flatMap(r => r.delivery_round_items?.map(item => item.delivery_id) || [])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const available = (data || []).filter((d: any) => !assignedDeliveryIds.includes(d.id))
    setAvailableDeliveries(available as Delivery[])
  }, [supabase, rounds])

  useEffect(() => {
    if (activeTab === 'blt' || activeTab === 'rblt') {
      fetchRounds()
      fetchDrivers()
    }
  }, [activeTab, fetchRounds, fetchDrivers])

  useEffect(() => {
    if (isRoundDialogOpen) {
      fetchAvailableDeliveries()
    }
  }, [isRoundDialogOpen, fetchAvailableDeliveries])

  const generateRoundNumber = async (): Promise<string> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('delivery_rounds') as any)
      .select('round_number')
      .like('round_number', 'BLT%')
      .order('round_number', { ascending: false })
      .limit(1)

    if (data && data.length > 0) {
      const lastNum = parseInt(data[0].round_number.replace('BLT', ''))
      if (!isNaN(lastNum)) {
        return `BLT${String(lastNum + 1).padStart(4, '0')}`
      }
    }
    return 'BLT0001'
  }

  const handleRoundSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedRoundDeliveries.length === 0) {
      alert('Veuillez selectionner au moins une livraison')
      return
    }

    const roundNumber = await generateRoundNumber()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: roundData, error: roundError } = await (supabase.from('delivery_rounds') as any)
      .insert([{
        round_number: roundNumber,
        driver_id: roundFormData.driver_id && roundFormData.driver_id !== 'none' ? roundFormData.driver_id : null,
        round_date: roundFormData.round_date,
        status: 'pending',
        depot_lat: companySettings?.depot_lat || null,
        depot_lng: companySettings?.depot_lng || null,
        notes: roundFormData.notes || null,
      }])
      .select()
      .single()

    if (roundError) {
      console.error('Error creating round:', roundError)
      alert(`Erreur: ${roundError.message}`)
      return
    }

    const roundItems = selectedRoundDeliveries.map((deliveryId, index) => ({
      round_id: roundData.id,
      delivery_id: deliveryId,
      sequence_order: index + 1,
      status: 'pending',
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('delivery_round_items') as any).insert(roundItems)

    fetchRounds()
    setIsRoundDialogOpen(false)
    resetRoundForm()
  }

  const handleStartRound = async (roundId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('delivery_rounds') as any)
      .update({ status: 'in_progress', start_time: new Date().toISOString() })
      .eq('id', roundId)
    if (!error) fetchRounds()
  }

  const handleCompleteRound = async (roundId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('delivery_rounds') as any)
      .update({ status: 'completed', end_time: new Date().toISOString() })
      .eq('id', roundId)
    if (!error) fetchRounds()
  }

  const handleCancelRound = async (roundId: string) => {
    if (!confirm('Etes-vous sur de vouloir annuler cette tournee ?')) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('delivery_rounds') as any)
      .update({ status: 'cancelled' })
      .eq('id', roundId)
    if (!error) fetchRounds()
  }

  const handleDeleteRound = async (roundId: string) => {
    if (!confirm('Etes-vous sur de vouloir supprimer cette tournee ?')) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('delivery_round_items') as any).delete().eq('round_id', roundId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('delivery_rounds') as any).delete().eq('id', roundId)
    if (!error) fetchRounds()
  }

  const handleUpdateItemStatus = async (itemId: string, newStatus: string) => {
    const updateData: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'delivered') {
      updateData.delivered_at = new Date().toISOString()
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('delivery_round_items') as any)
      .update(updateData)
      .eq('id', itemId)

    if (!error) {
      // Refresh rounds list
      const { data: updatedRounds } = await supabase
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
              client:clients(code, name, address, city, gps_lat, gps_lng)
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (updatedRounds) {
        setRounds(updatedRounds)
        // Update viewingRound if it's currently open
        if (viewingRound && viewingRound.id) {
          const updatedViewingRound = updatedRounds.find((r: any) => r.id === viewingRound.id)
          if (updatedViewingRound) {
            setViewingRound(updatedViewingRound)
          }
        }
      }
    }
  }

  const handleViewRound = (round: DeliveryRound) => {
    setViewingRound(round)
    setIsViewRoundDialogOpen(true)
    setExpandedDeliveryId(null) // Reset expanded delivery when opening dialog
  }

  const handleAssignDriver = async (roundId: string, driverId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('delivery_rounds') as any)
      .update({ driver_id: driverId && driverId !== 'none' ? driverId : null })
      .eq('id', roundId)
    if (!error) fetchRounds()
  }

  const handleUpdateDeliveryItem = async (itemId: string, quantityReturned: number, deliveryId?: string, allDeliveryItems?: any[]) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('delivery_items') as any)
      .update({ quantity_returned: quantityReturned })
      .eq('id', itemId)

    if (!error) {
      // Update delivery status based on returns
      if (deliveryId && allDeliveryItems) {
        let totalDelivered = 0
        let totalReturned = 0
        for (const di of allDeliveryItems) {
          totalDelivered += di.quantity_delivered || 0
          // Use the new value for the item being updated
          if (di.id === itemId) {
            totalReturned += quantityReturned
          } else {
            totalReturned += di.quantity_returned || 0
          }
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
      }

      await fetchRounds()
      await fetchData()
      if (viewingRound) {
        // Refresh viewing round with fresh data
        const { data: freshRound } = await supabase
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
                status,
                client:clients(code, name, address, city, gps_lat, gps_lng),
                delivery_items(id, article_id, quantity_ordered, quantity_delivered, quantity_returned, unit_price, article:articles(code, name, description))
              )
            )
          `)
          .eq('id', viewingRound.id)
          .single()
        if (freshRound) setViewingRound(freshRound)
      }
      // Clear editing state for this item
      setEditingItems(prev => {
        const newState = { ...prev }
        delete newState[itemId]
        return newState
      })
    }
  }

  const handleQuantityReturnedChange = (itemId: string, value: string) => {
    const numValue = parseInt(value) || 0
    setEditingItems(prev => ({
      ...prev,
      [itemId]: { quantity_returned: numValue }
    }))
  }

  const handleDeliverBL = async (deliveryId: string, deliveryItems: any[]) => {
    // Calculate status based on returned quantities
    let totalDelivered = 0
    let totalReturned = 0
    for (const item of deliveryItems) {
      totalDelivered += item.quantity_delivered || 0
      totalReturned += item.quantity_returned || 0
    }

    // Determine status:
    // - qte retournée = 0 → "delivered" (Livrée)
    // - qte retournée partielle → "partially_delivered" (Partiellement Livrée)
    // - qte retournée = qte livrée → "returned" (Retournée)
    let newStatus = 'delivered'
    if (totalReturned > 0 && totalReturned >= totalDelivered) {
      newStatus = 'returned'
    } else if (totalReturned > 0) {
      newStatus = 'partial'
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('deliveries') as any)
      .update({ status: newStatus })
      .eq('id', deliveryId)

    if (!error) {
      // Refresh both rounds and deliveries tables
      await fetchRounds()
      await fetchData()
      if (viewingRound) {
        const updated = rounds.find(r => r.id === viewingRound.id)
        if (updated) setViewingRound(updated)
      }
    }
  }

  const handleValidateBL = async (roundItemId: string, deliveryId: string, deliveryItems: any[]) => {
    // Calculate status based on returned quantities
    let totalDelivered = 0
    let totalReturned = 0
    for (const item of deliveryItems) {
      totalDelivered += item.quantity_delivered || 0
      totalReturned += item.quantity_returned || 0
    }

    // Determine status
    let newStatus = 'delivered'
    let roundItemStatus = 'delivered'
    if (totalReturned > 0 && totalReturned >= totalDelivered) {
      newStatus = 'returned'
      roundItemStatus = 'returned'
    } else if (totalReturned > 0) {
      newStatus = 'partial'
      roundItemStatus = 'partial'
    }

    // Update delivery status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('deliveries') as any)
      .update({ status: newStatus })
      .eq('id', deliveryId)

    if (!error) {
      // Update delivery_round_items status
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('delivery_round_items') as any)
        .update({ status: roundItemStatus, delivered_at: new Date().toISOString() })
        .eq('id', roundItemId)

      // Refresh data
      await fetchRounds()
      await fetchData()
      // Refresh viewingRound with fresh data
      if (viewingRound) {
        const { data: freshRound } = await supabase
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
                status,
                client:clients(code, name, address, city, gps_lat, gps_lng),
                delivery_items(id, article_id, quantity_ordered, quantity_delivered, quantity_returned, unit_price, article:articles(code, name, description))
              )
            )
          `)
          .eq('id', viewingRound.id)
          .single()
        if (freshRound) setViewingRound(freshRound)
      }
    }
  }

  const resetRoundForm = () => {
    setRoundFormData({
      driver_id: '',
      round_date: new Date().toISOString().split('T')[0],
      notes: '',
    })
    setSelectedRoundDeliveries([])
  }

  const toggleRoundDeliverySelection = (deliveryId: string) => {
    setSelectedRoundDeliveries(prev =>
      prev.includes(deliveryId)
        ? prev.filter(id => id !== deliveryId)
        : [...prev, deliveryId]
    )
  }

  const selectAllRoundDeliveries = () => {
    if (selectedRoundDeliveries.length === availableDeliveries.length) {
      setSelectedRoundDeliveries([])
    } else {
      setSelectedRoundDeliveries(availableDeliveries.map(d => d.id))
    }
  }

  const filteredRounds = rounds.filter((round) => {
    const matchesSearch =
      round.round_number.toLowerCase().includes(roundSearchTerm.toLowerCase()) ||
      round.driver?.full_name?.toLowerCase().includes(roundSearchTerm.toLowerCase())
    const matchesStatus = roundStatusFilter === 'all' || round.status === roundStatusFilter
    return matchesSearch && matchesStatus
  })

  const roundStats = {
    total: rounds.length,
    pending: rounds.filter(r => r.status === 'pending').length,
    inProgress: rounds.filter(r => r.status === 'in_progress').length,
    completed: rounds.filter(r => r.status === 'completed').length,
  }

  // RBLT - Fetch returns
  const fetchReturns = useCallback(async () => {
    const { data, error } = await supabase
      .from('delivery_returns')
      .select(`
        *,
        delivery:deliveries(delivery_number),
        client:clients(code, name),
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

  useEffect(() => {
    if (activeTab === 'rblt') {
      fetchReturns()
    }
  }, [activeTab, fetchReturns])

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

  const handleSelectDeliveryForReturn = (delivery: Delivery) => {
    setSelectedDeliveryForReturn(delivery)
    setReturnFormData({
      ...returnFormData,
      delivery_id: delivery.id,
      client_id: delivery.client_id,
    })
    // Initialize return items from delivery items
    if (delivery.delivery_items) {
      setReturnItems(delivery.delivery_items.map(item => ({
        article_id: item.article_id,
        quantity: 0,
        reason: '',
        unit_price: item.unit_price || 0,
      })))
    }
  }

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const itemsToReturn = returnItems.filter(item => item.quantity > 0)
    if (itemsToReturn.length === 0) {
      alert('Veuillez sélectionner au moins un article à retourner')
      return
    }

    const returnNumber = await generateReturnNumber()
    const totalHt = itemsToReturn.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: returnData, error: returnError } = await (supabase.from('delivery_returns') as any)
      .insert([{
        return_number: returnNumber,
        delivery_id: returnFormData.delivery_id || null,
        client_id: returnFormData.client_id,
        return_date: returnFormData.return_date,
        status: 'pending',
        return_reason: returnFormData.return_reason || null,
        total_ht: totalHt,
        notes: returnFormData.notes || null,
      }])
      .select()
      .single()

    if (returnError) {
      console.error('Error creating return:', returnError)
      alert(`Erreur: ${returnError.message}`)
      return
    }

    // Add return items
    const returnItemsData = itemsToReturn.map(item => ({
      return_id: returnData.id,
      article_id: item.article_id,
      quantity_returned: item.quantity,
      unit_price: item.unit_price,
      return_reason: item.reason || null,
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('delivery_return_items') as any).insert(returnItemsData)

    // Update delivery items with returned quantities
    if (selectedDeliveryForReturn?.delivery_items) {
      for (const item of itemsToReturn) {
        const deliveryItem = selectedDeliveryForReturn.delivery_items.find(di => di.article_id === item.article_id)
        if (deliveryItem) {
          const newReturnedQty = (deliveryItem.quantity_returned || 0) + item.quantity
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('delivery_items') as any)
            .update({ quantity_returned: newReturnedQty })
            .eq('id', deliveryItem.id)
        }
      }

      // Calculate new delivery status based on returns
      let totalDelivered = 0
      let totalReturned = 0
      for (const deliveryItem of selectedDeliveryForReturn.delivery_items) {
        const returnedItem = itemsToReturn.find(i => i.article_id === deliveryItem.article_id)
        const currentReturned = (deliveryItem.quantity_returned || 0) + (returnedItem?.quantity || 0)
        totalDelivered += deliveryItem.quantity_delivered || 0
        totalReturned += currentReturned
      }

      // Update delivery status
      let newStatus = 'delivered'
      if (totalReturned > 0 && totalReturned >= totalDelivered) {
        newStatus = 'returned'
      } else if (totalReturned > 0) {
        newStatus = 'partial'
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('deliveries') as any)
        .update({ status: newStatus })
        .eq('id', selectedDeliveryForReturn.id)
    }

    fetchReturns()
    fetchData()
    setIsReturnDialogOpen(false)
    resetReturnForm()
  }

  const handleValidateReturn = async (returnId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('delivery_returns') as any)
      .update({ status: 'validated' })
      .eq('id', returnId)
    if (!error) fetchReturns()
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
    setIsViewReturnDialogOpen(true)
  }

  const resetReturnForm = () => {
    setReturnFormData({
      delivery_id: '',
      client_id: '',
      return_date: new Date().toISOString().split('T')[0],
      return_reason: '',
      notes: '',
    })
    setReturnItems([])
    setSelectedDeliveryForReturn(null)
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

  // Get delivered deliveries for return selection
  const deliveredDeliveries = deliveries.filter(d => d.status === 'delivered' || d.status === 'partial')

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

    // Create the delivery
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newDelivery, error } = await (supabase.from('deliveries') as any).insert([{
      delivery_number: generateDeliveryNumber(),
      order_id: formData.order_id || null,
      client_id: formData.client_id,
      delivery_date: formData.delivery_date,
      status: 'pending',
      total_ht: selectedOrder?.total_ht || 0,
      notes: formData.notes || null,
    }]).select().single()

    if (error) {
      console.error('Error creating delivery:', error)
      alert('Erreur lors de la création du BL')
      return
    }

    // If order is selected, copy order_items to delivery_items
    if (formData.order_id && newDelivery) {
      // Fetch order items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: orderItems } = await (supabase.from('order_items') as any)
        .select('article_id, quantity, unit_price, total_ht')
        .eq('order_id', formData.order_id)

      if (orderItems && orderItems.length > 0) {
        // Create delivery items from order items
        const deliveryItems = orderItems.map((item: { article_id: string; quantity: number; unit_price: number }) => ({
          delivery_id: newDelivery.id,
          article_id: item.article_id,
          quantity_ordered: item.quantity,
          quantity_delivered: item.quantity, // Default to full delivery
          quantity_returned: 0,
          unit_price: item.unit_price,
        }))

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: itemsError } = await (supabase.from('delivery_items') as any).insert(deliveryItems)

        if (itemsError) {
          console.error('Error creating delivery items:', itemsError)
        }
      }
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

      generateDeliveryNotePDF(orderData, companySettings)
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

  // Edit handlers
  const handleEditDelivery = async (delivery: Delivery) => {
    setEditingDelivery(delivery)
    setEditFormData({
      delivery_date: delivery.delivery_date || new Date().toISOString().split('T')[0],
      notes: delivery.notes || '',
      status: delivery.status,
      order_id: delivery.order_id || '',
    })

    // Fetch delivery items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: items } = await (supabase.from('delivery_items') as any)
      .select(`
        id, article_id, quantity_ordered, quantity_delivered, quantity_returned, unit_price,
        article:articles(code, name, description)
      `)
      .eq('delivery_id', delivery.id)

    setEditItems(items || [])
    setIsEditDialogOpen(true)
  }

  const updateItemQuantity = (itemId: string, field: 'quantity_delivered' | 'quantity_returned', value: number) => {
    setEditItems(editItems.map(item => {
      if (item.id !== itemId) return item

      let newValue = value

      if (field === 'quantity_delivered') {
        // Qte Livrée <= Qte Cmd
        newValue = Math.min(value, item.quantity_ordered)
      } else if (field === 'quantity_returned') {
        // Qte Retour <= Qte Livrée
        newValue = Math.min(value, item.quantity_delivered)
      }

      return { ...item, [field]: Math.max(0, newValue) }
    }))
  }

  // Load items from a different order
  const handleEditOrderChange = async (newOrderId: string) => {
    const orderId = newOrderId === 'none' ? '' : newOrderId
    setEditFormData({ ...editFormData, order_id: orderId })

    if (orderId && editingDelivery) {
      // Delete existing delivery items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('delivery_items') as any)
        .delete()
        .eq('delivery_id', editingDelivery.id)

      // Fetch order items from new order
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: orderItems } = await (supabase.from('order_items') as any)
        .select('article_id, quantity, unit_price, total_ht')
        .eq('order_id', newOrderId)

      if (orderItems && orderItems.length > 0) {
        // Create new delivery items
        const newDeliveryItems = orderItems.map((item: { article_id: string; quantity: number; unit_price: number }) => ({
          delivery_id: editingDelivery.id,
          article_id: item.article_id,
          quantity_ordered: item.quantity,
          quantity_delivered: item.quantity,
          quantity_returned: 0,
          unit_price: item.unit_price,
        }))

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('delivery_items') as any).insert(newDeliveryItems)

        // Reload items with article info
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: items } = await (supabase.from('delivery_items') as any)
          .select(`
            id, article_id, quantity_ordered, quantity_delivered, quantity_returned, unit_price,
            article:articles(code, name, description)
          `)
          .eq('delivery_id', editingDelivery.id)

        setEditItems(items || [])

        // Update order reference
        const selectedOrder = orders.find(o => o.id === newOrderId)
        if (selectedOrder) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('deliveries') as any)
            .update({
              order_id: newOrderId,
              client_id: selectedOrder.client_id,
              total_ht: selectedOrder.total_ht,
            })
            .eq('id', editingDelivery.id)
        }
      }
    }
  }

  const handleSaveEdit = async () => {
    if (!editingDelivery) return

    // Calculate new total
    const newTotal = editItems.reduce((sum, item) => sum + (item.quantity_delivered * item.unit_price), 0)

    // Update delivery
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: deliveryError } = await (supabase.from('deliveries') as any)
      .update({
        delivery_date: editFormData.delivery_date,
        notes: editFormData.notes || null,
        status: editFormData.status,
        order_id: editFormData.order_id || null,
        total_ht: newTotal,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingDelivery.id)

    if (deliveryError) {
      console.error('Error updating delivery:', deliveryError)
      alert('Erreur lors de la mise à jour')
      return
    }

    // Update each delivery item
    for (const item of editItems) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('delivery_items') as any)
        .update({
          quantity_delivered: item.quantity_delivered,
          quantity_returned: item.quantity_returned,
        })
        .eq('id', item.id)
    }

    alert('Bon de livraison mis à jour avec succès')
    setIsEditDialogOpen(false)
    fetchData()
  }

  // Payment handlers
  const getRecetteBL = (delivery: Delivery) => {
    return delivery.delivery_items?.reduce((sum, item) => sum + ((item.quantity_delivered - item.quantity_returned) * item.unit_price), 0) || 0
  }

  const handleOpenPayment = async (delivery: Delivery) => {
    setPaymentDelivery(delivery)
    const recetteBL = getRecetteBL(delivery)
    const balanceDue = delivery.balance_due ?? recetteBL

    setPaymentFormData({
      amount: balanceDue,
      payment_method: 'cash',
      payment_date: new Date().toISOString().split('T')[0],
      reference: '',
      notes: '',
    })

    // Fetch existing payments for this delivery
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: payments } = await (supabase.from('payments') as any)
      .select('*')
      .eq('delivery_id', delivery.id)
      .order('created_at', { ascending: false })

    setDeliveryPayments(payments || [])
    setIsPaymentDialogOpen(true)
  }

  const generatePaymentNumber = async (): Promise<string> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('payments') as any)
      .select('payment_number')
      .like('payment_number', 'REC%')
      .order('payment_number', { ascending: false })
      .limit(1)

    if (data && data.length > 0) {
      const lastNum = parseInt(data[0].payment_number.replace('REC', ''))
      if (!isNaN(lastNum)) {
        return `REC${String(lastNum + 1).padStart(5, '0')}`
      }
    }
    return 'REC00001'
  }

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!paymentDelivery) return

    if (paymentFormData.amount <= 0) {
      alert('Le montant doit etre superieur a 0')
      return
    }

    try {
      const paymentNumber = await generatePaymentNumber()

      // Create payment
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newPayment, error } = await (supabase.from('payments') as any)
        .insert({
          payment_number: paymentNumber,
          client_id: paymentDelivery.client_id,
          delivery_id: paymentDelivery.id,
          amount: paymentFormData.amount,
          payment_method: paymentFormData.payment_method,
          payment_date: paymentFormData.payment_date,
          reference: paymentFormData.reference || null,
          notes: paymentFormData.notes || null,
        })
        .select()
        .single()

      if (error) {
        console.error('Payment error:', error)
        alert('Erreur lors de l\'enregistrement du paiement')
        return
      }

      // Update delivery payment status based on Recette BL
      const recetteBL = getRecetteBL(paymentDelivery)
      const currentPaid = (paymentDelivery.amount_paid || 0) + paymentFormData.amount
      const newBalance = Math.max(0, recetteBL - currentPaid)
      const newStatus = newBalance <= 0 ? 'paid' : currentPaid > 0 ? 'partial' : 'pending'

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('deliveries') as any)
        .update({
          amount_paid: currentPaid,
          balance_due: newBalance,
          payment_status: newStatus,
          total_ttc: recetteBL,
        })
        .eq('id', paymentDelivery.id)

      setLastPayment(newPayment)
      setIsPaymentDialogOpen(false)
      setIsReceiptDialogOpen(true)
      fetchData()
    } catch (error) {
      console.error('Payment error:', error)
      alert('Erreur lors de l\'enregistrement')
    }
  }

  const printReceipt = () => {
    if (!lastPayment || !paymentDelivery) return

    const totalTTC = (paymentDelivery.total_ht || 0) * 1.2
    const newBalance = Math.max(0, totalTTC - (paymentDelivery.amount_paid || 0) - lastPayment.amount)

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Recu ${lastPayment.payment_number}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; max-width: 400px; margin: auto; }
          .header { text-align: center; border-bottom: 2px solid #228B22; padding-bottom: 10px; margin-bottom: 20px; }
          .header h1 { color: #228B22; margin: 0; font-size: 20px; }
          .header p { margin: 5px 0; font-size: 12px; color: #666; }
          .receipt-number { background: #228B22; color: white; padding: 8px; text-align: center; font-weight: bold; margin: 10px 0; }
          .section { margin: 15px 0; }
          .row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dotted #ddd; }
          .row-label { color: #666; }
          .row-value { font-weight: bold; }
          .total { font-size: 18px; background: #f5f5f5; padding: 10px; margin: 15px 0; }
          .balance { color: ${newBalance > 0 ? '#dc2626' : '#16a34a'}; font-size: 16px; padding: 10px; background: ${newBalance > 0 ? '#fef2f2' : '#f0fdf4'}; }
          .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #888; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>KARAM Olives & Sauces</h1>
          <p>Zone Industrielle, Marrakech</p>
          <p>Tel: 05 24 XX XX XX</p>
        </div>
        <div class="receipt-number">RECU N ${lastPayment.payment_number}</div>
        <div class="section">
          <div class="row">
            <span class="row-label">Date:</span>
            <span class="row-value">${format(new Date(lastPayment.payment_date), 'dd/MM/yyyy', { locale: fr })}</span>
          </div>
          <div class="row">
            <span class="row-label">Client:</span>
            <span class="row-value">${paymentDelivery.client?.code} - ${paymentDelivery.client?.name}</span>
          </div>
          <div class="row">
            <span class="row-label">N BL:</span>
            <span class="row-value">${paymentDelivery.delivery_number}</span>
          </div>
          <div class="row">
            <span class="row-label">Mode de paiement:</span>
            <span class="row-value">${paymentMethodLabels[lastPayment.payment_method]}</span>
          </div>
          ${lastPayment.reference ? `<div class="row"><span class="row-label">Reference:</span><span class="row-value">${lastPayment.reference}</span></div>` : ''}
        </div>
        <div class="total">
          <div class="row" style="border: none;">
            <span>Montant recu:</span>
            <span>${lastPayment.amount.toFixed(2)} MAD</span>
          </div>
        </div>
        <div class="section">
          <div class="row">
            <span class="row-label">Total facture:</span>
            <span class="row-value">${totalTTC.toFixed(2)} MAD</span>
          </div>
          <div class="row">
            <span class="row-label">Total paye:</span>
            <span class="row-value">${((paymentDelivery.amount_paid || 0) + lastPayment.amount).toFixed(2)} MAD</span>
          </div>
        </div>
        <div class="balance">
          <div class="row" style="border: none;">
            <span>Reste a payer:</span>
            <span style="font-weight: bold;">${newBalance.toFixed(2)} MAD</span>
          </div>
        </div>
        ${lastPayment.notes ? `<div class="section"><p><strong>Notes:</strong> ${lastPayment.notes}</p></div>` : ''}
        <div class="footer">
          <p>Merci de votre confiance!</p>
          <p>Document genere le ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: fr })}</p>
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

  // Get current location
  const getCurrentLocation = () => {
    setIsGettingLocation(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
          setUseCurrentLocation(true)
          setIsGettingLocation(false)
        },
        (error) => {
          console.error('Geolocation error:', error)
          alert('Erreur de géolocalisation: ' + error.message)
          setIsGettingLocation(false)
        }
      )
    } else {
      alert('La géolocalisation n\'est pas supportée par ce navigateur')
      setIsGettingLocation(false)
    }
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

      // Determine start location
      let startLocation = null
      if (useCurrentLocation && currentLocation) {
        startLocation = { latitude: currentLocation.lat, longitude: currentLocation.lng }
      } else if (companySettings?.depot_lat && companySettings?.depot_lng) {
        startLocation = {
          latitude: companySettings.depot_lat,
          longitude: companySettings.depot_lng,
        }
      }

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
        body: JSON.stringify({
          deliveries: deliveriesData,
          startLocation,
        }),
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
        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-gray-200 pb-2">
          <Button
            variant={activeTab === 'bl' ? 'default' : 'outline'}
            onClick={() => setActiveTab('bl')}
            className={activeTab === 'bl' ? 'bg-[#B8860B] hover:bg-[#9A7209]' : ''}
          >
            <Truck className="h-4 w-4 mr-2" />
            BL - Bons de Livraison
          </Button>
          <Button
            variant={activeTab === 'blt' ? 'default' : 'outline'}
            onClick={() => setActiveTab('blt')}
            className={activeTab === 'blt' ? 'bg-[#B8860B] hover:bg-[#9A7209]' : ''}
          >
            <Route className="h-4 w-4 mr-2" />
            BLT - Tournée des Livraisons
          </Button>
          <Button
            variant={activeTab === 'rblt' ? 'default' : 'outline'}
            onClick={() => setActiveTab('rblt')}
            className={activeTab === 'rblt' ? 'bg-[#B8860B] hover:bg-[#9A7209]' : ''}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            RBLT - Retour des Livraisons
          </Button>
        </div>

        {activeTab === 'bl' && (
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Livraisons</h1>
              <p className="text-gray-500">Gerez vos bons de livraison</p>
            </div>

            <div className="flex gap-2">
              {selectedDeliveries.size > 0 && (
                <>
                  <Button
                    onClick={clearSelection}
                    className="gap-2 bg-[#B8860B] hover:bg-[#9A7209]"
                  >
                    Annuler ({selectedDeliveries.size})
                  </Button>
                  <Button
                    onClick={getCurrentLocation}
                    disabled={isGettingLocation}
                    className={`gap-2 bg-[#B8860B] hover:bg-[#9A7209]`}
                    title={useCurrentLocation ? 'Position actuelle utilisée' : 'Utiliser ma position'}
                  >
                    {isGettingLocation ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : useCurrentLocation ? (
                      <Navigation className="h-4 w-4 text-[#B8860B]" />
                    ) : (
                      <Navigation className="h-4 w-4" />
                    )}
                    {useCurrentLocation ? 'Position OK' : 'Ma position'}
                  </Button>
                  {!useCurrentLocation && companySettings?.depot_lat && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      Départ: Dépôt
                    </span>
                  )}
                  <Button
                    onClick={optimizeRoute}
                    disabled={isOptimizing}
                    className="bg-[#B8860B] hover:bg-[#9A7209] gap-2"
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

              <ProtectedModule module="livraisons" action="create">
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
                      Nouveau BL
                    </Button>
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
                    <Button type="button" onClick={() => setIsDialogOpen(false)} className="bg-[#B8860B] hover:bg-[#9A7209]">
                      Annuler
                    </Button>
                    <Button type="submit" className="bg-[#B8860B] hover:bg-[#9A7209]">
                      Creer le BL
                    </Button>
                  </div>
                </form>
              </DialogContent>
              </Dialog>
            </ProtectedModule>
            </div>
          </div>
        )}

        {/* BL - Bons de Livraison Tab Content */}
        {activeTab === 'bl' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-2 border-[#B8860B]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-gray-600">
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
              <Card className="border-2 border-[#B8860B]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-gray-600">
                    En attente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <span className="text-2xl font-bold text-yellow-600">
                    {pendingCount}
                  </span>
                </CardContent>
              </Card>
              <Card className="border-2 border-[#B8860B]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-gray-600">
                    Livrees
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <span className="text-2xl font-bold text-[#B8860B]">
                    {deliveredCount}
                  </span>
                </CardContent>
              </Card>
              <Card className="border-2 border-[#B8860B]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-gray-600">
                    CA Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-6 w-6 text-[#B8860B]" />
                    <span className="text-xl font-bold text-[#B8860B]">
                      {formatPrice(totalCA)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-2 border-[#B8860B]">
          <CardHeader>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par N BL ou client..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-2 border-[#B8860B]"
                />
              </div>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-44 border-2 border-[#B8860B]"
                placeholder="Filtrer par date"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48 border-2 border-[#B8860B]">
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="in_progress">En cours</SelectItem>
                  <SelectItem value="delivered">Livrée</SelectItem>
                  <SelectItem value="partial">Partiellement livrée</SelectItem>
                  <SelectItem value="returned">Retournée</SelectItem>
                  <SelectItem value="cancelled">Annulée</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={selectAllPending} className="gap-2 bg-[#B8860B] hover:bg-[#9A7209]">
                <CheckCircle2 className="h-4 w-4" />
                Selectionner en attente
              </Button>
              <Button size="icon" onClick={fetchData} title="Actualiser" className="bg-[#B8860B] hover:bg-[#9A7209]">
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadError ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 mb-4">{loadError}</p>
                <Button onClick={fetchData} className="bg-[#B8860B] hover:bg-[#9A7209]">
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
              <div className="overflow-x-auto border-2 border-[#B8860B] rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>N BL</TableHead>
                    <TableHead>N BCC</TableHead>
                    <TableHead className="text-center">Nbr Article</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Ville</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Paiement</TableHead>
                    <TableHead className="text-right">Val BL</TableHead>
                    <TableHead className="text-right">Recette BL</TableHead>
                    <TableHead className="text-right">Reste</TableHead>
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
                        {delivery.delivery_date
                          ? format(new Date(delivery.delivery_date), 'dd/MM/yyyy', { locale: fr })
                          : '-'}
                      </TableCell>
                      <TableCell className="font-medium">{delivery.delivery_number}</TableCell>
                      <TableCell className="text-gray-600">{delivery.order?.order_number || '-'}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-[#B8860B]">
                          {delivery.delivery_items?.length || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{delivery.client?.code}</span>
                          <span className="text-gray-500 ml-2">{delivery.client?.name}</span>
                          {delivery.client?.gps_lat && (
                            <span title="GPS disponible"><MapPin className="inline h-3 w-3 text-[#DAA520] ml-1" /></span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {delivery.client?.city || '-'}
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
                      <TableCell className="text-right font-semibold text-[#B8860B]">
                        {formatPrice(delivery.delivery_items?.reduce((sum, item) => sum + ((item.quantity_delivered - item.quantity_returned) * item.unit_price), 0) || 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-semibold ${(getRecetteBL(delivery) - (delivery.amount_paid || 0)) > 0 ? 'text-red-600' : 'text-[#B8860B]'}`}>
                          {formatPrice(Math.max(0, getRecetteBL(delivery) - (delivery.amount_paid || 0)))}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-0.5">
                          <Button
                            size="sm"
                            onClick={() => handleOpenPayment(delivery)}
                            title="Encaisser"
                            className={`h-7 w-7 p-0 bg-[#B8860B] hover:bg-[#9A7209] ${delivery.payment_status === 'paid' ? 'opacity-50' : ''}`}
                          >
                            <Wallet className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleViewDelivery(delivery)}
                            title="Voir details"
                            className="h-7 w-7 p-0 bg-[#B8860B] hover:bg-[#9A7209]"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleEditDelivery(delivery)}
                            title="Modifier"
                            className="h-7 w-7 p-0 bg-[#B8860B] hover:bg-[#9A7209]"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleGeneratePDF(delivery)}
                            title="Telecharger BL"
                            className="h-7 w-7 p-0 bg-[#B8860B] hover:bg-[#9A7209]"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleDeleteDelivery(delivery.id, delivery.delivery_number)}
                            title="Supprimer"
                            className="h-7 w-7 p-0 bg-[#B8860B] hover:bg-[#9A7209]"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
            <div className="mt-4 text-sm text-gray-500 text-right">
              {filteredDeliveries.length} livraison(s) affichee(s)
              {selectedDeliveries.size > 0 && ` - ${selectedDeliveries.size} selectionnee(s)`}
            </div>
          </CardContent>
            </Card>
          </>
        )}

        {/* BLT - Tournée des Livraisons Tab Content */}
        {activeTab === 'blt' && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Tournée de Livraisons</h1>
                <p className="text-gray-500">Gérez vos tournées de livraison</p>
              </div>

              <Dialog open={isRoundDialogOpen} onOpenChange={setIsRoundDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="bg-[#B8860B] hover:bg-[#9A7209]"
                    onClick={() => {
                      resetRoundForm()
                      setIsRoundDialogOpen(true)
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Nouvelle Tournée
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Créer une nouvelle tournée</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleRoundSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Livreur</Label>
                        <Select
                          value={roundFormData.driver_id}
                          onValueChange={(value) =>
                            setRoundFormData({ ...roundFormData, driver_id: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un livreur" />
                          </SelectTrigger>
                          <SelectContent>
                            {drivers.map((driver) => (
                              <SelectItem key={driver.id} value={driver.id}>
                                {driver.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="round_date">Date de tournée</Label>
                        <Input
                          id="round_date"
                          type="date"
                          value={roundFormData.round_date}
                          onChange={(e) =>
                            setRoundFormData({ ...roundFormData, round_date: e.target.value })
                          }
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Livraisons à inclure</Label>
                      <div className="border-2 border-[#B8860B] rounded-md p-4 max-h-64 overflow-y-auto space-y-2">
                        {availableDeliveries.map((delivery) => (
                          <div key={delivery.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`delivery-${delivery.id}`}
                              checked={selectedRoundDeliveries.includes(delivery.id)}
                              onCheckedChange={() => toggleRoundDeliverySelection(delivery.id)}
                            />
                            <label
                              htmlFor={`delivery-${delivery.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {delivery.delivery_number} - {delivery.client?.name} ({delivery.client?.city})
                            </label>
                          </div>
                        ))}
                        {availableDeliveries.length === 0 && (
                          <p className="text-sm text-gray-500">Aucune livraison disponible</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="round_notes">Notes</Label>
                      <Input
                        id="round_notes"
                        value={roundFormData.notes}
                        onChange={(e) =>
                          setRoundFormData({ ...roundFormData, notes: e.target.value })
                        }
                        placeholder="Notes sur la tournée"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        type="button"
                        onClick={() => setIsRoundDialogOpen(false)}
                        className="bg-[#B8860B] hover:bg-[#9A7209]"
                      >
                        Annuler
                      </Button>
                      <Button type="submit" className="bg-[#B8860B] hover:bg-[#9A7209]">
                        Créer la tournée
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
                    Total Tournées
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Route className="h-8 w-8 text-[#B8860B]" />
                    <span className="text-2xl font-bold">{roundStats.total}</span>
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
                  <span className="text-2xl font-bold text-yellow-600">{roundStats.pending}</span>
                </CardContent>
              </Card>
              <Card className="border-2 border-[#B8860B]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-gray-600">
                    En cours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <span className="text-2xl font-bold text-blue-600">{roundStats.inProgress}</span>
                </CardContent>
              </Card>
              <Card className="border-2 border-[#B8860B]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-gray-600">
                    Terminées
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <span className="text-2xl font-bold text-[#B8860B]">{roundStats.completed}</span>
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
                      placeholder="Rechercher par numéro ou livreur..."
                      value={roundSearchTerm}
                      onChange={(e) => setRoundSearchTerm(e.target.value)}
                      className="pl-10 border-2 border-[#B8860B]"
                    />
                  </div>
                  <Select value={roundStatusFilter} onValueChange={setRoundStatusFilter}>
                    <SelectTrigger className="w-full md:w-48 border-2 border-[#B8860B]">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      <SelectItem value="pending">En attente</SelectItem>
                      <SelectItem value="in_progress">En cours</SelectItem>
                      <SelectItem value="completed">Terminée</SelectItem>
                      <SelectItem value="cancelled">Annulée</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={fetchRounds}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Actualiser
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {filteredRounds.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Aucune tournée trouvée
                  </div>
                ) : (
                  <div className="overflow-x-auto border-2 border-[#B8860B] rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>N° BLT</TableHead>
                          <TableHead className="text-right">Val BLT</TableHead>
                          <TableHead className="text-right">Recette BLT</TableHead>
                          <TableHead>Livreur</TableHead>
                          <TableHead className="text-center">Livraisons</TableHead>
                          <TableHead>Durée</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRounds.map((round) => (
                          <TableRow key={round.id}>
                            <TableCell>
                              {format(new Date(round.round_date), 'dd/MM/yyyy', { locale: fr })}
                            </TableCell>
                            <TableCell className="font-mono font-medium">
                              {round.round_number}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatPrice(
                                round.delivery_round_items?.reduce(
                                  (sum, item) => sum + (item.delivery?.total_ht || 0),
                                  0
                                ) || 0
                              )}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-[#B8860B]">
                              {formatPrice(
                                round.delivery_round_items?.reduce(
                                  (sum, item) => {
                                    const deliveryRecette = (item.delivery as any)?.delivery_items?.reduce(
                                      (itemSum: number, deliveryItem: any) =>
                                        itemSum + ((deliveryItem.quantity_delivered - deliveryItem.quantity_returned) * deliveryItem.unit_price),
                                      0
                                    ) || 0
                                    return sum + deliveryRecette
                                  },
                                  0
                                ) || 0
                              )}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={round.driver_id || 'none'}
                                onValueChange={(value) => handleAssignDriver(round.id, value)}
                              >
                                <SelectTrigger className="w-40">
                                  <SelectValue placeholder="Non assigné">
                                    {round.driver?.full_name || 'Non assigné'}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Non assigné</SelectItem>
                                  {drivers.map((driver) => (
                                    <SelectItem key={driver.id} value={driver.id}>
                                      {driver.full_name || driver.email}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline">
                                {round.delivery_round_items?.length || 0} BL
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {round.start_time && round.end_time ? (
                                <span className="text-sm">
                                  {Math.round((new Date(round.end_time).getTime() - new Date(round.start_time).getTime()) / 60000)} min
                                </span>
                              ) : round.start_time ? (
                                <span className="text-sm text-blue-600">En cours...</span>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={roundStatusColors[round.status]}>
                                {roundStatusLabels[round.status]}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Voir détails"
                                  onClick={() => handleViewRound(round)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {round.status === 'pending' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    title="Démarrer"
                                    onClick={() => handleStartRound(round.id)}
                                  >
                                    <Play className="h-4 w-4 text-[#B8860B]" />
                                  </Button>
                                )}
                                {round.status === 'in_progress' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    title="Terminer"
                                    onClick={() => handleCompleteRound(round.id)}
                                  >
                                    <CheckCircle2 className="h-4 w-4 text-[#B8860B]" />
                                  </Button>
                                )}
                                {round.status !== 'completed' && round.status !== 'cancelled' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    title="Annuler"
                                    onClick={() => handleCancelRound(round.id)}
                                  >
                                    <XCircle className="h-4 w-4 text-orange-600" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Supprimer"
                                  onClick={() => handleDeleteRound(round.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* View Round Dialog */}
            <Dialog open={isViewRoundDialogOpen} onOpenChange={setIsViewRoundDialogOpen}>
              <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3 text-xl">
                    <Route className="h-6 w-6 text-[#B8860B]" />
                    Tournée {viewingRound?.round_number}
                    {viewingRound && (
                      <Badge className={`ml-2 ${roundStatusColors[viewingRound.status]}`}>
                        {roundStatusLabels[viewingRound.status]}
                      </Badge>
                    )}
                  </DialogTitle>
                </DialogHeader>
                {viewingRound && (
                  <div className="space-y-6">
                    {/* Header Info */}
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                          <Calendar className="h-4 w-4" />
                          Date
                        </div>
                        <p className="font-medium">
                          {format(new Date(viewingRound.round_date), 'dd MMMM yyyy', { locale: fr })}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                          <User className="h-4 w-4" />
                          Livreur
                        </div>
                        <p className="font-medium">
                          {viewingRound.driver?.full_name || 'Non assigné'}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                          <Package className="h-4 w-4" />
                          Livraisons
                        </div>
                        <p className="font-medium">
                          {viewingRound.delivery_round_items?.length || 0} BL
                        </p>
                      </div>
                      <div className="bg-amber-50 border border-[#B8860B] rounded-lg p-3">
                        <div className="flex items-center gap-2 text-[#B8860B] text-sm mb-1">
                          <Package className="h-4 w-4" />
                          Val BLT
                        </div>
                        <p className="font-semibold text-[#B8860B]">
                          {formatPrice(
                            viewingRound.delivery_round_items?.reduce(
                              (sum, item) => sum + (item.delivery?.total_ht || 0),
                              0
                            ) || 0
                          )}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                          <Clock className="h-4 w-4" />
                          Durée
                        </div>
                        <p className="font-medium">
                          {viewingRound.start_time && viewingRound.end_time
                            ? `${Math.round((new Date(viewingRound.end_time).getTime() - new Date(viewingRound.start_time).getTime()) / 60000)} min`
                            : viewingRound.start_time
                              ? 'En cours...'
                              : 'Non démarré'}
                        </p>
                      </div>
                      <div className={`rounded-lg p-3 border-2 ${roundStatusColors[viewingRound.status].replace('bg-', 'bg-').replace('text-', 'border-')}`}>
                        <div className="flex items-center gap-2 text-gray-700 text-sm mb-1 font-semibold">
                          <CheckCircle2 className="h-4 w-4" />
                          Statut Tournée
                        </div>
                        <p className="font-bold">
                          <Badge className={roundStatusColors[viewingRound.status]}>
                            {roundStatusLabels[viewingRound.status]}
                          </Badge>
                        </p>
                      </div>
                    </div>

                    {/* Deliveries List */}
                    <div className="border rounded-xl overflow-hidden">
                      <div className="bg-gray-50 px-4 py-3 border-b">
                        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                          <Truck className="h-5 w-5" />
                          Livraisons de la tournée
                        </h3>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>N° BL</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Adresse</TableHead>
                            <TableHead>GPS</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead>Statut BL</TableHead>
                            <TableHead className="text-center">Articles</TableHead>
                            <TableHead className="text-center">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {viewingRound.delivery_round_items?.sort((a, b) => a.sequence_order - b.sequence_order).map((item) => {
                            const delivery = item.delivery as any
                            return (
                            <>
                              <TableRow key={item.id} className={expandedDeliveryId === item.delivery_id ? 'bg-amber-50' : ''}>
                                <TableCell className="font-bold text-gray-400">
                                  {item.sequence_order}
                                </TableCell>
                                <TableCell className="font-mono font-medium">
                                  {delivery?.delivery_number}
                                </TableCell>
                                <TableCell>
                                  <span className="font-medium">{delivery?.client?.code}</span>
                                  <span className="text-gray-500 ml-2">{delivery?.client?.name}</span>
                                </TableCell>
                                <TableCell className="text-sm text-gray-600">
                                  {delivery?.client?.address}
                                  {delivery?.client?.city && `, ${delivery.client.city}`}
                                </TableCell>
                                <TableCell>
                                  {delivery?.client?.gps_lat && delivery?.client?.gps_lng ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-blue-600 p-0 h-auto"
                                      onClick={() => window.open(`https://www.google.com/maps?q=${delivery?.client?.gps_lat},${delivery?.client?.gps_lng}`, '_blank')}
                                    >
                                      <MapPin className="h-4 w-4 mr-1" />
                                      Voir
                                    </Button>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatPrice(delivery?.total_ht || 0)}
                                </TableCell>
                                <TableCell>
                                  <Badge className={statusColors[delivery?.status || 'pending']}>
                                    {statusLabels[delivery?.status || 'pending']}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setExpandedDeliveryId(expandedDeliveryId === item.delivery_id ? null : item.delivery_id)}
                                    className="text-[#B8860B]"
                                  >
                                    <Package className="h-4 w-4 mr-1" />
                                    Voir
                                  </Button>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Button
                                    size="sm"
                                    onClick={() => handleValidateBL(item.id, item.delivery_id, delivery?.delivery_items || [])}
                                    className="bg-green-600 hover:bg-green-700 h-7 px-2 text-xs"
                                  >
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Valider
                                  </Button>
                                </TableCell>
                              </TableRow>
                              {expandedDeliveryId === item.delivery_id && delivery?.delivery_items && (
                                <TableRow>
                                  <TableCell colSpan={9} className="bg-gray-50 p-4">
                                    <div className="border-2 border-[#B8860B] rounded-lg p-4">
                                      <h4 className="font-semibold text-[#B8860B] mb-3 flex items-center gap-2">
                                        <Package className="h-4 w-4" />
                                        Articles du BL {delivery?.delivery_number}
                                      </h4>
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Code</TableHead>
                                            <TableHead>Article</TableHead>
                                            <TableHead className="text-right">Qte Commandée</TableHead>
                                            <TableHead className="text-right">Qte Livrée</TableHead>
                                            <TableHead className="text-right">Qte Retournée</TableHead>
                                            <TableHead className="text-right">Prix Unit.</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                            <TableHead className="text-center">Action</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {delivery.delivery_items.map((deliveryItem: any) => {
                                            const currentQtyReturned = editingItems[deliveryItem.id]?.quantity_returned ?? deliveryItem.quantity_returned
                                            const hasChanges = editingItems[deliveryItem.id] !== undefined
                                            return (
                                              <TableRow key={deliveryItem.id}>
                                                <TableCell className="font-mono">{deliveryItem.article?.code}</TableCell>
                                                <TableCell>{deliveryItem.article?.name}</TableCell>
                                                <TableCell className="text-right">{deliveryItem.quantity_ordered}</TableCell>
                                                <TableCell className="text-right font-semibold text-[#B8860B]">
                                                  {deliveryItem.quantity_delivered}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                  <Input
                                                    type="number"
                                                    min="0"
                                                    max={deliveryItem.quantity_delivered}
                                                    value={currentQtyReturned}
                                                    onChange={(e) => handleQuantityReturnedChange(deliveryItem.id, e.target.value)}
                                                    className={`w-20 text-right ${hasChanges ? 'border-[#B8860B] border-2' : ''}`}
                                                  />
                                                </TableCell>
                                                <TableCell className="text-right">{formatPrice(deliveryItem.unit_price)}</TableCell>
                                                <TableCell className="text-right font-semibold">
                                                  {formatPrice((deliveryItem.quantity_delivered - currentQtyReturned) * deliveryItem.unit_price)}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                  {hasChanges && (
                                                    <Button
                                                      size="sm"
                                                      onClick={() => handleUpdateDeliveryItem(deliveryItem.id, currentQtyReturned, item.delivery_id, delivery.delivery_items)}
                                                      className="bg-[#B8860B] hover:bg-[#9A7209] h-7 px-2"
                                                    >
                                                      <CheckCircle2 className="h-3 w-3" />
                                                    </Button>
                                                  )}
                                                </TableCell>
                                              </TableRow>
                                            )
                                          })}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </>
                          )})}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Notes */}
                    {viewingRound.notes && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                        <h3 className="font-semibold text-yellow-800 mb-2">Notes</h3>
                        <p className="text-sm text-gray-700">{viewingRound.notes}</p>
                      </div>
                    )}

                    {/* Recette BLT et Diff Val */}
                    <div className="flex justify-end">
                      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-[#B8860B] rounded-xl p-4 w-auto space-y-2">
                        <div className="flex items-center gap-4">
                          <h3 className="text-lg font-bold text-[#B8860B]">Recette BLT</h3>
                          <p className="text-2xl font-bold text-[#B8860B]">
                            {formatPrice(
                              viewingRound.delivery_round_items?.reduce(
                                (sum, item) => {
                                  const deliveryRecette = (item.delivery as any)?.delivery_items?.reduce(
                                    (itemSum: number, deliveryItem: any) =>
                                      itemSum + ((deliveryItem.quantity_delivered - deliveryItem.quantity_returned) * deliveryItem.unit_price),
                                    0
                                  ) || 0
                                  return sum + deliveryRecette
                                },
                                0
                              ) || 0
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 border-t border-[#B8860B] pt-2">
                          <h3 className="text-lg font-bold text-gray-700">Diff Val</h3>
                          <p className="text-2xl font-bold text-gray-700">
                            {(() => {
                              const valBLT = viewingRound.delivery_round_items?.reduce(
                                (sum, item) => sum + (item.delivery?.total_ht || 0),
                                0
                              ) || 0
                              const recetteBLT = viewingRound.delivery_round_items?.reduce(
                                (sum, item) => {
                                  const deliveryRecette = (item.delivery as any)?.delivery_items?.reduce(
                                    (itemSum: number, deliveryItem: any) =>
                                      itemSum + ((deliveryItem.quantity_delivered - deliveryItem.quantity_returned) * deliveryItem.unit_price),
                                    0
                                  ) || 0
                                  return sum + deliveryRecette
                                },
                                0
                              ) || 0
                              return formatPrice(valBLT - recetteBLT)
                            })()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap justify-end gap-3 pt-4 border-t">
                      <Button className="bg-[#B8860B] hover:bg-[#9A7209]" onClick={() => setIsViewRoundDialogOpen(false)}>
                        Fermer
                      </Button>
                      {viewingRound.status === 'pending' && (
                        <Button
                          className="bg-[#B8860B] hover:bg-[#9A7209]"
                          onClick={() => {
                            handleStartRound(viewingRound.id)
                            setIsViewRoundDialogOpen(false)
                          }}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Démarrer la tournée
                        </Button>
                      )}
                      {viewingRound.status === 'in_progress' && (
                        <Button
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => {
                            handleCompleteRound(viewingRound.id)
                            setIsViewRoundDialogOpen(false)
                          }}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Terminer la tournée
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </>
        )}

        {/* RBLT - Retour des Livraisons Tab Content */}
        {activeTab === 'rblt' && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Retour de Livraisons</h1>
                <p className="text-gray-500">Gérez les retours de marchandises</p>
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
                        onValueChange={(value) => {
                          setSelectedRoundForReturn(value)
                          setReturnFormData({ ...returnFormData, delivery_id: '', client_id: '' })
                          setSelectedDeliveryForReturn(null)
                          setReturnItems([])
                        }}
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

                    {selectedRoundForReturn && (
                    <div className="space-y-2">
                      <Label>Livraison source *</Label>
                      <Select
                        value={returnFormData.delivery_id}
                        onValueChange={(value) => {
                          const round = rounds.find(r => r.id === selectedRoundForReturn)
                          const roundItem = round?.delivery_round_items?.find(ri => ri.delivery_id === value)
                          const delivery = roundItem?.delivery as any
                          if (delivery) {
                            const fullDelivery = deliveries.find(d => d.id === value)
                            if (fullDelivery) handleSelectDeliveryForReturn(fullDelivery)
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une livraison" />
                        </SelectTrigger>
                        <SelectContent>
                          {(() => {
                            const round = rounds.find(r => r.id === selectedRoundForReturn)
                            return round?.delivery_round_items?.map((ri) => {
                              const delivery = ri.delivery as any
                              return (
                                <SelectItem key={ri.delivery_id} value={ri.delivery_id}>
                                  {delivery?.delivery_number} - {delivery?.client?.name}
                                </SelectItem>
                              )
                            }) || []
                          })()}
                        </SelectContent>
                      </Select>
                    </div>
                    )}

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

                    {selectedDeliveryForReturn && (
                      <div className="border-t pt-4">
                        <h3 className="font-medium mb-3">Articles à retourner</h3>
                        <div className="space-y-2">
                          {selectedDeliveryForReturn.delivery_items?.map((item, index) => (
                            <div key={item.id} className="flex items-center gap-4 p-3 border rounded-lg">
                              <div className="flex-1">
                                <p className="font-medium">
                                  {item.article?.code} - {item.article?.name}
                                </p>
                                <p className="text-sm text-gray-500">
                                  Quantité livrée: {item.quantity_delivered}
                                </p>
                              </div>
                              <div className="w-32">
                                <Label htmlFor={`qty-${item.id}`} className="text-xs">
                                  Qté retour
                                </Label>
                                <Input
                                  id={`qty-${item.id}`}
                                  type="number"
                                  min="0"
                                  max={item.quantity_delivered}
                                  value={returnItems[index]?.quantity || 0}
                                  onChange={(e) => {
                                    const newQty = parseInt(e.target.value) || 0
                                    const newItems = [...returnItems]
                                    newItems[index] = {
                                      ...newItems[index],
                                      quantity: newQty,
                                    }
                                    setReturnItems(newItems)
                                  }}
                                  className="text-center"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
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
                        placeholder="Raison du retour"
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
                      <Button type="submit" className="bg-[#B8860B] hover:bg-[#9A7209]">
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
                {filteredReturns.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Aucun retour trouvé
                  </div>
                ) : (
                  <div className="overflow-x-auto border-2 border-[#B8860B] rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>N° RBLT</TableHead>
                          <TableHead>N° BLT</TableHead>
                          <TableHead className="text-center">Nombre BL</TableHead>
                          <TableHead className="text-center">Nombre articles</TableHead>
                          <TableHead className="text-right">Valeur BLT</TableHead>
                          <TableHead className="text-right">Recette BLT</TableHead>
                          <TableHead className="text-center">Articles retour</TableHead>
                          <TableHead className="text-right">Valeur retour</TableHead>
                          <TableHead className="text-right">Différence</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredReturns.map((ret) => {
                          const linkedRound = rounds.find(r => r.delivery_round_items?.some(ri => ri.delivery_id === ret.delivery_id))
                          const roundItems = linkedRound?.delivery_round_items || []
                          const nbBL = roundItems.length
                          const nbArticles = roundItems.reduce((sum, ri) => sum + ((ri.delivery as any)?.delivery_items?.length || 0), 0)
                          const valeurBLT = roundItems.reduce((sum, ri) => sum + ((ri.delivery as any)?.total_ht || 0), 0)
                          const recetteBLT = roundItems.reduce((sum, ri) => {
                            const items = (ri.delivery as any)?.delivery_items || []
                            return sum + items.reduce((s: number, di: any) => s + ((di.quantity_delivered - di.quantity_returned) * di.unit_price), 0)
                          }, 0)
                          const articlesRetour = ret.delivery_return_items?.filter(item => item.quantity_returned > 0).length || 0
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
                              {linkedRound?.round_number || '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline">{nbBL}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {nbArticles}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatPrice(valeurBLT)}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-[#B8860B]">
                              {formatPrice(recetteBLT)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="text-red-600 border-red-300">
                                {articlesRetour}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-semibold text-red-600">
                              {formatPrice(valeurRetour)}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatPrice(difference)}
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
                )}
              </CardContent>
            </Card>

            {/* View Return Dialog */}
            <Dialog open={isViewReturnDialogOpen} onOpenChange={setIsViewReturnDialogOpen}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                {viewingReturn && (
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
                          <User className="h-4 w-4" />
                          Client
                        </div>
                        <p className="font-medium">
                          {viewingReturn.client?.code} - {viewingReturn.client?.name}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                          <Truck className="h-4 w-4" />
                          BL Origine
                        </div>
                        <p className="font-medium">
                          {viewingReturn.delivery?.delivery_number || '-'}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                          <TrendingUp className="h-4 w-4" />
                          Total HT
                        </div>
                        <p className="font-medium text-red-600">
                          {formatPrice(viewingReturn.total_ht || 0)}
                        </p>
                      </div>
                    </div>

                    {/* Return Reason */}
                    {viewingReturn.return_reason && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <span className="font-medium text-red-800">Motif: </span>
                        <span className="text-red-700">
                          {returnReasons.find(r => r.value === viewingReturn.return_reason)?.label || viewingReturn.return_reason}
                        </span>
                      </div>
                    )}

                    {/* Return Items */}
                    <div className="border rounded-xl overflow-hidden">
                      <div className="bg-gray-50 px-4 py-3 border-b">
                        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                          <Package className="h-5 w-5" />
                          Articles retournés
                        </h3>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead>Article</TableHead>
                            <TableHead className="text-center">Quantité</TableHead>
                            <TableHead>Motif</TableHead>
                            <TableHead className="text-right">Prix unitaire</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {viewingReturn.delivery_return_items?.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <span className="font-medium">{item.article?.code}</span>
                                <span className="text-gray-500 ml-2">{item.article?.name}</span>
                              </TableCell>
                              <TableCell className="text-center font-medium">
                                {item.quantity_returned}
                              </TableCell>
                              <TableCell>
                                {returnReasons.find(r => r.value === item.return_reason)?.label || item.return_reason || '-'}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatPrice(item.unit_price || 0)}
                              </TableCell>
                              <TableCell className="text-right font-medium text-red-600">
                                {formatPrice((item.quantity_returned || 0) * (item.unit_price || 0))}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Notes */}
                    {viewingReturn.notes && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                        <h3 className="font-semibold text-yellow-800 mb-2">Notes</h3>
                        <p className="text-sm text-gray-700">{viewingReturn.notes}</p>
                      </div>
                    )}

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
                )}
              </DialogContent>
            </Dialog>
          </>
        )}

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
                        <TableHead className="text-center">Qte Cmd</TableHead>
                        <TableHead className="text-center">Qte Livree</TableHead>
                        <TableHead className="text-center">Qte Retour</TableHead>
                        <TableHead className="text-right">Prix U</TableHead>
                        <TableHead className="text-right">Total HT</TableHead>
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
                            {item.quantity_ordered || '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {item.quantity_delivered}
                          </TableCell>
                          <TableCell className="text-center text-red-600">
                            {item.quantity_returned || 0}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatPrice(item.unit_price)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatPrice((item.quantity_delivered - (item.quantity_returned || 0)) * item.unit_price)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total HT:</span>
                      <span className="text-[#B8860B]">{formatPrice(viewDelivery.total_ht)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Recette BL:</span>
                      <span className="text-green-600">{formatPrice(viewDelivery.delivery_items?.reduce((sum, item) => sum + ((item.quantity_delivered - (item.quantity_returned || 0)) * item.unit_price), 0) || 0)}</span>
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
                        <SelectItem value="delivered">Livrée</SelectItem>
                        <SelectItem value="partial">Partiellement livrée</SelectItem>
                        <SelectItem value="returned">Retournée</SelectItem>
                        <SelectItem value="cancelled">Annulée</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleGeneratePDF(viewDelivery)}
                      className="gap-2 bg-[#B8860B] hover:bg-[#9A7209]"
                    >
                      <FileText className="h-4 w-4" />
                      Telecharger BL
                    </Button>
                    <Button
                      onClick={() => setIsViewDialogOpen(false)}
                      className="bg-[#B8860B] hover:bg-[#9A7209]"
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
                  <div className="bg-amber-50 p-4 rounded-lg text-center">
                    <MapPin className="h-8 w-8 text-[#B8860B] mx-auto mb-2" />
                    <p className="text-2xl font-bold text-[#B8860B]">{optimizedRoute.totalDistance} km</p>
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

                {/* Google API indicator */}
                <div className={`text-center text-sm py-2 px-4 rounded-lg ${optimizedRoute.usingGoogle ? 'bg-amber-100 text-[#9A7209]' : 'bg-yellow-100 text-yellow-700'}`}>
                  {optimizedRoute.usingGoogle ? (
                    <span>Calcul precis via Google Maps API</span>
                  ) : (
                    <span>Calcul approximatif (ajoutez GOOGLE_MAPS_API_KEY pour plus de precision)</span>
                  )}
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
                          <p className="font-semibold text-[#B8860B]">{formatPrice(delivery.total_ht)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    onClick={() => setIsRouteDialogOpen(false)}
                    className="bg-[#B8860B] hover:bg-[#9A7209]"
                  >
                    Fermer
                  </Button>
                  <Button
                    onClick={generateRouteSheet}
                    className="bg-[#B8860B] hover:bg-[#9A7209] gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Imprimer Fiche du Jour
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Delivery Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5 text-blue-600" />
                Modifier BL {editingDelivery?.delivery_number}
              </DialogTitle>
            </DialogHeader>
            {editingDelivery && (
              <div className="space-y-6">
                {/* Edit form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_date">Date de livraison</Label>
                    <Input
                      id="edit_date"
                      type="date"
                      value={editFormData.delivery_date}
                      onChange={(e) => setEditFormData({ ...editFormData, delivery_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Statut</Label>
                    <Select
                      value={editFormData.status}
                      onValueChange={(value) => setEditFormData({ ...editFormData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">En attente</SelectItem>
                        <SelectItem value="in_progress">En cours</SelectItem>
                        <SelectItem value="delivered">Livrée</SelectItem>
                        <SelectItem value="partial">Partiellement livrée</SelectItem>
                        <SelectItem value="returned">Retournée</SelectItem>
                        <SelectItem value="cancelled">Annulée</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Link2 className="h-4 w-4" />
                      Commande associee
                    </Label>
                    <Select
                      value={editFormData.order_id || 'none'}
                      onValueChange={handleEditOrderChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Changer de commande" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucune commande</SelectItem>
                        {orders.map((order) => (
                          <SelectItem key={order.id} value={order.id}>
                            {order.order_number} - {order.client?.name} ({formatPrice(order.total_ht)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">Changer la commande remplacera tous les articles</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_notes">Notes</Label>
                    <Input
                      id="edit_notes"
                      value={editFormData.notes}
                      onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                      placeholder="Notes"
                    />
                  </div>
                </div>

                {/* Client info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-700 mb-2">Client</h3>
                  <p className="font-medium">{editingDelivery.client?.code} - {editingDelivery.client?.name}</p>
                  {editingDelivery.client?.address && (
                    <p className="text-sm text-gray-600">{editingDelivery.client.address}, {editingDelivery.client.city}</p>
                  )}
                </div>

                {/* Edit items */}
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3">Articles</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Designation</TableHead>
                        <TableHead className="text-center">Qte Cmd</TableHead>
                        <TableHead className="text-center">Qte Livree</TableHead>
                        <TableHead className="text-center">Qte Retour</TableHead>
                        <TableHead className="text-right">Prix Unit.</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-sm">{item.article?.code}</TableCell>
                          <TableCell>{item.article?.description || item.article?.name}</TableCell>
                          <TableCell className="text-center">{item.quantity_ordered}</TableCell>
                          <TableCell className="text-center">
                            <Input
                              type="number"
                              min="0"
                              value={item.quantity_delivered}
                              onChange={(e) => updateItemQuantity(item.id, 'quantity_delivered', parseInt(e.target.value) || 0)}
                              className="w-20 text-center"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Input
                              type="number"
                              min="0"
                              value={item.quantity_returned}
                              onChange={(e) => updateItemQuantity(item.id, 'quantity_returned', parseInt(e.target.value) || 0)}
                              className="w-20 text-center"
                            />
                          </TableCell>
                          <TableCell className="text-right">{formatPrice(item.unit_price)}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatPrice((item.quantity_delivered - item.quantity_returned) * item.unit_price)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-72 space-y-2 bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between text-sm text-gray-600 pb-2">
                      <span>Total HT (Cmd):</span>
                      <span>
                        {formatPrice(editItems.reduce((sum, item) => sum + (item.quantity_ordered * item.unit_price), 0))}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Recette BL:</span>
                      <span className="text-[#B8860B]">
                        {formatPrice(editItems.reduce((sum, item) => sum + ((item.quantity_delivered - item.quantity_returned) * item.unit_price), 0))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    onClick={() => setIsEditDialogOpen(false)}
                    className="bg-[#B8860B] hover:bg-[#9A7209]"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleSaveEdit}
                    className="bg-[#B8860B] hover:bg-[#9A7209]"
                  >
                    Enregistrer
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Payment Dialog */}
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-[#B8860B]" />
                Encaisser - {paymentDelivery?.delivery_number}
              </DialogTitle>
            </DialogHeader>
            {paymentDelivery && (
              <div className="space-y-6">
                {/* Client & Delivery Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-700 mb-2">Client</h3>
                    <p className="font-medium">{paymentDelivery.client?.code} - {paymentDelivery.client?.name}</p>
                    {paymentDelivery.client?.phone && (
                      <p className="text-sm text-gray-600">Tel: {paymentDelivery.client.phone}</p>
                    )}
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-700 mb-2">Montants</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Recette BL:</span>
                        <span className="font-medium">{formatPrice(getRecetteBL(paymentDelivery))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Deja paye:</span>
                        <span className="font-medium text-[#B8860B]">{formatPrice(paymentDelivery.amount_paid || 0)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold border-t pt-1">
                        <span className="text-red-600">Reste a payer:</span>
                        <span className="text-red-600">{formatPrice(Math.max(0, getRecetteBL(paymentDelivery) - (paymentDelivery.amount_paid || 0)))}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Previous payments */}
                {deliveryPayments.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Paiements precedents</h3>
                    <div className="border rounded-lg divide-y max-h-32 overflow-y-auto">
                      {deliveryPayments.map((payment) => (
                        <div key={payment.id} className="flex justify-between items-center p-2 text-sm">
                          <div>
                            <span className="font-medium">{payment.payment_number}</span>
                            <span className="text-gray-500 ml-2">
                              {format(new Date(payment.payment_date), 'dd/MM/yyyy', { locale: fr })}
                            </span>
                            <Badge variant="outline" className="ml-2">
                              {paymentMethodLabels[payment.payment_method]}
                            </Badge>
                          </div>
                          <span className="font-medium text-[#B8860B]">{formatPrice(payment.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Payment Form */}
                <form onSubmit={handleSubmitPayment} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="payment_amount">Montant *</Label>
                      <Input
                        id="payment_amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={paymentFormData.amount}
                        onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: parseFloat(e.target.value) || 0 })}
                        className="text-lg font-bold"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Mode de paiement *</Label>
                      <Select
                        value={paymentFormData.payment_method}
                        onValueChange={(value) => setPaymentFormData({ ...paymentFormData, payment_method: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">
                            <div className="flex items-center gap-2">
                              <Banknote className="h-4 w-4" />
                              Especes
                            </div>
                          </SelectItem>
                          <SelectItem value="check">
                            <div className="flex items-center gap-2">
                              <Receipt className="h-4 w-4" />
                              Cheque
                            </div>
                          </SelectItem>
                          <SelectItem value="transfer">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              Virement
                            </div>
                          </SelectItem>
                          <SelectItem value="card">
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4" />
                              Carte
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="payment_date">Date</Label>
                      <Input
                        id="payment_date"
                        type="date"
                        value={paymentFormData.payment_date}
                        onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="payment_reference">Reference (N cheque, etc.)</Label>
                      <Input
                        id="payment_reference"
                        value={paymentFormData.reference}
                        onChange={(e) => setPaymentFormData({ ...paymentFormData, reference: e.target.value })}
                        placeholder="N cheque, reference virement..."
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payment_notes">Notes</Label>
                    <Input
                      id="payment_notes"
                      value={paymentFormData.notes}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                      placeholder="Notes sur le paiement"
                    />
                  </div>

                  {/* Quick amount buttons */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setPaymentFormData({ ...paymentFormData, amount: Math.max(0, getRecetteBL(paymentDelivery) - (paymentDelivery.amount_paid || 0)) })}
                      className="bg-[#B8860B] hover:bg-[#9A7209]"
                    >
                      Tout payer
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setPaymentFormData({ ...paymentFormData, amount: Math.max(0, getRecetteBL(paymentDelivery) - (paymentDelivery.amount_paid || 0)) / 2 })}
                      className="bg-[#B8860B] hover:bg-[#9A7209]"
                    >
                      50%
                    </Button>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button
                      type="button"
                      onClick={() => setIsPaymentDialogOpen(false)}
                      className="bg-[#B8860B] hover:bg-[#9A7209]"
                    >
                      Annuler
                    </Button>
                    <Button
                      type="submit"
                      className="bg-[#B8860B] hover:bg-[#9A7209] gap-2"
                    >
                      <Wallet className="h-4 w-4" />
                      Enregistrer le paiement
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Receipt Dialog */}
        <Dialog open={isReceiptDialogOpen} onOpenChange={setIsReceiptDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-[#B8860B]">
                <CheckCircle2 className="h-5 w-5" />
                Paiement enregistre!
              </DialogTitle>
            </DialogHeader>
            {lastPayment && paymentDelivery && (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                  <p className="text-sm text-[#9A7209]">Recu N</p>
                  <p className="text-2xl font-bold text-[#9A7209]">{lastPayment.payment_number}</p>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Montant recu:</span>
                    <span className="font-bold text-[#B8860B]">{formatPrice(lastPayment.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mode:</span>
                    <span>{paymentMethodLabels[lastPayment.payment_method]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">BL:</span>
                    <span>{paymentDelivery.delivery_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Client:</span>
                    <span>{paymentDelivery.client?.name}</span>
                  </div>
                </div>

                <div className={`p-4 rounded-lg text-center ${
                  Math.max(0, (paymentDelivery.total_ht || 0) * 1.2 - (paymentDelivery.amount_paid || 0) - lastPayment.amount) > 0
                    ? 'bg-orange-50 border border-orange-200'
                    : 'bg-amber-50 border border-amber-200'
                }`}>
                  <p className="text-sm text-gray-600">Reste a payer</p>
                  <p className={`text-2xl font-bold ${
                    Math.max(0, (paymentDelivery.total_ht || 0) * 1.2 - (paymentDelivery.amount_paid || 0) - lastPayment.amount) > 0
                      ? 'text-orange-600'
                      : 'text-[#B8860B]'
                  }`}>
                    {formatPrice(Math.max(0, (paymentDelivery.total_ht || 0) * 1.2 - (paymentDelivery.amount_paid || 0) - lastPayment.amount))}
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => setIsReceiptDialogOpen(false)}
                    className="flex-1 bg-[#B8860B] hover:bg-[#9A7209]"
                  >
                    Fermer
                  </Button>
                  <Button
                    onClick={printReceipt}
                    className="flex-1 bg-[#B8860B] hover:bg-[#9A7209] gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Imprimer recu
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
