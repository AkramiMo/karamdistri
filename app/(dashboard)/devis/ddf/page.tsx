'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSupabase } from '@/hooks/useSupabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  Eye,
  Pencil,
  Trash2,
  RefreshCw,
  Building2,
  FileText,
  CheckCircle2,
  Send,
  Download,
} from 'lucide-react'
import { generateDDFPDF } from '@/lib/pdf/ddf'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Supplier {
  id: string
  code: string
  name: string
  phone: string | null
  email: string | null
}

interface Supply {
  id: string
  code: string
  name: string
  price_ht: number
}

interface DDFItem {
  id?: string
  supply_id: string
  supply_code: string
  supply_name: string
  quantity: string | number
  estimated_price: number
}

interface DDF {
  id: string
  ddf_number: string
  supplier_id: string
  supplier?: Supplier
  request_date: string
  response_deadline: string | null
  status: string
  notes: string | null
  created_at: string
  ddf_items?: DDFItem[]
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  received: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

const statusLabels: Record<string, string> = {
  draft: 'Brouillon',
  sent: 'Envoyé',
  received: 'Réponse reçue',
  cancelled: 'Annulé',
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
  }).format(price)
}

export default function DDFPage() {
  const supabase = useSupabase()
  const [ddfs, setDdfs] = useState<DDF[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [supplies, setSupplies] = useState<Supply[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [viewingDDF, setViewingDDF] = useState<DDF | null>(null)
  const [editingDDF, setEditingDDF] = useState<DDF | null>(null)

  const [formData, setFormData] = useState({
    supplier_id: '',
    request_date: new Date().toISOString().split('T')[0],
    response_deadline: '',
    notes: '',
  })
  const [formItems, setFormItems] = useState<DDFItem[]>([])

  const fetchDDFs = useCallback(async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('supplier_quote_requests')
      .select(`
        *,
        supplier:suppliers(id, code, name, phone, email),
        ddf_items:supplier_quote_request_items(*)
      `)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setDdfs(data)
    }
    setIsLoading(false)
  }, [supabase])

  const fetchSuppliers = useCallback(async () => {
    const { data } = await supabase
      .from('suppliers')
      .select('id, code, name, phone, email')
      .eq('is_active', true)
      .order('name')

    if (data) setSuppliers(data)
  }, [supabase])

  const fetchSupplies = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('supplies') as any)
      .select('id, code, name, price_ht')
      .eq('is_active', true)
      .order('name')

    if (data) setSupplies(data as Supply[])
  }, [supabase])

  useEffect(() => {
    fetchDDFs()
    fetchSuppliers()
    fetchSupplies()
  }, [fetchDDFs, fetchSuppliers, fetchSupplies])

  const generateDDFNumber = async (): Promise<string> => {
    const year = new Date().getFullYear()
    const prefix = `DDF-${year}-`

    const { data } = await supabase
      .from('supplier_quote_requests')
      .select('ddf_number')
      .like('ddf_number', `${prefix}%`)
      .order('ddf_number', { ascending: false })
      .limit(1)

    if (data && data.length > 0) {
      const lastNum = parseInt(data[0].ddf_number.replace(prefix, '')) || 0
      return `${prefix}${String(lastNum + 1).padStart(4, '0')}`
    }
    return `${prefix}0001`
  }

  const handleAddItem = () => {
    setFormItems([
      ...formItems,
      {
        supply_id: '',
        supply_code: '',
        supply_name: '',
        quantity: '',
        estimated_price: 0,
      },
    ])
  }

  const handleRemoveItem = (index: number) => {
    setFormItems(formItems.filter((_, i) => i !== index))
  }

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...formItems]
    if (field === 'supply_id') {
      const supply = supplies.find((s) => s.id === value)
      if (supply) {
        newItems[index] = {
          ...newItems[index],
          supply_id: supply.id,
          supply_code: supply.code,
          supply_name: supply.name,
          estimated_price: supply.price_ht,
        }
      }
    } else {
      newItems[index] = { ...newItems[index], [field]: value }
    }
    setFormItems(newItems)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.supplier_id) {
      alert('Veuillez sélectionner un fournisseur')
      return
    }

    if (formItems.length === 0) {
      alert('Veuillez ajouter au moins une fourniture')
      return
    }

    if (editingDDF) {
      // Update existing DDF
      const { error } = await supabase
        .from('supplier_quote_requests')
        .update({
          supplier_id: formData.supplier_id,
          request_date: formData.request_date,
          response_deadline: formData.response_deadline || null,
          notes: formData.notes || null,
        })
        .eq('id', editingDDF.id)

      if (error) {
        console.error('Error updating DDF:', error)
        alert(`Erreur: ${error.message}`)
        return
      }

      // Delete old items and insert new ones
      await supabase
        .from('supplier_quote_request_items')
        .delete()
        .eq('ddf_id', editingDDF.id)

      const itemsToInsert = formItems.map((item) => ({
        ddf_id: editingDDF.id,
        supply_id: item.supply_id,
        supply_code: item.supply_code,
        supply_name: item.supply_name,
        quantity: item.quantity,
        estimated_price: item.estimated_price,
      }))

      await supabase.from('supplier_quote_request_items').insert(itemsToInsert)
    } else {
      // Create new DDF
      const ddfNumber = await generateDDFNumber()

      const { data: newDDF, error } = await supabase
        .from('supplier_quote_requests')
        .insert([
          {
            ddf_number: ddfNumber,
            supplier_id: formData.supplier_id,
            request_date: formData.request_date,
            response_deadline: formData.response_deadline || null,
            status: 'draft',
            notes: formData.notes || null,
          },
        ])
        .select()
        .single()

      if (error) {
        console.error('Error creating DDF:', error)
        alert(`Erreur: ${error.message}`)
        return
      }

      // Insert items
      const itemsToInsert = formItems.map((item) => ({
        ddf_id: newDDF.id,
        supply_id: item.supply_id,
        supply_code: item.supply_code,
        supply_name: item.supply_name,
        quantity: item.quantity,
        estimated_price: item.estimated_price,
      }))

      await supabase.from('supplier_quote_request_items').insert(itemsToInsert)
    }

    resetForm()
    setIsDialogOpen(false)
    fetchDDFs()
  }

  const handleEdit = (ddf: DDF) => {
    setEditingDDF(ddf)
    setFormData({
      supplier_id: ddf.supplier_id,
      request_date: ddf.request_date,
      response_deadline: ddf.response_deadline || '',
      notes: ddf.notes || '',
    })
    setFormItems(
      ddf.ddf_items?.map((item) => ({
        id: item.id,
        supply_id: item.supply_id,
        supply_code: item.supply_code,
        supply_name: item.supply_name,
        quantity: item.quantity,
        estimated_price: item.estimated_price,
      })) || []
    )
    setIsDialogOpen(true)
  }

  const handleView = (ddf: DDF) => {
    setViewingDDF(ddf)
    setIsViewDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette demande de devis ?')) return

    await supabase.from('supplier_quote_request_items').delete().eq('ddf_id', id)
    await supabase.from('supplier_quote_requests').delete().eq('id', id)
    fetchDDFs()
  }

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    await supabase
      .from('supplier_quote_requests')
      .update({ status: newStatus })
      .eq('id', id)
    fetchDDFs()
  }

  const handleDownload = async (ddf: DDF) => {
    if (!ddf.supplier || !ddf.ddf_items) return

    await generateDDFPDF({
      id: ddf.id,
      ddf_number: ddf.ddf_number,
      request_date: ddf.request_date,
      response_deadline: ddf.response_deadline,
      status: ddf.status,
      notes: ddf.notes,
      supplier: {
        code: ddf.supplier.code,
        name: ddf.supplier.name,
        phone: ddf.supplier.phone,
        email: ddf.supplier.email,
      },
      ddf_items: ddf.ddf_items.map((item) => ({
        supply_code: item.supply_code,
        supply_name: item.supply_name,
        quantity: item.quantity,
        estimated_price: item.estimated_price,
      })),
    })
  }

  const resetForm = () => {
    setFormData({
      supplier_id: '',
      request_date: new Date().toISOString().split('T')[0],
      response_deadline: '',
      notes: '',
    })
    setFormItems([])
    setEditingDDF(null)
  }

  const filteredDDFs = ddfs.filter((ddf) => {
    const matchesSearch =
      ddf.ddf_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ddf.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ddf.supplier?.code?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || ddf.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: ddfs.length,
    draft: ddfs.filter((d) => d.status === 'draft').length,
    sent: ddfs.filter((d) => d.status === 'sent').length,
    received: ddfs.filter((d) => d.status === 'received').length,
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-2 border-[#B8860B]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total DDF</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-[#B8860B]" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Brouillons</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-gray-600">{stats.draft}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Envoyés</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-blue-600">{stats.sent}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Réponses reçues</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-green-600">{stats.received}</span>
          </CardContent>
        </Card>
      </div>

      {/* Search and Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="flex flex-col md:flex-row gap-4 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par numéro, fournisseur..."
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
                  <SelectItem value="sent">Envoyé</SelectItem>
                  <SelectItem value="received">Réponse reçue</SelectItem>
                  <SelectItem value="cancelled">Annulé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchDDFs}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualiser
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open)
                if (!open) resetForm()
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-[#B8860B] hover:bg-[#9A7209]">
                    <Plus className="h-4 w-4 mr-2" />
                    Nouvelle DDF
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingDDF ? 'Modifier la DDF' : 'Nouvelle Demande de Devis Fournisseur'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <Label>Date de demande *</Label>
                        <Input
                          type="date"
                          value={formData.request_date}
                          onChange={(e) => setFormData({ ...formData, request_date: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Date limite de réponse</Label>
                        <Input
                          type="date"
                          value={formData.response_deadline}
                          onChange={(e) => setFormData({ ...formData, response_deadline: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          placeholder="Notes ou remarques..."
                        />
                      </div>
                    </div>

                    {/* Items */}
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold">Fournitures</h3>
                        <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                          <Plus className="h-4 w-4 mr-1" />
                          Ajouter fourniture
                        </Button>
                      </div>

                      {formItems.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                          Aucune fourniture ajoutée
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Fourniture</TableHead>
                              <TableHead className="w-32">Quantité</TableHead>
                              <TableHead className="w-16"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {formItems.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell>
                                  <Select
                                    value={item.supply_id}
                                    onValueChange={(value) => handleItemChange(index, 'supply_id', value)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Sélectionner" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {supplies.map((supply) => (
                                        <SelectItem key={supply.id} value={supply.id}>
                                          {supply.code} - {supply.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="text"
                                    value={item.quantity}
                                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveItem(index)}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Annuler
                      </Button>
                      <Button type="submit" className="bg-[#B8860B] hover:bg-[#9A7209]">
                        {editingDDF ? 'Modifier' : 'Créer'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-[#B8860B]" />
            </div>
          ) : filteredDDFs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Aucune demande de devis trouvée</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° DDF</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Date demande</TableHead>
                  <TableHead>Date limite</TableHead>
                  <TableHead className="text-center">Nb fournitures</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDDFs.map((ddf) => (
                  <TableRow key={ddf.id}>
                    <TableCell className="font-mono font-medium">{ddf.ddf_number}</TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{ddf.supplier?.code}</span>
                        <span className="text-gray-500 ml-2">{ddf.supplier?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(ddf.request_date), 'dd/MM/yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell>
                      {ddf.response_deadline
                        ? format(new Date(ddf.response_deadline), 'dd/MM/yyyy', { locale: fr })
                        : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{ddf.ddf_items?.length || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[ddf.status]}>
                        {statusLabels[ddf.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleView(ddf)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownload(ddf)}
                          title="Télécharger PDF"
                        >
                          <Download className="h-4 w-4 text-[#B8860B]" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(ddf)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {ddf.status === 'draft' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleUpdateStatus(ddf.id, 'sent')}
                            title="Marquer comme envoyé"
                          >
                            <Send className="h-4 w-4 text-blue-500" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(ddf.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
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

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#B8860B]" />
              DDF {viewingDDF?.ddf_number}
              {viewingDDF && (
                <Badge className={`ml-2 ${statusColors[viewingDDF.status]}`}>
                  {statusLabels[viewingDDF.status]}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {viewingDDF && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-500 mb-1">Fournisseur</div>
                  <p className="font-medium">
                    {viewingDDF.supplier?.code} - {viewingDDF.supplier?.name}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-500 mb-1">Date demande</div>
                  <p className="font-medium">
                    {format(new Date(viewingDDF.request_date), 'dd MMMM yyyy', { locale: fr })}
                  </p>
                </div>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fourniture</TableHead>
                      <TableHead className="text-center">Quantité</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewingDDF.ddf_items?.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <span className="font-medium">{item.supply_code}</span>
                          <span className="text-gray-500 ml-2">{item.supply_name}</span>
                        </TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {viewingDDF.notes && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="text-sm text-yellow-800 font-medium mb-1">Notes</div>
                  <p className="text-sm">{viewingDDF.notes}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                {viewingDDF.status === 'sent' && (
                  <Button
                    onClick={() => {
                      handleUpdateStatus(viewingDDF.id, 'received')
                      setIsViewDialogOpen(false)
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Marquer réponse reçue
                  </Button>
                )}
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
