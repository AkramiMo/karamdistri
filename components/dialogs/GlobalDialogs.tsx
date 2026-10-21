'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useGlobalDialogs } from '@/contexts/GlobalDialogsContext'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

// ==================== TYPES ====================
interface Supplier { id: string; code: string; name: string }
interface Client { id: string; code: string; name: string }
interface Article { id: string; code: string; name: string; unit_price: number; unit?: string }
interface Supply { id: string; code: string; name: string; price_ht: number; unit?: string }
interface Category { id: string; name: string; parent_id: string | null }
interface Delivery { id: string; delivery_number: string; client_id: string; total_ht: number }
interface Order { id: string; order_number: string; client_id: string }
interface PurchaseOrder { id: string; po_number: string; supplier_id: string }

// Helper pour parser les décimales
const parseDecimal = (v: string) => parseFloat(v.replace(',', '.')) || 0

// ==================== FOURNISSEUR FORM ====================
function FournisseurForm({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const supabase = createClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    code: '', name: '', contact_name: '', phone: '', email: '', address: '', city: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const { error } = await supabase.from('suppliers').insert([formData])
    if (error) toast.error(`Erreur: ${error.message}`)
    else { toast.success('Fournisseur créé'); onSuccess?.(); onClose() }
    setIsSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Code *</Label>
          <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Nom *</Label>
          <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Contact</Label>
          <Input value={formData.contact_name} onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Téléphone</Label>
          <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Ville</Label>
          <Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Adresse</Label>
        <Textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
        <Button type="submit" className="bg-[#B8860B] hover:bg-[#9A7209]" disabled={isSubmitting}>
          {isSubmitting ? 'Création...' : 'Créer'}
        </Button>
      </div>
    </form>
  )
}

// ==================== CLIENT FORM ====================
function ClientForm({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const supabase = createClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    code: '', name: '', contact_name: '', phone: '', email: '', address: '', city: '', category: 'restaurant',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const { error } = await supabase.from('clients').insert([formData])
    if (error) toast.error(`Erreur: ${error.message}`)
    else { toast.success('Client créé'); onSuccess?.(); onClose() }
    setIsSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Code *</Label>
          <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Nom *</Label>
          <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Catégorie</Label>
          <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="restaurant">Restaurant</SelectItem>
              <SelectItem value="hotel">Hôtel</SelectItem>
              <SelectItem value="snack">Snack</SelectItem>
              <SelectItem value="traiteur">Traiteur</SelectItem>
              <SelectItem value="epicerie">Épicerie</SelectItem>
              <SelectItem value="grossiste">Grossiste</SelectItem>
              <SelectItem value="autre">Autre</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Téléphone</Label>
          <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Ville</Label>
          <Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Adresse</Label>
        <Textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
        <Button type="submit" className="bg-[#B8860B] hover:bg-[#9A7209]" disabled={isSubmitting}>
          {isSubmitting ? 'Création...' : 'Créer'}
        </Button>
      </div>
    </form>
  )
}

