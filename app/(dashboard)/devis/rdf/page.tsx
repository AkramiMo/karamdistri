// @ts-nocheck
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
  Trash2,
  RefreshCw,
  FileInput,
  Download,
  ClipboardCheck,
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

interface DDF {
  id: string
  ddf_number: string
  supplier_id: string
  supplier?: Supplier
  request_date?: string
  response_deadline?: string | null
  status?: string
  notes?: string | null
}

interface RDFItem {
  id?: string
  supply_id: string
  supply_code: string
  supply_name: string
  quantity: number
  unit_price: string | number
}

interface RDF {
  id: string
  rdf_number: string
  ddf_id: string | null
  ddf?: DDF & { ddf_items?: { supply_code: string; supply_name: string; quantity: string | number }[] }
  supplier_id: string
  supplier?: Supplier
  supplier_quote_ref: string | null
  reception_date: string
  validity_date: string | null
  status: string
  total_ht: number
  notes: string | null
  created_at: string
  rdf_items?: RDFItem[]
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  converted: 'bg-blue-100 text-blue-800',
  expired: 'bg-orange-100 text-orange-800',
}

const statusLabels: Record<string, string> = {
  pending: 'En attente',
  accepted: 'Accepté',
  rejected: 'Refusé',
  converted: 'Converti en BC',
  expired: 'Expiré',
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
  }).format(price)
}

