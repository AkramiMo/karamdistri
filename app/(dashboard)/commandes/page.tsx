'use client'

import { useEffect, useState } from 'react'
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
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  confirmed: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

const statusLabels: Record<string, string> = {
  draft: 'Brouillon',
  confirmed: 'Confirmee',
  in_progress: 'En cours',
  delivered: 'Livree',
  cancelled: 'Annulee',
}

interface ClientPrice {
  article_id: string
  custom_price: number
}

export default function CommandesPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [articles, setArticles] = useState<Article[]>([])
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
    status: 'draft',
  })
  const [editOrderItems, setEditOrderItems] = useState<OrderItem[]>([])
  const supabase = createClient()
  const { companySettings } = useCompanySettings()

  const [formData, setFormData] = useState({
    client_id: '',
    order_date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [selectedArticle, setSelectedArticle] = useState('')
  const [selectedQuantity, setSelectedQuantity] = useState('1')

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
    // Query database for the highest order number to avoid duplicates
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('orders') as any)
      .select('order_number')
      .like('order_number', 'BCC%')
      .order('order_number', { ascending: false })
      .limit(1)

    if (data && data.length > 0) {
      const lastNum = parseInt(data[0].order_number.replace('BCC', ''))
      if (!isNaN(lastNum)) {
        return `BCC${lastNum + 1}`
      }
    }
    return `BCC${401}`
  }

  const addItem = () => {
    if (!selectedArticle || !selectedQuantity) return

    const article = articles.find(a => a.id === selectedArticle)
    if (!article) return

    const quantity = parseInt(selectedQuantity)
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
    }])

    setSelectedArticle('')
    setSelectedQuantity('1')
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
        status: 'draft',
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

  const handleGenerateDeliveryNote = (order: Order) => {
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

    generateDeliveryNotePDF(pdfOrder, companySettings)
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
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la commande ${orderNumber} ?`)) {
      return
    }

    // First delete order items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('order_items') as any).delete().eq('order_id', orderId)

    // Then delete the order
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('orders') as any).delete().eq('id', orderId)

    if (error) {
      console.error('Error deleting order:', error)
      alert('Erreur lors de la suppression de la commande')
    } else {
      fetchOrders()
      if (viewingOrder?.id === orderId) {
        setIsViewDialogOpen(false)
      }
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

  // Stats
  const totalCA = orders.reduce((sum, o) => sum + (o.total_ttc || 0), 0)
  const pendingOrders = orders.filter((o) => o.status === 'draft' || o.status === 'confirmed').length
  const inProgressOrders = orders.filter((o) => o.status === 'in_progress').length
  const deliveredOrders = orders.filter((o) => o.status === 'delivered').length

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
              <ProtectedModule module="commandes" action="create">
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    resetForm()
                    setIsDialogOpen(true)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvelle commande
                </Button>
              </ProtectedModule>
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
                          className="w-full justify-between"
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
                                  value={`${client.code} ${client.name} ${client.phone || ''}`}
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
                                  {client.phone && (
                                    <span className="ml-2 text-gray-400 text-sm">{client.phone}</span>
                                  )}
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
                  />
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium mb-3">
                    Articles
                    {clientPrices.length > 0 && (
                      <Badge className="ml-2 bg-green-100 text-green-800">
                        {clientPrices.length} prix personnalises
                      </Badge>
                    )}
                  </h3>
                  <div className="flex gap-2 mb-4">
                    <Popover open={articleOpen} onOpenChange={setArticleOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={articleOpen}
                          className="flex-1 justify-between"
                        >
                          {selectedArticle
                            ? (() => {
                                const article = articles.find((a) => a.id === selectedArticle)
                                if (!article) return "Article selectionne"
                                const clientPrice = clientPrices.find(cp => cp.article_id === article.id)
                                const displayPrice = clientPrice ? clientPrice.custom_price : article.price_ht
                                return `${article.code} - ${article.name} (${formatPrice(displayPrice)})`
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
                                const clientPrice = clientPrices.find(cp => cp.article_id === article.id)
                                const displayPrice = clientPrice ? clientPrice.custom_price : article.price_ht
                                return (
                                  <CommandItem
                                    key={article.id}
                                    value={`${article.code} ${article.name}`}
                                    onSelect={() => {
                                      setSelectedArticle(article.id)
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
                                    <span className="ml-2 text-gray-600">{article.name}</span>
                                    <span className="ml-auto text-green-600">{formatPrice(displayPrice)}</span>
                                    {clientPrice && <Badge className="ml-1 bg-yellow-100 text-yellow-800 text-xs">*</Badge>}
                                  </CommandItem>
                                )
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <Input
                      type="number"
                      min="1"
                      value={selectedQuantity}
                      onChange={(e) => setSelectedQuantity(e.target.value)}
                      className="w-24"
                      placeholder="Qte"
                    />
                    <Button type="button" onClick={addItem} variant="outline">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {orderItems.length > 0 && (
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
                        {orderItems.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <div>
                                <span className="font-mono text-sm">{item.article_code}</span>
                                <span className="ml-2">{item.article_name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
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
                        ))}
                        <TableRow>
                          <TableCell colSpan={3} className="text-right font-medium">
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
                  <Button type="submit" className="bg-green-600 hover:bg-green-700">
                    Creer la commande
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Commandes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-8 w-8 text-green-600" />
                <span className="text-2xl font-bold">{orders.length}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                CA Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-xl font-bold text-green-600">
                {formatPrice(totalCA)}
              </span>
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
                {pendingOrders}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                En cours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-blue-600">
                {inProgressOrders}
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
                {deliveredOrders}
              </span>
            </CardContent>
          </Card>
        </div>

        {/* Search & Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par numero ou client..."
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
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="confirmed">Confirmee</SelectItem>
                  <SelectItem value="in_progress">En cours</SelectItem>
                  <SelectItem value="delivered">Livree</SelectItem>
                  <SelectItem value="cancelled">Annulee</SelectItem>
                </SelectContent>
              </Select>
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N Commande</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-center">Articles</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Total HT</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono font-medium">
                          {order.order_number}
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="font-medium">{order.client?.code}</span>
                            <span className="text-gray-500 ml-2">{order.client?.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(order.order_date), 'dd/MM/yyyy', {
                            locale: fr,
                          })}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">
                            {order.order_items?.length || 0}
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
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Voir details"
                              onClick={() => handleViewOrder(order)}
                            >
                              <Eye className="h-4 w-4" />
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
                              title="Telecharger facture"
                              onClick={() => handleGenerateInvoice(order)}
                            >
                              <FileText className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Telecharger BL"
                              onClick={() => handleGenerateDeliveryNote(order)}
                            >
                              <Truck className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Supprimer"
                              onClick={() => handleDeleteOrder(order.id, order.order_number)}
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
                <ShoppingCart className="h-6 w-6 text-green-600" />
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
                  <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="h-5 w-5 text-green-600" />
                      <h3 className="font-semibold text-green-800">Client</h3>
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
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Total TTC</p>
                        <p className="font-bold text-green-600 text-lg">{formatPrice(viewingOrder.total_ttc)}</p>
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
                      <div className="w-72 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Total HT:</span>
                          <span className="font-medium">{formatPrice(viewingOrder.total_ht)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">TVA (20%):</span>
                          <span className="font-medium">{formatPrice(viewingOrder.total_tva)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                          <span className="text-green-700">Total TTC:</span>
                          <span className="text-green-700">{formatPrice(viewingOrder.total_ttc)}</span>
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
                  <Button
                    variant="outline"
                    onClick={() => setIsViewDialogOpen(false)}
                  >
                    Fermer
                  </Button>
                  <Button
                    variant="outline"
                    className="border-green-600 text-green-600 hover:bg-green-50"
                    onClick={() => handleGenerateDeliveryNote(viewingOrder)}
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    Bon de Livraison
                  </Button>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => handleGenerateInvoice(viewingOrder)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Telecharger Facture
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
                        className="w-full justify-between"
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
                                value={`${client.code} ${client.name} ${client.phone || ''}`}
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
                                {client.phone && (
                                  <span className="ml-2 text-gray-400 text-sm">{client.phone}</span>
                                )}
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
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Brouillon</SelectItem>
                      <SelectItem value="confirmed">Confirmee</SelectItem>
                      <SelectItem value="in_progress">En cours</SelectItem>
                      <SelectItem value="delivered">Livree</SelectItem>
                      <SelectItem value="cancelled">Annulee</SelectItem>
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
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">
                  Articles
                  {editClientPrices.length > 0 && (
                    <Badge className="ml-2 bg-green-100 text-green-800">
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
                        className="flex-1 justify-between"
                      >
                        {editSelectedArticle
                          ? (() => {
                              const article = articles.find((a) => a.id === editSelectedArticle)
                              if (!article) return "Article selectionne"
                              const clientPrice = editClientPrices.find(cp => cp.article_id === article.id)
                              const displayPrice = clientPrice ? clientPrice.custom_price : article.price_ht
                              return `${article.code} - ${article.name} (${formatPrice(displayPrice)})`
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
                            {articles.map((article) => {
                              const clientPrice = editClientPrices.find(cp => cp.article_id === article.id)
                              const displayPrice = clientPrice ? clientPrice.custom_price : article.price_ht
                              return (
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
                                  <span className="ml-auto text-green-600">{formatPrice(displayPrice)}</span>
                                  {clientPrice && <Badge className="ml-1 bg-yellow-100 text-yellow-800 text-xs">*</Badge>}
                                </CommandItem>
                              )
                            })}
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
                    className="w-24"
                    placeholder="Qte"
                  />
                  <Button type="button" onClick={addEditItem} variant="outline">
                    <Plus className="h-4 w-4" />
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
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
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
