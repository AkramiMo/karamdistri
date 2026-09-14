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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Eye, PackageCheck, Trash2, FileDown, Upload, FileText, Image, Camera, Download, X, Pencil } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { generateReceptionPDF } from '@/lib/pdf/reception'
import { useCompanySettings } from '@/hooks/useCompanySettings'

interface Reception {
  id: string
  reception_number: string
  purchase_order_id: string | null
  supplier_id: string
  reception_date: string
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
  purchase_order?: {
    po_number: string
  } | null
  reception_items?: {
    id: string
    article_id: string
    quantity_expected: number
    quantity_received: number
    unit_price: number
  }[]
  reception_documents?: {
    id: string
    nom: string
    type: string
    chemin: string
  }[]
}

interface Supplier {
  id: string
  code: string
  name: string
}

interface PurchaseOrder {
  id: string
  po_number: string
  supplier_id: string
  total_ht: number
  purchase_order_items?: {
    id: string
    supply_id: string
    quantity: number
    unit_price: number
    supply: {
      code: string
      name: string
    }
  }[]
}

interface Supply {
  id: string
  code: string
  name: string
  price_ht: number
  is_active?: boolean
  category_id?: string | null
}

interface SupplyCategory {
  id: string
  name: string
}

interface ReceptionItem {
  article_id: string
  article_name: string
  article_code: string
  quantity_ordered: number
  quantity_received: number
  unit_price: number
  total_ht: number
}

interface ReceptionDocument {
  id?: string
  nom: string
  type: 'pdf' | 'image' | 'scan'
  chemin: string
  file?: File
}