export default function RDFPage() {
  const supabase = useSupabase()
  const [rdfs, setRdfs] = useState<RDF[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [ddfs, setDdfs] = useState<DDF[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [viewingRDF, setViewingRDF] = useState<RDF | null>(null)
  const [editingRDF, setEditingRDF] = useState<RDF | null>(null)

  const [formData, setFormData] = useState({
    ddf_id: '',
    supplier_id: '',
    supplier_quote_ref: '',
    reception_date: new Date().toISOString().split('T')[0],
    validity_date: '',
    notes: '',
  })
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [statusRDF, setStatusRDF] = useState<RDF | null>(null)
  const [formItems, setFormItems] = useState<RDFItem[]>([])

  const fetchRDFs = useCallback(async () => {
    setIsLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('supplier_quote_responses')
      .select(`
        *,
        ddf:supplier_quote_requests(id, ddf_number, supplier_id, request_date, response_deadline, status, notes, ddf_items:supplier_quote_request_items(supply_code, supply_name, quantity)),
        supplier:suppliers(id, code, name, phone, email),
        rdf_items:supplier_quote_response_items(*)
      `)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setRdfs(data as RDF[])
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

  const fetchDDFs = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('supplier_quote_requests')
      .select('id, ddf_number, supplier_id, supplier:suppliers(id, code, name)')
      .in('status', ['draft', 'sent', 'received'])
      .order('created_at', { ascending: false })

    if (data) setDdfs(data as DDF[])
  }, [supabase])

  useEffect(() => {
    fetchRDFs()
    fetchSuppliers()
    fetchDDFs()
  }, [fetchRDFs, fetchSuppliers, fetchDDFs])

  const generateRDFNumber = async (): Promise<string> => {
    const year = new Date().getFullYear()
    const prefix = `RDF-${year}-`

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('supplier_quote_responses')
      .select('rdf_number')
      .like('rdf_number', `${prefix}%`)
      .order('rdf_number', { ascending: false })
      .limit(1) as { data: { rdf_number: string }[] | null }

    if (data && data.length > 0) {
      const lastNum = parseInt(data[0].rdf_number.replace(prefix, '')) || 0
      return `${prefix}${String(lastNum + 1).padStart(4, '0')}`
    }
    return `${prefix}0001`
  }

  const handleDDFChange = (ddfId: string) => {
    if (ddfId === 'none') {
      setFormData({
        ...formData,
        ddf_id: '',
      })
      return
    }
    const selectedDDF = ddfs.find(d => d.id === ddfId)
    if (selectedDDF) {
      setFormData({
        ...formData,
        ddf_id: ddfId,
        supplier_id: selectedDDF.supplier_id,
      })
    }
  }

  const handleAddItem = () => {
    setFormItems([
      ...formItems,
      {
        supply_id: '',
        supply_code: '',
        supply_name: '',
        quantity: 1,
        unit_price: '',
      },
    ])
  }

  const handleRemoveItem = (index: number) => {
    setFormItems(formItems.filter((_, i) => i !== index))
  }

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...formItems]
    newItems[index] = { ...newItems[index], [field]: value }
    setFormItems(newItems)
  }

  const calculateTotal = () => {
    return formItems.reduce((sum, item) => {
      const price = typeof item.unit_price === 'string' ? parseFloat(item.unit_price) || 0 : item.unit_price
      return sum + item.quantity * price
    }, 0)
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

    const totalHT = calculateTotal()

    if (editingRDF) {
      // Update existing RDF
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('supplier_quote_responses')
        .update({
          ddf_id: formData.ddf_id || null,
          supplier_id: formData.supplier_id,
          supplier_quote_ref: formData.supplier_quote_ref || null,
          reception_date: formData.reception_date,
          validity_date: formData.validity_date || null,
          total_ht: totalHT,
          notes: formData.notes || null,
        })
        .eq('id', editingRDF.id)

      if (error) {
        console.error('Error updating RDF:', error)
        alert(`Erreur: ${error.message}`)
        return
      }

      // Delete old items and insert new ones
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('supplier_quote_response_items')
        .delete()
        .eq('rdf_id', editingRDF.id)

      const itemsToInsert = formItems.map((item) => ({
        rdf_id: editingRDF.id,
        supply_id: item.supply_id || null,
        supply_code: item.supply_code,
        supply_name: item.supply_name,
        quantity: item.quantity,
        unit_price: typeof item.unit_price === 'string' ? parseFloat(item.unit_price) || 0 : item.unit_price,
      }))

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('supplier_quote_response_items').insert(itemsToInsert)

      // Update DDF status to received if linked
      if (formData.ddf_id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('supplier_quote_requests')
          .update({ status: 'received' })
          .eq('id', formData.ddf_id)
      }
    } else {
      // Create new RDF
      const rdfNumber = await generateRDFNumber()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newRDF, error } = await (supabase as any)
        .from('supplier_quote_responses')
        .insert([
          {
            rdf_number: rdfNumber,
            ddf_id: formData.ddf_id || null,
            supplier_id: formData.supplier_id,
            supplier_quote_ref: formData.supplier_quote_ref || null,
            reception_date: formData.reception_date,
            validity_date: formData.validity_date || null,
            status: 'pending',
            total_ht: totalHT,
            notes: formData.notes || null,
          },
        ])
        .select()
        .single()

      if (error) {
        console.error('Error creating RDF:', error)
        alert(`Erreur: ${error.message}`)
        return
      }

      // Insert items
      const itemsToInsert = formItems.map((item) => ({
        rdf_id: newRDF.id,
        supply_id: item.supply_id || null,
        supply_code: item.supply_code,
        supply_name: item.supply_name,
        quantity: item.quantity,
        unit_price: typeof item.unit_price === 'string' ? parseFloat(item.unit_price) || 0 : item.unit_price,
      }))

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('supplier_quote_response_items').insert(itemsToInsert)

      // Update DDF status to received if linked
      if (formData.ddf_id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('supplier_quote_requests')
          .update({ status: 'received' })
          .eq('id', formData.ddf_id)
      }
    }

    resetForm()
    setIsDialogOpen(false)
    fetchRDFs()
    fetchDDFs()
  }

  const handleEdit = (rdf: RDF) => {
    setEditingRDF(rdf)
    setFormData({
      ddf_id: rdf.ddf_id || '',
      supplier_id: rdf.supplier_id,
      supplier_quote_ref: rdf.supplier_quote_ref || '',
      reception_date: rdf.reception_date,
      validity_date: rdf.validity_date || '',
      notes: rdf.notes || '',
    })
    setFormItems(
      rdf.rdf_items?.map((item) => ({
        id: item.id,
        supply_id: item.supply_id,
        supply_code: item.supply_code,
        supply_name: item.supply_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })) || []
    )
    setIsDialogOpen(true)
  }

  const handleView = (rdf: RDF) => {
    setViewingRDF(rdf)
    setIsViewDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce devis reçu ?')) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('supplier_quote_response_items').delete().eq('rdf_id', id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('supplier_quote_responses').delete().eq('id', id)
    fetchRDFs()
  }

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('supplier_quote_responses')
      .update({ status: newStatus })
      .eq('id', id)
    fetchRDFs()
  }

  const handleDownloadDDF = async (rdf: RDF) => {
    if (!rdf.ddf || !rdf.supplier) return

    await generateDDFPDF({
      id: rdf.ddf.id,
      ddf_number: rdf.ddf.ddf_number,
      request_date: rdf.ddf.request_date || new Date().toISOString(),
      response_deadline: rdf.ddf.response_deadline || null,
      status: rdf.ddf.status || 'sent',
      notes: rdf.ddf.notes || null,
      supplier: {
        code: rdf.supplier.code,
        name: rdf.supplier.name,
        phone: rdf.supplier.phone,
        email: rdf.supplier.email,
      },
      ddf_items: rdf.ddf.ddf_items?.map((item) => ({
        supply_code: item.supply_code,
        supply_name: item.supply_name,
        quantity: item.quantity,
        estimated_price: 0,
      })) || [],
    })
  }

  const handleOpenStatusDialog = (rdf: RDF) => {
    setStatusRDF(rdf)
    setIsStatusDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      ddf_id: '',
      supplier_id: '',
      supplier_quote_ref: '',
      reception_date: new Date().toISOString().split('T')[0],
      validity_date: '',
      notes: '',
    })
    setFormItems([])
    setEditingRDF(null)
  }

  const filteredRDFs = rdfs.filter((rdf) => {
    const matchesSearch =
      rdf.rdf_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rdf.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rdf.supplier?.code?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || rdf.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: rdfs.length,
    pending: rdfs.filter((r) => r.status === 'pending').length,
    accepted: rdfs.filter((r) => r.status === 'accepted').length,
    converted: rdfs.filter((r) => r.status === 'converted').length,
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-2 border-[#B8860B]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total RDF</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileInput className="h-6 w-6 text-[#B8860B]" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">En attente</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-yellow-600">{stats.pending}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Acceptés</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-green-600">{stats.accepted}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Convertis en BC</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-blue-600">{stats.converted}</span>
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
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="accepted">Accepté</SelectItem>
                  <SelectItem value="rejected">Refusé</SelectItem>
                  <SelectItem value="converted">Converti en BC</SelectItem>
                  <SelectItem value="expired">Expiré</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchRDFs}>
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
                    Nouveau RDF
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingRDF ? 'Modifier le RDF' : 'Nouvelle Réception de Devis Fournisseur'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>DDF associée (optionnel)</Label>
                        <Select
                          value={formData.ddf_id || 'none'}
                          onValueChange={handleDDFChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner une DDF" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Aucune</SelectItem>
                            {ddfs.map((ddf: any) => (
                              <SelectItem key={ddf.id} value={ddf.id}>
                                {ddf.ddf_number} - {ddf.supplier?.name}
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
                        <Label>Réf devis fournisseur</Label>
                        <Input
                          value={formData.supplier_quote_ref}
                          onChange={(e) => setFormData({ ...formData, supplier_quote_ref: e.target.value })}
                          placeholder="Référence du devis fournisseur"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Date de réception *</Label>
                        <Input
                          type="date"
                          value={formData.reception_date}
                          onChange={(e) => setFormData({ ...formData, reception_date: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
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
                        <h3 className="font-semibold">Fournitures proposées</h3>
                        <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                          <Plus className="h-4 w-4 mr-1" />
                          Ajouter ligne
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
                              <TableHead>Code</TableHead>
                              <TableHead>Désignation</TableHead>
                              <TableHead className="w-24">Quantité</TableHead>
                              <TableHead className="w-32">Prix Unit.</TableHead>
                              <TableHead className="w-32 text-right">Total</TableHead>
                              <TableHead className="w-16"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {formItems.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell>
                                  <Input
                                    value={item.supply_code}
                                    onChange={(e) => handleItemChange(index, 'supply_code', e.target.value)}
                                    placeholder="Code"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    value={item.supply_name}
                                    onChange={(e) => handleItemChange(index, 'supply_name', e.target.value)}
                                    placeholder="Désignation"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="text"
                                    value={item.quantity}
                                    onChange={(e) => {
                                      const value = e.target.value.replace(',', '.')
                                      handleItemChange(index, 'quantity', parseFloat(value) || 0)
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="text"
                                    inputMode="decimal"
                                    value={item.unit_price}
                                    onChange={(e) => {
                                      const value = e.target.value.replace(/,/g, '.')
                                      handleItemChange(index, 'unit_price', value)
                                    }}
                                  />
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatPrice(item.quantity * (typeof item.unit_price === 'string' ? parseFloat(item.unit_price) || 0 : item.unit_price))}
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

                      {formItems.length > 0 && (
                        <div className="flex justify-end mt-4">
                          <div className="bg-[#B8860B]/10 border border-[#B8860B] rounded-lg px-4 py-2">
                            <span className="text-gray-600">Total HT: </span>
                            <span className="font-bold text-[#B8860B]">{formatPrice(calculateTotal())}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Annuler
                      </Button>
                      <Button type="submit" className="bg-[#B8860B] hover:bg-[#9A7209]">
                        {editingRDF ? 'Modifier' : 'Créer'}
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
          ) : filteredRDFs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Aucun devis reçu trouvé</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° RDF</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Réf devis fournisseur</TableHead>
                  <TableHead>DDF associée</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRDFs.map((rdf) => (
                  <TableRow key={rdf.id}>
                    <TableCell className="font-mono font-medium">{rdf.rdf_number}</TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{rdf.supplier?.code}</span>
                        <span className="text-gray-500 ml-2">{rdf.supplier?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{rdf.supplier_quote_ref || '-'}</TableCell>
                    <TableCell className="font-mono text-gray-500">
                      {rdf.ddf?.ddf_number || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[rdf.status]}>
                        {statusLabels[rdf.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleView(rdf)}
                          title="Voir détail"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {rdf.ddf && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownloadDDF(rdf)}
                            title="Télécharger DDF"
                          >
                            <Download className="h-4 w-4 text-[#B8860B]" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenStatusDialog(rdf)}
                          title="Statuer"
                        >
                          <ClipboardCheck className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(rdf.id)}
                          title="Supprimer"
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
              <FileInput className="h-5 w-5 text-[#B8860B]" />
              RDF {viewingRDF?.rdf_number}
              {viewingRDF && (
                <Badge className={`ml-2 ${statusColors[viewingRDF.status]}`}>
                  {statusLabels[viewingRDF.status]}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {viewingRDF && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-500 mb-1">Fournisseur</div>
                  <p className="font-medium">
                    {viewingRDF.supplier?.code} - {viewingRDF.supplier?.name}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-500 mb-1">Date réception</div>
                  <p className="font-medium">
                    {format(new Date(viewingRDF.reception_date), 'dd MMMM yyyy', { locale: fr })}
                  </p>
                </div>
                {viewingRDF.ddf && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-sm text-blue-600 mb-1">DDF liée</div>
                    <p className="font-medium text-blue-800">{viewingRDF.ddf.ddf_number}</p>
                  </div>
                )}
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Désignation</TableHead>
                      <TableHead className="text-center">Quantité</TableHead>
                      <TableHead className="text-right">Prix Unit.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewingRDF.rdf_items?.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono">{item.supply_code}</TableCell>
                        <TableCell>{item.supply_name}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatPrice(typeof item.unit_price === 'number' ? item.unit_price : parseFloat(String(item.unit_price)) || 0)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatPrice(item.quantity * (typeof item.unit_price === 'number' ? item.unit_price : parseFloat(String(item.unit_price)) || 0))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end">
                <div className="bg-[#B8860B]/10 border border-[#B8860B] rounded-lg px-6 py-3">
                  <span className="text-gray-600">Total HT: </span>
                  <span className="text-xl font-bold text-[#B8860B]">
                    {formatPrice(viewingRDF.total_ht)}
                  </span>
                </div>
              </div>

              {viewingRDF.notes && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="text-sm text-yellow-800 font-medium mb-1">Notes</div>
                  <p className="text-sm">{viewingRDF.notes}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Status Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Statuer sur le RDF {statusRDF?.rdf_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-600">
              Choisissez le nouveau statut pour ce devis fournisseur :
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-20 flex flex-col gap-2 border-green-200 hover:bg-green-50 hover:border-green-400"
                onClick={() => {
                  if (statusRDF) {
                    handleUpdateStatus(statusRDF.id, 'accepted')
                    setIsStatusDialogOpen(false)
                  }
                }}
              >
                <span className="text-2xl">✓</span>
                <span className="text-green-700">Accepter</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col gap-2 border-red-200 hover:bg-red-50 hover:border-red-400"
                onClick={() => {
                  if (statusRDF) {
                    handleUpdateStatus(statusRDF.id, 'rejected')
                    setIsStatusDialogOpen(false)
                  }
                }}
              >
                <span className="text-2xl">✗</span>
                <span className="text-red-700">Refuser</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col gap-2 border-yellow-200 hover:bg-yellow-50 hover:border-yellow-400"
                onClick={() => {
                  if (statusRDF) {
                    handleUpdateStatus(statusRDF.id, 'pending')
                    setIsStatusDialogOpen(false)
                  }
                }}
              >
                <span className="text-2xl">⏳</span>
                <span className="text-yellow-700">En attente</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col gap-2 border-orange-200 hover:bg-orange-50 hover:border-orange-400"
                onClick={() => {
                  if (statusRDF) {
                    handleUpdateStatus(statusRDF.id, 'expired')
                    setIsStatusDialogOpen(false)
                  }
                }}
              >
                <span className="text-2xl">⌛</span>
                <span className="text-orange-700">Expiré</span>
              </Button>
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
              Annuler
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
