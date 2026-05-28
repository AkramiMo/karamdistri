'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Edit, Trash2, Layers, Package, TrendingUp, Eye, Link2 } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Supplier {
  id: string
  code: string
  name: string
}

interface Reception {
  id: string
  reception_number: string
  reception_date: string
  supplier_id: string
  total_ht: number | null
  suppliers?: Supplier
}

interface Lot {
  id: string
  lot_number: string
  supplier_id: string | null
  reception_id: string | null
  origin: string | null
  olive_type: string
  caliber: string | null
  purchase_date: string
  quantity_kg: number
  purchase_price_kg: number
  total_amount: number
  remaining_quantity_kg: number | null
  state: 'brut' | 'fermente' | 'pret_a_conditionner' | 'conditionne' | 'epuise'
  salt_rate: number | null
  brine_density: number | null
  quality_grade: 'A' | 'B' | 'C' | 'D' | null
  quality_remarks: string | null
  is_active: boolean
  created_at: string
  suppliers?: Supplier
  receptions?: Reception
}

const STATE_LABELS: Record<string, { label: string; color: string }> = {
  brut: { label: 'Brut', color: 'bg-gray-500' },
  fermente: { label: 'Fermenté', color: 'bg-yellow-500' },
  pret_a_conditionner: { label: 'Prêt à conditionner', color: 'bg-blue-500' },
  conditionne: { label: 'Conditionné', color: 'bg-green-500' },
  epuise: { label: 'Épuisé', color: 'bg-red-500' },
}

const OLIVE_TYPES = [
  'NOIR',
  'VERT',
  'TOURNANT',
  'NOIR_FG',
  'VERT_CASSE',
  'COCKTAIL',
]

const CALIBERS = [
  '14/16',
  '16/18',
  '18/20',
  '20/22',
  '22/25',
  '25/28',
  '28/32',
  '32/35',
]

const QUALITY_GRADES = ['A', 'B', 'C', 'D']

