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

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  delivered: 'bg-green-100 text-green-800',
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
  paid: 'bg-green-100 text-green-800',
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

export default function LivraisonsPage() {
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
    setEditItems(editItems.map(item =>
      item.id === itemId ? { ...item, [field]: value } : item
    ))
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
  const handleOpenPayment = async (delivery: Delivery) => {
    setPaymentDelivery(delivery)
    const totalTTC = (delivery.total_ht || 0) * 1.2
    const balanceDue = delivery.balance_due ?? totalTTC

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

      // Update delivery payment status
      const totalTTC = (paymentDelivery.total_ht || 0) * 1.2
      const currentPaid = (paymentDelivery.amount_paid || 0) + paymentFormData.amount
      const newBalance = Math.max(0, totalTTC - currentPaid)
      const newStatus = newBalance <= 0 ? 'paid' : currentPaid > 0 ? 'partial' : 'pending'

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('deliveries') as any)
        .update({
          amount_paid: currentPaid,
          balance_due: newBalance,
          payment_status: newStatus,
          total_ttc: totalTTC,
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Livraisons</h1>
            <p className="text-gray-500">Gerez vos bons de livraison</p>
          </div>

          <div className="flex gap-2">
            {selectedDeliveries.size > 0 && (
              <>
                <Button
                  variant="outline"
                  onClick={clearSelection}
                  className="gap-2"
                >
                  Annuler ({selectedDeliveries.size})
                </Button>
                <Button
                  variant="outline"
                  onClick={getCurrentLocation}
                  disabled={isGettingLocation}
                  className={`gap-2 ${useCurrentLocation ? 'border-green-500 text-green-600' : ''}`}
                  title={useCurrentLocation ? 'Position actuelle utilisée' : 'Utiliser ma position'}
                >
                  {isGettingLocation ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : useCurrentLocation ? (
                    <Navigation className="h-4 w-4 text-green-600" />
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
                  className="bg-blue-600 hover:bg-blue-700 gap-2"
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

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <ProtectedModule module="livraisons" action="create">
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      resetForm()
                      setIsDialogOpen(true)
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Nouveau BL
                  </Button>
                </ProtectedModule>
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
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button type="submit" className="bg-green-600 hover:bg-green-700">
                      Creer le BL
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
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
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                En attente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-yellow-600">
                {pendingCount}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Livrees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-green-600">
                {deliveredCount}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                CA Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-green-600" />
                <span className="text-xl font-bold text-green-600">
                  {formatPrice(totalCA)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par N BL ou client..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-44"
                placeholder="Filtrer par date"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="in_progress">En cours</SelectItem>
                  <SelectItem value="delivered">Livree</SelectItem>
                  <SelectItem value="partial">Partielle</SelectItem>
                  <SelectItem value="returned">Retournee</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={selectAllPending} className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Selectionner en attente
              </Button>
              <Button variant="ghost" size="icon" onClick={fetchData} title="Actualiser">
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadError ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 mb-4">{loadError}</p>
                <Button onClick={fetchData} variant="outline">
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedDeliveries.size === filteredDeliveries.length && filteredDeliveries.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedDeliveries(new Set(filteredDeliveries.map(d => d.id)))
                          } else {
                            setSelectedDeliveries(new Set())
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>N BL</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Ville</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Paiement</TableHead>
                    <TableHead className="text-right">Total TTC</TableHead>
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
                        <Checkbox
                          checked={selectedDeliveries.has(delivery.id)}
                          onCheckedChange={() => toggleDeliverySelection(delivery.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{delivery.delivery_number}</TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{delivery.client?.code}</span>
                          <span className="text-gray-500 ml-2">{delivery.client?.name}</span>
                          {delivery.client?.gps_lat && (
                            <span title="GPS disponible"><MapPin className="inline h-3 w-3 text-green-500 ml-1" /></span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {delivery.client?.city || '-'}
                      </TableCell>
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
                        {formatPrice((delivery.total_ht || 0) * 1.2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-semibold ${(delivery.balance_due || (delivery.total_ht || 0) * 1.2) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatPrice(delivery.balance_due ?? (delivery.total_ht || 0) * 1.2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenPayment(delivery)}
                            title="Encaisser"
                            className={delivery.payment_status === 'paid' ? 'opacity-50' : ''}
                          >
                            <Wallet className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDelivery(delivery)}
                            title="Voir details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditDelivery(delivery)}
                            title="Modifier"
                          >
                            <Pencil className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleGeneratePDF(delivery)}
                            title="Telecharger BL"
                          >
                            <FileText className="h-4 w-4 text-purple-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteDelivery(delivery.id, delivery.delivery_number)}
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
            <div className="mt-4 text-sm text-gray-500 text-right">
              {filteredDeliveries.length} livraison(s) affichee(s)
              {selectedDeliveries.size > 0 && ` - ${selectedDeliveries.size} selectionnee(s)`}
            </div>
          </CardContent>
        </Card>

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
                        <TableHead className="text-center">Qte</TableHead>
                        <TableHead className="text-right">Prix Unit.</TableHead>
                        <TableHead className="text-right">Total</TableHead>
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
                            {item.quantity_delivered}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatPrice(item.unit_price)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatPrice(item.quantity_delivered * item.unit_price)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total HT:</span>
                      <span className="font-medium">{formatPrice(viewDelivery.total_ht)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">TVA (20%):</span>
                      <span className="font-medium">{formatPrice((viewDelivery.total_ht || 0) * 0.2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Total TTC:</span>
                      <span className="text-green-600">{formatPrice((viewDelivery.total_ht || 0) * 1.2)}</span>
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
                        <SelectItem value="delivered">Livree</SelectItem>
                        <SelectItem value="partial">Partielle</SelectItem>
                        <SelectItem value="returned">Retournee</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleGeneratePDF(viewDelivery)}
                      className="gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Telecharger BL
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsViewDialogOpen(false)}
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
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <MapPin className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-600">{optimizedRoute.totalDistance} km</p>
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
                <div className={`text-center text-sm py-2 px-4 rounded-lg ${optimizedRoute.usingGoogle ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
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
                          <p className="font-semibold text-green-600">{formatPrice(delivery.total_ht)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setIsRouteDialogOpen(false)}
                  >
                    Fermer
                  </Button>
                  <Button
                    onClick={generateRouteSheet}
                    className="bg-blue-600 hover:bg-blue-700 gap-2"
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
                        <SelectItem value="delivered">Livree</SelectItem>
                        <SelectItem value="partial">Partielle</SelectItem>
                        <SelectItem value="returned">Retournee</SelectItem>
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
                            {formatPrice(item.quantity_delivered * item.unit_price)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-64 space-y-2 bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total HT:</span>
                      <span className="font-medium">
                        {formatPrice(editItems.reduce((sum, item) => sum + (item.quantity_delivered * item.unit_price), 0))}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">TVA (20%):</span>
                      <span className="font-medium">
                        {formatPrice(editItems.reduce((sum, item) => sum + (item.quantity_delivered * item.unit_price), 0) * 0.2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Total TTC:</span>
                      <span className="text-green-600">
                        {formatPrice(editItems.reduce((sum, item) => sum + (item.quantity_delivered * item.unit_price), 0) * 1.2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleSaveEdit}
                    className="bg-green-600 hover:bg-green-700"
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
                <Wallet className="h-5 w-5 text-green-600" />
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
                        <span className="text-gray-600">Total TTC:</span>
                        <span className="font-medium">{formatPrice((paymentDelivery.total_ht || 0) * 1.2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Deja paye:</span>
                        <span className="font-medium text-green-600">{formatPrice(paymentDelivery.amount_paid || 0)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold border-t pt-1">
                        <span className="text-red-600">Reste a payer:</span>
                        <span className="text-red-600">{formatPrice(paymentDelivery.balance_due ?? (paymentDelivery.total_ht || 0) * 1.2)}</span>
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
                          <span className="font-medium text-green-600">{formatPrice(payment.amount)}</span>
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
                      variant="outline"
                      size="sm"
                      onClick={() => setPaymentFormData({ ...paymentFormData, amount: paymentDelivery.balance_due ?? (paymentDelivery.total_ht || 0) * 1.2 })}
                    >
                      Tout payer
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPaymentFormData({ ...paymentFormData, amount: (paymentDelivery.balance_due ?? (paymentDelivery.total_ht || 0) * 1.2) / 2 })}
                    >
                      50%
                    </Button>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsPaymentDialogOpen(false)}
                    >
                      Annuler
                    </Button>
                    <Button
                      type="submit"
                      className="bg-green-600 hover:bg-green-700 gap-2"
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
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                Paiement enregistre!
              </DialogTitle>
            </DialogHeader>
            {lastPayment && paymentDelivery && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <p className="text-sm text-green-700">Recu N</p>
                  <p className="text-2xl font-bold text-green-800">{lastPayment.payment_number}</p>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Montant recu:</span>
                    <span className="font-bold text-green-600">{formatPrice(lastPayment.amount)}</span>
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
                  (paymentDelivery.balance_due ?? 0) - lastPayment.amount > 0
                    ? 'bg-orange-50 border border-orange-200'
                    : 'bg-green-50 border border-green-200'
                }`}>
                  <p className="text-sm text-gray-600">Reste a payer</p>
                  <p className={`text-2xl font-bold ${
                    Math.max(0, (paymentDelivery.balance_due ?? (paymentDelivery.total_ht || 0) * 1.2) - lastPayment.amount) > 0
                      ? 'text-orange-600'
                      : 'text-green-600'
                  }`}>
                    {formatPrice(Math.max(0, (paymentDelivery.balance_due ?? (paymentDelivery.total_ht || 0) * 1.2) - lastPayment.amount))}
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsReceiptDialogOpen(false)}
                    className="flex-1"
                  >
                    Fermer
                  </Button>
                  <Button
                    onClick={printReceipt}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 gap-2"
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
