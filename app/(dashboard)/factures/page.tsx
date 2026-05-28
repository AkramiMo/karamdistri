'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ProtectedModule } from '@/components/auth/ProtectedModule'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Search, FileText, Eye, Pencil, Trash2, AlertTriangle, Download } from 'lucide-react'
import { generateFacturePDF } from '@/lib/pdf/facture'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Facture {
  id: string
  facture_number: string
  facture_date: string
  client_id: string
  delivery_id: string | null
  total_ht: number
  total_tva: number
  total_ttc: number
  due_date: string | null
  status: string
  notes: string | null
  user_id: string | null
  created_at: string
  updated_at: string
  client?: { name: string; code: string; phone: string | null; city: string | null; ice: string | null }
  delivery?: { delivery_number: string; total_ht: number | null }
}

interface ClientDelivery {
  id: string
  delivery_number: string
  delivery_date: string | null
  total_ht: number | null
}

interface Client {
  id: string
  code: string
  name: string
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  paid: 'bg-amber-100 text-[#9A7209]',
  partial: 'bg-orange-100 text-orange-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-red-200 text-red-900',
}

const statusLabels: Record<string, string> = {
  draft: 'Brouillon',
  sent: 'Envoyée',
  paid: 'Payée',
  partial: 'Partielle',
  overdue: 'En retard',
  cancelled: 'Annulée',
}

