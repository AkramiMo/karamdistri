'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Search, Eye, FileText, Trash2, FileDown, Package, Pencil, Users, Edit3 } from 'lucide-react'
import { generatePurchaseOrderPDF } from '@/lib/pdf/purchaseOrder'
import { useCompanySettings } from '@/hooks/useCompanySettings'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import Link from 'next/link'

interface PurchaseOrder {
  id: string
  po_number: string
  supplier_id: string
  status: string
  order_date: string
  total_ht: number | null
  notes: string | null
  supplier?: {
    code: string
    name: string
    contact_name: string | null
    phone: string | null
    email: string | null
    address: string | null
  }
  purchase_order_items?: {
    id: string
    supply_id: string
    quantity: number
    unit_price: number
    total_ht: number
    supply: {
      code: string
      name: string
      description: string | null
    }
  }[]
}

interface Supplier {
  id: string
  code: string
  name: string
}

interface Supply {
  id: string
  code: string
  name: string
  price_ht: number
  unit: string
  supply_categories?: {
    name: string
  }
}

interface POItem {
  supply_id: string | null  // null si saisie libre
  supply_name: string
  supply_code: string
  quantity: number
  unit_price: number | null
  total_ht: number | null
  is_custom: boolean  // true si saisie libre
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  partial: 'bg-yellow-100 text-yellow-800',
  received: 'bg-amber-100 text-[#9A7209]',
  cancelled: 'bg-red-100 text-red-800',
}

const statusLabels: Record<string, string> = {
  draft: 'Brouillon',
  sent: 'Envoyée',
  partial: 'Partielle',
  received: 'Reçue',
  cancelled: 'Annulée',
}

