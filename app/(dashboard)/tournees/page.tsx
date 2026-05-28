'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { ProtectedModule } from '@/components/auth/ProtectedModule'

// Import map component dynamically to avoid SSR issues with Leaflet
const RouteMap = dynamic(
  () => import('@/components/maps/RouteMap').then(mod => mod.RouteMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center bg-gray-100 rounded-lg h-full">
        <div className="text-gray-500">Chargement de la carte...</div>
      </div>
    )
  }
)
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
  Route,
  MapPin,
  Clock,
  User,
  Calendar,
  Play,
  CheckCircle2,
  XCircle,
  Trash2,
  Pencil,
  Navigation,
  RefreshCw,
  Package,
  Locate,
  X,
  Maximize2,
  Radio,
  Wallet,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useCompanySettings } from '@/hooks/useCompanySettings'

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

interface Delivery {
  id: string
  delivery_number: string
  client_id: string
  status: string
  total_ht: number | null
  delivery_date: string | null
  client?: {
    code: string
    name: string
    address: string | null
    city: string | null
    gps_lat: number | null
    gps_lng: number | null
  }
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-amber-100 text-[#9A7209]',
  cancelled: 'bg-red-100 text-red-800',
}

const statusLabels: Record<string, string> = {
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

const deliveryStatusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  in_delivery: 'bg-purple-100 text-purple-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  partial: 'bg-orange-100 text-orange-800',
  returned: 'bg-pink-100 text-pink-800',
  cancelled: 'bg-red-100 text-red-800',
}

const deliveryStatusLabels: Record<string, string> = {
  pending: 'En attente',
  in_progress: 'En cours',
  in_delivery: 'En livraison',
  delivered: 'Livrée',
  partial: 'Partiellement livrée',
  returned: 'Retournée',
  cancelled: 'Annulée',
}

export default function TourneesPage() {
  const [rounds, setRounds] = useState<DeliveryRound[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [availableDeliveries, setAvailableDeliveries] = useState<Delivery[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [viewingRound, setViewingRound] = useState<DeliveryRound | null>(null)
  const [editingRound, setEditingRound] = useState<DeliveryRound | null>(null)
  const [expandedDeliveryId, setExpandedDeliveryId] = useState<string | null>(null)
  const [editingItems, setEditingItems] = useState<Record<string, { quantity_returned: number }>>({})
  const [confirmedDeliveries, setConfirmedDeliveries] = useState<Set<string>>(new Set())

  // Payment states
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [paymentDelivery, setPaymentDelivery] = useState<any>(null)
  const [paymentAmount, setPaymentAmount] = useState<number>(0)
  const [paymentMethod, setPaymentMethod] = useState<string>('cash')

  // Live tracking states
  const [isLiveTrackingOpen, setIsLiveTrackingOpen] = useState(false)
  const [trackingRound, setTrackingRound] = useState<DeliveryRound | null>(null)
  const [driverPosition, setDriverPosition] = useState<{ lat: number; lng: number; speed?: number; heading?: number; timestamp?: number } | null>(null)
  const [driverPath, setDriverPath] = useState<[number, number][]>([])
  const [isTracking, setIsTracking] = useState(false)
  const [trackingError, setTrackingError] = useState<string | null>(null)
  const watchIdRef = useRef<number | null>(null)

  const supabase = createClient()
  const { companySettings } = useCompanySettings()

  const [formData, setFormData] = useState({
    driver_id: '',
    round_date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  const [selectedDeliveries, setSelectedDeliveries] = useState<string[]>([])

  const fetchRounds = useCallback(async () => {
    setIsLoading(true)
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
    setIsLoading(false)
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
    // Get deliveries that are not already assigned to an active round
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

    // Filter out deliveries already in a non-completed round
    const assignedDeliveryIds = rounds
      .filter(r => r.status !== 'completed' && r.status !== 'cancelled')
      .flatMap(r => r.delivery_round_items?.map(item => item.delivery_id) || [])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const available = (data || []).filter((d: any) => !assignedDeliveryIds.includes(d.id))
    setAvailableDeliveries(available as Delivery[])
  }, [supabase, rounds])

  useEffect(() => {
    fetchRounds()
    fetchDrivers()
  }, [fetchRounds, fetchDrivers])

  useEffect(() => {
    if (isDialogOpen) {
      fetchAvailableDeliveries()
    }
  }, [isDialogOpen, fetchAvailableDeliveries])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedDeliveries.length === 0) {
      alert('Veuillez selectionner au moins une livraison')
      return
    }

    const roundNumber = await generateRoundNumber()

    // Create the round
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: roundData, error: roundError } = await (supabase.from('delivery_rounds') as any)
      .insert([{
        round_number: roundNumber,
        driver_id: formData.driver_id && formData.driver_id !== 'none' ? formData.driver_id : null,
        round_date: formData.round_date,
        status: 'pending',
        depot_lat: companySettings?.depot_lat || null,
        depot_lng: companySettings?.depot_lng || null,
        notes: formData.notes || null,
      }])
      .select()
      .single()

    if (roundError) {
      console.error('Error creating round:', roundError)
      alert(`Erreur: ${roundError.message}`)
      return
    }

    // Add deliveries to the round
    const roundItems = selectedDeliveries.map((deliveryId, index) => ({
      round_id: roundData.id,
      delivery_id: deliveryId,
      sequence_order: index + 1,
      status: 'pending',
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: itemsError } = await (supabase.from('delivery_round_items') as any)
      .insert(roundItems)

    if (itemsError) {
      console.error('Error adding deliveries to round:', itemsError)
    }

    // Déduire du stock les articles des BL inclus dans le BLT
    for (const deliveryId of selectedDeliveries) {
      // Récupérer les articles du BL
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: deliveryItems } = await (supabase.from('delivery_items') as any)
        .select('id, article_id, quantity_delivered, unit_price, article:articles(code, name)')
        .eq('delivery_id', deliveryId)

      // Récupérer le numéro du BL
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: deliveryData } = await (supabase.from('deliveries') as any)
        .select('delivery_number')
        .eq('id', deliveryId)
        .single()

      if (deliveryItems && deliveryItems.length > 0) {
        for (const di of deliveryItems) {
          const qtyToDeduct = di.quantity_delivered || 0
          if (qtyToDeduct > 0) {
            // Mouvement de stock (sortie)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from('stock_movements') as any).insert([{
              article_id: di.article_id,
              quantity: -qtyToDeduct,
              movement_type: 'out',
              reference_type: 'livraison',
              reference_id: deliveryId,
              notes: `BLT ${roundData.round_number} - BL ${deliveryData?.delivery_number || ''} - ${di.article?.code || ''}`,
            }])

            // Mettre à jour le stock
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: existingStock } = await (supabase.from('stock') as any)
              .select('id, quantity')
              .eq('article_id', di.article_id)
              .eq('warehouse', 'principal')
              .single()

            if (existingStock) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (supabase.from('stock') as any)
                .update({ quantity: existingStock.quantity - qtyToDeduct, updated_at: new Date().toISOString() })
                .eq('id', existingStock.id)
            } else {
              // Créer l'entrée de stock si elle n'existe pas
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (supabase.from('stock') as any).insert([{
                article_id: di.article_id,
                quantity: -qtyToDeduct,
                warehouse: 'principal',
              }])
            }
          }
        }
      }
    }

    fetchRounds()
    setIsDialogOpen(false)
    resetForm()
  }

  const handleStartRound = async (roundId: string) => {
    try {
      // 1. Update the round status to in_progress
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('delivery_rounds') as any)
        .update({ status: 'in_progress', start_time: new Date().toISOString() })
        .eq('id', roundId)

      if (error) {
        console.error('Error starting round:', error)
        return
      }

      // 2. Get all delivery_round_items for this round to get delivery IDs
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: roundItems, error: roundItemsError } = await (supabase.from('delivery_round_items') as any)
        .select('delivery_id')
        .eq('round_id', roundId)

      if (roundItemsError) {
        console.error('Error fetching round items:', roundItemsError)
        return
      }

      console.log('Round items found:', roundItems)

      if (roundItems && roundItems.length > 0) {
        // 3. Get unique delivery IDs
        const deliveryIds = roundItems.map((item: any) => item.delivery_id).filter(Boolean)
        console.log('Delivery IDs to update:', deliveryIds)

        // 4. Update all deliveries to "En livraison" (in_delivery)
        if (deliveryIds.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: deliveryUpdateError } = await (supabase.from('deliveries') as any)
            .update({ status: 'in_delivery' })
            .in('id', deliveryIds)

          if (deliveryUpdateError) {
            console.error('Error updating deliveries status:', deliveryUpdateError)
          } else {
            console.log('Successfully updated deliveries to in_delivery')
          }

          // 5. Get deliveries to find their order_ids
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: deliveries, error: deliveriesError } = await (supabase.from('deliveries') as any)
            .select('order_id')
            .in('id', deliveryIds)

          if (deliveriesError) {
            console.error('Error fetching deliveries for orders:', deliveriesError)
          } else if (deliveries) {
            const orderIds = deliveries
              .map((d: any) => d.order_id)
              .filter(Boolean)
              .filter((id: string, index: number, self: string[]) => self.indexOf(id) === index) // unique

            console.log('Order IDs to update:', orderIds)

            // 6. Update all associated orders to "En livraison" (in_delivery)
            if (orderIds.length > 0) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const { error: orderUpdateError } = await (supabase.from('orders') as any)
                .update({ status: 'in_delivery' })
                .in('id', orderIds)

              if (orderUpdateError) {
                console.error('Error updating orders status:', orderUpdateError)
              } else {
                console.log('Successfully updated orders to in_delivery')
              }
            }
          }
        }
      }

      await fetchRounds()
    } catch (err) {
      console.error('Error in handleStartRound:', err)
    }
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

    // First delete items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('delivery_round_items') as any).delete().eq('round_id', roundId)
    // Then delete round
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('delivery_rounds') as any).delete().eq('id', roundId)

    if (!error) fetchRounds()
  }

  // Live tracking functions
  const startLiveTracking = (round: DeliveryRound) => {
    setTrackingRound(round)
    setIsLiveTrackingOpen(true)
    setDriverPath([])
    setTrackingError(null)

    if (!navigator.geolocation) {
      setTrackingError("La géolocalisation n'est pas supportée par votre navigateur")
      return
    }

    setIsTracking(true)

    // Watch position with high accuracy
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const newPosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          speed: position.coords.speed || undefined,
          heading: position.coords.heading || undefined,
          timestamp: position.timestamp
        }
        setDriverPosition(newPosition)
        setDriverPath(prev => [...prev, [newPosition.lat, newPosition.lng]])
        setTrackingError(null)
      },
      (error) => {
        console.error('Geolocation error:', error)
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setTrackingError("Accès à la localisation refusé. Veuillez autoriser l'accès dans les paramètres.")
            break
          case error.POSITION_UNAVAILABLE:
            setTrackingError("Position indisponible. Vérifiez que le GPS est activé.")
            break
          case error.TIMEOUT:
            setTrackingError("Délai d'attente dépassé pour obtenir la position.")
            break
          default:
            setTrackingError("Erreur de géolocalisation.")
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  const stopLiveTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setIsTracking(false)
  }

  const closeLiveTracking = () => {
    stopLiveTracking()
    setIsLiveTrackingOpen(false)
    setTrackingRound(null)
    setDriverPosition(null)
    setDriverPath([])
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  const refreshViewingRound = async (roundId: string) => {
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
            balance_due,
            amount_paid,
            payment_status,
            status,
            client:clients(code, name, address, city, gps_lat, gps_lng),
            delivery_items(id, article_id, quantity_ordered, quantity_delivered, quantity_returned, unit_price, article:articles(code, name, description))
          )
        )
      `)
      .eq('id', roundId)
      .single()
    if (freshRound) setViewingRound(freshRound)
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
      fetchRounds()
      if (viewingRound) {
        await refreshViewingRound(viewingRound.id)
      }
    }
  }

  // Payment handlers
  const getRecetteBL = (delivery: any) => {
    return delivery?.delivery_items?.reduce((sum: number, item: any) =>
      sum + ((item.quantity_delivered - (item.quantity_returned || 0)) * item.unit_price), 0) || 0
  }

  const handleOpenPayment = (delivery: any) => {
    const recette = getRecetteBL(delivery)
    const balanceDue = delivery.balance_due ?? (recette - (delivery.amount_paid || 0))
    setPaymentDelivery(delivery)
    setPaymentAmount(Math.max(0, balanceDue))
    setPaymentMethod('cash')
    setIsPaymentDialogOpen(true)
  }

  const handleSubmitPayment = async () => {
    if (!paymentDelivery || paymentAmount <= 0) return

    try {
      // Générer le numéro de paiement
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: lastPayment } = await (supabase.from('payments') as any)
        .select('payment_number')
        .like('payment_number', 'REC%')
        .order('payment_number', { ascending: false })
        .limit(1)

      let paymentNumber = 'REC00001'
      if (lastPayment && lastPayment.length > 0) {
        const lastNum = parseInt(lastPayment[0].payment_number.replace('REC', ''))
        if (!isNaN(lastNum)) {
          paymentNumber = `REC${String(lastNum + 1).padStart(5, '0')}`
        }
      }

      // Créer le paiement dans la table payments
      // Le trigger update_delivery_payment_status() met automatiquement à jour deliveries
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('payments') as any)
        .insert([{
          payment_number: paymentNumber,
          client_id: paymentDelivery.client_id,
          delivery_id: paymentDelivery.id,
          amount: paymentAmount,
          payment_method: paymentMethod,
          payment_date: new Date().toISOString().split('T')[0],
          notes: viewingRound ? `Encaissement via BLT ${viewingRound.round_number}` : null,
        }])

      if (error) throw error

      setIsPaymentDialogOpen(false)
      fetchRounds()
      if (viewingRound) {
        await refreshViewingRound(viewingRound.id)
      }
    } catch (error) {
      console.error('Erreur paiement:', error)
      alert('Erreur lors de l\'enregistrement du paiement')
    }
  }

  const handleUpdateDeliveryItem = async (itemId: string, quantityReturned: number) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('delivery_items') as any)
      .update({ quantity_returned: quantityReturned })
      .eq('id', itemId)

    if (!error) {
      fetchRounds()
      if (viewingRound) {
        await refreshViewingRound(viewingRound.id)
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

  // Confirmer un BL via la case à cocher : met à jour le statut selon les quantités retournées
  const handleConfirmDelivery = async (
    deliveryId: string,
    roundItemId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deliveryItems: any[],
    checked: boolean
  ) => {
    if (!checked) {
      setConfirmedDeliveries(prev => {
        const next = new Set(prev)
        next.delete(deliveryId)
        return next
      })
      return
    }

    // Calculer le statut selon les quantités retournées
    let totalDelivered = 0
    let totalReturned = 0
    for (const di of deliveryItems) {
      const qtyDel = di.quantity_delivered || 0
      const qtyRet = editingItems[di.id]?.quantity_returned ?? (di.quantity_returned || 0)
      totalDelivered += qtyDel
      totalReturned += qtyRet
    }

    let newStatus = 'delivered'
    if (totalReturned > 0 && totalReturned >= totalDelivered) {
      newStatus = 'returned'
    } else if (totalReturned > 0) {
      newStatus = 'partial'
    }

    // Sauvegarder les quantités retournées modifiées
    for (const di of deliveryItems) {
      if (editingItems[di.id] !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('delivery_items') as any)
          .update({ quantity_returned: editingItems[di.id].quantity_returned })
          .eq('id', di.id)
      }
    }

    // Mettre à jour le statut du BL
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('deliveries') as any)
      .update({ status: newStatus })
      .eq('id', deliveryId)

    // Mettre à jour le statut du round item
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('delivery_round_items') as any)
      .update({ status: newStatus })
      .eq('id', roundItemId)

    // Mettre à jour le statut de la commande (BC) associée
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: delivery } = await (supabase.from('deliveries') as any)
      .select('order_id')
      .eq('id', deliveryId)
      .single()

    if (delivery?.order_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('orders') as any)
        .update({ status: newStatus })
        .eq('id', delivery.order_id)
    }

    // Marquer comme confirmé
    setConfirmedDeliveries(prev => {
      const next = new Set(prev)
      next.add(deliveryId)
      return next
    })

    // Nettoyer les éditions
    setEditingItems(prev => {
      const next = { ...prev }
      for (const di of deliveryItems) {
        delete next[di.id]
      }
      return next
    })

    await fetchRounds()
    if (viewingRound) {
      await refreshViewingRound(viewingRound.id)
    }
  }

  const handleViewRound = (round: DeliveryRound) => {
    setViewingRound(round)
    setIsViewDialogOpen(true)
    setExpandedDeliveryId(null) // Reset expanded delivery when opening dialog
    setConfirmedDeliveries(new Set())
  }

  const handleAssignDriver = async (roundId: string, driverId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('delivery_rounds') as any)
      .update({ driver_id: driverId && driverId !== 'none' ? driverId : null })
      .eq('id', roundId)

    if (!error) fetchRounds()
  }

  const resetForm = () => {
    setFormData({
      driver_id: '',
      round_date: new Date().toISOString().split('T')[0],
      notes: '',
    })
    setSelectedDeliveries([])
    setEditingRound(null)
  }

  const toggleDeliverySelection = (deliveryId: string) => {
    setSelectedDeliveries(prev =>
      prev.includes(deliveryId)
        ? prev.filter(id => id !== deliveryId)
        : [...prev, deliveryId]
    )
  }

  const selectAllDeliveries = () => {
    if (selectedDeliveries.length === availableDeliveries.length) {
      setSelectedDeliveries([])
    } else {
      setSelectedDeliveries(availableDeliveries.map(d => d.id))
    }
  }

  const filteredRounds = rounds.filter((round) => {
    const matchesSearch =
      round.round_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      round.driver?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || round.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const formatPrice = (price: number | null) => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
    }).format(price || 0)
  }

  // Stats
  const stats = {
    total: rounds.length,
    pending: rounds.filter(r => r.status === 'pending').length,
    inProgress: rounds.filter(r => r.status === 'in_progress').length,
    completed: rounds.filter(r => r.status === 'completed').length,
  }

  return (
    <ProtectedModule module="tournees">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tournée de Livraison - BLT</h1>
            <p className="text-gray-500">Gérez vos bons de livraison tournée (BLT)</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <ProtectedModule module="tournees" action="create">
                <Button
                  className="bg-[#B8860B] hover:bg-[#9A7209]"
                  onClick={() => {
                    resetForm()
                    setIsDialogOpen(true)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvelle Tournee
                </Button>
              </ProtectedModule>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Creer une nouvelle tournee</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Livreur</Label>
                    <Select
                      value={formData.driver_id}
                      onValueChange={(value) => setFormData({ ...formData, driver_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selectionner un livreur" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Non assigne</SelectItem>
                        {drivers.map((driver) => (
                          <SelectItem key={driver.id} value={driver.id}>
                            {driver.full_name || driver.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="round_date">Date de tournee</Label>
                    <Input
                      id="round_date"
                      type="date"
                      value={formData.round_date}
                      onChange={(e) => setFormData({ ...formData, round_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Notes sur la tournee"
                  />
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">Livraisons a inclure</h3>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedDeliveries.length === availableDeliveries.length && availableDeliveries.length > 0}
                        onCheckedChange={selectAllDeliveries}
                      />
                      <span className="text-sm text-gray-600">Tout selectionner</span>
                      <Badge variant="outline" className="ml-2">
                        {selectedDeliveries.length} selectionnee(s)
                      </Badge>
                    </div>
                  </div>

                  {availableDeliveries.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Aucune livraison disponible
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12"></TableHead>
                            <TableHead>N BL</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Ville</TableHead>
                            <TableHead>GPS</TableHead>
                            <TableHead className="text-right">Total HT</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {availableDeliveries.map((delivery) => (
                            <TableRow
                              key={delivery.id}
                              className={selectedDeliveries.includes(delivery.id) ? 'bg-amber-50' : ''}
                            >
                              <TableCell>
                                <Checkbox
                                  checked={selectedDeliveries.includes(delivery.id)}
                                  onCheckedChange={() => toggleDeliverySelection(delivery.id)}
                                />
                              </TableCell>
                              <TableCell className="font-mono font-medium">
                                {delivery.delivery_number}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <span className="font-medium">{delivery.client?.code}</span>
                                  <span className="text-gray-500 ml-2">{delivery.client?.name}</span>
                                </div>
                              </TableCell>
                              <TableCell>{delivery.client?.city || '-'}</TableCell>
                              <TableCell>
                                {delivery.client?.gps_lat && delivery.client?.gps_lng ? (
                                  <Badge variant="outline" className="text-[#B8860B]">
                                    <MapPin className="h-3 w-3 mr-1" />
                                    OK
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-red-600">
                                    Non
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatPrice(delivery.total_ht)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" className="bg-[#B8860B] hover:bg-[#9A7209]">
                    Creer la tournee
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Tournees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Route className="h-8 w-8 text-[#B8860B]" />
                <span className="text-2xl font-bold">{stats.total}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                En attente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-yellow-600">{stats.pending}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                En cours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-blue-600">{stats.inProgress}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Terminees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-[#B8860B]">{stats.completed}</span>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filters */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par numero ou livreur..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="in_progress">En cours</SelectItem>
                  <SelectItem value="completed">Terminee</SelectItem>
                  <SelectItem value="cancelled">Annulee</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchRounds}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualiser
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Chargement...</div>
            ) : filteredRounds.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Aucune tournee trouvee
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>N BLT</TableHead>
                      <TableHead className="text-right">Val BLT</TableHead>
                      <TableHead className="text-right">Recette BLT</TableHead>
                      <TableHead>Livreur</TableHead>
                      <TableHead className="text-center">Livraisons</TableHead>
                      <TableHead>Duree</TableHead>
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
                              <SelectValue placeholder="Non assigne">
                                {round.driver?.full_name || 'Non assigne'}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Non assigne</SelectItem>
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
                          <Badge className={statusColors[round.status]}>
                            {statusLabels[round.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Voir details"
                              onClick={() => handleViewRound(round)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {round.status === 'pending' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Demarrer"
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
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-xl">
                <Route className="h-6 w-6 text-[#B8860B]" />
                Tournee {viewingRound?.round_number}
                {viewingRound && (
                  <Badge className={`ml-2 ${statusColors[viewingRound.status]}`}>
                    {statusLabels[viewingRound.status]}
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
                      {viewingRound.driver?.full_name || 'Non assigne'}
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
                      Duree
                    </div>
                    <p className="font-medium">
                      {viewingRound.start_time && viewingRound.end_time
                        ? `${Math.round((new Date(viewingRound.end_time).getTime() - new Date(viewingRound.start_time).getTime()) / 60000)} min`
                        : viewingRound.start_time
                          ? 'En cours...'
                          : 'Non demarre'}
                    </p>
                  </div>
                  <div className={`rounded-lg p-3 border-2 ${statusColors[viewingRound.status].replace('bg-', 'bg-').replace('text-', 'border-')}`}>
                    <div className="flex items-center gap-2 text-gray-700 text-sm mb-1 font-semibold">
                      <CheckCircle2 className="h-4 w-4" />
                      Statut Tournee
                    </div>
                    <p className="font-bold">
                      <Badge className={statusColors[viewingRound.status]}>
                        {statusLabels[viewingRound.status]}
                      </Badge>
                    </p>
                  </div>
                </div>

                {/* Depot Coordinates */}
                {viewingRound.depot_lat && viewingRound.depot_lng && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-blue-800">Point de depart (Depot)</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto text-blue-600"
                        onClick={() => window.open(`https://www.google.com/maps?q=${viewingRound.depot_lat},${viewingRound.depot_lng}`, '_blank')}
                      >
                        <Navigation className="h-4 w-4 mr-1" />
                        Voir sur la carte
                      </Button>
                    </div>
                  </div>
                )}

                {/* Deliveries List */}
                <div className="border rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b">
                    <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      Livraisons de la tournee
                    </h3>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>N BL</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Adresse</TableHead>
                        <TableHead>GPS</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Statut BL</TableHead>
                        <TableHead className="text-center">Articles</TableHead>
                        <TableHead className="text-center">Confirmer</TableHead>
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
                              <div>
                                <span className="font-medium">{delivery?.client?.code}</span>
                                <span className="text-gray-500 ml-2">{delivery?.client?.name}</span>
                              </div>
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
                              <Badge className={deliveryStatusColors[delivery?.status || 'pending']}>
                                {deliveryStatusLabels[delivery?.status || 'pending']}
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
                                {expandedDeliveryId === item.delivery_id ? 'Masquer' : 'Voir'}
                              </Button>
                            </TableCell>
                            <TableCell className="text-center">
                              {(() => {
                                const isConfirmed = confirmedDeliveries.has(item.delivery_id)
                                const items = delivery?.delivery_items || []
                                let totDel = 0
                                let totRet = 0
                                for (const di of items) {
                                  totDel += di.quantity_delivered || 0
                                  totRet += editingItems[di.id]?.quantity_returned ?? (di.quantity_returned || 0)
                                }
                                let statusLabel = 'Livrée'
                                let statusColor = 'bg-emerald-100 text-emerald-800'
                                if (totRet > 0 && totRet >= totDel) {
                                  statusLabel = 'Retournée'
                                  statusColor = 'bg-pink-100 text-pink-800'
                                } else if (totRet > 0) {
                                  statusLabel = 'Partiellement Livrée'
                                  statusColor = 'bg-orange-100 text-orange-800'
                                }
                                return (
                                  <div className="flex flex-col items-center gap-1">
                                    <Checkbox
                                      checked={isConfirmed}
                                      onCheckedChange={(checked) =>
                                        handleConfirmDelivery(item.delivery_id, item.id, items, !!checked)
                                      }
                                      className="h-5 w-5 border-2 border-[#B8860B] data-[state=checked]:bg-[#B8860B] data-[state=checked]:border-[#B8860B]"
                                    />
                                    {isConfirmed && (
                                      <Badge className={`text-[10px] px-1 py-0 ${statusColor}`}>
                                        {statusLabel}
                                      </Badge>
                                    )}
                                  </div>
                                )
                              })()}
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
                                        <TableHead className="text-right">Qte Commandee</TableHead>
                                        <TableHead className="text-right">Qte Livree</TableHead>
                                        <TableHead className="text-right">Qte Retournee</TableHead>
                                        <TableHead className="text-right">Prix Unit.</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead className="text-center">Action</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {delivery.delivery_items.map((deliveryItem: any) => {
                                        const currentQtyReturned = editingItems[deliveryItem.id]?.quantity_returned ?? deliveryItem.quantity_returned
                                        const hasChanges = editingItems[deliveryItem.id] !== undefined
                                        const isConfirmed = confirmedDeliveries.has(item.delivery_id)
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
                                                disabled={isConfirmed}
                                              />
                                            </TableCell>
                                            <TableCell className="text-right">{formatPrice(deliveryItem.unit_price)}</TableCell>
                                            <TableCell className="text-right font-semibold">
                                              {formatPrice((deliveryItem.quantity_delivered - currentQtyReturned) * deliveryItem.unit_price)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                              {hasChanges && !isConfirmed && (
                                                <Button
                                                  size="sm"
                                                  onClick={() => handleUpdateDeliveryItem(deliveryItem.id, currentQtyReturned)}
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
                                  <div className="flex justify-end mt-4 pt-3 border-t border-[#B8860B]">
                                    <Button
                                      onClick={() => handleOpenPayment(delivery)}
                                      className="gap-2 bg-green-600 hover:bg-green-700"
                                    >
                                      <Wallet className="h-4 w-4" />
                                      Encaisser
                                    </Button>
                                  </div>
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
                    <div className="flex items-center gap-4 border-t border-[#B8860B] pt-2">
                      <h3 className="text-lg font-bold text-green-700">RNET-BLT</h3>
                      <p className="text-2xl font-bold text-green-700">
                        {(() => {
                          // RNET-BLT = Total encaissé (amount_paid) si encaissement fait, sinon 0
                          const totalEncaisse = viewingRound.delivery_round_items?.reduce(
                            (sum, item) => {
                              const delivery = item.delivery as any
                              // Only count if payment has been made (payment_status is 'paid' or 'partial', or amount_paid > 0)
                              const amountPaid = delivery?.amount_paid || 0
                              return sum + amountPaid
                            },
                            0
                          ) || 0
                          return formatPrice(totalEncaisse)
                        })()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                    Fermer
                  </Button>
                  {viewingRound.status === 'pending' && (
                    <Button
                      className="bg-[#B8860B] hover:bg-[#9A7209]"
                      onClick={() => {
                        handleStartRound(viewingRound.id)
                        setIsViewDialogOpen(false)
                      }}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Demarrer la tournee
                    </Button>
                  )}
                  {viewingRound.status === 'in_progress' && (
                    <>
                      <Button
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => {
                          startLiveTracking(viewingRound)
                        }}
                      >
                        <Locate className="h-4 w-4 mr-2" />
                        Suivre en direct
                      </Button>
                      <Button
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => {
                          handleCompleteRound(viewingRound.id)
                          setIsViewDialogOpen(false)
                        }}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Terminer la tournee
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Live Tracking Modal */}
        {isLiveTrackingOpen && trackingRound && (
          <div className="fixed inset-0 z-[9999] bg-black">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-[10000] bg-gradient-to-b from-black/80 to-transparent p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-white rounded-lg shadow-lg px-4 py-2">
                    <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                      <Truck className="h-5 w-5 text-[#B8860B]" />
                      Tournée {trackingRound.round_number}
                    </h3>
                  </div>
                  {trackingRound.driver && (
                    <div className="bg-white rounded-lg shadow-lg px-4 py-2">
                      <p className="text-sm flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        {trackingRound.driver.full_name}
                      </p>
                    </div>
                  )}
                  {isTracking && (
                    <div className="bg-green-500 text-white rounded-full px-4 py-2 flex items-center gap-2 animate-pulse">
                      <Radio className="h-4 w-4" />
                      GPS Actif
                    </div>
                  )}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={closeLiveTracking}
                  className="bg-white hover:bg-gray-100 shadow-lg"
                >
                  <X className="h-4 w-4 mr-1" />
                  Fermer
                </Button>
              </div>
            </div>

            {/* Map */}
            <RouteMap
              points={trackingRound.delivery_round_items
                ?.sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0))
                .map((item, index) => ({
                  lat: item.delivery?.client?.gps_lat || 0,
                  lng: item.delivery?.client?.gps_lng || 0,
                  label: `${item.delivery?.client?.code || ''} - ${item.delivery?.client?.name || ''}`,
                  order: item.sequence_order || index + 1
                }))
                .filter(p => p.lat !== 0 && p.lng !== 0) || []
              }
              depot={companySettings?.depot_lat && companySettings?.depot_lng ? {
                lat: companySettings.depot_lat,
                lng: companySettings.depot_lng
              } : null}
              height="100vh"
              driverPosition={driverPosition}
              showDriverPath={true}
              driverPath={driverPath}
            />

            {/* Driver Info Panel */}
            <div className="absolute bottom-4 left-4 right-4 z-[10000]">
              <div className="bg-white rounded-xl shadow-2xl p-4 max-w-lg">
                {trackingError ? (
                  <div className="flex items-center gap-3 text-red-600">
                    <XCircle className="h-6 w-6" />
                    <div>
                      <p className="font-medium">Erreur GPS</p>
                      <p className="text-sm">{trackingError}</p>
                    </div>
                    <Button size="sm" onClick={() => startLiveTracking(trackingRound)} className="ml-auto">
                      Réessayer
                    </Button>
                  </div>
                ) : driverPosition ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white">
                          <Truck className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">Position du livreur</p>
                          <p className="text-sm text-gray-500">
                            {driverPosition.timestamp && new Date(driverPosition.timestamp).toLocaleTimeString('fr-FR')}
                          </p>
                        </div>
                      </div>
                      {driverPosition.speed !== undefined && driverPosition.speed > 0 && (
                        <div className="text-right">
                          <p className="text-2xl font-bold text-[#B8860B]">
                            {Math.round(driverPosition.speed * 3.6)} km/h
                          </p>
                          <p className="text-xs text-gray-500">Vitesse</p>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-gray-500">Latitude</p>
                        <p className="font-mono font-medium">{driverPosition.lat.toFixed(6)}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-gray-500">Longitude</p>
                        <p className="font-mono font-medium">{driverPosition.lng.toFixed(6)}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-gray-500">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                    <p>Recherche de la position GPS...</p>
                  </div>
                )}

                {/* Legend */}
                <div className="flex items-center gap-6 mt-4 pt-4 border-t text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center border-2 border-white shadow">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                      </svg>
                    </div>
                    <span>Dépôt</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white border-2 border-white shadow">
                      <Truck className="h-3.5 w-3.5" />
                    </div>
                    <span>Livreur</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow">
                      1
                    </div>
                    <span>Client</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Dialog */}
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-green-600" />
                Encaisser - {paymentDelivery?.delivery_number}
              </DialogTitle>
            </DialogHeader>
            {paymentDelivery && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Client:</span>
                    <span className="font-medium">{paymentDelivery.client?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Recette BL:</span>
                    <span className="font-medium">{formatPrice(getRecetteBL(paymentDelivery))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Deja paye:</span>
                    <span className="font-medium text-green-600">{formatPrice(paymentDelivery.amount_paid || 0)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span className="text-red-600">Reste a payer:</span>
                    <span className="text-red-600">{formatPrice(Math.max(0, getRecetteBL(paymentDelivery) - (paymentDelivery.amount_paid || 0)))}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="payment_amount">Montant</Label>
                    <Input
                      id="payment_amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                      className="text-lg font-bold"
                    />
                  </div>
                  <div>
                    <Label>Mode de paiement</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Especes</SelectItem>
                        <SelectItem value="check">Cheque</SelectItem>
                        <SelectItem value="transfer">Virement</SelectItem>
                        <SelectItem value="card">Carte</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setIsPaymentDialogOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleSubmitPayment}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={paymentAmount <= 0}
                  >
                    <Wallet className="h-4 w-4 mr-2" />
                    Encaisser
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
