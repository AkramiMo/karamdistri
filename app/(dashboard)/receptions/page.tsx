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
import { Plus, Search, Eye, PackageCheck, Trash2, FileDown } from 'lucide-react'
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
    article: {
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

interface PurchaseOrder {
  id: string
  po_number: string
  supplier_id: string
  total_ht: number
  purchase_order_items?: {
    id: string
    article_id: string
    quantity: number
    unit_price: number
    article: {
      code: string
      name: string
    }
  }[]
}

interface Article {
  id: string
  code: string
  name: string
  price_ht: number
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

export default function ReceptionsPage() {
  const [receptions, setReceptions] = useState<Reception[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
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
            unit_price,
            article:articles(code, name, description)
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
    const { data } = await supabase
      .from('purchase_orders')
      .select(`
        id, po_number, supplier_id, total_ht,
        purchase_order_items(
          id, article_id, quantity, unit_price,
          article:articles(code, name)
        )
      `)
      .in('status', ['sent', 'partial'])
      .order('created_at', { ascending: false })
    setPurchaseOrders(data || [])
  }

  const fetchArticles = async () => {
    const { data } = await supabase
      .from('articles')
      .select('id, code, name, price_ht')
      .eq('is_active', true)
      .order('name')
    setArticles(data || [])
  }

  useEffect(() => {
    fetchReceptions()
    fetchSuppliers()
    fetchPurchaseOrders()
    fetchArticles()
  }, [])

  // Generate reception number
  const generateReceptionNumber = async (): Promise<string> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('get_next_document_number', {
        p_document_type: 'reception'
      })

      if (error || !data) {
        const date = new Date()
        const year = date.getFullYear()
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
        return `BR-${year}-${random}`
      }

      return data
    } catch {
      const date = new Date()
      const year = date.getFullYear()
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
      return `BR-${year}-${random}`
    }
  }

  // Handle PDF export
  const handleExportPDF = (reception: Reception) => {
    if (!reception.supplier || !reception.reception_items) {
      alert('Données incomplètes pour générer le PDF')
      return
    }

    generateReceptionPDF({
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
      reception_items: reception.reception_items.map(item => ({
        article: {
          code: item.article.code,
          name: item.article.name,
          description: item.article.description,
        },
        quantity_expected: item.quantity_expected,
        quantity_received: item.quantity_received,
        unit_price: item.unit_price,
      })),
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
          article_id: item.article_id,
          article_name: item.article.name,
          article_code: item.article.code,
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

    const article = articles.find(a => a.id === selectedArticle)
    if (!article) return

    const quantityOrdered = parseInt(selectedQuantityOrdered) || 0
    const quantityReceived = parseInt(selectedQuantityReceived)
    const unit_price = parseFloat(selectedPrice)
    const total_ht = unit_price * quantityReceived

    setReceptionItems([...receptionItems, {
      article_id: article.id,
      article_name: article.name,
      article_code: article.code,
      quantity_ordered: quantityOrdered,
      quantity_received: quantityReceived,
      unit_price,
      total_ht,
    }])

    setSelectedArticle('')
    setSelectedQuantityOrdered('0')
    setSelectedQuantityReceived('1')
    setSelectedPrice('')
  }

  const removeItem = (index: number) => {
    setReceptionItems(receptionItems.filter((_, i) => i !== index))
  }

  const updateItemQuantity = (index: number, newQuantity: number) => {
    const items = [...receptionItems]
    items[index].quantity_received = newQuantity
    items[index].total_ht = newQuantity * items[index].unit_price
    setReceptionItems(items)
  }

  const handleArticleSelect = (articleId: string) => {
    const article = articles.find(a => a.id === articleId)
    if (article) {
      setSelectedArticle(articleId)
      setSelectedPrice(article.price_ht.toString())
    }
  }

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
                  className="bg-green-600 hover:bg-green-700"
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
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nouveau bon de réception</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Bon de commande (optionnel)</Label>
                    <Select
                      value={formData.purchase_order_id}
                      onValueChange={handlePurchaseOrderSelect}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un BC" />
                      </SelectTrigger>
                      <SelectContent>
                        {purchaseOrders.map((po) => (
                          <SelectItem key={po.id} value={po.id}>
                            {po.po_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

                <div className="border-t pt-4">
                  <h3 className="font-medium mb-3">Articles reçus</h3>
                  <div className="flex gap-2 mb-4">
                    <Select value={selectedArticle} onValueChange={handleArticleSelect}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Ajouter un article" />
                      </SelectTrigger>
                      <SelectContent>
                        {articles.map((article) => (
                          <SelectItem key={article.id} value={article.id}>
                            {article.code} - {article.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="0"
                      value={selectedQuantityOrdered}
                      onChange={(e) => setSelectedQuantityOrdered(e.target.value)}
                      className="w-24"
                      placeholder="Cmd"
                      title="Quantité commandée"
                    />
                    <Input
                      type="number"
                      min="1"
                      value={selectedQuantityReceived}
                      onChange={(e) => setSelectedQuantityReceived(e.target.value)}
                      className="w-24"
                      placeholder="Reçu"
                      title="Quantité reçue"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      value={selectedPrice}
                      onChange={(e) => setSelectedPrice(e.target.value)}
                      className="w-32"
                      placeholder="Prix"
                    />
                    <Button type="button" onClick={addItem} variant="outline">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {receptionItems.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Article</TableHead>
                          <TableHead className="text-right">Qté Cmd</TableHead>
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
                            <TableCell className="text-right">{item.quantity_ordered}</TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                min="0"
                                value={item.quantity_received}
                                onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 0)}
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
                          <TableCell colSpan={5} className="text-right font-medium">
                            Total HT:
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {formatPrice(receptionItems.reduce((sum, item) => sum + item.total_ht, 0))}
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" className="bg-green-600 hover:bg-green-700">
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
                <PackageCheck className="h-8 w-8 text-green-600" />
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
              <span className="text-2xl font-bold text-green-600">
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
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
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
                  <h3 className="font-medium mb-3">Articles reçus</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Article</TableHead>
                        <TableHead className="text-right">Qté Cmd</TableHead>
                        <TableHead className="text-right">Qté Reçue</TableHead>
                        <TableHead className="text-right">Prix unit.</TableHead>
                        <TableHead className="text-right">Total HT</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewingReception.reception_items?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.article.code}</TableCell>
                          <TableCell>{item.article.name}</TableCell>
                          <TableCell className="text-right">{item.quantity_expected}</TableCell>
                          <TableCell className="text-right">{item.quantity_received}</TableCell>
                          <TableCell className="text-right">{formatPrice(item.unit_price)}</TableCell>
                          <TableCell className="text-right">{formatPrice(item.quantity_received * item.unit_price)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={5} className="text-right font-medium">
                          Total HT:
                        </TableCell>
                        <TableCell className="text-right font-bold text-green-600">
                          {formatPrice(viewingReception.total_ht)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
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
      </div>
    </ProtectedModule>
  )
}