export default function AchatsPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [supplies, setSupplies] = useState<Supply[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [viewingOrder, setViewingOrder] = useState<PurchaseOrder | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null)
  const supabase = createClient()
  const { companySettings } = useCompanySettings()

  const [formData, setFormData] = useState({
    supplier_id: '',
    order_date: new Date().toISOString().split('T')[0],
  })

  const [poItems, setPOItems] = useState<POItem[]>([])
  const [selectedSupply, setSelectedSupply] = useState('')
  const [selectedQuantity, setSelectedQuantity] = useState('1')
  const [selectedPrice, setSelectedPrice] = useState('')
  const [customDesignation, setCustomDesignation] = useState('')
  const [isCustomEntry, setIsCustomEntry] = useState(false)

  const fetchPurchaseOrders = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        supplier:suppliers(code, name, contact_name, phone, email, address),
        purchase_order_items(
          id,
          supply_id,
          quantity,
          unit_price,
          total_ht,
          supply:supplies!purchase_order_items_supply_id_fkey(code, name, description)
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching purchase orders:', error)
    } else {
      setPurchaseOrders(data || [])
    }
    setIsLoading(false)
  }

  // Handle PDF export
  const handleExportPDF = async (order: PurchaseOrder) => {
    if (!order.supplier || !order.purchase_order_items) {
      alert('Données incomplètes pour générer le PDF')
      return
    }

    await generatePurchaseOrderPDF({
      id: order.id,
      po_number: order.po_number,
      order_date: order.order_date,
      status: order.status,
      total_ht: order.total_ht || 0,
      notes: order.notes,
      supplier: {
        code: order.supplier.code,
        name: order.supplier.name,
        contact_name: order.supplier.contact_name,
        phone: order.supplier.phone,
        email: order.supplier.email,
        address: order.supplier.address,
      },
      purchase_order_items: order.purchase_order_items.map(item => ({
        article: {
          code: item.supply?.code || '',
          name: item.supply?.name || '',
          description: item.supply?.description || null,
        },
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_ht: item.total_ht,
      })),
    }, companySettings)
  }

  const fetchSuppliers = async () => {
    const { data } = await supabase
      .from('suppliers')
      .select('id, code, name')
      .eq('is_active', true)
      .order('name')
    setSuppliers(data || [])
  }

  const fetchSupplies = async () => {
    const { data } = await supabase
      .from('supplies')
      .select('id, code, name, price_ht, unit, supply_categories(name)')
      .eq('is_active', true)
      .order('code')
    setSupplies(data || [])
  }

  useEffect(() => {
    fetchPurchaseOrders()
    fetchSuppliers()
    fetchSupplies()
  }, [])

  const generatePONumber = () => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `BC-${year}${month}-${random}`
  }

  const addItem = () => {
    const quantity = parseInt(selectedQuantity) || 1
    const unit_price = selectedPrice ? parseFloat(selectedPrice) : null
    const total_ht = unit_price !== null ? unit_price * quantity : null

    if (isCustomEntry) {
      // Saisie libre
      if (!customDesignation.trim()) {
        alert('Veuillez saisir une désignation')
        return
      }

      setPOItems([...poItems, {
        supply_id: null,
        supply_name: customDesignation.trim(),
        supply_code: '-',
        quantity,
        unit_price,
        total_ht,
        is_custom: true,
      }])

      setCustomDesignation('')
    } else {
      // Sélection depuis la liste
      if (!selectedSupply) {
        alert('Veuillez sélectionner une fourniture ou saisir une désignation')
        return
      }

      const supply = supplies.find(s => s.id === selectedSupply)
      if (!supply) return

      setPOItems([...poItems, {
        supply_id: supply.id,
        supply_name: supply.name,
        supply_code: supply.code,
        quantity,
        unit_price,
        total_ht,
        is_custom: false,
      }])

      setSelectedSupply('')
    }

    setSelectedQuantity('1')
    setSelectedPrice('')
  }

  const removeItem = (index: number) => {
    setPOItems(poItems.filter((_, i) => i !== index))
  }

  const handleSupplySelect = (supplyId: string) => {
    const supply = supplies.find(s => s.id === supplyId)
    if (supply) {
      setSelectedSupply(supplyId)
      setSelectedPrice(supply.price_ht?.toString() || '')
      setIsCustomEntry(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.supplier_id) {
      alert('Veuillez sélectionner un fournisseur')
      return
    }

    if (poItems.length === 0) {
      alert('Veuillez ajouter au moins une fourniture')
      return
    }

    const total_ht = poItems.reduce((sum, item) => sum + (item.total_ht || 0), 0) || null

    // Create the purchase order
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newOrder, error } = await (supabase.from('purchase_orders') as any)
      .insert([{
        po_number: generatePONumber(),
        supplier_id: formData.supplier_id,
        order_date: formData.order_date,
        status: 'draft',
        total_ht,
      }])
      .select()
      .single()

    if (error || !newOrder) {
      console.error('Error creating purchase order:', error)
      alert('Erreur lors de la création du bon de commande')
      return
    }

    // Insert the items - handle custom entries by creating supplies first
    const itemsToInsert = []

    for (const item of poItems) {
      let supplyId = item.supply_id

      // For custom entries, create a custom supply first
      if (item.is_custom && !supplyId) {
        const customCode = `CUSTOM-${Date.now()}`
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: newSupply, error: supplyError } = await (supabase.from('supplies') as any)
          .insert([{
            code: customCode,
            name: item.supply_name,
            price_ht: item.unit_price || 0,
            is_custom: true,
            is_active: true,
          }])
          .select()
          .single()

        if (supplyError || !newSupply) {
          console.error('Error creating custom supply:', supplyError)
          continue
        }
        supplyId = newSupply.id
      }

      if (supplyId) {
        itemsToInsert.push({
          purchase_order_id: newOrder.id,
          supply_id: supplyId,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_ht: item.total_ht,
        })
      }
    }

    if (itemsToInsert.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: itemsError } = await (supabase.from('purchase_order_items') as any)
        .insert(itemsToInsert)

      if (itemsError) {
        console.error('Error creating purchase order items:', itemsError)
        alert('Erreur lors de l\'ajout des articles')
      }
    }

    fetchPurchaseOrders()
    setIsDialogOpen(false)
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      supplier_id: '',
      order_date: new Date().toISOString().split('T')[0],
    })
    setPOItems([])
    setSelectedSupply('')
    setSelectedQuantity('1')
    setSelectedPrice('')
    setCustomDesignation('')
    setIsCustomEntry(false)
  }

  // View order
  const handleViewOrder = (order: PurchaseOrder) => {
    setViewingOrder(order)
    setIsViewDialogOpen(true)
  }

  // Edit order
  const [editFormData, setEditFormData] = useState({
    supplier_id: '',
    order_date: '',
    status: 'draft',
  })

  const handleEditOrder = (order: PurchaseOrder) => {
    setEditingOrder(order)
    setEditFormData({
      supplier_id: order.supplier_id,
      order_date: order.order_date,
      status: order.status,
    })
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    console.log('handleSaveEdit called')
    console.log('editingOrder:', editingOrder)
    console.log('editFormData:', editFormData)

    if (!editingOrder) {
      console.log('No editingOrder, returning')
      alert('Erreur: Aucune commande sélectionnée')
      return
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('purchase_orders') as any)
        .update({
          supplier_id: editFormData.supplier_id,
          order_date: editFormData.order_date,
          status: editFormData.status,
        })
        .eq('id', editingOrder.id)

      if (error) {
        console.error('Error updating purchase order:', error)
        alert('Erreur lors de la modification: ' + error.message)
        return
      }

      console.log('Update successful')
      alert('Bon de commande modifié avec succès')
      fetchPurchaseOrders()
      setIsEditDialogOpen(false)
      setEditingOrder(null)
    } catch (err) {
      console.error('Exception:', err)
      alert('Erreur: ' + (err as Error).message)
    }
  }

  // Delete order
  const handleDeleteOrder = async (orderId: string, poNumber: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le BC ${poNumber} ?`)) {
      return
    }

    // First delete items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('purchase_order_items') as any).delete().eq('purchase_order_id', orderId)

    // Then delete the order
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('purchase_orders') as any).delete().eq('id', orderId)

    if (error) {
      console.error('Error deleting purchase order:', error)
      alert('Erreur lors de la suppression')
    } else {
      fetchPurchaseOrders()
    }
  }

  const filteredOrders = purchaseOrders.filter(
    (order) =>
      order.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatPrice = (price: number | null) => {
    if (price === null) return '-'
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
    }).format(price)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bon de Commande</h1>
          <p className="text-gray-500">Gérez vos bons de commande fournisseurs</p>
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
              Nouveau bon de commande
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouveau bon de commande fournisseur</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fournisseur *</Label>
                  <Select
                    value={formData.supplier_id}
                    onValueChange={(value) => setFormData({ ...formData, supplier_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un fournisseur" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.code} - {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">Fournitures</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="customEntry"
                        checked={isCustomEntry}
                        onCheckedChange={(checked) => {
                          setIsCustomEntry(checked === true)
                          setSelectedSupply('')
                          setCustomDesignation('')
                        }}
                      />
                      <Label htmlFor="customEntry" className="text-sm cursor-pointer flex items-center gap-1">
                        <Edit3 className="h-3 w-3" />
                        Saisie libre
                      </Label>
                    </div>
                    <Link href="/fournitures" className="text-sm text-[#B8860B] hover:underline flex items-center gap-1">
                      <Package className="h-4 w-4" />
                      Gérer les fournitures
                    </Link>
                  </div>
                </div>

                <div className="flex gap-2 mb-4">
                  {isCustomEntry ? (
                    <Input
                      value={customDesignation}
                      onChange={(e) => setCustomDesignation(e.target.value)}
                      className="flex-1"
                      placeholder="Saisir la désignation..."
                    />
                  ) : (
                    <Select value={selectedSupply} onValueChange={handleSupplySelect}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Sélectionner une fourniture" />
                      </SelectTrigger>
                      <SelectContent>
                        {supplies.map((supply) => (
                          <SelectItem key={supply.id} value={supply.id}>
                            {supply.code} - {supply.name}
                            {supply.supply_categories?.name && ` (${supply.supply_categories.name})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Input
                    type="number"
                    min="1"
                    value={selectedQuantity}
                    onChange={(e) => setSelectedQuantity(e.target.value)}
                    className="w-24"
                    placeholder="Qté"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    value={selectedPrice}
                    onChange={(e) => setSelectedPrice(e.target.value)}
                    className="w-32"
                    placeholder="Prix (opt.)"
                  />
                  <Button type="button" onClick={addItem} variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {poItems.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Fourniture</TableHead>
                        <TableHead className="text-right">Qté</TableHead>
                        <TableHead className="text-right">Prix unit.</TableHead>
                        <TableHead className="text-right">Total HT</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {poItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono">
                            {item.is_custom ? (
                              <Badge variant="outline" className="text-xs">Libre</Badge>
                            ) : (
                              item.supply_code
                            )}
                          </TableCell>
                          <TableCell>{item.supply_name}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            {item.unit_price !== null ? formatPrice(item.unit_price) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.total_ht !== null ? formatPrice(item.total_ht) : '-'}
                          </TableCell>
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
                        <TableCell colSpan={4} className="text-right font-medium">
                          Total HT:
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {poItems.some(item => item.total_ht !== null)
                            ? formatPrice(poItems.reduce((sum, item) => sum + (item.total_ht || 0), 0))
                            : '-'}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button
                  className="bg-[#B8860B] hover:bg-[#9A7209]"
                  onClick={handleSubmit}
                >
                  Créer le BC
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total BC
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileText className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold">{purchaseOrders.length}</span>
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
              {purchaseOrders.filter((o) => o.status === 'draft' || o.status === 'sent').length}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Partielles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-blue-600">
              {purchaseOrders.filter((o) => o.status === 'partial').length}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Reçues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-[#B8860B]">
              {purchaseOrders.filter((o) => o.status === 'received').length}
            </span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher un bon de commande..."
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
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucun bon de commande trouvé
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° BC</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Total HT</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.po_number}</TableCell>
                    <TableCell>{order.supplier?.name}</TableCell>
                    <TableCell>
                      {format(new Date(order.order_date), 'dd/MM/yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[order.status]}>
                        {statusLabels[order.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {order.total_ht ? formatPrice(order.total_ht) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewOrder(order)}
                          title="Voir détails"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditOrder(order)}
                          title="Modifier"
                        >
                          <Pencil className="h-4 w-4 text-orange-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleExportPDF(order)}
                          title="Exporter PDF"
                        >
                          <FileDown className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteOrder(order.id, order.po_number)}
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
        </CardContent>
      </Card>

      {/* View Order Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl">
              <FileText className="h-6 w-6 text-blue-600" />
              Bon de commande {viewingOrder?.po_number}
              {viewingOrder && (
                <Badge className={`ml-2 ${statusColors[viewingOrder.status]}`}>
                  {statusLabels[viewingOrder.status]}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {viewingOrder && (
            <div className="space-y-6">
              {/* Supplier Info */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-800">Fournisseur</h3>
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-lg text-gray-900">
                    {viewingOrder.supplier?.code} - {viewingOrder.supplier?.name}
                  </p>
                  {viewingOrder.supplier?.contact_name && (
                    <p className="text-sm text-gray-600">Contact: {viewingOrder.supplier.contact_name}</p>
                  )}
                  {viewingOrder.supplier?.phone && (
                    <p className="text-sm text-gray-600">Tél: {viewingOrder.supplier.phone}</p>
                  )}
                  {viewingOrder.supplier?.email && (
                    <p className="text-sm text-gray-600">Email: {viewingOrder.supplier.email}</p>
                  )}
                </div>
              </div>

              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Date de commande</p>
                  <p className="font-medium">
                    {format(new Date(viewingOrder.order_date), 'dd MMMM yyyy', { locale: fr })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Total HT</p>
                  <p className="font-bold text-[#B8860B] text-lg">
                    {viewingOrder.total_ht ? formatPrice(viewingOrder.total_ht) : 'Non renseigné'}
                  </p>
                </div>
              </div>

              {/* Items Table */}
              {viewingOrder.purchase_order_items && viewingOrder.purchase_order_items.length > 0 && (
                <div className="border rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b">
                    <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Fournitures commandées ({viewingOrder.purchase_order_items.length})
                    </h3>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Code</TableHead>
                        <TableHead>Désignation</TableHead>
                        <TableHead className="text-center">Qté</TableHead>
                        <TableHead className="text-right">Prix Unit.</TableHead>
                        <TableHead className="text-right">Total HT</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewingOrder.purchase_order_items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-sm text-blue-600">
                            {item.supply?.code || '-'}
                          </TableCell>
                          <TableCell className="font-medium">{item.supply?.name || '-'}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{item.quantity}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {item.unit_price ? formatPrice(item.unit_price) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {item.total_ht ? formatPrice(item.total_ht) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  Fermer
                </Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => handleExportPDF(viewingOrder)}
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Exporter PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Order Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-orange-600" />
              Modifier le BC {editingOrder?.po_number}
            </DialogTitle>
          </DialogHeader>
          {editingOrder && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Fournisseur</Label>
                <Select
                  value={editFormData.supplier_id}
                  onValueChange={(value) => setEditFormData({ ...editFormData, supplier_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.code} - {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date de commande</Label>
                  <Input
                    type="date"
                    value={editFormData.order_date}
                    onChange={(e) => setEditFormData({ ...editFormData, order_date: e.target.value })}
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
                      <SelectItem value="draft">Brouillon</SelectItem>
                      <SelectItem value="sent">Envoyée</SelectItem>
                      <SelectItem value="partial">Partielle</SelectItem>
                      <SelectItem value="received">Reçue</SelectItem>
                      <SelectItem value="cancelled">Annulée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Annuler
                </Button>
                <Button
                  onClick={() => {
                    console.log('Enregistrer clicked, editingOrder:', editingOrder)
                    handleSaveEdit()
                  }}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  Enregistrer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
