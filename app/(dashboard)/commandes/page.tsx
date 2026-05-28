'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ProtectedModule } from '@/components/auth/ProtectedModule'
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Eye, ShoppingCart, Trash2, FileText, Truck, Download, Users, Package, Check, ChevronsUpDown, Pencil } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { generateInvoicePDF, generateDeliveryNotePDF } from '@/lib/pdf/invoice'
import { useCompanySettings } from '@/hooks/useCompanySettings'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

interface OrderItemDB {
  id: string
  article_id: string
  quantity: number
  unit_price: number
  total_ht: number
  article: {
    code: string
    name: string
    description: string | null
  }
}

interface ClientDB {
  id: string
  code: string
  name: string
  contact_name: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
}

interface Order {
  id: string
  order_number: string
  client_id: string
  status: string
  order_date: string
  total_ht: number
  total_tva: number
  total_ttc: number
  notes: string | null
  created_at: string
  client?: ClientDB
  order_items?: OrderItemDB[]
}

interface Client {
  id: string
  code: string
  name: string
  phone: string | null
}

interface Article {
  id: string
  code: string
  name: string
  description: string | null
  price_ht: number
  tva_rate: number
}

interface OrderItem {
  article_id: string
  article_code: string
  article_name: string
  article_description: string | null
  quantity: number
  unit_price: number
  total_ht: number
  lot_id?: string
  lot_number?: string
}

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  confirmed: 'bg-blue-100 text-blue-800',
  in_preparation: 'bg-yellow-100 text-yellow-800',
  ready: 'bg-amber-100 text-[#9A7209]',
  in_delivery: 'bg-purple-100 text-purple-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  partial: 'bg-orange-100 text-orange-800',
  returned: 'bg-pink-100 text-pink-800',
  cancelled: 'bg-red-100 text-red-800',
  out_of_stock: 'bg-slate-100 text-slate-800',
  in_progress: 'bg-cyan-100 text-cyan-800',
}

const statusLabels: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  in_preparation: 'En préparation',
  ready: 'Prête',
  in_delivery: 'En livraison',
  delivered: 'Livrée',
  partial: 'Partiellement livrée',
  returned: 'Retournée',
  cancelled: 'Annulée',
  out_of_stock: 'Rupture de stock',
  in_progress: 'En cours',
}

interface ClientPrice {
  article_id: string
  custom_price: number
}

interface Lot {
  id: string
  lot_number: string
  olive_type: string
  state: string
  remaining_quantity_kg: number | null
}

interface StockByLot {
  id: string
  article_id: string
  lot_id: string | null
  quantity: number
  lot?: {
    id: string
    lot_number: string
  }
  article?: {
    code: string
    name: string
  }
}