// ==================== FOURNITURE FORM ====================
function FournitureForm({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const supabase = createClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [formData, setFormData] = useState({
    code: '', name: '', description: '', category_id: '', unit: 'kg', price_ht: '',
  })

  useEffect(() => {
    supabase.from('supply_categories').select('id, name').then(({ data }) => setCategories(data || []))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const { error } = await supabase.from('supplies').insert([{
      ...formData,
      price_ht: parseDecimal(formData.price_ht),
      category_id: formData.category_id || null,
    }])
    if (error) toast.error(`Erreur: ${error.message}`)
    else { toast.success('Fourniture créée'); onSuccess?.(); onClose() }
    setIsSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Code *</Label>
          <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Nom *</Label>
          <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Catégorie</Label>
          <Select value={formData.category_id} onValueChange={(v) => setFormData({ ...formData, category_id: v })}>
            <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Unité</Label>
          <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="kg">Kilogramme (kg)</SelectItem>
              <SelectItem value="l">Litre (L)</SelectItem>
              <SelectItem value="unit">Unité</SelectItem>
              <SelectItem value="pack">Pack</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Prix HT (MAD)</Label>
          <Input value={formData.price_ht} onChange={(e) => setFormData({ ...formData, price_ht: e.target.value })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
        <Button type="submit" className="bg-[#B8860B] hover:bg-[#9A7209]" disabled={isSubmitting}>
          {isSubmitting ? 'Création...' : 'Créer'}
        </Button>
      </div>
    </form>
  )
}

// ==================== CATEGORIE FORM ====================
function CategorieForm({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const supabase = createClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [formData, setFormData] = useState({ name: '', description: '', parent_id: '' })

  useEffect(() => {
    supabase.from('categories').select('id, name, parent_id').then(({ data }) => setCategories(data || []))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const { error } = await supabase.from('categories').insert([{
      name: formData.name,
      description: formData.description || null,
      parent_id: formData.parent_id || null,
    }])
    if (error) toast.error(`Erreur: ${error.message}`)
    else { toast.success('Catégorie créée'); onSuccess?.(); onClose() }
    setIsSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Nom *</Label>
        <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label>Catégorie parente</Label>
        <Select value={formData.parent_id || 'none'} onValueChange={(v) => setFormData({ ...formData, parent_id: v === 'none' ? '' : v })}>
          <SelectTrigger><SelectValue placeholder="Aucune (racine)" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Aucune</SelectItem>
            {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
        <Button type="submit" className="bg-[#B8860B] hover:bg-[#9A7209]" disabled={isSubmitting}>
          {isSubmitting ? 'Création...' : 'Créer'}
        </Button>
      </div>
    </form>
  )
}

// ==================== ARTICLE FORM ====================
function ArticleForm({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const supabase = createClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [formData, setFormData] = useState({
    code: '', name: '', description: '', category_id: '', unit: 'kg', unit_price: '', tva_rate: '20',
  })

  useEffect(() => {
    supabase.from('categories').select('id, name, parent_id').then(({ data }) => setCategories(data || []))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const { error } = await supabase.from('articles').insert([{
      ...formData,
      unit_price: parseDecimal(formData.unit_price),
      tva_rate: parseDecimal(formData.tva_rate),
      category_id: formData.category_id || null,
    }])
    if (error) toast.error(`Erreur: ${error.message}`)
    else { toast.success('Article créé'); onSuccess?.(); onClose() }
    setIsSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Code *</Label>
          <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Nom *</Label>
          <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Catégorie</Label>
          <Select value={formData.category_id} onValueChange={(v) => setFormData({ ...formData, category_id: v })}>
            <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Unité</Label>
          <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="kg">Kilogramme</SelectItem>
              <SelectItem value="l">Litre</SelectItem>
              <SelectItem value="unit">Unité</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Prix unitaire (MAD) *</Label>
          <Input value={formData.unit_price} onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>TVA (%)</Label>
          <Input value={formData.tva_rate} onChange={(e) => setFormData({ ...formData, tva_rate: e.target.value })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
        <Button type="submit" className="bg-[#B8860B] hover:bg-[#9A7209]" disabled={isSubmitting}>
          {isSubmitting ? 'Création...' : 'Créer'}
        </Button>
      </div>
    </form>
  )
}

// ==================== EMBALLAGE FORM ====================
function EmballageForm({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const supabase = createClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    code: '', name: '', description: '', capacity: '', unit: 'kg', price: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const { error } = await supabase.from('emballages').insert([{
      code: formData.code, name: formData.name, description: formData.description || null,
      capacity: parseDecimal(formData.capacity) || null, unit: formData.unit,
      price: parseDecimal(formData.price) || null,
    }])
    if (error) toast.error(`Erreur: ${error.message}`)
    else { toast.success('Emballage créé'); onSuccess?.(); onClose() }
    setIsSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Code *</Label>
          <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Nom *</Label>
          <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Capacité</Label>
          <Input value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: e.target.value })} placeholder="Ex: 5" />
        </div>
        <div className="space-y-2">
          <Label>Unité</Label>
          <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="kg">Kilogramme</SelectItem>
              <SelectItem value="l">Litre</SelectItem>
              <SelectItem value="unit">Unité</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Prix (MAD)</Label>
          <Input value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
        <Button type="submit" className="bg-[#B8860B] hover:bg-[#9A7209]" disabled={isSubmitting}>
          {isSubmitting ? 'Création...' : 'Créer'}
        </Button>
      </div>
    </form>
  )
}

// ==================== PACK FORM ====================
function PackForm({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const supabase = createClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    code: '', name: '', description: '', quantity: '', price: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const { error } = await supabase.from('packs').insert([{
      code: formData.code, name: formData.name, description: formData.description || null,
      quantity: parseInt(formData.quantity) || null, price: parseDecimal(formData.price) || null,
    }])
    if (error) toast.error(`Erreur: ${error.message}`)
    else { toast.success('Pack créé'); onSuccess?.(); onClose() }
    setIsSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Code *</Label>
          <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Nom *</Label>
          <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Quantité</Label>
          <Input type="number" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} placeholder="Ex: 12" />
        </div>
        <div className="space-y-2">
          <Label>Prix (MAD)</Label>
          <Input value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
        <Button type="submit" className="bg-[#B8860B] hover:bg-[#9A7209]" disabled={isSubmitting}>
          {isSubmitting ? 'Création...' : 'Créer'}
        </Button>
      </div>
    </form>
  )
}

// ==================== RECEPTION FORM ====================
function ReceptionForm({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const supabase = createClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [supplies, setSupplies] = useState<Supply[]>([])
  const [formData, setFormData] = useState({
    supplier_id: '', reception_date: format(new Date(), 'yyyy-MM-dd'), notes: '',
  })
  const [items, setItems] = useState<{ supply_id: string; supply_name: string; quantity: string; unit_price: string }[]>([])
  const [selectedSupply, setSelectedSupply] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unitPrice, setUnitPrice] = useState('')

  useEffect(() => {
    supabase.from('suppliers').select('id, code, name').eq('is_active', true).order('name').then(({ data }) => setSuppliers(data || []))
    supabase.from('supplies').select('id, code, name, price_ht').eq('is_active', true).order('name').then(({ data }) => setSupplies(data || []))
  }, [])

  const addItem = () => {
    const supply = supplies.find(s => s.id === selectedSupply)
    if (!supply) return
    setItems([...items, { supply_id: supply.id, supply_name: supply.name, quantity, unit_price: unitPrice || String(supply.price_ht) }])
    setSelectedSupply(''); setQuantity('1'); setUnitPrice('')
  }

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx))

  const totalHT = items.reduce((sum, it) => sum + parseDecimal(it.quantity) * parseDecimal(it.unit_price), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.supplier_id || items.length === 0) {
      toast.error('Sélectionnez un fournisseur et ajoutez des articles')
      return
    }
    setIsSubmitting(true)

    // Generate reception number
    const { data: numData } = await supabase.rpc('generate_reception_number')
    const receptionNumber = numData || `BR-${Date.now()}`

    const { data: newReception, error: recErr } = await supabase.from('receptions').insert([{
      reception_number: receptionNumber,
      supplier_id: formData.supplier_id,
      reception_date: formData.reception_date,
      total_ht: totalHT,
      notes: formData.notes || null,
    }]).select().single()

    if (recErr) { toast.error(`Erreur: ${recErr.message}`); setIsSubmitting(false); return }

    // Insert items
    const itemsToInsert = items.map(it => ({
      reception_id: newReception.id,
      article_id: it.supply_id,
      quantity_expected: parseDecimal(it.quantity),
      quantity_received: parseDecimal(it.quantity),
      unit_price: parseDecimal(it.unit_price),
    }))
    await supabase.from('reception_items').insert(itemsToInsert)

    // Update stock
    for (const it of items) {
      const qty = parseDecimal(it.quantity)
      const { data: existingStock } = await supabase.from('stock').select('id, quantity').eq('article_id', it.supply_id).single()
      if (existingStock) {
        await supabase.from('stock').update({ quantity: existingStock.quantity + qty }).eq('id', existingStock.id)
      } else {
        await supabase.from('stock').insert([{ article_id: it.supply_id, quantity: qty, warehouse: 'principal' }])
      }
      await supabase.from('stock_movements').insert([{
        article_id: it.supply_id, quantity: qty, movement_type: 'in',
        reference_type: 'reception', reference_id: newReception.id,
        notes: `Réception ${receptionNumber}`,
      }])
    }

    toast.success(`BR ${receptionNumber} créé`)
    onSuccess?.(); onClose()
    setIsSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Fournisseur *</Label>
          <Select value={formData.supplier_id} onValueChange={(v) => setFormData({ ...formData, supplier_id: v })}>
            <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
            <SelectContent>
              {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.code} - {s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Date de réception</Label>
          <Input type="date" value={formData.reception_date} onChange={(e) => setFormData({ ...formData, reception_date: e.target.value })} />
        </div>
      </div>

      <div className="border rounded-lg p-4 space-y-3">
        <Label className="font-semibold">Articles</Label>
        <div className="flex gap-2">
          <Select value={selectedSupply} onValueChange={(v) => { setSelectedSupply(v); const s = supplies.find(x => x.id === v); if (s) setUnitPrice(String(s.price_ht)) }}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="Article" /></SelectTrigger>
            <SelectContent>
              {supplies.map((s) => <SelectItem key={s.id} value={s.id}>{s.code} - {s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input className="w-24" placeholder="Qté" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          <Input className="w-28" placeholder="Prix" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
          <Button type="button" onClick={addItem} size="icon"><Plus className="h-4 w-4" /></Button>
        </div>
        {items.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Article</TableHead>
                <TableHead className="text-right">Qté</TableHead>
                <TableHead className="text-right">Prix</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it, idx) => (
                <TableRow key={idx}>
                  <TableCell>{it.supply_name}</TableCell>
                  <TableCell className="text-right">{it.quantity}</TableCell>
                  <TableCell className="text-right">{it.unit_price}</TableCell>
                  <TableCell className="text-right">{(parseDecimal(it.quantity) * parseDecimal(it.unit_price)).toFixed(2)}</TableCell>
                  <TableCell><Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <div className="text-right font-bold">Total HT: {totalHT.toFixed(2)} MAD</div>
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
        <Button type="submit" className="bg-[#B8860B] hover:bg-[#9A7209]" disabled={isSubmitting}>
          {isSubmitting ? 'Création...' : 'Créer le BR'}
        </Button>
      </div>
    </form>
  )
}

// ==================== LOT FORM ====================
function LotForm({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const supabase = createClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [formData, setFormData] = useState({
    lot_number: '', supplier_id: '', origin: '', olive_type: 'NOIR', caliber: '20/22',
    purchase_date: format(new Date(), 'yyyy-MM-dd'), quantity_kg: '', purchase_price_kg: '', state: 'brut',
  })

  useEffect(() => {
    supabase.from('suppliers').select('id, code, name').eq('is_active', true).order('name').then(({ data }) => setSuppliers(data || []))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const qty = parseDecimal(formData.quantity_kg)
    const price = parseDecimal(formData.purchase_price_kg)
    const { error } = await supabase.from('lots').insert([{
      ...formData,
      supplier_id: formData.supplier_id || null,
      quantity_kg: qty,
      purchase_price_kg: price,
      total_amount: qty * price,
      remaining_quantity_kg: qty,
    }])
    if (error) toast.error(`Erreur: ${error.message}`)
    else { toast.success('Lot créé'); onSuccess?.(); onClose() }
    setIsSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>N° Lot *</Label>
          <Input value={formData.lot_number} onChange={(e) => setFormData({ ...formData, lot_number: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Fournisseur</Label>
          <Select value={formData.supplier_id} onValueChange={(v) => setFormData({ ...formData, supplier_id: v })}>
            <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
            <SelectContent>
              {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Type d'olive *</Label>
          <Select value={formData.olive_type} onValueChange={(v) => setFormData({ ...formData, olive_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="NOIR">Noir</SelectItem>
              <SelectItem value="VERT">Vert</SelectItem>
              <SelectItem value="TOURNANT">Tournant</SelectItem>
              <SelectItem value="COCKTAIL">Cocktail</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Calibre</Label>
          <Select value={formData.caliber} onValueChange={(v) => setFormData({ ...formData, caliber: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {['14/16', '16/18', '18/20', '20/22', '22/25', '25/28', '28/32'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Date d'achat</Label>
          <Input type="date" value={formData.purchase_date} onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Origine</Label>
          <Input value={formData.origin} onChange={(e) => setFormData({ ...formData, origin: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Quantité (kg) *</Label>
          <Input value={formData.quantity_kg} onChange={(e) => setFormData({ ...formData, quantity_kg: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Prix/kg (MAD) *</Label>
          <Input value={formData.purchase_price_kg} onChange={(e) => setFormData({ ...formData, purchase_price_kg: e.target.value })} required />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
        <Button type="submit" className="bg-[#B8860B] hover:bg-[#9A7209]" disabled={isSubmitting}>
          {isSubmitting ? 'Création...' : 'Créer'}
        </Button>
      </div>
    </form>
  )
}

// ==================== BON COMMANDE FORM ====================
function BonCommandeForm({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const supabase = createClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [supplies, setSupplies] = useState<Supply[]>([])
  const [formData, setFormData] = useState({ supplier_id: '', order_date: format(new Date(), 'yyyy-MM-dd'), notes: '' })
  const [items, setItems] = useState<{ supply_id: string; supply_name: string; quantity: string; unit_price: string }[]>([])
  const [selectedSupply, setSelectedSupply] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unitPrice, setUnitPrice] = useState('')

  useEffect(() => {
    supabase.from('suppliers').select('id, code, name').eq('is_active', true).order('name').then(({ data }) => setSuppliers(data || []))
    supabase.from('supplies').select('id, code, name, price_ht').eq('is_active', true).order('name').then(({ data }) => setSupplies(data || []))
  }, [])

  const addItem = () => {
    const supply = supplies.find(s => s.id === selectedSupply)
    if (!supply) return
    setItems([...items, { supply_id: supply.id, supply_name: supply.name, quantity, unit_price: unitPrice || String(supply.price_ht) }])
    setSelectedSupply(''); setQuantity('1'); setUnitPrice('')
  }

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx))
  const totalHT = items.reduce((sum, it) => sum + parseDecimal(it.quantity) * parseDecimal(it.unit_price), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.supplier_id || items.length === 0) { toast.error('Sélectionnez un fournisseur et ajoutez des articles'); return }
    setIsSubmitting(true)

    const { data: numData } = await supabase.rpc('generate_po_number')
    const poNumber = numData || `BC-${Date.now()}`

    const { data: newPO, error } = await supabase.from('purchase_orders').insert([{
      po_number: poNumber, supplier_id: formData.supplier_id, order_date: formData.order_date,
      total_ht: totalHT, notes: formData.notes || null, status: 'draft',
    }]).select().single()

    if (error) { toast.error(`Erreur: ${error.message}`); setIsSubmitting(false); return }

    await supabase.from('purchase_order_items').insert(items.map(it => ({
      purchase_order_id: newPO.id, supply_id: it.supply_id,
      quantity: parseDecimal(it.quantity), unit_price: parseDecimal(it.unit_price),
      total_ht: parseDecimal(it.quantity) * parseDecimal(it.unit_price),
    })))

    toast.success(`BC ${poNumber} créé`); onSuccess?.(); onClose()
    setIsSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Fournisseur *</Label>
          <Select value={formData.supplier_id} onValueChange={(v) => setFormData({ ...formData, supplier_id: v })}>
            <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
            <SelectContent>
              {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.code} - {s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Date</Label>
          <Input type="date" value={formData.order_date} onChange={(e) => setFormData({ ...formData, order_date: e.target.value })} />
        </div>
      </div>

      <div className="border rounded-lg p-4 space-y-3">
        <Label className="font-semibold">Articles</Label>
        <div className="flex gap-2">
          <Select value={selectedSupply} onValueChange={(v) => { setSelectedSupply(v); const s = supplies.find(x => x.id === v); if (s) setUnitPrice(String(s.price_ht)) }}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="Article" /></SelectTrigger>
            <SelectContent>
              {supplies.map((s) => <SelectItem key={s.id} value={s.id}>{s.code} - {s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input className="w-24" placeholder="Qté" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          <Input className="w-28" placeholder="Prix" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
          <Button type="button" onClick={addItem} size="icon"><Plus className="h-4 w-4" /></Button>
        </div>
        {items.length > 0 && (
          <Table>
            <TableHeader><TableRow><TableHead>Article</TableHead><TableHead className="text-right">Qté</TableHead><TableHead className="text-right">Prix</TableHead><TableHead className="text-right">Total</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {items.map((it, idx) => (
                <TableRow key={idx}>
                  <TableCell>{it.supply_name}</TableCell>
                  <TableCell className="text-right">{it.quantity}</TableCell>
                  <TableCell className="text-right">{it.unit_price}</TableCell>
                  <TableCell className="text-right">{(parseDecimal(it.quantity) * parseDecimal(it.unit_price)).toFixed(2)}</TableCell>
                  <TableCell><Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <div className="text-right font-bold">Total HT: {totalHT.toFixed(2)} MAD</div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
        <Button type="submit" className="bg-[#B8860B] hover:bg-[#9A7209]" disabled={isSubmitting}>
          {isSubmitting ? 'Création...' : 'Créer le BC'}
        </Button>
      </div>
    </form>
  )
}

// ==================== PAIEMENT FORM ====================
function PaiementForm({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const supabase = createClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [formData, setFormData] = useState({
    client_id: '', amount: '', payment_method: 'cash', payment_date: format(new Date(), 'yyyy-MM-dd'), reference: '', notes: '',
  })

  useEffect(() => {
    supabase.from('clients').select('id, code, name').eq('is_active', true).order('name').then(({ data }) => setClients(data || []))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.client_id || !formData.amount) { toast.error('Remplissez les champs obligatoires'); return }
    setIsSubmitting(true)

    const { data: numData } = await supabase.rpc('generate_payment_number')
    const paymentNumber = numData || `REC-${Date.now()}`

    const { error } = await supabase.from('payments').insert([{
      payment_number: paymentNumber, client_id: formData.client_id,
      amount: parseDecimal(formData.amount), payment_method: formData.payment_method,
      payment_date: formData.payment_date, reference: formData.reference || null, notes: formData.notes || null,
    }])

    if (error) toast.error(`Erreur: ${error.message}`)
    else { toast.success(`Paiement ${paymentNumber} enregistré`); onSuccess?.(); onClose() }
    setIsSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Client *</Label>
          <Select value={formData.client_id} onValueChange={(v) => setFormData({ ...formData, client_id: v })}>
            <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
            <SelectContent>
              {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Montant (MAD) *</Label>
          <Input value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Mode de paiement</Label>
          <Select value={formData.payment_method} onValueChange={(v) => setFormData({ ...formData, payment_method: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Espèces</SelectItem>
              <SelectItem value="check">Chèque</SelectItem>
              <SelectItem value="transfer">Virement</SelectItem>
              <SelectItem value="card">Carte</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Date</Label>
          <Input type="date" value={formData.payment_date} onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })} />
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Référence (N° chèque, etc.)</Label>
          <Input value={formData.reference} onChange={(e) => setFormData({ ...formData, reference: e.target.value })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
        <Button type="submit" className="bg-[#B8860B] hover:bg-[#9A7209]" disabled={isSubmitting}>
          {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>
    </form>
  )
}

// ==================== COMMANDE FORM ====================
interface DDC { id: string; ddc_number: string; request_date: string; status: string; total_ht: number }
interface DDCItem { article_id: string; article_code: string; article_name: string; quantity: number; unit_price: number }
interface ClientPrice { article_id: string; custom_price: number }
type PriceSource = 'catalogue' | 'ddc' | 'libre'

function CommandeForm({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const supabase = createClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [formData, setFormData] = useState({
    client_id: '', order_date: format(new Date(), 'yyyy-MM-dd'), delivery_date: '', notes: '',
  })
  const [items, setItems] = useState<{ article_id: string; article_name: string; quantity: string; unit_price: string; price_source: PriceSource }[]>([])
  const [selectedArticle, setSelectedArticle] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unitPrice, setUnitPrice] = useState('')

  // DDC Catalogue states
  const [priceSource, setPriceSource] = useState<PriceSource>('catalogue')
  const [clientDDCs, setClientDDCs] = useState<DDC[]>([])
  const [selectedDDC, setSelectedDDC] = useState('')
  const [ddcItems, setDdcItems] = useState<DDCItem[]>([])
  const [clientPrices, setClientPrices] = useState<ClientPrice[]>([])

  useEffect(() => {
    supabase.from('clients').select('id, code, name').eq('is_active', true).order('name').then(({ data }) => setClients(data || []))
    supabase.from('articles').select('id, code, name, price_ht, unit').eq('is_active', true).order('name').then(({ data }) => setArticles((data || []).map(a => ({ ...a, unit_price: a.price_ht }))))
  }, [])

  // Fetch client prices and DDCs when client changes
  useEffect(() => {
    if (formData.client_id) {
      // Fetch client prices
      supabase.from('client_prices').select('article_id, custom_price').eq('client_id', formData.client_id)
        .then(({ data }) => setClientPrices(data || []))
      // Fetch validated DDCs
      supabase.from('client_quote_requests').select('id, ddc_number, request_date, status, total_ht')
        .eq('client_id', formData.client_id).eq('status', 'accepted').order('request_date', { ascending: false })
        .then(({ data }) => setClientDDCs(data || []))
    } else {
      setClientPrices([])
      setClientDDCs([])
      setSelectedDDC('')
      setDdcItems([])
    }
    setPriceSource('catalogue')
    setSelectedDDC('')
    setDdcItems([])
  }, [formData.client_id])

  // Fetch DDC items when DDC selection changes
  useEffect(() => {
    if (selectedDDC) {
      supabase.from('client_quote_request_items').select('article_id, article_code, article_name, quantity, unit_price')
        .eq('ddc_id', selectedDDC).then(({ data }) => setDdcItems(data || []))
    } else {
      setDdcItems([])
    }
  }, [selectedDDC])

  // Get price for an article based on price source
  const getArticlePrice = (articleId: string): number => {
    if (priceSource === 'ddc' && selectedDDC) {
      const ddcItem = ddcItems.find(item => item.article_id === articleId)
      if (ddcItem) return ddcItem.unit_price
    }
    if (priceSource === 'libre') return 0
    // Catalogue: client price if exists, otherwise article price
    const clientPrice = clientPrices.find(cp => cp.article_id === articleId)
    if (clientPrice) return clientPrice.custom_price
    const article = articles.find(a => a.id === articleId)
    return article?.unit_price || 0
  }

  // Generate order number with BCC format
  const generateOrderNumber = async (): Promise<string> => {
    const { data } = await supabase.from('orders').select('order_number').like('order_number', 'BCC%')
    if (data && data.length > 0) {
      const numbers = data.map((d: { order_number: string }) => parseInt(d.order_number.replace('BCC', ''))).filter((n: number) => !isNaN(n))
      if (numbers.length > 0) {
        const maxNum = Math.max(...numbers)
        return `BCC${maxNum + 1}`
      }
    }
    return 'BCC1'
  }

  const addItem = () => {
    const article = articles.find(a => a.id === selectedArticle)
    if (!article) return
    const price = priceSource === 'libre' ? unitPrice : String(getArticlePrice(article.id))
    setItems([...items, { article_id: article.id, article_name: article.name, quantity, unit_price: price || String(article.unit_price), price_source: priceSource }])
    setSelectedArticle(''); setQuantity('1'); setUnitPrice('')
  }

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx))
  const totalHT = items.reduce((sum, it) => sum + parseDecimal(it.quantity) * parseDecimal(it.unit_price), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.client_id || items.length === 0) { toast.error('Sélectionnez un client et ajoutez des articles'); return }
    setIsSubmitting(true)

    const orderNumber = await generateOrderNumber()

    const { data: newOrder, error } = await supabase.from('orders').insert([{
      order_number: orderNumber, client_id: formData.client_id, order_date: formData.order_date,
      delivery_date: formData.delivery_date || null, total_ht: totalHT, total_ttc: totalHT,
      notes: formData.notes || null, status: 'confirmed',
    }]).select().single()

    if (error) { toast.error(`Erreur: ${error.message}`); setIsSubmitting(false); return }

    await supabase.from('order_items').insert(items.map(it => ({
      order_id: newOrder.id, article_id: it.article_id,
      quantity: parseDecimal(it.quantity), unit_price: parseDecimal(it.unit_price),
      total_ht: parseDecimal(it.quantity) * parseDecimal(it.unit_price),
    })))

    toast.success(`Commande ${orderNumber} créée`); onSuccess?.(); onClose()
    setIsSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Client *</Label>
          <Select value={formData.client_id} onValueChange={(v) => setFormData({ ...formData, client_id: v })}>
            <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
            <SelectContent>
              {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Date commande</Label>
          <Input type="date" value={formData.order_date} onChange={(e) => setFormData({ ...formData, order_date: e.target.value })} />
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Date de livraison souhaitée</Label>
          <Input type="date" value={formData.delivery_date} onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })} />
        </div>
      </div>

      {/* Source de prix - DDC Catalogue */}
      {formData.client_id && (
        <div className="border rounded-lg p-3 bg-gray-50 space-y-3">
          <div className="flex items-center gap-4">
            <Label className="font-semibold">Source de prix :</Label>
            <div className="flex gap-2">
              <Button type="button" variant={priceSource === 'catalogue' ? 'default' : 'outline'} size="sm"
                onClick={() => { setPriceSource('catalogue'); setSelectedDDC(''); setDdcItems([]) }}
                className={priceSource === 'catalogue' ? 'bg-[#B8860B] hover:bg-[#9A7209]' : ''}>
                Catalogue
              </Button>
              <Button type="button" variant={priceSource === 'ddc' ? 'default' : 'outline'} size="sm"
                onClick={() => setPriceSource('ddc')}
                className={priceSource === 'ddc' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                disabled={clientDDCs.length === 0}>
                DDC {clientDDCs.length > 0 && `(${clientDDCs.length})`}
              </Button>
              <Button type="button" variant={priceSource === 'libre' ? 'default' : 'outline'} size="sm"
                onClick={() => { setPriceSource('libre'); setSelectedDDC(''); setDdcItems([]) }}
                className={priceSource === 'libre' ? 'bg-green-600 hover:bg-green-700' : ''}>
                Libre
              </Button>
            </div>
          </div>

          {priceSource === 'ddc' && clientDDCs.length > 0 && (
            <div className="flex items-center gap-4">
              <Label>DDC validé :</Label>
              <Select value={selectedDDC} onValueChange={setSelectedDDC}>
                <SelectTrigger className="w-[300px] bg-blue-50">
                  <SelectValue placeholder="Sélectionner un DDC" />
                </SelectTrigger>
                <SelectContent>
                  {clientDDCs.map((ddc) => (
                    <SelectItem key={ddc.id} value={ddc.id}>
                      {ddc.ddc_number} - {format(new Date(ddc.request_date), 'dd/MM/yyyy')} ({ddc.total_ht.toFixed(2)} MAD)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedDDC && ddcItems.length > 0 && (
                <span className="text-sm text-blue-600 font-medium">{ddcItems.length} articles</span>
              )}
            </div>
          )}

          <div className="text-sm text-gray-500">
            {priceSource === 'catalogue' && <span>Prix depuis le catalogue (prix client personnalisé si existant)</span>}
            {priceSource === 'ddc' && !selectedDDC && <span className="text-orange-600">Sélectionnez un DDC validé pour utiliser ses prix</span>}
            {priceSource === 'ddc' && selectedDDC && <span className="text-blue-600">Les prix seront pris du DDC sélectionné</span>}
            {priceSource === 'libre' && <span className="text-green-600">Saisissez le prix manuellement</span>}
          </div>
        </div>
      )}

      <div className="border rounded-lg p-4 space-y-3">
        <Label className="font-semibold">Articles</Label>
        <div className="flex gap-2">
          <Select value={selectedArticle} onValueChange={(v) => {
            setSelectedArticle(v)
            const price = getArticlePrice(v)
            if (priceSource !== 'libre') setUnitPrice(String(price))
          }}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="Article" /></SelectTrigger>
            <SelectContent>
              {articles.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input className="w-24" placeholder="Qté" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          <Input className="w-28" placeholder="Prix" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)}
            disabled={priceSource !== 'libre' && priceSource !== 'catalogue'} />
          <Button type="button" onClick={addItem} size="icon"><Plus className="h-4 w-4" /></Button>
        </div>
        {items.length > 0 && (
          <Table>
            <TableHeader><TableRow><TableHead>Article</TableHead><TableHead className="text-right">Qté</TableHead><TableHead className="text-right">Prix</TableHead><TableHead className="text-right">Total</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {items.map((it, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    {it.article_name}
                    {it.price_source === 'ddc' && <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-1 rounded">DDC</span>}
                    {it.price_source === 'libre' && <span className="ml-2 text-xs text-green-600 bg-green-50 px-1 rounded">Libre</span>}
                  </TableCell>
                  <TableCell className="text-right">{it.quantity}</TableCell>
                  <TableCell className="text-right">{it.unit_price}</TableCell>
                  <TableCell className="text-right">{(parseDecimal(it.quantity) * parseDecimal(it.unit_price)).toFixed(2)}</TableCell>
                  <TableCell><Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <div className="text-right font-bold">Total HT: {totalHT.toFixed(2)} MAD</div>
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
        <Button type="submit" className="bg-[#B8860B] hover:bg-[#9A7209]" disabled={isSubmitting}>
          {isSubmitting ? 'Création...' : 'Créer la commande'}
        </Button>
      </div>
    </form>
  )
}

// ==================== LIVRAISON FORM ====================
function LivraisonForm({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const supabase = createClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [formData, setFormData] = useState({
    client_id: '', order_id: '', delivery_date: format(new Date(), 'yyyy-MM-dd'), notes: '',
  })
  const [items, setItems] = useState<{ article_id: string; article_name: string; quantity: string; unit_price: string }[]>([])
  const [selectedArticle, setSelectedArticle] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unitPrice, setUnitPrice] = useState('')

  useEffect(() => {
    supabase.from('clients').select('id, code, name').eq('is_active', true).order('name').then(({ data }) => setClients(data || []))
    supabase.from('articles').select('id, code, name, price_ht, unit').eq('is_active', true).order('name').then(({ data }) => setArticles((data || []).map(a => ({ ...a, unit_price: a.price_ht }))))
  }, [])

  // Charger les commandes du client sélectionné
  useEffect(() => {
    if (formData.client_id) {
      supabase.from('orders').select('id, order_number, client_id').eq('client_id', formData.client_id).in('status', ['confirmed', 'in_progress']).order('created_at', { ascending: false }).then(({ data }) => setOrders(data || []))
    } else {
      setOrders([])
    }
  }, [formData.client_id])

  const addItem = () => {
    const article = articles.find(a => a.id === selectedArticle)
    if (!article) return
    setItems([...items, { article_id: article.id, article_name: article.name, quantity, unit_price: unitPrice || String(article.unit_price) }])
    setSelectedArticle(''); setQuantity('1'); setUnitPrice('')
  }

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx))
  const totalHT = items.reduce((sum, it) => sum + parseDecimal(it.quantity) * parseDecimal(it.unit_price), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.client_id || items.length === 0) { toast.error('Sélectionnez un client et ajoutez des articles'); return }
    setIsSubmitting(true)

    const { data: numData } = await supabase.rpc('generate_delivery_number')
    const deliveryNumber = numData || `BL-${Date.now()}`

    const { data: newDelivery, error } = await supabase.from('deliveries').insert([{
      delivery_number: deliveryNumber, client_id: formData.client_id, order_id: formData.order_id || null,
      delivery_date: formData.delivery_date, total_ht: totalHT, notes: formData.notes || null, status: 'pending',
    }]).select().single()

    if (error) { toast.error(`Erreur: ${error.message}`); setIsSubmitting(false); return }

    await supabase.from('delivery_items').insert(items.map(it => ({
      delivery_id: newDelivery.id, article_id: it.article_id,
      quantity_ordered: parseDecimal(it.quantity), quantity_delivered: 0,
      unit_price: parseDecimal(it.unit_price),
    })))

    toast.success(`BL ${deliveryNumber} créé`); onSuccess?.(); onClose()
    setIsSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Client *</Label>
          <Select value={formData.client_id} onValueChange={(v) => setFormData({ ...formData, client_id: v, order_id: '' })}>
            <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
            <SelectContent>
              {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Commande associée</Label>
          <Select value={formData.order_id || 'none'} onValueChange={(v) => setFormData({ ...formData, order_id: v === 'none' ? '' : v })}>
            <SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Aucune</SelectItem>
              {orders.map((o) => <SelectItem key={o.id} value={o.id}>{o.order_number}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Date de livraison</Label>
          <Input type="date" value={formData.delivery_date} onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })} />
        </div>
      </div>

      <div className="border rounded-lg p-4 space-y-3">
        <Label className="font-semibold">Articles</Label>
        <div className="flex gap-2">
          <Select value={selectedArticle} onValueChange={(v) => { setSelectedArticle(v); const a = articles.find(x => x.id === v); if (a) setUnitPrice(String(a.unit_price)) }}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="Article" /></SelectTrigger>
            <SelectContent>
              {articles.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input className="w-24" placeholder="Qté" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          <Input className="w-28" placeholder="Prix" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
          <Button type="button" onClick={addItem} size="icon"><Plus className="h-4 w-4" /></Button>
        </div>
        {items.length > 0 && (
          <Table>
            <TableHeader><TableRow><TableHead>Article</TableHead><TableHead className="text-right">Qté</TableHead><TableHead className="text-right">Prix</TableHead><TableHead className="text-right">Total</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {items.map((it, idx) => (
                <TableRow key={idx}>
                  <TableCell>{it.article_name}</TableCell>
                  <TableCell className="text-right">{it.quantity}</TableCell>
                  <TableCell className="text-right">{it.unit_price}</TableCell>
                  <TableCell className="text-right">{(parseDecimal(it.quantity) * parseDecimal(it.unit_price)).toFixed(2)}</TableCell>
                  <TableCell><Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <div className="text-right font-bold">Total HT: {totalHT.toFixed(2)} MAD</div>
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
        <Button type="submit" className="bg-[#B8860B] hover:bg-[#9A7209]" disabled={isSubmitting}>
          {isSubmitting ? 'Création...' : 'Créer le BL'}
        </Button>
      </div>
    </form>
  )
}

// ==================== TOURNEE FORM ====================
interface Driver { id: string; full_name: string }

function TourneeForm({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const supabase = createClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [formData, setFormData] = useState({
    driver_id: '', round_date: format(new Date(), 'yyyy-MM-dd'), notes: '',
  })
  const [selectedDeliveries, setSelectedDeliveries] = useState<string[]>([])

  useEffect(() => {
    // Charger les livreurs
    supabase.from('users').select('id, full_name').then(({ data }) => setDrivers(data || []))
    // Charger les BL en attente
    supabase.from('deliveries').select('id, delivery_number, client_id, total_ht').eq('status', 'pending').order('created_at', { ascending: false }).then(({ data }) => setDeliveries(data || []))
  }, [])

  const toggleDelivery = (deliveryId: string) => {
    setSelectedDeliveries(prev =>
      prev.includes(deliveryId) ? prev.filter(id => id !== deliveryId) : [...prev, deliveryId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.driver_id || selectedDeliveries.length === 0) { toast.error('Sélectionnez un livreur et des BL'); return }
    setIsSubmitting(true)

    const { data: numData } = await supabase.rpc('generate_round_number')
    const roundNumber = numData || `BLT-${Date.now()}`

    const { data: newRound, error } = await supabase.from('delivery_rounds').insert([{
      round_number: roundNumber, driver_id: formData.driver_id,
      round_date: formData.round_date, notes: formData.notes || null, status: 'pending',
    }]).select().single()

    if (error) { toast.error(`Erreur: ${error.message}`); setIsSubmitting(false); return }

    // Ajouter les BL à la tournée
    await supabase.from('delivery_round_items').insert(selectedDeliveries.map((deliveryId, idx) => ({
      round_id: newRound.id, delivery_id: deliveryId, sequence_order: idx + 1, status: 'pending',
    })))

    // Mettre à jour le statut des BL
    await supabase.from('deliveries').update({ status: 'in_delivery' }).in('id', selectedDeliveries)

    toast.success(`Tournée ${roundNumber} créée avec ${selectedDeliveries.length} BL`); onSuccess?.(); onClose()
    setIsSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Livreur *</Label>
          <Select value={formData.driver_id} onValueChange={(v) => setFormData({ ...formData, driver_id: v })}>
            <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
            <SelectContent>
              {drivers.map((d) => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Date de tournée</Label>
          <Input type="date" value={formData.round_date} onChange={(e) => setFormData({ ...formData, round_date: e.target.value })} />
        </div>
      </div>

      <div className="border rounded-lg p-4 space-y-3">
        <Label className="font-semibold">Bons de livraison à inclure ({selectedDeliveries.length} sélectionné(s))</Label>
        {deliveries.length === 0 ? (
          <p className="text-gray-500 text-sm">Aucun BL en attente</p>
        ) : (
          <div className="max-h-60 overflow-y-auto space-y-2">
            {deliveries.map((d) => (
              <div key={d.id} className="flex items-center gap-3 p-2 border rounded hover:bg-gray-50 cursor-pointer" onClick={() => toggleDelivery(d.id)}>
                <input type="checkbox" checked={selectedDeliveries.includes(d.id)} onChange={() => {}} className="h-4 w-4" />
                <span className="font-medium">{d.delivery_number}</span>
                <span className="text-gray-500 text-sm">- {d.total_ht?.toFixed(2)} MAD</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
        <Button type="submit" className="bg-[#B8860B] hover:bg-[#9A7209]" disabled={isSubmitting}>
          {isSubmitting ? 'Création...' : 'Créer la tournée'}
        </Button>
      </div>
    </form>
  )
}

// ==================== VENTE FORM ====================
function VenteForm({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const supabase = createClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [formData, setFormData] = useState({
    client_id: '', sale_date: format(new Date(), 'yyyy-MM-dd'), payment_method: 'cash', notes: '',
  })
  const [items, setItems] = useState<{ article_id: string; article_name: string; quantity: string; unit_price: string }[]>([])
  const [selectedArticle, setSelectedArticle] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unitPrice, setUnitPrice] = useState('')

  useEffect(() => {
    supabase.from('clients').select('id, code, name').eq('is_active', true).order('name').then(({ data }) => setClients(data || []))
    supabase.from('articles').select('id, code, name, price_ht, unit').eq('is_active', true).order('name').then(({ data }) => setArticles((data || []).map(a => ({ ...a, unit_price: a.price_ht }))))
  }, [])

  const addItem = () => {
    const article = articles.find(a => a.id === selectedArticle)
    if (!article) return
    setItems([...items, { article_id: article.id, article_name: article.name, quantity, unit_price: unitPrice || String(article.unit_price) }])
    setSelectedArticle(''); setQuantity('1'); setUnitPrice('')
  }

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx))
  const totalHT = items.reduce((sum, it) => sum + parseDecimal(it.quantity) * parseDecimal(it.unit_price), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.client_id || items.length === 0) { toast.error('Sélectionnez un client et ajoutez des articles'); return }
    setIsSubmitting(true)

    const { data: numData } = await supabase.rpc('generate_sale_number')
    const saleNumber = numData || `VTE-${Date.now()}`

    const { error } = await supabase.from('sales').insert([{
      sale_number: saleNumber, client_id: formData.client_id,
      sale_date: formData.sale_date, total_ht: totalHT, total_ttc: totalHT,
      payment_method: formData.payment_method, payment_status: 'pending',
      notes: formData.notes || null,
    }])

    if (error) { toast.error(`Erreur: ${error.message}`); setIsSubmitting(false); return }

    toast.success(`Vente ${saleNumber} créée`); onSuccess?.(); onClose()
    setIsSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Client *</Label>
          <Select value={formData.client_id} onValueChange={(v) => setFormData({ ...formData, client_id: v })}>
            <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
            <SelectContent>
              {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Date de vente</Label>
          <Input type="date" value={formData.sale_date} onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })} />
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Mode de paiement</Label>
          <Select value={formData.payment_method} onValueChange={(v) => setFormData({ ...formData, payment_method: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Espèces</SelectItem>
              <SelectItem value="check">Chèque</SelectItem>
              <SelectItem value="transfer">Virement</SelectItem>
              <SelectItem value="card">Carte</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-lg p-4 space-y-3">
        <Label className="font-semibold">Articles</Label>
        <div className="flex gap-2">
          <Select value={selectedArticle} onValueChange={(v) => { setSelectedArticle(v); const a = articles.find(x => x.id === v); if (a) setUnitPrice(String(a.unit_price)) }}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="Article" /></SelectTrigger>
            <SelectContent>
              {articles.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input className="w-24" placeholder="Qté" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          <Input className="w-28" placeholder="Prix" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
          <Button type="button" onClick={addItem} size="icon"><Plus className="h-4 w-4" /></Button>
        </div>
        {items.length > 0 && (
          <Table>
            <TableHeader><TableRow><TableHead>Article</TableHead><TableHead className="text-right">Qté</TableHead><TableHead className="text-right">Prix</TableHead><TableHead className="text-right">Total</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {items.map((it, idx) => (
                <TableRow key={idx}>
                  <TableCell>{it.article_name}</TableCell>
                  <TableCell className="text-right">{it.quantity}</TableCell>
                  <TableCell className="text-right">{it.unit_price}</TableCell>
                  <TableCell className="text-right">{(parseDecimal(it.quantity) * parseDecimal(it.unit_price)).toFixed(2)}</TableCell>
                  <TableCell><Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <div className="text-right font-bold">Total: {totalHT.toFixed(2)} MAD</div>
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
        <Button type="submit" className="bg-[#B8860B] hover:bg-[#9A7209]" disabled={isSubmitting}>
          {isSubmitting ? 'Création...' : 'Créer la vente'}
        </Button>
      </div>
    </form>
  )
}

// ==================== FACTURE FORM ====================
function FactureForm({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const supabase = createClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [formData, setFormData] = useState({
    client_id: '', delivery_id: '', facture_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: '', total_ht: '', notes: '',
  })

  useEffect(() => {
    supabase.from('clients').select('id, code, name').eq('is_active', true).order('name').then(({ data }) => setClients(data || []))
  }, [])

  // Charger les livraisons du client
  useEffect(() => {
    if (formData.client_id) {
      supabase.from('deliveries').select('id, delivery_number, client_id, total_ht').eq('client_id', formData.client_id).eq('status', 'delivered').order('created_at', { ascending: false }).then(({ data }) => setDeliveries(data || []))
    } else {
      setDeliveries([])
    }
  }, [formData.client_id])

  // Mettre à jour le total quand une livraison est sélectionnée
  useEffect(() => {
    if (formData.delivery_id) {
      const delivery = deliveries.find(d => d.id === formData.delivery_id)
      if (delivery) setFormData(prev => ({ ...prev, total_ht: String(delivery.total_ht || 0) }))
    }
  }, [formData.delivery_id, deliveries])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.client_id) { toast.error('Sélectionnez un client'); return }
    setIsSubmitting(true)

    const { data: numData } = await supabase.rpc('generate_invoice_number')
    const factureNumber = numData || `FAC-${Date.now()}`

    const totalHT = parseDecimal(formData.total_ht)
    const { error } = await supabase.from('factures').insert([{
      facture_number: factureNumber, client_id: formData.client_id,
      delivery_id: formData.delivery_id || null, facture_date: formData.facture_date,
      due_date: formData.due_date || null, total_ht: totalHT, total_ttc: totalHT,
      notes: formData.notes || null, status: 'draft',
    }])

    if (error) { toast.error(`Erreur: ${error.message}`); setIsSubmitting(false); return }

    toast.success(`Facture ${factureNumber} créée`); onSuccess?.(); onClose()
    setIsSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Client *</Label>
          <Select value={formData.client_id} onValueChange={(v) => setFormData({ ...formData, client_id: v, delivery_id: '' })}>
            <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
            <SelectContent>
              {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Livraison associée</Label>
          <Select value={formData.delivery_id || 'none'} onValueChange={(v) => setFormData({ ...formData, delivery_id: v === 'none' ? '' : v })}>
            <SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Aucune</SelectItem>
              {deliveries.map((d) => <SelectItem key={d.id} value={d.id}>{d.delivery_number} - {d.total_ht?.toFixed(2)} MAD</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Date de facture</Label>
          <Input type="date" value={formData.facture_date} onChange={(e) => setFormData({ ...formData, facture_date: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Date d'échéance</Label>
          <Input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} />
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Montant HT (MAD) *</Label>
          <Input value={formData.total_ht} onChange={(e) => setFormData({ ...formData, total_ht: e.target.value })} required />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
        <Button type="submit" className="bg-[#B8860B] hover:bg-[#9A7209]" disabled={isSubmitting}>
          {isSubmitting ? 'Création...' : 'Créer la facture'}
        </Button>
      </div>
    </form>
  )
}

// ==================== DEVIS FORM ====================
function DevisForm({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const supabase = createClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [formData, setFormData] = useState({
    client_id: '', request_date: format(new Date(), 'yyyy-MM-dd'), validity_date: '', notes: '',
  })
  const [items, setItems] = useState<{ article_id: string; article_code: string; article_name: string; quantity: string; unit_price: string }[]>([])
  const [selectedArticle, setSelectedArticle] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unitPrice, setUnitPrice] = useState('')

  useEffect(() => {
    supabase.from('clients').select('id, code, name').eq('is_active', true).order('name').then(({ data }) => setClients(data || []))
    supabase.from('articles').select('id, code, name, price_ht').eq('is_active', true).order('name').then(({ data }) => setArticles((data || []).map(a => ({ ...a, unit_price: a.price_ht }))))
  }, [])

  const addItem = () => {
    const article = articles.find(a => a.id === selectedArticle)
    if (!article) return
    setItems([...items, { article_id: article.id, article_code: article.code, article_name: article.name, quantity, unit_price: unitPrice || String(article.unit_price) }])
    setSelectedArticle(''); setQuantity('1'); setUnitPrice('')
  }

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx))
  const totalHT = items.reduce((sum, it) => sum + parseDecimal(it.quantity) * parseDecimal(it.unit_price), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.client_id || items.length === 0) { toast.error('Sélectionnez un client et ajoutez des articles'); return }
    setIsSubmitting(true)

    const { data: numData } = await supabase.rpc('generate_ddc_number')
    const ddcNumber = numData || `DDC-${Date.now()}`

    const { data: newDevis, error } = await supabase.from('client_quote_requests').insert([{
      ddc_number: ddcNumber, client_id: formData.client_id,
      request_date: formData.request_date, validity_date: formData.validity_date || null,
      total_ht: totalHT, notes: formData.notes || null, status: 'draft',
    }]).select().single()

    if (error) { toast.error(`Erreur: ${error.message}`); setIsSubmitting(false); return }

    await supabase.from('client_quote_request_items').insert(items.map(it => ({
      ddc_id: newDevis.id, article_id: it.article_id, article_code: it.article_code,
      article_name: it.article_name, quantity: parseDecimal(it.quantity), unit_price: parseDecimal(it.unit_price),
    })))

    toast.success(`Devis ${ddcNumber} créé`); onSuccess?.(); onClose()
    setIsSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Client *</Label>
          <Select value={formData.client_id} onValueChange={(v) => setFormData({ ...formData, client_id: v })}>
            <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
            <SelectContent>
              {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Date du devis</Label>
          <Input type="date" value={formData.request_date} onChange={(e) => setFormData({ ...formData, request_date: e.target.value })} />
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Date de validité</Label>
          <Input type="date" value={formData.validity_date} onChange={(e) => setFormData({ ...formData, validity_date: e.target.value })} />
        </div>
      </div>

      <div className="border rounded-lg p-4 space-y-3">
        <Label className="font-semibold">Articles</Label>
        <div className="flex gap-2">
          <Select value={selectedArticle} onValueChange={(v) => { setSelectedArticle(v); const a = articles.find(x => x.id === v); if (a) setUnitPrice(String(a.unit_price)) }}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="Article" /></SelectTrigger>
            <SelectContent>
              {articles.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input className="w-24" placeholder="Qté" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          <Input className="w-28" placeholder="Prix" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
          <Button type="button" onClick={addItem} size="icon"><Plus className="h-4 w-4" /></Button>
        </div>
        {items.length > 0 && (
          <Table>
            <TableHeader><TableRow><TableHead>Article</TableHead><TableHead className="text-right">Qté</TableHead><TableHead className="text-right">Prix</TableHead><TableHead className="text-right">Total</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {items.map((it, idx) => (
                <TableRow key={idx}>
                  <TableCell>{it.article_name}</TableCell>
                  <TableCell className="text-right">{it.quantity}</TableCell>
                  <TableCell className="text-right">{it.unit_price}</TableCell>
                  <TableCell className="text-right">{(parseDecimal(it.quantity) * parseDecimal(it.unit_price)).toFixed(2)}</TableCell>
                  <TableCell><Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <div className="text-right font-bold">Total HT: {totalHT.toFixed(2)} MAD</div>
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
        <Button type="submit" className="bg-[#B8860B] hover:bg-[#9A7209]" disabled={isSubmitting}>
          {isSubmitting ? 'Création...' : 'Créer le devis'}
        </Button>
      </div>
    </form>
  )
}

// ==================== MOUVEMENT STOCK FORM ====================
function MouvementStockForm({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const supabase = createClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [articles, setArticles] = useState<Article[]>([])
  const [formData, setFormData] = useState({
    article_id: '', quantity: '', movement_type: 'in' as 'in' | 'out' | 'adjustment', notes: '',
  })

  useEffect(() => {
    supabase.from('articles').select('id, code, name, price_ht').eq('is_active', true).order('name').then(({ data }) => setArticles((data || []).map(a => ({ ...a, unit_price: a.price_ht }))))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.article_id || !formData.quantity) { toast.error('Sélectionnez un article et une quantité'); return }
    setIsSubmitting(true)

    const qty = parseDecimal(formData.quantity)

    // Créer le mouvement
    const { error } = await supabase.from('stock_movements').insert([{
      article_id: formData.article_id, quantity: qty, movement_type: formData.movement_type,
      reference_type: 'manual', notes: formData.notes || 'Mouvement manuel',
    }])

    if (error) { toast.error(`Erreur: ${error.message}`); setIsSubmitting(false); return }

    // Mettre à jour le stock
    const { data: existingStock } = await supabase.from('stock').select('id, quantity').eq('article_id', formData.article_id).single()

    if (existingStock) {
      const newQty = formData.movement_type === 'in'
        ? existingStock.quantity + qty
        : formData.movement_type === 'out'
        ? Math.max(0, existingStock.quantity - qty)
        : qty // adjustment = set to exact value
      await supabase.from('stock').update({ quantity: newQty }).eq('id', existingStock.id)
    } else {
      await supabase.from('stock').insert([{ article_id: formData.article_id, quantity: formData.movement_type === 'out' ? 0 : qty, warehouse: 'principal' }])
    }

    toast.success('Mouvement de stock enregistré'); onSuccess?.(); onClose()
    setIsSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Article *</Label>
        <Select value={formData.article_id} onValueChange={(v) => setFormData({ ...formData, article_id: v })}>
          <SelectTrigger><SelectValue placeholder="Sélectionner un article" /></SelectTrigger>
          <SelectContent>
            {articles.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Type de mouvement</Label>
          <Select value={formData.movement_type} onValueChange={(v) => setFormData({ ...formData, movement_type: v as 'in' | 'out' | 'adjustment' })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="in">Entrée (+)</SelectItem>
              <SelectItem value="out">Sortie (-)</SelectItem>
              <SelectItem value="adjustment">Ajustement (=)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Quantité *</Label>
          <Input value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} required />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Raison du mouvement..." />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
        <Button type="submit" className="bg-[#B8860B] hover:bg-[#9A7209]" disabled={isSubmitting}>
          {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>
    </form>
  )
}

// ==================== RBLT FORM ====================
interface DeliveryReturn { id: string; delivery_number: string; client_id: string; total_ht: number }

function RBLTForm({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const supabase = createClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deliveries, setDeliveries] = useState<DeliveryReturn[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [formData, setFormData] = useState({
    delivery_id: '', return_date: format(new Date(), 'yyyy-MM-dd'), return_reason: '', notes: '',
  })
  const [items, setItems] = useState<{ article_id: string; article_name: string; quantity: string; unit_price: string }[]>([])
  const [selectedArticle, setSelectedArticle] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unitPrice, setUnitPrice] = useState('')

  useEffect(() => {
    // Charger les BL livrés
    supabase.from('deliveries').select('id, delivery_number, client_id, total_ht').in('status', ['delivered', 'partial']).order('created_at', { ascending: false }).then(({ data }) => setDeliveries(data || []))
    supabase.from('articles').select('id, code, name, price_ht, unit').eq('is_active', true).order('name').then(({ data }) => setArticles((data || []).map(a => ({ ...a, unit_price: a.price_ht }))))
  }, [])

  const addItem = () => {
    const article = articles.find(a => a.id === selectedArticle)
    if (!article) return
    setItems([...items, { article_id: article.id, article_name: article.name, quantity, unit_price: unitPrice || String(article.unit_price) }])
    setSelectedArticle(''); setQuantity('1'); setUnitPrice('')
  }

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx))
  const totalHT = items.reduce((sum, it) => sum + parseDecimal(it.quantity) * parseDecimal(it.unit_price), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.delivery_id || items.length === 0) { toast.error('Sélectionnez un BL et ajoutez des articles retournés'); return }
    setIsSubmitting(true)

    const { data: numData } = await supabase.rpc('generate_return_number')
    const returnNumber = numData || `RBLT-${Date.now()}`

    const delivery = deliveries.find(d => d.id === formData.delivery_id)
    const { data: newReturn, error } = await supabase.from('delivery_returns').insert([{
      return_number: returnNumber, delivery_id: formData.delivery_id, client_id: delivery?.client_id,
      return_date: formData.return_date, return_reason: formData.return_reason || null,
      total_ht: totalHT, notes: formData.notes || null, status: 'pending',
    }]).select().single()

    if (error) { toast.error(`Erreur: ${error.message}`); setIsSubmitting(false); return }

    await supabase.from('delivery_return_items').insert(items.map(it => ({
      return_id: newReturn.id, article_id: it.article_id,
      quantity_returned: parseDecimal(it.quantity), unit_price: parseDecimal(it.unit_price),
      return_reason: formData.return_reason || null,
    })))

    toast.success(`RBLT ${returnNumber} créé`); onSuccess?.(); onClose()
    setIsSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Bon de livraison *</Label>
          <Select value={formData.delivery_id} onValueChange={(v) => setFormData({ ...formData, delivery_id: v })}>
            <SelectTrigger><SelectValue placeholder="Sélectionner un BL" /></SelectTrigger>
            <SelectContent>
              {deliveries.map((d) => <SelectItem key={d.id} value={d.id}>{d.delivery_number}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Date de retour</Label>
          <Input type="date" value={formData.return_date} onChange={(e) => setFormData({ ...formData, return_date: e.target.value })} />
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Raison du retour</Label>
          <Select value={formData.return_reason} onValueChange={(v) => setFormData({ ...formData, return_reason: v })}>
            <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="damaged">Produit endommagé</SelectItem>
              <SelectItem value="wrong_product">Mauvais produit</SelectItem>
              <SelectItem value="quality">Problème de qualité</SelectItem>
              <SelectItem value="excess">Excédent</SelectItem>
              <SelectItem value="other">Autre</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-lg p-4 space-y-3">
        <Label className="font-semibold">Articles retournés</Label>
        <div className="flex gap-2">
          <Select value={selectedArticle} onValueChange={(v) => { setSelectedArticle(v); const a = articles.find(x => x.id === v); if (a) setUnitPrice(String(a.unit_price)) }}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="Article" /></SelectTrigger>
            <SelectContent>
              {articles.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input className="w-24" placeholder="Qté" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          <Input className="w-28" placeholder="Prix" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
          <Button type="button" onClick={addItem} size="icon"><Plus className="h-4 w-4" /></Button>
        </div>
        {items.length > 0 && (
          <Table>
            <TableHeader><TableRow><TableHead>Article</TableHead><TableHead className="text-right">Qté</TableHead><TableHead className="text-right">Prix</TableHead><TableHead className="text-right">Total</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {items.map((it, idx) => (
                <TableRow key={idx}>
                  <TableCell>{it.article_name}</TableCell>
                  <TableCell className="text-right">{it.quantity}</TableCell>
                  <TableCell className="text-right">{it.unit_price}</TableCell>
                  <TableCell className="text-right">{(parseDecimal(it.quantity) * parseDecimal(it.unit_price)).toFixed(2)}</TableCell>
                  <TableCell><Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <div className="text-right font-bold">Total retour: {totalHT.toFixed(2)} MAD</div>
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
        <Button type="submit" className="bg-[#B8860B] hover:bg-[#9A7209]" disabled={isSubmitting}>
          {isSubmitting ? 'Création...' : 'Créer le RBLT'}
        </Button>
      </div>
    </form>
  )
}

// ==================== MAIN COMPONENT ====================
export function GlobalDialogs() {
  const { activeDialog, closeDialog } = useGlobalDialogs()

  const dialogTitles: Record<string, string> = {
    'reception': 'Nouveau bon de réception',
    'fournisseur': 'Nouveau fournisseur',
    'fourniture': 'Nouvelle fourniture',
    'bon-commande': 'Nouveau bon de commande',
    'lot': 'Nouveau lot',
    'mouvement-stock': 'Nouveau mouvement de stock',
    'commande': 'Nouvelle commande',
    'livraison': 'Nouveau bon de livraison',
    'tournee': 'Nouvelle tournée',
    'rblt': 'Nouveau retour de livraison',
    'vente': 'Nouvelle vente',
    'facture': 'Nouvelle facture',
    'article': 'Nouvel article',
    'categorie': 'Nouvelle catégorie',
    'emballage': 'Nouvel emballage',
    'pack': 'Nouveau pack',
    'client': 'Nouveau client',
    'paiement': 'Nouveau paiement',
    'devis': 'Nouveau devis',
  }

  const getDialogSize = () => {
    if (['reception', 'bon-commande', 'commande', 'livraison', 'tournee', 'rblt', 'vente', 'facture', 'devis'].includes(activeDialog || '')) {
      return 'max-w-4xl'
    }
    return 'max-w-2xl'
  }

  const renderForm = () => {
    switch (activeDialog) {
      case 'fournisseur': return <FournisseurForm onClose={closeDialog} />
      case 'client': return <ClientForm onClose={closeDialog} />
      case 'categorie': return <CategorieForm onClose={closeDialog} />
      case 'article': return <ArticleForm onClose={closeDialog} />
      case 'emballage': return <EmballageForm onClose={closeDialog} />
      case 'pack': return <PackForm onClose={closeDialog} />
      case 'fourniture': return <FournitureForm onClose={closeDialog} />
      case 'reception': return <ReceptionForm onClose={closeDialog} />
      case 'lot': return <LotForm onClose={closeDialog} />
      case 'bon-commande': return <BonCommandeForm onClose={closeDialog} />
      case 'paiement': return <PaiementForm onClose={closeDialog} />
      case 'commande': return <CommandeForm onClose={closeDialog} />
      case 'livraison': return null // Utilise le formulaire de la page /livraisons
      case 'tournee': return <TourneeForm onClose={closeDialog} />
      case 'rblt': return <RBLTForm onClose={closeDialog} />
      case 'vente': return <VenteForm onClose={closeDialog} />
      case 'facture': return <FactureForm onClose={closeDialog} />
      case 'devis': return <DevisForm onClose={closeDialog} />
      case 'mouvement-stock': return <MouvementStockForm onClose={closeDialog} />
      default: return null
    }
  }

  return (
    <Dialog open={activeDialog !== null} onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent className={`${getDialogSize()} max-h-[90vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle>{activeDialog ? dialogTitles[activeDialog] : ''}</DialogTitle>
        </DialogHeader>
        {renderForm()}
      </DialogContent>
    </Dialog>
  )
}