export default function FacturesPage() {
  const [factures, setFactures] = useState<Facture[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [viewingFacture, setViewingFacture] = useState<Facture | null>(null)
  const [editingFacture, setEditingFacture] = useState<Facture | null>(null)
  const [clientDeliveries, setClientDeliveries] = useState<ClientDelivery[]>([])
  const [formClientDeliveries, setFormClientDeliveries] = useState<ClientDelivery[]>([])
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState<string[]>([])
  const supabase = createClient()

  const getDefaultDueDate = (factureDate: string) => {
    try {
      const date = new Date(factureDate)
      if (isNaN(date.getTime())) return ''
      date.setMonth(date.getMonth() + 2)
      return date.toISOString().split('T')[0]
    } catch {
      return ''
    }
  }

  const [formData, setFormData] = useState(() => {
    const today = new Date().toISOString().split('T')[0]
    return {
      client_id: '',
      facture_date: today,
      total_ht: '',
      total_tva: '',
      total_ttc: '',
      due_date: getDefaultDueDate(today),
      status: 'draft',
      notes: '',
    }
  })

  const fetchFactures = async () => {
    setIsLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase
      .from('factures')
      .select(`
        *,
        client:clients(name, code, phone, city, ice),
        delivery:deliveries(delivery_number, total_ht)
      `)
      .order('facture_date', { ascending: false }) as any)

    if (error) {
      console.error('Error fetching factures:', error)
    } else {
      setFactures(data || [])
    }
    setIsLoading(false)
  }

  const fetchClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, code, name')
      .eq('is_active', true)
      .order('name')
    setClients(data || [])
  }

  useEffect(() => {
    fetchFactures()
    fetchClients()
  }, [])

  const generateFactureNumber = async (): Promise<string> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('get_next_document_number', {
        p_document_type: 'facture',
      })

      if (!error && data) {
        return data as string
      }
    } catch {
      // Fallback if RPC doesn't exist
    }

    // Fallback: generate manually
    const year = new Date().getFullYear()
    const prefix = `FAC-${year}-`

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('factures') as any)
      .select('facture_number')
      .like('facture_number', `${prefix}%`)
      .order('facture_number', { ascending: false })
      .limit(1)

    if (data && data.length > 0) {
      const lastNumber = parseInt(data[0].facture_number.replace(prefix, '')) || 0
      return `${prefix}${(lastNumber + 1).toString().padStart(6, '0')}`
    }

    return `${prefix}000001`
  }

  const handleFormClientSelect = async (clientId: string) => {
    if (clientId === formData.client_id) return
    setSelectedDeliveryIds([])
    setFormClientDeliveries([])
    setFormData(prev => ({ ...prev, client_id: clientId, total_ht: '0', total_tva: '0', total_ttc: '0' }))
    // Fetch deliveries for this client
    const { data } = await supabase
      .from('deliveries')
      .select('id, delivery_number, delivery_date, total_ht')
      .eq('client_id', clientId)
      .eq('status', 'delivered')
      .order('delivery_date', { ascending: false })
    setFormClientDeliveries(data || [])
  }

  const recalcTotals = (deliveryIds: string[], deliveriesList: ClientDelivery[]) => {
    const totalHt = deliveriesList
      .filter(d => deliveryIds.includes(d.id))
      .reduce((sum, d) => sum + (d.total_ht || 0), 0)
    const totalHtRounded = Math.round(totalHt * 100) / 100
    const totalTva = Math.round(totalHtRounded * 0.2 * 100) / 100
    const totalTtc = Math.round((totalHtRounded + totalTva) * 100) / 100
    return { totalHtRounded, totalTva, totalTtc }
  }

  const handleDeliveryToggle = (deliveryId: string, checked: boolean) => {
    const alreadySelected = selectedDeliveryIds.includes(deliveryId)
    if (checked && alreadySelected) return
    if (!checked && !alreadySelected) return
    const newIds = checked
      ? [...selectedDeliveryIds, deliveryId]
      : selectedDeliveryIds.filter(id => id !== deliveryId)
    setSelectedDeliveryIds(newIds)
    const { totalHtRounded, totalTva, totalTtc } = recalcTotals(newIds, formClientDeliveries)
    setFormData(prev => ({
      ...prev,
      total_ht: totalHtRounded.toString(),
      total_tva: totalTva.toString(),
      total_ttc: totalTtc.toString(),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.client_id) {
      alert('Veuillez sélectionner un client')
      return
    }
    if (!editingFacture && selectedDeliveryIds.length === 0) {
      alert('Veuillez sélectionner au moins un bon de livraison')
      return
    }

    const total_ht = parseFloat(formData.total_ht) || 0
    const total_tva = parseFloat(formData.total_tva) || Math.round(total_ht * 0.2 * 100) / 100
    const total_ttc = parseFloat(formData.total_ttc) || Math.round((total_ht + total_tva) * 100) / 100

    if (editingFacture) {
      // Update existing facture
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('factures') as any)
        .update({
          client_id: formData.client_id,
          delivery_id: selectedDeliveryIds[0] || null,
          facture_date: formData.facture_date,
          total_ht,
          total_tva,
          total_ttc,
          due_date: formData.due_date || null,
          status: formData.status,
          notes: formData.notes || null,
        })
        .eq('id', editingFacture.id)

      if (error) {
        console.error('Error updating facture:', error)
        alert(`Erreur mise à jour facture: ${error.message}`)
        return
      }
    } else {
      // Create new facture
      const factureNumber = await generateFactureNumber()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('factures') as any).insert([{
        facture_number: factureNumber,
        client_id: formData.client_id,
        delivery_id: selectedDeliveryIds[0] || null,
        facture_date: formData.facture_date,
        total_ht,
        total_tva,
        total_ttc,
        due_date: formData.due_date || null,
        status: formData.status,
        notes: formData.notes || null,
      }])

      if (error) {
        console.error('Error creating facture:', error)
        alert(`Erreur création facture: ${error.message}`)
        return
      }
    }

    fetchFactures()
    setIsDialogOpen(false)
    setEditingFacture(null)
    resetForm()
  }

  const resetForm = () => {
    const today = new Date().toISOString().split('T')[0]
    setFormData({
      client_id: '',
      facture_date: today,
      total_ht: '',
      total_tva: '',
      total_ttc: '',
      due_date: getDefaultDueDate(today),
      status: 'draft',
      notes: '',
    })
    setSelectedDeliveryIds([])
    setFormClientDeliveries([])
  }

  const handleEdit = async (facture: Facture) => {
    setEditingFacture(facture)
    setFormData({
      client_id: facture.client_id,
      facture_date: facture.facture_date,
      total_ht: facture.total_ht.toString(),
      total_tva: facture.total_tva.toString(),
      total_ttc: facture.total_ttc.toString(),
      due_date: facture.due_date || '',
      status: facture.status,
      notes: facture.notes || '',
    })
    // Fetch deliveries for this client
    const { data } = await supabase
      .from('deliveries')
      .select('id, delivery_number, delivery_date, total_ht')
      .eq('client_id', facture.client_id)
      .eq('status', 'delivered')
      .order('delivery_date', { ascending: false })
    setFormClientDeliveries(data || [])
    setSelectedDeliveryIds(facture.delivery_id ? [facture.delivery_id] : [])
    setIsDialogOpen(true)
  }

  const handleDelete = async (factureId: string, factureNumber: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la facture ${factureNumber} ?`)) {
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('factures') as any).delete().eq('id', factureId)

    if (error) {
      console.error('Error deleting facture:', error)
      alert('Erreur lors de la suppression de la facture')
    } else {
      fetchFactures()
    }
  }

  const handleViewFacture = async (facture: Facture) => {
    setViewingFacture(facture)
    setIsViewDialogOpen(true)
    // Fetch all deliveries for this client
    const { data } = await supabase
      .from('deliveries')
      .select('id, delivery_number, delivery_date, total_ht')
      .eq('client_id', facture.client_id)
      .order('delivery_date', { ascending: false })
    setClientDeliveries(data || [])
  }

  const handleDownloadPDF = async (facture: Facture) => {
    // Fetch delivered deliveries for this client
    const { data: deliveries } = await supabase
      .from('deliveries')
      .select('id, delivery_number, delivery_date, total_ht')
      .eq('client_id', facture.client_id)
      .eq('status', 'delivered')
      .order('delivery_date', { ascending: false })

    if (!facture.client) {
      alert('Informations client manquantes')
      return
    }

    const factureData = {
      id: facture.id,
      facture_number: facture.facture_number,
      facture_date: facture.facture_date,
      total_ht: facture.total_ht,
      total_tva: facture.total_tva,
      total_ttc: facture.total_ttc,
      client: {
        code: facture.client.code,
        name: facture.client.name,
        phone: facture.client.phone,
        city: facture.client.city,
        ice: facture.client.ice,
      },
    }

    await generateFacturePDF(factureData, deliveries || [], '/logo.jpg')
  }

  // Determine display status (overdue detection)
  const getDisplayStatus = (facture: Facture): string => {
    if (
      facture.status !== 'paid' &&
      facture.status !== 'cancelled' &&
      facture.due_date
    ) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const dueDate = new Date(facture.due_date)
      if (dueDate < today) {
        return 'overdue'
      }
    }
    return facture.status
  }

  const filteredFactures = factures.filter(
    (f) =>
      f.facture_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.client?.code?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return '-'
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
    }).format(price)
  }

  // Stats
  const thisMonth = new Date().toISOString().slice(0, 7)
  const monthFactures = factures.filter(f => f.facture_date.startsWith(thisMonth))
  const monthTotalTTC = monthFactures.reduce((sum, f) => sum + (f.total_ttc || 0), 0)
  const paidCount = factures.filter(f => f.status === 'paid').length
  const overdueCount = factures.filter(f => getDisplayStatus(f) === 'overdue').length

  return (
    <ProtectedModule module="factures">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Factures</h1>
            <p className="text-gray-500">Gestion des factures clients</p>
          </div>

          <ProtectedModule module="factures" action="create">
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open)
              if (!open) {
                setEditingFacture(null)
                resetForm()
              }
            }}>
              <DialogTrigger asChild>
                <Button
                  className="bg-[#B8860B] hover:bg-[#9A7209]"
                  onClick={() => {
                    setEditingFacture(null)
                    resetForm()
                    setIsDialogOpen(true)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvelle facture
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingFacture ? `Modifier facture ${editingFacture.facture_number}` : 'Nouvelle facture'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Client *</Label>
                    <Select
                      value={formData.client_id}
                      onValueChange={handleFormClientSelect}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un client" />
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

                  {formData.client_id && (
                    <div className="space-y-2">
                      <Label>Bons de livraison</Label>
                      {formClientDeliveries.length === 0 ? (
                        <p className="text-sm text-gray-500 py-2">Aucun BL livré pour ce client</p>
                      ) : (
                        <div className="border rounded-lg max-h-48 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-10"></TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>N° BL</TableHead>
                                <TableHead className="text-right">Recette BL</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {formClientDeliveries.map((del) => {
                                const isSelected = selectedDeliveryIds.includes(del.id)
                                return (
                                <TableRow
                                  key={del.id}
                                  className="cursor-pointer"
                                  onClick={() => handleDeliveryToggle(del.id, !isSelected)}
                                >
                                  <TableCell onClick={(e) => e.stopPropagation()}>
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={(checked) => handleDeliveryToggle(del.id, !!checked)}
                                    />
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {del.delivery_date
                                      ? format(new Date(del.delivery_date), 'dd/MM/yyyy', { locale: fr })
                                      : '-'}
                                  </TableCell>
                                  <TableCell className="font-mono text-sm">{del.delivery_number}</TableCell>
                                  <TableCell className="text-right text-sm font-medium">
                                    {formatPrice(del.total_ht)}
                                  </TableCell>
                                </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="facture_date">Date de facture</Label>
                      <Input
                        id="facture_date"
                        type="date"
                        value={formData.facture_date}
                        onChange={(e) => {
                          const newDate = e.target.value
                          setFormData(prev => ({
                            ...prev,
                            facture_date: newDate,
                            due_date: getDefaultDueDate(newDate),
                          }))
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="due_date">Date d&apos;échéance</Label>
                      <Input
                        id="due_date"
                        type="date"
                        value={formData.due_date}
                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Total HT (MAD)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.total_ht}
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>TVA 20% (MAD)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.total_tva}
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Total TTC (MAD)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.total_ttc}
                        readOnly
                        className="bg-gray-50 font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Statut</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Brouillon</SelectItem>
                        <SelectItem value="sent">Envoyée</SelectItem>
                        <SelectItem value="paid">Payée</SelectItem>
                        <SelectItem value="partial">Partielle</SelectItem>
                        <SelectItem value="overdue">En retard</SelectItem>
                        <SelectItem value="cancelled">Annulée</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Notes optionnelles..."
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => {
                      setIsDialogOpen(false)
                      setEditingFacture(null)
                      resetForm()
                    }}>
                      Annuler
                    </Button>
                    <Button type="submit" className="bg-[#B8860B] hover:bg-[#9A7209]">
                      {editingFacture ? 'Mettre à jour' : 'Créer la facture'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </ProtectedModule>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total factures
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-[#B8860B]" />
                <span className="text-2xl font-bold">{factures.length}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total TTC du mois
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-[#B8860B]">{formatPrice(monthTotalTTC)}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Factures payées
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-[#B8860B]">{paidCount}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Factures en retard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {overdueCount > 0 && <AlertTriangle className="h-5 w-5 text-red-500" />}
                <span className={`text-2xl font-bold ${overdueCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                  {overdueCount}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher une facture..."
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
            ) : filteredFactures.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Aucune facture pour le moment
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>N° Facture</TableHead>
                    <TableHead>Code Client</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Total HT</TableHead>
                    <TableHead className="text-right">TVA</TableHead>
                    <TableHead className="text-right">Total TTC</TableHead>
                    <TableHead>Échéance</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFactures.map((facture) => {
                    const displayStatus = getDisplayStatus(facture)
                    return (
                      <TableRow key={facture.id}>
                        <TableCell>
                          {format(new Date(facture.facture_date), 'dd/MM/yyyy', { locale: fr })}
                        </TableCell>
                        <TableCell className="font-medium">{facture.facture_number}</TableCell>
                        <TableCell className="font-mono text-sm">{facture.client?.code || '--'}</TableCell>
                        <TableCell>{facture.client?.name || '--'}</TableCell>
                        <TableCell className="text-right">{formatPrice(facture.total_ht)}</TableCell>
                        <TableCell className="text-right">{formatPrice(facture.total_tva)}</TableCell>
                        <TableCell className="text-right font-medium">{formatPrice(facture.total_ttc)}</TableCell>
                        <TableCell>
                          {facture.due_date
                            ? format(new Date(facture.due_date), 'dd/MM/yyyy', { locale: fr })
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[displayStatus]}>
                            {statusLabels[displayStatus]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownloadPDF(facture)}
                              title="Télécharger Facture"
                            >
                              <Download className="h-4 w-4 text-[#B8860B]" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewFacture(facture)}
                              title="Voir détails"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <ProtectedModule module="factures" action="edit">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(facture)}
                                title="Modifier"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </ProtectedModule>
                            <ProtectedModule module="factures" action="delete">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(facture.id, facture.facture_number)}
                                title="Supprimer"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </ProtectedModule>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* View Facture Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#B8860B]" />
                Facture {viewingFacture?.facture_number}
              </DialogTitle>
            </DialogHeader>
            {viewingFacture && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-700">Client</h3>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="font-medium">
                        {viewingFacture.client?.code} - {viewingFacture.client?.name}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-700">Détails</h3>
                    <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                      <p className="text-sm">
                        <span className="text-gray-600">Échéance:</span>{' '}
                        {viewingFacture.due_date
                          ? format(new Date(viewingFacture.due_date), 'dd MMMM yyyy', { locale: fr })
                          : '-'}
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-gray-600 text-sm">Statut:</span>
                        <Badge className={statusColors[getDisplayStatus(viewingFacture)]}>
                          {statusLabels[getDisplayStatus(viewingFacture)]}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {viewingFacture.notes && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-700">Notes</h3>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{viewingFacture.notes}</p>
                    </div>
                  </div>
                )}

                {/* Bon de livraisons */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-700">Bon de livraisons</h3>
                  {clientDeliveries.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      Aucun bon de livraison pour ce client
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>N° BL</TableHead>
                          <TableHead className="text-right">Recette BL</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clientDeliveries.map((del) => (
                          <TableRow key={del.id}>
                            <TableCell>
                              {del.delivery_date
                                ? format(new Date(del.delivery_date), 'dd/MM/yyyy', { locale: fr })
                                : '-'}
                            </TableCell>
                            <TableCell className="font-mono text-sm">{del.delivery_number}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatPrice(del.total_ht)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  <div className="flex justify-end pt-3">
                    <div className="w-72 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total HT:</span>
                        <span className="font-medium">{formatPrice(viewingFacture.total_ht)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold border-t pt-2">
                        <span>Total TTC:</span>
                        <span className="text-[#B8860B]">{formatPrice(viewingFacture.total_ttc)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setIsViewDialogOpen(false)}
                  >
                    Fermer
                  </Button>
                  <Button
                    className="bg-[#B8860B] hover:bg-[#9A7209]"
                    onClick={() => viewingFacture && handleDownloadPDF(viewingFacture)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Télécharger Facture
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