export default function CommandesPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [lots, setLots] = useState<Lot[]>([])
  const [stockByLot, setStockByLot] = useState<StockByLot[]>([])
  const [clientPrices, setClientPrices] = useState<ClientPrice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [editFormData, setEditFormData] = useState({
    client_id: '',
    order_date: '',
    notes: '',
    status: 'pending',
  })
  const [editOrderItems, setEditOrderItems] = useState<OrderItem[]>([])
  const supabase = createClient()
  const router = useRouter()
  const { companySettings } = useCompanySettings()
  const { profile } = useAuth()
  const isLivreur = profile?.role?.name === 'livreur'

  const [formData, setFormData] = useState({
    client_id: '',
    order_date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [selectedArticle, setSelectedArticle] = useState('')
  const [selectedQuantity, setSelectedQuantity] = useState('1')
  const [selectedLot, setSelectedLot] = useState('')

  // Combobox open states
  const [clientOpen, setClientOpen] = useState(false)
  const [articleOpen, setArticleOpen] = useState(false)

  // Edit dialog combobox states
  const [editClientOpen, setEditClientOpen] = useState(false)
  const [editArticleOpen, setEditArticleOpen] = useState(false)
  const [editSelectedArticle, setEditSelectedArticle] = useState('')
  const [editSelectedQuantity, setEditSelectedQuantity] = useState('1')
  const [editClientPrices, setEditClientPrices] = useState<ClientPrice[]>([])

  const fetchOrders = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        client:clients(*),
        order_items(
          *,
          article:articles(code, name, description)
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching orders:', error)
    } else {
      setOrders(data || [])
    }
    setIsLoading(false)
  }

  const fetchClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, code, name, phone')
      .eq('is_active', true)
      .order('code')
    setClients(data || [])
  }

  const fetchArticles = async () => {
    const { data } = await supabase
      .from('articles')
      .select('id, code, name, description, price_ht, tva_rate')
      .eq('is_active', true)
      .order('code')
    setArticles(data || [])
  }

  const fetchLots = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('lots') as any)
      .select('id, lot_number, olive_type, state, remaining_quantity_kg')
      .neq('state', 'epuise')
      .eq('is_active', true)
      .order('purchase_date', { ascending: false })
    setLots(data || [])
  }

  const fetchStockByLot = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('stock') as any)
      .select(`
        id,
        article_id,
        lot_id,
        quantity,
        lot:lots(id, lot_number),
        article:articles(code, name)
      `)
      .gt('quantity', 0)
      .order('quantity', { ascending: false })
    setStockByLot(data || [])
  }

  // Get available stock for an article+lot combination
  const getAvailableStock = (articleId: string, lotId: string | null): number => {
    const stock = stockByLot.find(s =>
      s.article_id === articleId &&
      (s.lot_id === lotId || (!s.lot_id && !lotId))
    )
    return stock?.quantity || 0
  }

  // Get lots that have stock for a specific article
  const getLotsWithStockForArticle = (articleId: string): StockByLot[] => {
    return stockByLot.filter(s => s.article_id === articleId && s.quantity > 0)
  }

  const fetchClientPrices = async (clientId: string) => {
    if (!clientId) {
      setClientPrices([])
      return
    }
    const { data } = await supabase
      .from('client_prices')
      .select('article_id, custom_price')
      .eq('client_id', clientId)
    setClientPrices(data || [])
  }

  // Get price for an article (client price if exists, otherwise default)
  const getArticlePrice = (articleId: string): number => {
    const clientPrice = clientPrices.find(cp => cp.article_id === articleId)
    if (clientPrice) return clientPrice.custom_price
    const article = articles.find(a => a.id === articleId)
    return article?.price_ht || 0
  }

  useEffect(() => {
    fetchOrders()
    fetchClients()
    fetchArticles()
    fetchLots()
    fetchStockByLot()
  }, [])

  // Fetch client prices when client changes
  useEffect(() => {
    if (formData.client_id) {
      fetchClientPrices(formData.client_id)
    } else {
      setClientPrices([])
    }
  }, [formData.client_id])

  const generateOrderNumber = async (): Promise<string> => {
    // Query database for all order numbers and find the max numerically
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('orders') as any)
      .select('order_number')
      .like('order_number', 'BCC%')

    if (data && data.length > 0) {
      const numbers = data
        .map((d: { order_number: string }) => parseInt(d.order_number.replace('BCC', '')))
        .filter((n: number) => !isNaN(n))

      if (numbers.length > 0) {
        const maxNum = Math.max(...numbers)
        return `BCC${maxNum + 1}`
      }
    }
    return `BCC${401}`
  }

  const addItem = () => {
    if (!selectedArticle || !selectedQuantity) return

    const article = articles.find(a => a.id === selectedArticle)
    if (!article) return

    const lot = selectedLot ? lots.find(l => l.id === selectedLot) : null
    const quantity = parseInt(selectedQuantity)

    // Vérifier le stock disponible
    const availableStock = getAvailableStock(selectedArticle, selectedLot || null)

    // Calculer la quantité déjà ajoutée pour cet article+lot dans la commande
    const alreadyOrdered = orderItems
      .filter(item => item.article_id === selectedArticle && (item.lot_id || '') === (selectedLot || ''))
      .reduce((sum, item) => sum + item.quantity, 0)

    const totalRequestedQty = alreadyOrdered + quantity

    if (availableStock > 0 && totalRequestedQty > availableStock) {
      const remainingStock = availableStock - alreadyOrdered
      alert(`Stock insuffisant!\n\nStock disponible: ${availableStock}\nDéjà commandé: ${alreadyOrdered}\nRestant: ${remainingStock}\nQuantité demandée: ${quantity}`)
      return
    }

    const unitPrice = getArticlePrice(selectedArticle)
    const total_ht = unitPrice * quantity

    setOrderItems([...orderItems, {
      article_id: article.id,
      article_code: article.code,
      article_name: article.name,
      article_description: article.description,
      quantity,
      unit_price: unitPrice,
      total_ht,
      lot_id: lot?.id,
      lot_number: lot?.lot_number,
    }])

    setSelectedArticle('')
    setSelectedQuantity('1')
    setSelectedLot('')
  }

  const removeItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.client_id || orderItems.length === 0) {
      alert('Veuillez selectionner un client et ajouter au moins un article')
      return
    }

    const total_ht = orderItems.reduce((sum, item) => sum + item.total_ht, 0)
    const total_tva = total_ht * 0.2 // 20% TVA
    const total_ttc = total_ht + total_tva

    // Generate unique order number from database
    const orderNumber = await generateOrderNumber()

    // Create order
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: orderData, error: orderError } = await (supabase.from('orders') as any)
      .insert([{
        order_number: orderNumber,
        client_id: formData.client_id,
        order_date: formData.order_date,
        status: 'pending',
        total_ht,
        total_tva,
        total_ttc,
        notes: formData.notes || null,
      }])
      .select()
      .single()

    if (orderError) {
      console.error('Error creating order:', orderError)
      alert(`Erreur lors de la création: ${orderError.message || orderError.code || JSON.stringify(orderError)}`)
      return
    }

    if (!orderData) {
      console.error('No order data returned')
      alert('Erreur: Aucune donnée retournée lors de la création')
      return
    }

    // Create order items
    const itemsToInsert = orderItems.map(item => ({
      order_id: orderData.id,
      article_id: item.article_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_percent: 0,
      total_ht: item.total_ht,
      lot_id: item.lot_id || null,
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('order_items') as any).insert(itemsToInsert)

    fetchOrders()
    setIsDialogOpen(false)
    resetForm()
  }

  const handleViewOrder = (order: Order) => {
    setViewingOrder(order)
    setIsViewDialogOpen(true)
  }

  const handleGenerateInvoice = (order: Order) => {
    if (!order.client || !order.order_items) {
      alert('Donnees de commande incompletes')
      return
    }

    const pdfOrder = {
      id: order.id,
      order_number: order.order_number,
      order_date: order.order_date,
      status: order.status,
      total_ht: order.total_ht || 0,
      total_tva: order.total_tva || 0,
      total_ttc: order.total_ttc || 0,
      notes: order.notes,
      client: {
        code: order.client.code,
        name: order.client.name,
        contact_name: order.client.contact_name,
        phone: order.client.phone,
        email: order.client.email,
        address: order.client.address,
        city: order.client.city,
      },
      order_items: order.order_items.map(item => ({
        article: {
          code: item.article?.code || '',
          name: item.article?.name || '',
          description: item.article?.description || null,
        },
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_ht: item.total_ht,
      })),
    }

    generateInvoicePDF(pdfOrder, companySettings)
  }

  const generateDeliveryNumber = () => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `BL-${year}${month}-${random}`
  }

  const handleCreateDelivery = async (order: Order) => {
    if (!order.client || !order.order_items) {
      alert('Donnees de commande incompletes')
      return
    }

    // Check if a delivery already exists for this order
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingDeliveries } = await (supabase.from('deliveries') as any)
      .select('id, delivery_number')
      .eq('order_id', order.id)

    if (existingDeliveries && existingDeliveries.length > 0) {
      alert(`Un BL existe déjà pour cette commande: ${existingDeliveries[0].delivery_number}`)
      return
    }

    // Create the delivery
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newDelivery, error } = await (supabase.from('deliveries') as any).insert([{
      delivery_number: generateDeliveryNumber(),
      order_id: order.id,
      client_id: order.client_id,
      delivery_date: new Date().toISOString().split('T')[0],
      status: 'pending',
      total_ht: order.total_ht || 0,
      notes: order.notes || null,
    }]).select().single()

    if (error) {
      console.error('Error creating delivery:', error)
      alert(`Erreur lors de la création du BL: ${error.message || JSON.stringify(error)}`)
      return
    }

    // Copy order items to delivery items
    if (order.order_items && order.order_items.length > 0 && newDelivery) {
      const deliveryItems = order.order_items.map(item => ({
        delivery_id: newDelivery.id,
        article_id: item.article_id,
        quantity_ordered: item.quantity,
        quantity_delivered: item.quantity,
        quantity_returned: 0,
        unit_price: item.unit_price,
      }))

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: itemsError } = await (supabase.from('delivery_items') as any).insert(deliveryItems)

      if (itemsError) {
        console.error('Error creating delivery items:', itemsError)
      }
    }

    // Update order status to in_delivery
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('orders') as any)
      .update({ status: 'in_delivery' })
      .eq('id', order.id)

    alert(`BL créé avec succès: ${newDelivery.delivery_number}`)
    setIsViewDialogOpen(false)
    fetchOrders()
    router.push('/livraisons')
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('orders') as any)
      .update({ status: newStatus })
      .eq('id', orderId)

    if (!error) {
      fetchOrders()
      if (viewingOrder?.id === orderId) {
        setViewingOrder({ ...viewingOrder, status: newStatus })
      }
    }
  }

  const handleDeleteOrder = async (orderId: string, orderNumber: string) => {
    // Vérifier s'il y a des BL liés à cette commande
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: linkedDeliveries } = await (supabase.from('deliveries') as any)
      .select('id, delivery_number')
      .eq('order_id', orderId)

    if (linkedDeliveries && linkedDeliveries.length > 0) {
      const blNumbers = linkedDeliveries.map((d: any) => d.delivery_number).join(', ')
      const confirmDelete = confirm(
        `Cette commande est liée à ${linkedDeliveries.length} BL(s): ${blNumbers}.\n\n` +
        `Voulez-vous supprimer la commande ET les BL associés ?`
      )
      if (!confirmDelete) return

      // Supprimer les delivery_items et deliveries liés
      for (const delivery of linkedDeliveries) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('delivery_items') as any).delete().eq('delivery_id', delivery.id)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('deliveries') as any).delete().eq('id', delivery.id)
      }
    } else {
      if (!confirm(`Êtes-vous sûr de vouloir supprimer la commande ${orderNumber} ?`)) {
        return
      }
    }

    // Supprimer les order_items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('order_items') as any).delete().eq('order_id', orderId)

    // Supprimer la commande
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('orders') as any).delete().eq('id', orderId)

    if (error) {
      console.error('Error deleting order:', error)
      if (error.code === '23503') {
        alert('Impossible de supprimer cette commande car elle est liée à d\'autres documents (ventes, factures, etc.)')
      } else {
        alert(`Erreur lors de la suppression: ${error.message}`)
      }
    } else {
      fetchOrders()
      if (viewingOrder?.id === orderId) {
        setIsViewDialogOpen(false)
      }
    }
  }

  const handleCreateBL = async (order: Order) => {
    if (!confirm(`Créer un Bon de Livraison pour la commande ${order.order_number} ?`)) return

    // Générer le numéro BL
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    const deliveryNumber = `BL-${year}${month}-${random}`

    // Créer le BL
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newDelivery, error } = await (supabase.from('deliveries') as any).insert([{
      delivery_number: deliveryNumber,
      order_id: order.id,
      client_id: order.client_id,
      delivery_date: new Date().toISOString().split('T')[0],
      status: 'pending',
      total_ht: order.total_ht || 0,
      notes: `BL créé depuis commande ${order.order_number}`,
    }]).select().single()

    if (error) {
      console.error('Error creating delivery:', error)
      alert('Erreur lors de la création du BL')
      return
    }

    // Copier les order_items en delivery_items
    if (newDelivery && order.order_items && order.order_items.length > 0) {
      const deliveryItems = order.order_items.map((item) => ({
        delivery_id: newDelivery.id,
        article_id: item.article_id,
        quantity_ordered: item.quantity,
        quantity_delivered: item.quantity,
        quantity_returned: 0,
        unit_price: item.unit_price,
      }))

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: itemsError } = await (supabase.from('delivery_items') as any).insert(deliveryItems)
      if (itemsError) {
        console.error('Error creating delivery items:', itemsError)
      }
    }

    alert(`BL ${deliveryNumber} créé avec succès`)
    router.push('/livraisons')
  }

  const handleChangeStatus = async (orderId: string, newStatus: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('orders') as any)
      .update({ status: newStatus })
      .eq('id', orderId)

    if (error) {
      console.error('Error updating status:', error)
      alert('Erreur lors du changement de statut')
    } else {
      fetchOrders()
    }
  }

  const resetForm = () => {
    setFormData({
      client_id: '',
      order_date: new Date().toISOString().split('T')[0],
      notes: '',
    })
    setOrderItems([])
    setSelectedArticle('')
    setSelectedQuantity('1')
  }

  // Edit order functions
  const fetchEditClientPrices = async (clientId: string) => {
    if (!clientId) {
      setEditClientPrices([])
      return
    }
    const { data } = await supabase
      .from('client_prices')
      .select('article_id, custom_price')
      .eq('client_id', clientId)
    setEditClientPrices(data || [])
  }

  const getEditArticlePrice = (articleId: string): number => {
    const clientPrice = editClientPrices.find(cp => cp.article_id === articleId)
    if (clientPrice) return clientPrice.custom_price
    const article = articles.find(a => a.id === articleId)
    return article?.price_ht || 0
  }

  const handleEditOrder = async (order: Order) => {
    setEditingOrder(order)
    setEditFormData({
      client_id: order.client_id,
      order_date: order.order_date,
      notes: order.notes || '',
      status: order.status,
    })

    // Convert order items to editable format
    const items: OrderItem[] = (order.order_items || []).map(item => ({
      article_id: item.article_id,
      article_code: item.article?.code || '',
      article_name: item.article?.name || '',
      article_description: item.article?.description || null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_ht: item.total_ht,
    }))
    setEditOrderItems(items)

    // Fetch client prices
    await fetchEditClientPrices(order.client_id)

    setIsEditDialogOpen(true)
  }

  const addEditItem = () => {
    if (!editSelectedArticle || !editSelectedQuantity) return

    const article = articles.find(a => a.id === editSelectedArticle)
    if (!article) return

    const quantity = parseInt(editSelectedQuantity)
    const unitPrice = getEditArticlePrice(editSelectedArticle)
    const total_ht = unitPrice * quantity

    setEditOrderItems([...editOrderItems, {
      article_id: article.id,
      article_code: article.code,
      article_name: article.name,
      article_description: article.description,
      quantity,
      unit_price: unitPrice,
      total_ht,
    }])

    setEditSelectedArticle('')
    setEditSelectedQuantity('1')
  }

  const removeEditItem = (index: number) => {
    setEditOrderItems(editOrderItems.filter((_, i) => i !== index))
  }

  const updateEditItemQuantity = (index: number, newQuantity: number) => {
    const updatedItems = [...editOrderItems]
    updatedItems[index].quantity = newQuantity
    updatedItems[index].total_ht = updatedItems[index].unit_price * newQuantity
    setEditOrderItems(updatedItems)
  }

  const updateEditItemPrice = (index: number, newPrice: number) => {
    const updatedItems = [...editOrderItems]
    updatedItems[index].unit_price = newPrice
    updatedItems[index].total_ht = newPrice * updatedItems[index].quantity
    setEditOrderItems(updatedItems)
  }

  const handleSaveEdit = async () => {
    if (!editingOrder) return

    if (!editFormData.client_id || editOrderItems.length === 0) {
      alert('Veuillez selectionner un client et ajouter au moins un article')
      return
    }

    const total_ht = editOrderItems.reduce((sum, item) => sum + item.total_ht, 0)
    const total_tva = total_ht * 0.2
    const total_ttc = total_ht + total_tva

    // Update order
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: orderError } = await (supabase.from('orders') as any)
      .update({
        client_id: editFormData.client_id,
        order_date: editFormData.order_date,
        notes: editFormData.notes || null,
        status: editFormData.status,
        total_ht,
        total_tva,
        total_ttc,
      })
      .eq('id', editingOrder.id)

    if (orderError) {
      console.error('Error updating order:', orderError)
      alert(`Erreur lors de la modification: ${orderError.message || JSON.stringify(orderError)}`)
      return
    }

    // Delete existing order items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('order_items') as any).delete().eq('order_id', editingOrder.id)

    // Insert new order items
    const itemsToInsert = editOrderItems.map(item => ({
      order_id: editingOrder.id,
      article_id: item.article_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_percent: 0,
      total_ht: item.total_ht,
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('order_items') as any).insert(itemsToInsert)

    fetchOrders()
    setIsEditDialogOpen(false)
    setEditingOrder(null)
  }

  // Handle client change in edit mode
  const handleEditClientChange = async (newClientId: string) => {
    setEditFormData({ ...editFormData, client_id: newClientId })
    await fetchEditClientPrices(newClientId)
  }

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.client?.code?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
    }).format(price || 0)
  }

  return (
    <ProtectedModule module="commandes">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Commandes</h1>
            <p className="text-gray-500">Gerez vos commandes clients</p>
          </div>

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
                Nouvelle commande
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nouvelle commande</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Client *</Label>
                    <Popover open={clientOpen} onOpenChange={setClientOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={clientOpen}
                          className="w-full justify-between bg-[#F5E6C8]"
                        >
                          {formData.client_id
                            ? clients.find((c) => c.id === formData.client_id)?.name || "Client selectionne"
                            : "Rechercher un client..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Rechercher par nom ou code..." />
                          <CommandList>
                            <CommandEmpty>Aucun client trouve.</CommandEmpty>
                            <CommandGroup>
                              {clients.map((client) => (
                                <CommandItem
                                  key={client.id}
                                  value={`${client.code} ${client.name}`}
                                  onSelect={() => {
                                    setFormData({ ...formData, client_id: client.id })
                                    setClientOpen(false)
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      formData.client_id === client.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <span className="font-medium">{client.code}</span>
                                  <span className="ml-2 text-gray-600">{client.name}</span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="order_date">Date de commande</Label>
                    <Input
                      id="order_date"
                      type="date"
                      value={formData.order_date}
                      onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                      className="bg-[#F5E6C8]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Notes sur la commande"
                    className="bg-[#F5E6C8]"
                  />
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium mb-3">
                    Articles
                    {clientPrices.length > 0 && (
                      <Badge className="ml-2 bg-amber-100 text-[#9A7209]">
                        {clientPrices.length} prix personnalises
                      </Badge>
                    )}
                    {selectedArticle && (
                      <Badge className="ml-2 bg-blue-100 text-blue-800">
                        Stock total: {getLotsWithStockForArticle(selectedArticle).reduce((sum, s) => sum + s.quantity, 0)}
                      </Badge>
                    )}
                  </h3>
                  <div className="flex gap-2 mb-4 flex-wrap">
                    <Popover open={articleOpen} onOpenChange={setArticleOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={articleOpen}
                          className="flex-1 min-w-[200px] justify-between bg-[#F5E6C8]"
                        >
                          {selectedArticle
                            ? (() => {
                                const article = articles.find((a) => a.id === selectedArticle)
                                if (!article) return "Article selectionne"
                                return `${article.code} - ${article.name}`
                              })()
                            : "Rechercher un article..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[500px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Rechercher par code ou nom..." />
                          <CommandList>
                            <CommandEmpty>Aucun article trouve.</CommandEmpty>
                            <CommandGroup>
                              {articles.map((article) => {
                                const articleStock = getLotsWithStockForArticle(article.id)
                                const totalStock = articleStock.reduce((sum, s) => sum + s.quantity, 0)
                                return (
                                  <CommandItem
                                    key={article.id}
                                    value={`${article.code} ${article.name}`}
                                    onSelect={() => {
                                      setSelectedArticle(article.id)
                                      setSelectedLot('') // Reset lot selection when article changes
                                      setArticleOpen(false)
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedArticle === article.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <span className="font-medium">{article.code}</span>
                                    <span className="ml-2 text-gray-600 flex-1">{article.name}</span>
                                    <span className={cn(
                                      "ml-2 text-xs px-2 py-0.5 rounded-full",
                                      totalStock > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                    )}>
                                      {totalStock > 0 ? `${totalStock} dispo` : 'Rupture'}
                                    </span>
                                  </CommandItem>
                                )
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <Select
                      value={selectedLot || 'none'}
                      onValueChange={(value) => setSelectedLot(value === 'none' ? '' : value)}
                    >
                      <SelectTrigger className="w-[250px] bg-[#F5E6C8]">
                        <SelectValue placeholder="N° Lot (stock)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sans lot</SelectItem>
                        {selectedArticle ? (
                          // Afficher les lots avec stock pour l'article sélectionné
                          getLotsWithStockForArticle(selectedArticle).map((stock) => (
                            <SelectItem key={stock.lot_id || 'no-lot'} value={stock.lot_id || 'none'}>
                              {stock.lot?.lot_number || 'Sans lot'} ({stock.quantity} dispo)
                            </SelectItem>
                          ))
                        ) : (
                          // Si pas d'article sélectionné, afficher tous les lots
                          lots.map((lot) => (
                            <SelectItem key={lot.id} value={lot.id}>
                              {lot.lot_number}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="1"
                      value={selectedQuantity}
                      onChange={(e) => setSelectedQuantity(e.target.value)}
                      className="w-24 bg-[#F5E6C8]"
                      placeholder="Qte"
                    />
                    <Button type="button" onClick={addItem} className="bg-[#B8860B] hover:bg-[#9A7209] text-white">
                      Ajouter
                    </Button>
                  </div>

                  {orderItems.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Article</TableHead>
                          <TableHead>N° Lot</TableHead>
                          <TableHead className="text-right">Qte</TableHead>
                          <TableHead className="text-right">Prix unit.</TableHead>
                          <TableHead className="text-right">Total HT</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orderItems.map((item, index) => {
                          const availableStock = getAvailableStock(item.article_id, item.lot_id || null)
                          const orderedQty = orderItems
                            .filter(i => i.article_id === item.article_id && (i.lot_id || '') === (item.lot_id || ''))
                            .reduce((sum, i) => sum + i.quantity, 0)
                          const isOverStock = availableStock > 0 && orderedQty > availableStock

                          return (
                            <TableRow key={index} className={isOverStock ? 'bg-red-50' : ''}>
                              <TableCell>
                                <div>
                                  <span className="font-mono text-sm">{item.article_code}</span>
                                  <span className="ml-2">{item.article_name}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {item.lot_number ? (
                                  <div>
                                    <span className="font-mono text-xs text-blue-600">{item.lot_number}</span>
                                    <span className="text-xs text-gray-500 ml-1">({availableStock} dispo)</span>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-xs">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <span className={isOverStock ? 'text-red-600 font-bold' : ''}>
                                  {item.quantity}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">{formatPrice(item.unit_price)}</TableCell>
                              <TableCell className="text-right">{formatPrice(item.total_ht)}</TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeItem(index)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                        <TableRow>
                          <TableCell colSpan={4} className="text-right font-medium">
                            Total HT:
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {formatPrice(orderItems.reduce((sum, item) => sum + item.total_ht, 0))}
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t mt-4 relative z-50">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" className="bg-[#B8860B] hover:bg-[#9A7209]">
                    Creer la commande
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Status Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('all')}
            className={statusFilter === 'all' ? 'bg-[#B8860B] hover:bg-[#9A7209]' : 'border-[#B8860B] text-[#B8860B] hover:bg-[#B8860B] hover:text-white'}
          >
            Tous ({orders.length})
          </Button>
          {Object.entries(statusLabels).map(([key, label]) => {
            const count = orders.filter(o => o.status === key).length
            return (
              <Button
                key={key}
                variant={statusFilter === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(key)}
                className={cn(
                  'border-2 transition-all',
                  statusFilter === key
                    ? statusColors[key]
                    : 'border-[#B8860B] hover:bg-[#B8860B] hover:text-white'
                )}
              >
                {label} ({count})
              </Button>
            )
          })}
        </div>

        {/* Search & Table */}
        <Card className="border-2 border-[#B8860B]">
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par numero ou client..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-2 border-[#B8860B]"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Chargement...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Aucune commande trouvee
              </div>
            ) : (
              <div className="overflow-x-auto border-2 border-[#B8860B] rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>N Commande</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead className="text-center">Articles</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Total HT</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          {format(new Date(order.order_date), 'dd/MM/yyyy', {
                            locale: fr,
                          })}
                        </TableCell>
                        <TableCell className="font-mono font-medium">
                          {order.order_number}
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="font-medium">{order.client?.code}</span>
                            <span className="text-gray-500 ml-2">{order.client?.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">
                            {order.order_items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[order.status]}>
                            {statusLabels[order.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatPrice(order.total_ht)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Voir details"
                              onClick={() => handleViewOrder(order)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {!isLivreur && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Créer un BL"
                                  onClick={() => handleCreateBL(order)}
                                >
                                  <Truck className="h-4 w-4 text-[#B8860B]" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Modifier"
                                  onClick={() => handleEditOrder(order)}
                                >
                                  <Pencil className="h-4 w-4 text-orange-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Supprimer"
                                  onClick={() => handleDeleteOrder(order.id, order.order_number)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                                <Select
                                  value={order.status}
                                  onValueChange={(value) => handleChangeStatus(order.id, value)}
                                >
                                  <SelectTrigger className="h-8 w-36 text-xs font-medium bg-[#D4A847] text-gray-900 border-[#C49A3C] hover:bg-[#C49A3C]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(statusLabels).map(([key, label]) => (
                                      <SelectItem key={key} value={key}>
                                        {label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <div className="mt-4 text-sm text-gray-500 text-right">
              {filteredOrders.length} commande(s) affichee(s)
            </div>
          </CardContent>
        </Card>

        {/* View Order Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-xl">
                <ShoppingCart className="h-6 w-6 text-[#B8860B]" />
                Commande {viewingOrder?.order_number}
                {viewingOrder && (
                  <Badge className={`ml-2 ${statusColors[viewingOrder.status]}`}>
                    {statusLabels[viewingOrder.status]}
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            {viewingOrder && (
              <div className="space-y-6">
                {/* Header with Client & Order Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Client Card */}
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="h-5 w-5 text-[#B8860B]" />
                      <h3 className="font-semibold text-[#9A7209]">Client</h3>
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-lg text-gray-900">
                        {viewingOrder.client?.code} - {viewingOrder.client?.name}
                      </p>
                      {viewingOrder.client?.contact_name && (
                        <p className="text-sm text-gray-600 flex items-center gap-2">
                          <span className="text-gray-400">Contact:</span> {viewingOrder.client.contact_name}
                        </p>
                      )}
                      {viewingOrder.client?.phone && (
                        <p className="text-sm text-gray-600 flex items-center gap-2">
                          <span className="text-gray-400">Tel:</span> {viewingOrder.client.phone}
                        </p>
                      )}
                      {viewingOrder.client?.address && (
                        <p className="text-sm text-gray-600">
                          {viewingOrder.client.address}
                          {viewingOrder.client.city && `, ${viewingOrder.client.city}`}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Order Info Card */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <h3 className="font-semibold text-blue-800">Details Commande</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Date</p>
                        <p className="font-medium">
                          {format(new Date(viewingOrder.order_date), 'dd MMMM yyyy', { locale: fr })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Statut</p>
                        <Badge className={`mt-1 ${statusColors[viewingOrder.status]}`}>
                          {statusLabels[viewingOrder.status]}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Articles</p>
                        <p className="font-medium">{viewingOrder.order_items?.length || 0} produits</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Items Table */}
                <div className="border rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b">
                    <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Articles commandes ({viewingOrder.order_items?.length || 0})
                    </h3>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold">Code</TableHead>
                        <TableHead className="font-semibold">Designation</TableHead>
                        <TableHead className="text-center font-semibold">Qte</TableHead>
                        <TableHead className="text-right font-semibold">Prix Unit.</TableHead>
                        <TableHead className="text-right font-semibold">Total HT</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewingOrder.order_items?.map((item, index) => (
                        <TableRow key={index} className="hover:bg-gray-50">
                          <TableCell className="font-mono text-sm text-blue-600">{item.article?.code}</TableCell>
                          <TableCell className="font-medium">{item.article?.description || item.article?.name}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="font-semibold">{item.quantity}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatPrice(item.unit_price)}</TableCell>
                          <TableCell className="text-right font-semibold">{formatPrice(item.total_ht)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Totals Section */}
                  <div className="bg-gray-50 p-4 border-t">
                    <div className="flex justify-end">
                      <div className="w-72">
                        <div className="flex justify-between text-lg font-bold">
                          <span className="text-[#9A7209]">Total HT:</span>
                          <span className="text-[#9A7209]">{formatPrice(viewingOrder.total_ht)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {viewingOrder.notes && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <h3 className="font-semibold text-yellow-800 mb-2">Notes</h3>
                    <p className="text-sm text-gray-700">{viewingOrder.notes}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap justify-end gap-3 pt-4 border-t">
                  {!isLivreur && (
                    <Button
                      className="bg-[#B8860B] hover:bg-[#9A7209]"
                      onClick={() => handleCreateDelivery(viewingOrder)}
                    >
                      <Truck className="h-4 w-4 mr-2" />
                      Créer BL
                    </Button>
                  )}
                  <Button
                    className="bg-[#B8860B] hover:bg-[#9A7209] text-white"
                    onClick={() => setIsViewDialogOpen(false)}
                  >
                    Fermer
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Order Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5 text-orange-600" />
                Modifier la commande {editingOrder?.order_number}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Client *</Label>
                  <Popover open={editClientOpen} onOpenChange={setEditClientOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={editClientOpen}
                        className="w-full justify-between bg-[#F5E6C8]"
                      >
                        {editFormData.client_id
                          ? clients.find((c) => c.id === editFormData.client_id)?.name || "Client selectionne"
                          : "Rechercher un client..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Rechercher par nom ou code..." />
                        <CommandList>
                          <CommandEmpty>Aucun client trouve.</CommandEmpty>
                          <CommandGroup>
                            {clients.map((client) => (
                              <CommandItem
                                key={client.id}
                                value={`${client.code} ${client.name}`}
                                onSelect={() => {
                                  handleEditClientChange(client.id)
                                  setEditClientOpen(false)
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    editFormData.client_id === client.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <span className="font-medium">{client.code}</span>
                                <span className="ml-2 text-gray-600">{client.name}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_order_date">Date de commande</Label>
                  <Input
                    id="edit_order_date"
                    type="date"
                    value={editFormData.order_date}
                    onChange={(e) => setEditFormData({ ...editFormData, order_date: e.target.value })}
                    className="bg-[#F5E6C8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select
                    value={editFormData.status}
                    onValueChange={(value) => setEditFormData({ ...editFormData, status: value })}
                  >
                    <SelectTrigger className="bg-[#F5E6C8]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">En attente</SelectItem>
                      <SelectItem value="confirmed">Confirmée</SelectItem>
                      <SelectItem value="in_preparation">En préparation</SelectItem>
                      <SelectItem value="ready">Prête</SelectItem>
                      <SelectItem value="in_delivery">En livraison</SelectItem>
                      <SelectItem value="delivered">Livrée</SelectItem>
                      <SelectItem value="partial">Partiellement livrée</SelectItem>
                      <SelectItem value="returned">Retournée</SelectItem>
                      <SelectItem value="cancelled">Annulée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_notes">Notes</Label>
                  <Input
                    id="edit_notes"
                    value={editFormData.notes}
                    onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                    placeholder="Notes sur la commande"
                    className="bg-[#F5E6C8]"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">
                  Articles
                  {editClientPrices.length > 0 && (
                    <Badge className="ml-2 bg-amber-100 text-[#9A7209]">
                      {editClientPrices.length} prix personnalises
                    </Badge>
                  )}
                </h3>
                <div className="flex gap-2 mb-4">
                  <Popover open={editArticleOpen} onOpenChange={setEditArticleOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={editArticleOpen}
                        className="flex-1 justify-between bg-[#F5E6C8]"
                      >
                        {editSelectedArticle
                          ? (() => {
                              const article = articles.find((a) => a.id === editSelectedArticle)
                              if (!article) return "Article selectionne"
                              return `${article.code} - ${article.name}`
                            })()
                          : "Ajouter un article..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[500px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Rechercher par code ou nom..." />
                        <CommandList>
                          <CommandEmpty>Aucun article trouve.</CommandEmpty>
                          <CommandGroup>
                            {articles.map((article) => (
                                <CommandItem
                                  key={article.id}
                                  value={`${article.code} ${article.name}`}
                                  onSelect={() => {
                                    setEditSelectedArticle(article.id)
                                    setEditArticleOpen(false)
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      editSelectedArticle === article.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <span className="font-medium">{article.code}</span>
                                  <span className="ml-2 text-gray-600">{article.name}</span>
                                </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <Input
                    type="number"
                    min="1"
                    value={editSelectedQuantity}
                    onChange={(e) => setEditSelectedQuantity(e.target.value)}
                    className="w-24 bg-[#F5E6C8]"
                    placeholder="Qte"
                  />
                  <Button type="button" onClick={addEditItem} className="bg-[#B8860B] hover:bg-[#9A7209] text-white">
                    Ajouter
                  </Button>
                </div>

                {editOrderItems.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Article</TableHead>
                        <TableHead className="text-right">Qte</TableHead>
                        <TableHead className="text-right">Prix unit.</TableHead>
                        <TableHead className="text-right">Total HT</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editOrderItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div>
                              <span className="font-mono text-sm">{item.article_code}</span>
                              <span className="ml-2">{item.article_name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateEditItemQuantity(index, parseInt(e.target.value) || 1)}
                              className="w-20 text-right"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_price}
                              onChange={(e) => updateEditItemPrice(index, parseFloat(e.target.value) || 0)}
                              className="w-24 text-right"
                            />
                          </TableCell>
                          <TableCell className="text-right">{formatPrice(item.total_ht)}</TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeEditItem(index)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={3} className="text-right font-medium">
                          Total HT:
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatPrice(editOrderItems.reduce((sum, item) => sum + item.total_ht, 0))}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                <Button type="button" className="bg-[#B8860B] hover:bg-[#9A7209] text-white" onClick={() => setIsEditDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleSaveEdit} className="bg-orange-600 hover:bg-orange-700">
                  Enregistrer les modifications
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedModule>
  )
}
