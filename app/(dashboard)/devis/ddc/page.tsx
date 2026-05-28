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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  RefreshCw,
  Users,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  MoreHorizontal,
  Download,
  Send,
  Ban,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { generateDevisPDF } from '@/lib/pdf/devis'

interface Client {
  id: string
  code: string
  name: string
  phone: string | null
  email: string | null
  city: string | null
}

interface Article {
  id: string
  code: string
  name: string
  price_ht: number
}

interface DDCItem {
  id?: string
  article_id: string
  article_code: string
  article_name: string
  quantity: number
  unit_price: number
}

interface DDC {
  id: string
  ddc_number: string
  client_id: string
  client?: Client
  request_date: string
  validity_date: string | null
  status: string
  total_ht: number
  notes: string | null
  created_at: string
  ddc_items?: DDCItem[]
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  expired: 'bg-orange-100 text-orange-800',
}

const statusLabels: Record<string, string> = {
  draft: 'Brouillon',
  sent: 'Envoyé',
  accepted: 'Accepté',
  rejected: 'Refusé',
  expired: 'Expiré',
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
  }).format(price)
}

export default function DDCPage() {
  const supabase = useSupabase()
  const [ddcs, setDdcs] = useState<DDC[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [viewingDDC, setViewingDDC] = useState<DDC | null>(null)
  const [editingDDC, setEditingDDC] = useState<DDC | null>(null)

  const [formData, setFormData] = useState({
    client_id: '',
    request_date: new Date().toISOString().split('T')[0],
    validity_date: '',
    notes: '',
  })
  const [formItems, setFormItems] = useState<DDCItem[]>([])

  const fetchDDCs = useCallback(async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('client_quote_requests')
      .select(`
        *,
        client:clients(id, code, name, phone, email, city),
        ddc_items:client_quote_request_items(*)
      `)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setDdcs(data)
    }
    setIsLoading(false)
  }, [supabase])

  const fetchClients = useCallback(async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, code, name, phone, email, city')
      .eq('is_active', true)
      .order('name')

    if (data) setClients(data)
  }, [supabase])

  const fetchArticles = useCallback(async () => {
    const { data } = await supabase
      .from('articles')
      .select('id, code, name, price_ht')
      .eq('is_active', true)
      .order('name')

    if (data) setArticles(data)
  }, [supabase])

  useEffect(() => {
    fetchDDCs()
    fetchClients()
    fetchArticles()
  }, [fetchDDCs, fetchClients, fetchArticles])

  const generateDDCNumber = async (): Promise<string> => {
    const year = new Date().getFullYear()
    const prefix = `DDC-${year}-`

    const { data } = await supabase
      .from('client_quote_requests')
      .select('ddc_number')
      .like('ddc_number', `${prefix}%`)

    if (data && data.length > 0) {
      // Extraire tous les numéros et trouver le maximum
      const numbers = data.map(d => {
        const num = parseInt(d.ddc_number.replace(prefix, ''))
        return isNaN(num) ? 0 : num
      })
      const maxNum = Math.max(...numbers)
      return `${prefix}${String(maxNum + 1).padStart(4, '0')}`
    }
    return `${prefix}0001`
  }

  const handleAddItem = () => {
    setFormItems([
      ...formItems,
      {
        article_id: '',
        article_code: '',
        article_name: '',
        quantity: 1,
        unit_price: 0,
      },
    ])
  }

  const handleRemoveItem = (index: number) => {
    setFormItems(formItems.filter((_, i) => i !== index))
  }

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...formItems]
    if (field === 'article_id') {
      const article = articles.find((a) => a.id === value)
      if (article) {
        newItems[index] = {
          ...newItems[index],
          article_id: article.id,
          article_code: article.code,
          article_name: article.name,
          unit_price: article.price_ht,
        }
      }
    } else {
      newItems[index] = { ...newItems[index], [field]: value }
    }
    setFormItems(newItems)
  }

  const calculateTotal = () => {
    return formItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.client_id) {
      alert('Veuillez sélectionner un client')
      return
    }

    if (formItems.length === 0) {
      alert('Veuillez ajouter au moins un article')
      return
    }

    const totalHT = calculateTotal()

    if (editingDDC) {
      // Update existing DDC
      const { error } = await supabase
        .from('client_quote_requests')
        .update({
          client_id: formData.client_id,
          request_date: formData.request_date,
          validity_date: formData.validity_date || null,
          total_ht: totalHT,
          notes: formData.notes || null,
        })
        .eq('id', editingDDC.id)

      if (error) {
        console.error('Error updating DDC:', error)
        alert(`Erreur: ${error.message}`)
        return
      }

      // Delete old items and insert new ones
      await supabase
        .from('client_quote_request_items')
        .delete()
        .eq('ddc_id', editingDDC.id)

      const itemsToInsert = formItems.map((item) => ({
        ddc_id: editingDDC.id,
        article_id: item.article_id,
        article_code: item.article_code,
        article_name: item.article_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
      }))

      await supabase.from('client_quote_request_items').insert(itemsToInsert)
    } else {
      // Create new DDC
      const ddcNumber = await generateDDCNumber()

      const { data: newDDC, error } = await supabase
        .from('client_quote_requests')
        .insert([
          {
            ddc_number: ddcNumber,
            client_id: formData.client_id,
            request_date: formData.request_date,
            validity_date: formData.validity_date || null,
            status: 'draft',
            total_ht: totalHT,
            notes: formData.notes || null,
          },
        ])
        .select()
        .single()

      if (error) {
        console.error('Error creating DDC:', error)
        alert(`Erreur: ${error.message}`)
        return
      }

      // Insert items
      const itemsToInsert = formItems.map((item) => ({
        ddc_id: newDDC.id,
        article_id: item.article_id,
        article_code: item.article_code,
        article_name: item.article_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
      }))

      await supabase.from('client_quote_request_items').insert(itemsToInsert)
    }

    resetForm()
    setIsDialogOpen(false)
    fetchDDCs()
  }

  const handleEdit = (ddc: DDC) => {
    setEditingDDC(ddc)
    setFormData({
      client_id: ddc.client_id,
      request_date: ddc.request_date,
      validity_date: ddc.validity_date || '',
      notes: ddc.notes || '',
    })
    setFormItems(
      ddc.ddc_items?.map((item) => ({
        id: item.id,
        article_id: item.article_id,
        article_code: item.article_code,
        article_name: item.article_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })) || []
    )
    setIsDialogOpen(true)
  }

  const handleView = (ddc: DDC) => {
    setViewingDDC(ddc)
    setIsViewDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette demande de devis ?')) return

    await supabase.from('client_quote_request_items').delete().eq('ddc_id', id)
    await supabase.from('client_quote_requests').delete().eq('id', id)
    fetchDDCs()
  }

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    await supabase
      .from('client_quote_requests')
      .update({ status: newStatus })
      .eq('id', id)
    fetchDDCs()
  }

  const handleDownloadPDF = (ddc: DDC) => {
    generateDevisPDF({
      id: ddc.id,
      ddc_number: ddc.ddc_number,
      request_date: ddc.request_date,
      validity_date: ddc.validity_date,
      status: ddc.status,
      total_ht: ddc.total_ht,
      notes: ddc.notes,
      client: {
        code: ddc.client?.code || '',
        name: ddc.client?.name || '',
        phone: ddc.client?.phone || null,
        city: ddc.client?.city || null,
      },
      ddc_items: ddc.ddc_items?.map(item => ({
        article_code: item.article_code,
        article_name: item.article_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })) || [],
    })
  }

  const resetForm = () => {
    setFormData({
      client_id: '',
      request_date: new Date().toISOString().split('T')[0],
      validity_date: '',
      notes: '',
    })
    setFormItems([])
    setEditingDDC(null)
  }

  const filteredDDCs = ddcs.filter((ddc) => {
    const matchesSearch =
      ddc.ddc_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ddc.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ddc.client?.code?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || ddc.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: ddcs.length,
    draft: ddcs.filter((d) => d.status === 'draft').length,
    sent: ddcs.filter((d) => d.status === 'sent').length,
    accepted: ddcs.filter((d) => d.status === 'accepted').length,
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-2 border-[#B8860B]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total DDC</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-[#B8860B]" />
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
            <CardTitle className="text-sm font-medium text-gray-600">Acceptés</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-green-600">{stats.accepted}</span>
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
                  placeholder="Rechercher par numéro, client..."
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
                  <SelectItem value="accepted">Accepté</SelectItem>
                  <SelectItem value="rejected">Refusé</SelectItem>
                  <SelectItem value="expired">Expiré</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchDDCs}>
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
                    Nouvelle DDC
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl overflow-visible">
                  <DialogHeader>
                    <DialogTitle>
                      {editingDDC ? 'Modifier la DDC' : 'Nouvelle Demande de Devis Client'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Client *</Label>
                        <select
                          value={formData.client_id}
                          onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                          className="w-full h-9 px-3 py-2 border border-input rounded-md bg-transparent text-sm"
                        >
                          <option value="">Sélectionner un client</option>
                          {clients.map((client) => (
                            <option key={client.id} value={client.id}>
                              {client.code} - {client.name}
                            </option>
                          ))}
                        </select>
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
                        <Label>Date de validité</Label>
                        <Input
                          type="date"
                          value={formData.validity_date}
                          onChange={(e) => setFormData({ ...formData, validity_date: e.target.value })}
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
                        <h3 className="font-semibold">Articles</h3>
                        <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                          <Plus className="h-4 w-4 mr-1" />
                          Ajouter article
                        </Button>
                      </div>

                      {formItems.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                          Aucun article ajouté
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Article</TableHead>
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
                                  <select
                                    value={item.article_id}
                                    onChange={(e) => handleItemChange(index, 'article_id', e.target.value)}
                                    className="w-full h-9 px-3 py-2 border border-input rounded-md bg-transparent text-sm"
                                  >
                                    <option value="">Sélectionner</option>
                                    {articles.map((article) => (
                                      <option key={article.id} value={article.id}>
                                        {article.code} - {article.name}
                                      </option>
                                    ))}
                                  </select>
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={item.unit_price}
                                    onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                  />
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatPrice(item.quantity * item.unit_price)}
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
                        {editingDDC ? 'Modifier' : 'Créer'}
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
          ) : filteredDDCs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Aucune demande de devis trouvée</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>N° Devis</TableHead>
                  <TableHead>Nom Client</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDDCs.map((ddc) => (
                  <TableRow key={ddc.id}>
                    <TableCell>
                      {format(new Date(ddc.request_date), 'dd/MM/yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell className="font-mono font-medium">{ddc.ddc_number}</TableCell>
                    <TableCell className="font-medium">{ddc.client?.name || '-'}</TableCell>
                    <TableCell>{ddc.client?.phone || '-'}</TableCell>
                    <TableCell>{ddc.client?.city || '-'}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleView(ddc)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Voir détail
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownloadPDF(ddc)}>
                            <Download className="h-4 w-4 mr-2" />
                            Télécharger Devis
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <FileText className="h-4 w-4 mr-2" />
                              Changer statut
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              {ddc.status === 'draft' && (
                                <DropdownMenuItem onClick={() => handleUpdateStatus(ddc.id, 'sent')}>
                                  <Send className="h-4 w-4 mr-2 text-blue-500" />
                                  Marquer Envoyé
                                </DropdownMenuItem>
                              )}
                              {ddc.status === 'sent' && (
                                <>
                                  <DropdownMenuItem onClick={() => handleUpdateStatus(ddc.id, 'accepted')}>
                                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                                    Accepté
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleUpdateStatus(ddc.id, 'rejected')}>
                                    <XCircle className="h-4 w-4 mr-2 text-red-500" />
                                    Refusé
                                  </DropdownMenuItem>
                                </>
                              )}
                              {(ddc.status === 'accepted' || ddc.status === 'rejected') && (
                                <DropdownMenuItem onClick={() => handleUpdateStatus(ddc.id, 'draft')}>
                                  <Pencil className="h-4 w-4 mr-2 text-gray-500" />
                                  Remettre en brouillon
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleUpdateStatus(ddc.id, 'expired')}>
                                <Ban className="h-4 w-4 mr-2 text-orange-500" />
                                Expiré
                              </DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(ddc.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
              <FileText className="h-5 w-5 text-[#B8860B]" />
              DDC {viewingDDC?.ddc_number}
              {viewingDDC && (
                <Badge className={`ml-2 ${statusColors[viewingDDC.status]}`}>
                  {statusLabels[viewingDDC.status]}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {viewingDDC && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-500 mb-1">Client</div>
                  <p className="font-medium">
                    {viewingDDC.client?.code} - {viewingDDC.client?.name}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-500 mb-1">Date demande</div>
                  <p className="font-medium">
                    {format(new Date(viewingDDC.request_date), 'dd MMMM yyyy', { locale: fr })}
                  </p>
                </div>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Article</TableHead>
                      <TableHead className="text-center">Quantité</TableHead>
                      <TableHead className="text-right">Prix Unit.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewingDDC.ddc_items?.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <span className="font-medium">{item.article_code}</span>
                          <span className="text-gray-500 ml-2">{item.article_name}</span>
                        </TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatPrice(item.unit_price)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatPrice(item.quantity * item.unit_price)}
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
                    {formatPrice(viewingDDC.total_ht)}
                  </span>
                </div>
              </div>

              {viewingDDC.notes && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="text-sm text-yellow-800 font-medium mb-1">Notes</div>
                  <p className="text-sm">{viewingDDC.notes}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                {viewingDDC.status === 'sent' && (
                  <>
                    <Button
                      onClick={() => {
                        handleUpdateStatus(viewingDDC.id, 'accepted')
                        setIsViewDialogOpen(false)
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Accepter
                    </Button>
                    <Button
                      onClick={() => {
                        handleUpdateStatus(viewingDDC.id, 'rejected')
                        setIsViewDialogOpen(false)
                      }}
                      variant="destructive"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Refuser
                    </Button>
                  </>
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