export default function LotsPage() {
  const [lots, setLots] = useState<Lot[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [receptions, setReceptions] = useState<Reception[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [editingLot, setEditingLot] = useState<Lot | null>(null)
  const [viewingLot, setViewingLot] = useState<Lot | null>(null)
  const [stateFilter, setStateFilter] = useState<string>('all')
  const supabase = createClient()

  const [formData, setFormData] = useState({
    lot_number: '',
    supplier_id: '',
    reception_id: '',
    origin: '',
    olive_type: '',
    caliber: '',
    purchase_date: format(new Date(), 'yyyy-MM-dd'),
    quantity_kg: '',
    purchase_price_kg: '',
    state: 'brut' as const,
    salt_rate: '',
    brine_density: '',
    quality_grade: '',
    quality_remarks: '',
  })

  const fetchSuppliers = async () => {
    const { data } = await supabase
      .from('suppliers')
      .select('id, code, name')
      .eq('is_active', true)
      .order('name')

    if (data) setSuppliers(data)
  }

  const fetchReceptions = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('receptions') as any)
      .select(`
        id,
        reception_number,
        reception_date,
        supplier_id,
        total_ht,
        suppliers:supplier_id (id, code, name)
      `)
      .order('reception_date', { ascending: false })

    if (data) setReceptions(data)
  }

  const fetchLots = async () => {
    setIsLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('lots') as any)
      .select(`
        *,
        suppliers:supplier_id (id, code, name),
        receptions:reception_id (id, reception_number, reception_date)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching lots:', error)
    } else {
      setLots(data || [])
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchSuppliers()
    fetchReceptions()
    fetchLots()
  }, [])

  const handleReceptionSelect = (receptionId: string) => {
    const reception = receptions.find(r => r.id === receptionId)
    if (reception) {
      setFormData(prev => ({
        ...prev,
        reception_id: receptionId,
        supplier_id: reception.supplier_id,
        purchase_date: reception.reception_date,
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        reception_id: '',
      }))
    }
  }

  const generateLotNumber = () => {
    const supplier = suppliers.find(s => s.id === formData.supplier_id)
    const supplierCode = supplier?.code || 'XXX'
    const origin = formData.origin || 'XXX'
    const caliber = formData.caliber || 'XX'
    const oliveType = formData.olive_type || 'XXX'
    const date = formData.purchase_date.replace(/-/g, '')

    const baseLotNumber = `${date}-${supplierCode.toUpperCase()}-${origin.toUpperCase()}-${caliber}-${oliveType.toUpperCase()}`

    // Check for existing lots with same base number and add suffix if needed
    const existingLots = lots.filter(lot => lot.lot_number.startsWith(baseLotNumber))
    if (existingLots.length === 0) {
      return baseLotNumber
    }

    // Find the highest suffix number
    let maxSuffix = 0
    existingLots.forEach(lot => {
      const match = lot.lot_number.match(/-(\d+)$/)
      if (match) {
        const suffix = parseInt(match[1], 10)
        if (suffix > maxSuffix) maxSuffix = suffix
      } else {
        // Base lot without suffix exists, so we need at least -2
        if (maxSuffix < 1) maxSuffix = 1
      }
    })

    return `${baseLotNumber}-${maxSuffix + 1}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.olive_type) {
      alert('Veuillez sélectionner un type d\'olive')
      return
    }
    if (!formData.quantity_kg || parseFloat(formData.quantity_kg) <= 0) {
      alert('Veuillez entrer une quantité valide')
      return
    }
    if (!formData.purchase_price_kg || parseFloat(formData.purchase_price_kg) <= 0) {
      alert('Veuillez entrer un prix valide')
      return
    }

    const lotNumber = formData.lot_number || generateLotNumber()

    const payload = {
      lot_number: lotNumber,
      supplier_id: formData.supplier_id || null,
      reception_id: formData.reception_id || null,
      origin: formData.origin || null,
      olive_type: formData.olive_type,
      caliber: formData.caliber || null,
      purchase_date: formData.purchase_date,
      quantity_kg: parseFloat(formData.quantity_kg),
      purchase_price_kg: parseFloat(formData.purchase_price_kg),
      state: formData.state,
      salt_rate: formData.salt_rate ? parseFloat(formData.salt_rate) : null,
      brine_density: formData.brine_density ? parseFloat(formData.brine_density) : null,
      quality_grade: formData.quality_grade || null,
      quality_remarks: formData.quality_remarks || null,
    }

    if (editingLot) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('lots') as any)
        .update(payload)
        .eq('id', editingLot.id)

      if (error) {
        console.error('Error updating lot:', error)
        alert('Erreur lors de la modification du lot: ' + error.message)
      } else {
        fetchLots()
        setIsDialogOpen(false)
        resetForm()
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('lots') as any).insert([payload])

      if (error) {
        console.error('Error creating lot:', error)
        alert('Erreur lors de la création du lot: ' + error.message)
      } else {
        fetchLots()
        setIsDialogOpen(false)
        resetForm()
      }
    }
  }

  const handleEdit = (lot: Lot) => {
    setEditingLot(lot)
    setFormData({
      lot_number: lot.lot_number,
      supplier_id: lot.supplier_id || '',
      reception_id: lot.reception_id || '',
      origin: lot.origin || '',
      olive_type: lot.olive_type,
      caliber: lot.caliber || '',
      purchase_date: lot.purchase_date,
      quantity_kg: lot.quantity_kg.toString(),
      purchase_price_kg: lot.purchase_price_kg.toString(),
      state: lot.state,
      salt_rate: lot.salt_rate?.toString() || '',
      brine_density: lot.brine_density?.toString() || '',
      quality_grade: lot.quality_grade || '',
      quality_remarks: lot.quality_remarks || '',
    })
    setIsDialogOpen(true)
  }

  const handleView = (lot: Lot) => {
    setViewingLot(lot)
    setIsViewDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce lot ?')) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('lots') as any).delete().eq('id', id)
      if (error) {
        console.error('Error deleting lot:', error)
        alert('Erreur lors de la suppression: ' + error.message)
      } else {
        fetchLots()
      }
    }
  }

  const resetForm = () => {
    setEditingLot(null)
    setFormData({
      lot_number: '',
      supplier_id: '',
      reception_id: '',
      origin: '',
      olive_type: '',
      caliber: '',
      purchase_date: format(new Date(), 'yyyy-MM-dd'),
      quantity_kg: '',
      purchase_price_kg: '',
      state: 'brut',
      salt_rate: '',
      brine_density: '',
      quality_grade: '',
      quality_remarks: '',
    })
  }

  const filteredLots = lots.filter((lot) => {
    const matchesSearch =
      lot.lot_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lot.olive_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lot.suppliers?.name?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesState = stateFilter === 'all' || lot.state === stateFilter

    return matchesSearch && matchesState
  })

  const totalQuantity = lots.reduce((sum, lot) => sum + lot.quantity_kg, 0)
  const totalValue = lots.reduce((sum, lot) => sum + lot.total_amount, 0)
  const activeLots = lots.filter(lot => lot.state !== 'epuise').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lots</h1>
          <p className="text-gray-500">Gestion et traçabilité des lots d'olives</p>
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
              Nouveau lot
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingLot ? 'Modifier le lot' : 'Nouveau lot'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Section: Lien avec réception */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-700 border-b pb-2">Lien avec réception (optionnel)</h3>
                <div className="space-y-2">
                  <Label htmlFor="reception_id">Bon de réception</Label>
                  <Select
                    value={formData.reception_id || 'none'}
                    onValueChange={(value) => handleReceptionSelect(value === 'none' ? '' : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une réception (optionnel)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune réception</SelectItem>
                      {receptions.map((reception) => (
                        <SelectItem key={reception.id} value={reception.id}>
                          {reception.reception_number} - {format(new Date(reception.reception_date), 'dd/MM/yyyy')} - {reception.suppliers?.name || 'N/A'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    Sélectionner une réception pré-remplit le fournisseur et la date
                  </p>
                </div>
              </div>

              {/* Section: Informations principales */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-700 border-b pb-2">Informations principales</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="supplier_id">Fournisseur *</Label>
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
                    <Label htmlFor="purchase_date">Date d'achat *</Label>
                    <Input
                      id="purchase_date"
                      type="date"
                      value={formData.purchase_date}
                      onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="origin">Origine</Label>
                    <Input
                      id="origin"
                      placeholder="MEK, FES, etc."
                      value={formData.origin}
                      onChange={(e) => setFormData({ ...formData, origin: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="olive_type">Type d'olive *</Label>
                    <Select
                      value={formData.olive_type}
                      onValueChange={(value) => setFormData({ ...formData, olive_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner le type" />
                      </SelectTrigger>
                      <SelectContent>
                        {OLIVE_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="caliber">Calibre</Label>
                    <Select
                      value={formData.caliber}
                      onValueChange={(value) => setFormData({ ...formData, caliber: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner le calibre" />
                      </SelectTrigger>
                      <SelectContent>
                        {CALIBERS.map((caliber) => (
                          <SelectItem key={caliber} value={caliber}>
                            {caliber}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lot_number">N° de lot (auto-généré si vide)</Label>
                    <Input
                      id="lot_number"
                      value={formData.lot_number}
                      onChange={(e) => setFormData({ ...formData, lot_number: e.target.value })}
                      placeholder={generateLotNumber()}
                    />
                  </div>
                </div>
              </div>

              {/* Section: Quantité et prix */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-700 border-b pb-2">Quantité et prix</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity_kg">Quantité (kg) *</Label>
                    <Input
                      id="quantity_kg"
                      type="number"
                      step="0.01"
                      value={formData.quantity_kg}
                      onChange={(e) => setFormData({ ...formData, quantity_kg: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="purchase_price_kg">Prix d'achat (DH/kg) *</Label>
                    <Input
                      id="purchase_price_kg"
                      type="number"
                      step="0.01"
                      value={formData.purchase_price_kg}
                      onChange={(e) => setFormData({ ...formData, purchase_price_kg: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Total estimé</Label>
                    <div className="h-10 px-3 py-2 bg-gray-100 rounded-md flex items-center font-semibold">
                      {formData.quantity_kg && formData.purchase_price_kg
                        ? (parseFloat(formData.quantity_kg) * parseFloat(formData.purchase_price_kg)).toFixed(2)
                        : '0.00'} DH
                    </div>
                  </div>
                </div>
              </div>

              {/* Section: État et caractéristiques */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-700 border-b pb-2">État et caractéristiques</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="state">État du lot</Label>
                    <Select
                      value={formData.state}
                      onValueChange={(value: 'brut' | 'fermente' | 'pret_a_conditionner' | 'conditionne' | 'epuise') =>
                        setFormData({ ...formData, state: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATE_LABELS).map(([key, { label }]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salt_rate">Taux de sel (%)</Label>
                    <Input
                      id="salt_rate"
                      type="number"
                      step="0.01"
                      value={formData.salt_rate}
                      onChange={(e) => setFormData({ ...formData, salt_rate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brine_density">Densité saumure</Label>
                    <Input
                      id="brine_density"
                      type="number"
                      step="0.01"
                      value={formData.brine_density}
                      onChange={(e) => setFormData({ ...formData, brine_density: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Section: Qualité */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-700 border-b pb-2">Qualité</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quality_grade">Grade qualité</Label>
                    <Select
                      value={formData.quality_grade}
                      onValueChange={(value) => setFormData({ ...formData, quality_grade: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un grade" />
                      </SelectTrigger>
                      <SelectContent>
                        {QUALITY_GRADES.map((grade) => (
                          <SelectItem key={grade} value={grade}>
                            Grade {grade}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quality_remarks">Remarques qualité</Label>
                    <Textarea
                      id="quality_remarks"
                      value={formData.quality_remarks}
                      onChange={(e) => setFormData({ ...formData, quality_remarks: e.target.value })}
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" className="bg-[#B8860B] hover:bg-[#9A7209]">
                  {editingLot ? 'Modifier' : 'Créer'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Lots</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Layers className="h-8 w-8 text-orange-600" />
              <span className="text-2xl font-bold">{lots.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Lots Actifs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Package className="h-8 w-8 text-green-600" />
              <span className="text-2xl font-bold">{activeLots}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Quantité Totale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Package className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold">{totalQuantity.toLocaleString('fr-FR')} kg</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Valeur Totale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <span className="text-2xl font-bold">{totalValue.toLocaleString('fr-FR')} DH</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table des lots */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher un lot..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrer par état" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les états</SelectItem>
                {Object.entries(STATE_LABELS).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Chargement...</div>
          ) : filteredLots.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Aucun lot trouvé</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Lot</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Calibre</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Quantité</TableHead>
                  <TableHead className="text-right">Prix/kg</TableHead>
                  <TableHead>État</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLots.map((lot) => (
                  <TableRow key={lot.id}>
                    <TableCell className="font-mono font-medium text-sm">
                      <div className="flex items-center gap-1">
                        {lot.lot_number}
                        {lot.reception_id && (
                          <Link2 className="h-3 w-3 text-blue-500" title={`Lié à: ${lot.receptions?.reception_number || 'BR'}`} />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{lot.suppliers?.name || '-'}</TableCell>
                    <TableCell>{lot.olive_type}</TableCell>
                    <TableCell>{lot.caliber || '-'}</TableCell>
                    <TableCell>
                      {format(new Date(lot.purchase_date), 'dd/MM/yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell className="text-right">
                      {lot.quantity_kg.toLocaleString('fr-FR')} kg
                    </TableCell>
                    <TableCell className="text-right">
                      {lot.purchase_price_kg.toFixed(2)} DH
                    </TableCell>
                    <TableCell>
                      <Badge className={`${STATE_LABELS[lot.state]?.color} text-white`}>
                        {STATE_LABELS[lot.state]?.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleView(lot)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(lot)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600"
                          onClick={() => handleDelete(lot.id)}
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Dialog de visualisation */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Détails du lot</DialogTitle>
          </DialogHeader>
          {viewingLot && (
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Numéro de lot</p>
                <p className="text-xl font-mono font-bold">{viewingLot.lot_number}</p>
                {viewingLot.receptions && (
                  <p className="text-sm text-blue-600 mt-1">
                    Lié à la réception: {viewingLot.receptions.reception_number}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Fournisseur</p>
                  <p className="font-medium">{viewingLot.suppliers?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Origine</p>
                  <p className="font-medium">{viewingLot.origin || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Type d'olive</p>
                  <p className="font-medium">{viewingLot.olive_type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Calibre</p>
                  <p className="font-medium">{viewingLot.caliber || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date d'achat</p>
                  <p className="font-medium">
                    {format(new Date(viewingLot.purchase_date), 'dd MMMM yyyy', { locale: fr })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">État</p>
                  <Badge className={`${STATE_LABELS[viewingLot.state]?.color} text-white`}>
                    {STATE_LABELS[viewingLot.state]?.label}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 bg-orange-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Quantité</p>
                  <p className="text-lg font-bold">{viewingLot.quantity_kg.toLocaleString('fr-FR')} kg</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Prix/kg</p>
                  <p className="text-lg font-bold">{viewingLot.purchase_price_kg.toFixed(2)} DH</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="text-lg font-bold text-orange-600">
                    {viewingLot.total_amount.toLocaleString('fr-FR')} DH
                  </p>
                </div>
              </div>

              {(viewingLot.salt_rate || viewingLot.brine_density || viewingLot.quality_grade) && (
                <div className="grid grid-cols-3 gap-4">
                  {viewingLot.salt_rate && (
                    <div>
                      <p className="text-sm text-gray-500">Taux de sel</p>
                      <p className="font-medium">{viewingLot.salt_rate}%</p>
                    </div>
                  )}
                  {viewingLot.brine_density && (
                    <div>
                      <p className="text-sm text-gray-500">Densité saumure</p>
                      <p className="font-medium">{viewingLot.brine_density}</p>
                    </div>
                  )}
                  {viewingLot.quality_grade && (
                    <div>
                      <p className="text-sm text-gray-500">Grade qualité</p>
                      <p className="font-medium">Grade {viewingLot.quality_grade}</p>
                    </div>
                  )}
                </div>
              )}

              {viewingLot.quality_remarks && (
                <div>
                  <p className="text-sm text-gray-500">Remarques qualité</p>
                  <p className="font-medium bg-gray-50 p-3 rounded">{viewingLot.quality_remarks}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