export default function ReceptionsPage() {
  const [receptions, setReceptions] = useState<Reception[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [supplies, setSupplies] = useState<Supply[]>([])
  const [supplyCategories, setSupplyCategories] = useState<SupplyCategory[]>([])
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingReception, setEditingReception] = useState<Reception | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [viewingReception, setViewingReception] = useState<Reception | null>(null)
  const supabase = createClient()
  const { companySettings } = useCompanySettings()

  const [formData, setFormData] = useState({
    supplier_id: '',
    purchase_order_id: '',
    reception_date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  const [receptionItems, setReceptionItems] = useState<ReceptionItem[]>([])
  const [selectedArticle, setSelectedArticle] = useState('')
  const [selectedQuantityOrdered, setSelectedQuantityOrdered] = useState('0')
  const [selectedQuantityReceived, setSelectedQuantityReceived] = useState('1')
  const [selectedPrice, setSelectedPrice] = useState('')
  const [supplySearch, setSupplySearch] = useState('')
  const [showSupplyDropdown, setShowSupplyDropdown] = useState(false)
  const [isDropdownHovered, setIsDropdownHovered] = useState(false)

  // Documents state
  const [documents, setDocuments] = useState<ReceptionDocument[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useState<HTMLInputElement | null>(null)
  const cameraInputRef = useState<HTMLInputElement | null>(null)

  const fetchReceptions = async () => {
    setIsLoading(true)
    try {
      // First try a simple query to test access
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: testData, error: testError } = await (supabase.from('receptions') as any)
        .select('id')
        .limit(1)

      if (testError) {
        console.error('Test query error:', testError.message || testError.code || JSON.stringify(testError))
      }

      // Full query with relations
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('receptions') as any)
        .select(`
          *,
          supplier:suppliers(code, name, contact_name, phone, email, address),
          purchase_order:purchase_orders(po_number),
          reception_items(
            id,
            article_id,
            quantity_expected,
            quantity_received,
            unit_price
          ),
          reception_documents(
            id,
            nom,
            type,
            chemin
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching receptions:', error.message || error.code || JSON.stringify(error))
        // Still try to show data if available
        if (data) {
          setReceptions(data)
        }
      } else {
        setReceptions(data || [])
      }
    } catch (err) {
      console.error('Exception fetching receptions:', err)
    }
    setIsLoading(false)
  }

  const fetchSuppliers = async () => {
    const { data } = await supabase
      .from('suppliers')
      .select('id, code, name')
      .eq('is_active', true)
      .order('name')
    setSuppliers(data || [])
  }

  const fetchPurchaseOrders = async () => {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        id, po_number, supplier_id, total_ht,
        purchase_order_items(
          id, supply_id, quantity, unit_price,
          supply:supplies!purchase_order_items_supply_id_fkey(code, name)
        )
      `)
      .in('status', ['draft', 'sent', 'partial'])
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching purchase orders:', error)
    }
    setPurchaseOrders(data || [])
  }

  const fetchSupplies = async () => {
    // Fetch all supplies (including inactive) for viewing existing receptions
    const { data } = await supabase
      .from('supplies')
      .select('id, code, name, price_ht, is_active, category_id')
      .order('name')
    setSupplies(data || [])
  }

  const fetchSupplyCategories = async () => {
    const { data } = await supabase.from('supply_categories')
      .select('id, name')
      .order('name')
    setSupplyCategories(data || [])
  }

  useEffect(() => {
    fetchReceptions()
    fetchSuppliers()
    fetchPurchaseOrders()
    fetchSupplies()
    fetchSupplyCategories()
  }, [])

  // Generate reception number
  const generateReceptionNumber = async (): Promise<string> => {
    const year = new Date().getFullYear()
    const prefix = `BR-${year}-`

    try {
      // Query the last reception number for this year
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('receptions') as any)
        .select('reception_number')
        .like('reception_number', `${prefix}%`)
        .order('reception_number', { ascending: false })
        .limit(1)

      if (data && data.length > 0) {
        const lastNumber = parseInt(data[0].reception_number.replace(prefix, '')) || 0
        return `${prefix}${(lastNumber + 1).toString().padStart(6, '0')}`
      }

      return `${prefix}000001`
    } catch (err) {
      console.error('Error generating reception number:', err)
      const timestamp = Date.now().toString().slice(-6)
      return `${prefix}${timestamp}`
    }
  }

  // Handle PDF export
  const handleExportPDF = async (reception: Reception) => {
    if (!reception.supplier || !reception.reception_items) {
      alert('Données incomplètes pour générer le PDF')
      return
    }

    await generateReceptionPDF({
      id: reception.id,
      reception_number: reception.reception_number,
      reception_date: reception.reception_date,
      total_ht: reception.total_ht || 0,
      notes: reception.notes,
      supplier: {
        code: reception.supplier.code,
        name: reception.supplier.name,
        contact_name: reception.supplier.contact_name,
        phone: reception.supplier.phone,
        email: reception.supplier.email,
        address: reception.supplier.address,
      },
      purchase_order: reception.purchase_order,
      reception_items: reception.reception_items.map(item => {
        const supply = supplies.find(s => s.id === item.article_id)
        return {
          article: {
            code: supply?.code || '-',
            name: supply?.name || '-',
            description: null,
          },
          quantity_received: item.quantity_received,
          unit_price: item.unit_price,
        }
      }),
    }, companySettings)
  }

  // Handle purchase order selection - auto-fill items
  const handlePurchaseOrderSelect = (poId: string) => {
    const po = purchaseOrders.find(p => p.id === poId)
    if (po) {
      setFormData({
        ...formData,
        purchase_order_id: poId,
        supplier_id: po.supplier_id,
      })

      // Pre-fill items from PO
      if (po.purchase_order_items) {
        setReceptionItems(po.purchase_order_items.map(item => ({
          article_id: item.supply_id,
          article_name: item.supply?.name || '',
          article_code: item.supply?.code || '',
          quantity_ordered: item.quantity,
          quantity_received: item.quantity, // Default to full reception
          unit_price: item.unit_price,
          total_ht: item.quantity * item.unit_price,
        })))
      }
    }
  }

  const addItem = () => {
    if (!selectedArticle || !selectedQuantityReceived || !selectedPrice) return

    const supply = supplies.find(s => s.id === selectedArticle)
    if (!supply) return

    const quantityOrdered = parseDecimalInput(selectedQuantityOrdered)
    const quantityReceived = parseDecimalInput(selectedQuantityReceived)
    const unit_price = parseDecimalInput(selectedPrice)
    const total_ht = unit_price * quantityReceived

    setReceptionItems([...receptionItems, {
      article_id: supply.id,
      article_name: supply.name,
      article_code: supply.code,
      quantity_ordered: quantityOrdered,
      quantity_received: quantityReceived,
      unit_price,
      total_ht,
    }])

    setSelectedArticle('')
    setSelectedQuantityOrdered('0')
    setSelectedQuantityReceived('1')
    setSelectedPrice('')
    setSupplySearch('')
  }

  const removeItem = (index: number) => {
    setReceptionItems(receptionItems.filter((_, i) => i !== index))
  }

  const updateItemQuantity = (index: number, newQuantityStr: string) => {
    const items = [...receptionItems]
    const newQuantity = parseDecimalInput(newQuantityStr)
    items[index].quantity_received = newQuantity
    items[index].total_ht = newQuantity * items[index].unit_price
    setReceptionItems(items)
  }

  const handleSupplySelect = (supplyId: string) => {
    const supply = supplies.find(s => s.id === supplyId)
    if (supply) {
      setSelectedArticle(supplyId)
      setSelectedPrice((supply.price_ht ?? 0).toString())
      setSupplySearch(`${supply.code} - ${supply.name}`)
      setShowSupplyDropdown(false)
      setIsDropdownHovered(false)
    }
  }

  // Filtrer les fournitures selon la catégorie et la recherche
  const filteredSuppliesForSelect = supplies
    .filter(s => s.is_active !== false)
    .filter(s => {
      // Filtre par catégorie
      if (selectedCategoryFilter !== 'all' && s.category_id !== selectedCategoryFilter) {
        return false
      }
      // Filtre par recherche textuelle
      if (!supplySearch) return true
      const search = supplySearch.toLowerCase()
      return s.code.toLowerCase().includes(search) ||
             s.name.toLowerCase().includes(search)
    })
    .slice(0, 20) // Limiter à 20 résultats

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.supplier_id || receptionItems.length === 0) {
      alert('Veuillez sélectionner un fournisseur et ajouter des articles')
      return
    }

    const total_ht = receptionItems.reduce((sum, item) => sum + item.total_ht, 0)
    const receptionNumber = await generateReceptionNumber()

    // Create reception
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newReception, error: receptionError } = await (supabase.from('receptions') as any)
      .insert([{
        reception_number: receptionNumber,
        purchase_order_id: formData.purchase_order_id || null,
        supplier_id: formData.supplier_id,
        reception_date: formData.reception_date,
        total_ht,
        notes: formData.notes || null,
      }])
      .select()
      .single()

    if (receptionError) {
      console.error('Error creating reception:', receptionError)
      alert('Erreur lors de la création du BR')
      return
    }

    // Create reception items
    const itemsToInsert = receptionItems.map(item => ({
      reception_id: newReception.id,
      article_id: item.article_id,
      quantity_expected: item.quantity_ordered,
      quantity_received: item.quantity_received,
      unit_price: item.unit_price,
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: itemsError } = await (supabase.from('reception_items') as any)
      .insert(itemsToInsert)

    if (itemsError) {
      console.error('Error creating reception items:', itemsError)
    }

    // Update purchase order status if linked
    if (formData.purchase_order_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('purchase_orders') as any)
        .update({ status: 'received' })
        .eq('id', formData.purchase_order_id)
    }

    // Update stock
    for (const item of receptionItems) {
      // Check if stock entry exists
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingStock } = await (supabase.from('stock') as any)
        .select('id, quantity')
        .eq('article_id', item.article_id)
        .single() as { data: { id: string; quantity: number } | null }

      if (existingStock) {
        // Update existing stock
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('stock') as any)
          .update({
            quantity: existingStock.quantity + item.quantity_received,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingStock.id)
      } else {
        // Create new stock entry
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('stock') as any)
          .insert([{
            article_id: item.article_id,
            quantity: item.quantity_received,
            warehouse: 'principal',
          }])
      }

      // Create stock movement
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('stock_movements') as any)
        .insert([{
          article_id: item.article_id,
          quantity: item.quantity_received,
          movement_type: 'in',
          reference_type: 'reception',
          reference_id: newReception.id,
          notes: `Réception BR ${receptionNumber}`,
        }])
    }

    // Upload documents
    if (documents.length > 0) {
      await uploadDocuments(newReception.id)
    }

    fetchReceptions()
    fetchPurchaseOrders()
    setIsDialogOpen(false)
    resetForm()
  }

  const handleDelete = async (id: string, receptionNumber: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le BR ${receptionNumber} ?`)) {
      return
    }

    // Delete items first
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('reception_items') as any).delete().eq('reception_id', id)

    // Delete reception
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('receptions') as any).delete().eq('id', id)

    if (error) {
      console.error('Error deleting reception:', error)
      alert('Erreur lors de la suppression')
    } else {
      fetchReceptions()
    }
  }

  const handleView = (reception: Reception) => {
    setViewingReception(reception)
    setIsViewDialogOpen(true)
  }

  const handleEdit = (reception: Reception) => {
    setEditingReception(reception)
    setFormData({
      supplier_id: reception.supplier_id,
      purchase_order_id: reception.purchase_order_id || '',
      reception_date: reception.reception_date,
      notes: reception.notes || '',
    })

    // Pré-remplir les articles
    if (reception.reception_items) {
      const items: ReceptionItem[] = reception.reception_items.map(item => {
        const supply = supplies.find(s => s.id === item.article_id)
        return {
          article_id: item.article_id,
          article_name: supply?.name || '',
          article_code: supply?.code || '',
          quantity_ordered: item.quantity_expected,
          quantity_received: item.quantity_received,
          unit_price: item.unit_price,
          total_ht: item.quantity_received * item.unit_price,
        }
      })
      setReceptionItems(items)
    }

    setIsEditDialogOpen(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingReception || !formData.supplier_id || receptionItems.length === 0) {
      alert('Veuillez sélectionner un fournisseur et ajouter des articles')
      return
    }

    const total_ht = receptionItems.reduce((sum, item) => sum + item.total_ht, 0)

    // Mettre à jour la réception
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: receptionError } = await (supabase.from('receptions') as any)
      .update({
        purchase_order_id: formData.purchase_order_id || null,
        supplier_id: formData.supplier_id,
        reception_date: formData.reception_date,
        total_ht,
        notes: formData.notes || null,
      })
      .eq('id', editingReception.id)

    if (receptionError) {
      console.error('Error updating reception:', receptionError)
      alert('Erreur lors de la mise à jour du BR')
      return
    }

    // Supprimer les anciens articles
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('reception_items') as any).delete().eq('reception_id', editingReception.id)

    // Insérer les nouveaux articles
    const itemsToInsert = receptionItems.map(item => ({
      reception_id: editingReception.id,
      article_id: item.article_id,
      quantity_expected: item.quantity_ordered,
      quantity_received: item.quantity_received,
      unit_price: item.unit_price,
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: itemsError } = await (supabase.from('reception_items') as any)
      .insert(itemsToInsert)

    if (itemsError) {
      console.error('Error updating reception items:', itemsError)
    }

    fetchReceptions()
    setIsEditDialogOpen(false)
    setEditingReception(null)
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      supplier_id: '',
      purchase_order_id: '',
      reception_date: new Date().toISOString().split('T')[0],
      notes: '',
    })
    setReceptionItems([])
    setSelectedArticle('')
    setSelectedQuantityOrdered('0')
    setSelectedQuantityReceived('1')
    setSelectedPrice('')
    setSupplySearch('')
    setSelectedCategoryFilter('all')
    // Clear documents and revoke object URLs
    documents.forEach(doc => {
      if (doc.chemin.startsWith('blob:')) {
        URL.revokeObjectURL(doc.chemin)
      }
    })
    setDocuments([])
  }

  const filteredReceptions = receptions.filter(
    (reception) =>
      reception.reception_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reception.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatPrice = (price: number | null) => {
    if (price === null) return '-'
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
    }).format(price)
  }

  // Helper pour parser les nombres avec virgule ou point comme séparateur décimal
  const parseDecimalInput = (value: string): number => {
    if (!value) return 0
    // Remplacer la virgule par un point pour le parsing
    const normalized = value.replace(',', '.')
    const parsed = parseFloat(normalized)
    return isNaN(parsed) ? 0 : parsed
  }

  // Document handling functions
  const getDocumentType = (file: File): 'pdf' | 'image' | 'scan' => {
    if (file.type === 'application/pdf') return 'pdf'
    return 'image'
  }

  const handleFileSelect = (files: FileList | null, type?: 'scan') => {
    if (!files) return

    const newDocs: ReceptionDocument[] = Array.from(files).map(file => ({
      nom: file.name,
      type: type === 'scan' ? 'scan' : getDocumentType(file),
      chemin: URL.createObjectURL(file),
      file: file,
    }))

    setDocuments([...documents, ...newDocs])
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const removeDocument = (index: number) => {
    const doc = documents[index]
    if (doc.chemin.startsWith('blob:')) {
      URL.revokeObjectURL(doc.chemin)
    }
    setDocuments(documents.filter((_, i) => i !== index))
  }

  const uploadDocuments = async (receptionId: string) => {
    for (const doc of documents) {
      if (!doc.file) continue

      const fileExt = doc.file.name.split('.').pop()
      const fileName = `${receptionId}/${Date.now()}-${doc.nom}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('reception-documents')
        .upload(fileName, doc.file)

      if (uploadError) {
        console.error('Error uploading document:', uploadError)
        continue
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('reception-documents')
        .getPublicUrl(fileName)

      // Save to database
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('reception_documents') as any).insert({
        reception_id: receptionId,
        nom: doc.nom,
        type: doc.type,
        chemin: publicUrl,
      })
    }
  }

  return (
    <ProtectedModule module="receptions">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Réceptions</h1>
            <p className="text-gray-500">Gérez vos bons de réception (BR)</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <ProtectedModule module="receptions" action="create">
                <Button
                  className="bg-[#B8860B] hover:bg-[#9A7209]"
                  onClick={() => {
                    resetForm()
                    setIsDialogOpen(true)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nouveau bon de réception
                </Button>
              </ProtectedModule>
            </DialogTrigger>
            <DialogContent resizable className="w-[900px] min-w-[600px] min-h-[500px] max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>Nouveau bon de réception</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Bon de commande (optionnel)</Label>
                    <select
                      value={formData.purchase_order_id}
                      onChange={(e) => {
                        if (e.target.value) {
                          handlePurchaseOrderSelect(e.target.value)
                        } else {
                          setFormData({ ...formData, purchase_order_id: '' })
                          setReceptionItems([])
                        }
                      }}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
                    >
                      <option value="">Sélectionner un BC</option>
                      {purchaseOrders.map((po) => (
                        <option key={po.id} value={po.id}>
                          {po.po_number}
                        </option>
                      ))}
                    </select>
                  </div>
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
                    <Label htmlFor="reception_date">Date de réception</Label>
                    <Input
                      id="reception_date"
                      type="date"
                      value={formData.reception_date}
                      onChange={(e) => setFormData({ ...formData, reception_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Input
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Notes optionnelles"
                    />
                  </div>
                </div>

                <Tabs defaultValue="fournitures" className="border-t pt-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="fournitures">Fournitures</TabsTrigger>
                    <TabsTrigger value="documents">
                      Documents {documents.length > 0 && `(${documents.length})`}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="fournitures" className="mt-4 flex-1 min-h-[300px]">
                    {/* Filtre par catégorie */}
                    <div className="mb-4">
                      <Label className="text-xs text-gray-500 mb-1 block">Filtrer par catégorie</Label>
                      <Select
                        value={selectedCategoryFilter}
                        onValueChange={(value) => {
                          setSelectedCategoryFilter(value)
                          setSupplySearch('')
                          setSelectedArticle('')
                          setShowSupplyDropdown(value !== 'all')
                        }}
                      >
                        <SelectTrigger className="w-full md:w-64">
                          <SelectValue placeholder="Toutes les catégories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes les catégories</SelectItem>
                          {supplyCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-12 gap-2 mb-4 items-end">
                      <div className="col-span-6 relative">
                        <Label className="text-xs text-gray-500 mb-1 block">Fourniture (tapez pour rechercher)</Label>
                        <Input
                          type="text"
                          placeholder="Rechercher: code ou nom (ex: etq 5 ove)"
                          value={supplySearch}
                          onChange={(e) => {
                            setSupplySearch(e.target.value)
                            setSelectedArticle('')
                            setShowSupplyDropdown(true)
                          }}
                          onFocus={() => setShowSupplyDropdown(true)}
                          onBlur={() => {
                            if (!isDropdownHovered) {
                              setTimeout(() => setShowSupplyDropdown(false), 150)
                            }
                          }}
                        />
                        {showSupplyDropdown && (selectedCategoryFilter !== 'all' || supplySearch) && filteredSuppliesForSelect.length > 0 && (
                          <div
                            className="absolute z-[100] w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-80 overflow-y-auto"
                            onMouseEnter={() => setIsDropdownHovered(true)}
                            onMouseLeave={() => setIsDropdownHovered(false)}
                          >
                            {filteredSuppliesForSelect.map((supply) => (
                              <div
                                key={supply.id}
                                className="px-3 py-2 hover:bg-[#B8860B]/10 cursor-pointer text-sm"
                                onMouseDown={() => handleSupplySelect(supply.id)}
                              >
                                <span className="font-medium text-[#B8860B]">{supply.code}</span>
                                <span className="text-gray-600"> - {supply.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {showSupplyDropdown && (selectedCategoryFilter !== 'all' || supplySearch) && filteredSuppliesForSelect.length === 0 && (
                          <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-3 text-sm text-gray-500">
                            Aucune fourniture trouvée
                          </div>
                        )}
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs text-gray-500 mb-1 block">Qte Reçue</Label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={selectedQuantityReceived}
                          onChange={(e) => setSelectedQuantityReceived(e.target.value)}
                          placeholder="1"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs text-gray-500 mb-1 block">Prix HT</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={selectedPrice}
                          onChange={(e) => setSelectedPrice(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="col-span-2">
                        <Button type="button" onClick={addItem} variant="outline" className="w-full">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {receptionItems.length > 0 && (
                      <div className="max-h-[250px] overflow-y-auto border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Code</TableHead>
                            <TableHead>Fourniture</TableHead>
                            <TableHead className="text-right">Qté Reçue</TableHead>
                            <TableHead className="text-right">Prix unit.</TableHead>
                            <TableHead className="text-right">Total HT</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {receptionItems.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>{item.article_code}</TableCell>
                              <TableCell>{item.article_name}</TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  value={item.quantity_received}
                                  onChange={(e) => updateItemQuantity(index, e.target.value)}
                                  className="w-20 text-right"
                                />
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
                          ))}
                          <TableRow>
                            <TableCell colSpan={4} className="text-right font-medium">
                              Total HT:
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              {formatPrice(receptionItems.reduce((sum, item) => sum + item.total_ht, 0))}
                            </TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="documents" className="mt-4 space-y-4">
                    {/* Zone de glisser-déposer */}
                    <div
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        isDragging
                          ? 'border-[#B8860B] bg-[#B8860B]/5'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <Upload className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                      <p className="text-gray-600 mb-2">
                        Glissez-déposez vos fichiers ici
                      </p>
                      <p className="text-sm text-gray-400">
                        PDF, JPEG, PNG (max 25 MB)
                      </p>
                    </div>

                    {/* Boutons d'import */}
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const input = document.createElement('input')
                          input.type = 'file'
                          input.accept = 'application/pdf'
                          input.multiple = true
                          input.onchange = (e) => handleFileSelect((e.target as HTMLInputElement).files)
                          input.click()
                        }}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Importer PDF
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const input = document.createElement('input')
                          input.type = 'file'
                          input.accept = 'image/*'
                          input.multiple = true
                          input.onchange = (e) => handleFileSelect((e.target as HTMLInputElement).files)
                          input.click()
                        }}
                      >
                        <Image className="h-4 w-4 mr-2" />
                        Importer Image
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const input = document.createElement('input')
                          input.type = 'file'
                          input.accept = 'image/*'
                          input.capture = 'environment'
                          input.onchange = (e) => handleFileSelect((e.target as HTMLInputElement).files, 'scan')
                          input.click()
                        }}
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Scanner
                      </Button>
                    </div>

                    {/* Tableau des documents */}
                    {documents.length > 0 && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nom</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Aperçu</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {documents.map((doc, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{doc.nom}</TableCell>
                              <TableCell>
                                <Badge variant={doc.type === 'pdf' ? 'default' : doc.type === 'scan' ? 'secondary' : 'outline'}>
                                  {doc.type === 'pdf' ? 'PDF' : doc.type === 'scan' ? 'Scan' : 'Image'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {doc.type !== 'pdf' && (
                                  <img
                                    src={doc.chemin}
                                    alt={doc.nom}
                                    className="h-10 w-10 object-cover rounded"
                                  />
                                )}
                                {doc.type === 'pdf' && (
                                  <FileText className="h-10 w-10 text-red-500" />
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeDocument(index)}
                                >
                                  <X className="h-4 w-4 text-red-600" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}

                    {documents.length === 0 && (
                      <p className="text-center text-gray-500 py-4">
                        Aucun document ajouté
                      </p>
                    )}
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" className="bg-[#B8860B] hover:bg-[#9A7209]">
                    Créer le BR
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total BR
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <PackageCheck className="h-8 w-8 text-[#B8860B]" />
                <span className="text-2xl font-bold">{receptions.length}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Ce mois
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-blue-600">
                {receptions.filter(r => {
                  const receptionDate = new Date(r.reception_date)
                  const now = new Date()
                  return receptionDate.getMonth() === now.getMonth() &&
                         receptionDate.getFullYear() === now.getFullYear()
                }).length}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total valeur
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-[#B8860B]">
                {formatPrice(receptions.reduce((sum, r) => sum + (r.total_ht || 0), 0))}
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
                  placeholder="Rechercher un bon de réception..."
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
            ) : filteredReceptions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Aucun bon de réception trouvé
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° BR</TableHead>
                    <TableHead>Ref BC</TableHead>
                    <TableHead>Fournisseur</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Total HT</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReceptions.map((reception) => (
                    <TableRow key={reception.id}>
                      <TableCell className="font-medium">{reception.reception_number}</TableCell>
                      <TableCell>
                        {reception.purchase_order?.po_number || (
                          <Badge variant="outline">Sans BC</Badge>
                        )}
                      </TableCell>
                      <TableCell>{reception.supplier?.name}</TableCell>
                      <TableCell>
                        {format(new Date(reception.reception_date), 'dd/MM/yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell className="text-right">{formatPrice(reception.total_ht)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleView(reception)}
                            title="Voir détails"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <ProtectedModule module="receptions" action="edit">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(reception)}
                              title="Modifier"
                            >
                              <Pencil className="h-4 w-4 text-amber-600" />
                            </Button>
                          </ProtectedModule>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleExportPDF(reception)}
                            title="Exporter PDF"
                          >
                            <FileDown className="h-4 w-4 text-blue-600" />
                          </Button>
                          <ProtectedModule module="receptions" action="delete">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(reception.id, reception.reception_number)}
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </ProtectedModule>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* View Reception Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Bon de Réception {viewingReception?.reception_number}
              </DialogTitle>
            </DialogHeader>
            {viewingReception && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Fournisseur:</span>
                    <p className="font-medium">
                      {viewingReception.supplier?.code} - {viewingReception.supplier?.name}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Date:</span>
                    <p className="font-medium">
                      {format(new Date(viewingReception.reception_date), 'dd/MM/yyyy', { locale: fr })}
                    </p>
                  </div>
                  {viewingReception.purchase_order && (
                    <div>
                      <span className="text-gray-500">Réf. BC:</span>
                      <p className="font-medium">{viewingReception.purchase_order.po_number}</p>
                    </div>
                  )}
                  {viewingReception.notes && (
                    <div className="col-span-2">
                      <span className="text-gray-500">Notes:</span>
                      <p className="font-medium">{viewingReception.notes}</p>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium mb-3">Fournitures reçues</h3>
                  {(!viewingReception.reception_items || viewingReception.reception_items.length === 0) ? (
                    <p className="text-gray-500 text-center py-4">Aucun article dans ce bon de réception</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Fourniture</TableHead>
                          <TableHead className="text-right">Qté Reçue</TableHead>
                          <TableHead className="text-right">Prix unit.</TableHead>
                          <TableHead className="text-right">Total HT</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewingReception.reception_items.map((item) => {
                          const supply = supplies.find(s => s.id === item.article_id)
                          return (
                            <TableRow key={item.id}>
                              <TableCell>{supply?.code || '-'}</TableCell>
                              <TableCell>{supply?.name || '-'}</TableCell>
                              <TableCell className="text-right">{item.quantity_received}</TableCell>
                              <TableCell className="text-right">{formatPrice(item.unit_price)}</TableCell>
                              <TableCell className="text-right">{formatPrice(item.quantity_received * item.unit_price)}</TableCell>
                            </TableRow>
                          )
                        })}
                        <TableRow>
                          <TableCell colSpan={4} className="text-right font-medium">
                            Total HT:
                          </TableCell>
                          <TableCell className="text-right font-bold text-[#B8860B]">
                            {formatPrice(viewingReception.total_ht)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  )}
                </div>

                {/* Section Documents */}
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-3">Documents associés</h3>
                  {viewingReception.reception_documents && viewingReception.reception_documents.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nom</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Aperçu</TableHead>
                          <TableHead className="text-right">Télécharger</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewingReception.reception_documents.map((doc) => (
                          <TableRow key={doc.id}>
                            <TableCell className="font-medium">{doc.nom}</TableCell>
                            <TableCell>
                              <Badge variant={doc.type === 'pdf' ? 'default' : doc.type === 'scan' ? 'secondary' : 'outline'}>
                                {doc.type === 'pdf' ? 'PDF' : doc.type === 'scan' ? 'Scan' : 'Image'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {doc.type !== 'pdf' ? (
                                <a href={doc.chemin} target="_blank" rel="noopener noreferrer">
                                  <img
                                    src={doc.chemin}
                                    alt={doc.nom}
                                    className="h-12 w-12 object-cover rounded cursor-pointer hover:opacity-80"
                                  />
                                </a>
                              ) : (
                                <FileText className="h-10 w-10 text-red-500" />
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.open(doc.chemin, '_blank')}
                              >
                                <Download className="h-4 w-4 text-blue-600" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-gray-500 text-center py-4">Aucun document associé</p>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => handleExportPDF(viewingReception)}
                  >
                    <FileDown className="mr-2 h-4 w-4" />
                    Exporter PDF
                  </Button>
                  <Button onClick={() => setIsViewDialogOpen(false)}>
                    Fermer
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Reception Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent resizable className="w-[900px] min-w-[600px] min-h-[500px] max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Modifier le BR {editingReception?.reception_number}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdate} className="space-y-4 flex-1 flex flex-col">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bon de commande (optionnel)</Label>
                  <select
                    value={formData.purchase_order_id}
                    onChange={(e) => {
                      if (e.target.value) {
                        handlePurchaseOrderSelect(e.target.value)
                      } else {
                        setFormData({ ...formData, purchase_order_id: '' })
                      }
                    }}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
                  >
                    <option value="">Sélectionner un BC</option>
                    {purchaseOrders.map((po) => (
                      <option key={po.id} value={po.id}>
                        {po.po_number}
                      </option>
                    ))}
                  </select>
                </div>
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
                  <Label htmlFor="edit_reception_date">Date de réception</Label>
                  <Input
                    id="edit_reception_date"
                    type="date"
                    value={formData.reception_date}
                    onChange={(e) => setFormData({ ...formData, reception_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_notes">Notes</Label>
                  <Input
                    id="edit_notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Notes optionnelles"
                  />
                </div>
              </div>

              <div className="border-t pt-4 flex-1 min-h-[300px]">
                <h3 className="font-medium mb-4">Fournitures</h3>

                {/* Filtre par catégorie */}
                <div className="mb-4">
                  <Label className="text-xs text-gray-500 mb-1 block">Filtrer par catégorie</Label>
                  <Select
                    value={selectedCategoryFilter}
                    onValueChange={(value) => {
                      setSelectedCategoryFilter(value)
                      setSupplySearch('')
                      setSelectedArticle('')
                      setShowSupplyDropdown(value !== 'all')
                    }}
                  >
                    <SelectTrigger className="w-full md:w-64">
                      <SelectValue placeholder="Toutes les catégories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les catégories</SelectItem>
                      {supplyCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-12 gap-2 mb-4 items-end">
                  <div className="col-span-6 relative">
                    <Label className="text-xs text-gray-500 mb-1 block">Fourniture (tapez pour rechercher)</Label>
                    <Input
                      type="text"
                      placeholder="Rechercher: code ou nom"
                      value={supplySearch}
                      onChange={(e) => {
                        setSupplySearch(e.target.value)
                        setSelectedArticle('')
                        setShowSupplyDropdown(true)
                      }}
                      onFocus={() => setShowSupplyDropdown(true)}
                      onBlur={() => {
                        if (!isDropdownHovered) {
                          setTimeout(() => setShowSupplyDropdown(false), 150)
                        }
                      }}
                    />
                    {showSupplyDropdown && (selectedCategoryFilter !== 'all' || supplySearch) && filteredSuppliesForSelect.length > 0 && (
                      <div
                        className="absolute z-[100] w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-80 overflow-y-auto"
                        onMouseEnter={() => setIsDropdownHovered(true)}
                        onMouseLeave={() => setIsDropdownHovered(false)}
                      >
                        {filteredSuppliesForSelect.map((supply) => (
                          <div
                            key={supply.id}
                            className="px-3 py-2 hover:bg-[#B8860B]/10 cursor-pointer text-sm"
                            onMouseDown={() => handleSupplySelect(supply.id)}
                          >
                            <span className="font-medium text-[#B8860B]">{supply.code}</span>
                            <span className="text-gray-600"> - {supply.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-gray-500 mb-1 block">Qte Reçue</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={selectedQuantityReceived}
                      onChange={(e) => setSelectedQuantityReceived(e.target.value)}
                      placeholder="1"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-gray-500 mb-1 block">Prix HT</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={selectedPrice}
                      onChange={(e) => setSelectedPrice(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="col-span-2">
                    <Button type="button" onClick={addItem} variant="outline" className="w-full">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {receptionItems.length > 0 && (
                  <div className="max-h-[250px] overflow-y-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Fourniture</TableHead>
                        <TableHead className="text-right">Qté Reçue</TableHead>
                        <TableHead className="text-right">Prix unit.</TableHead>
                        <TableHead className="text-right">Total HT</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receptionItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.article_code}</TableCell>
                          <TableCell>{item.article_name}</TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={item.quantity_received}
                              onChange={(e) => updateItemQuantity(index, e.target.value)}
                              className="w-20 text-right"
                            />
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
                      ))}
                      <TableRow>
                        <TableCell colSpan={4} className="text-right font-medium">
                          Total HT:
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatPrice(receptionItems.reduce((sum, item) => sum + item.total_ht, 0))}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setIsEditDialogOpen(false)
                  setEditingReception(null)
                  resetForm()
                }}>
                  Annuler
                </Button>
                <Button type="submit" className="bg-[#B8860B] hover:bg-[#9A7209]">
                  Enregistrer les modifications
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedModule>
  )
}
