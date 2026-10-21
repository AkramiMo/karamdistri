'use client'

import React, { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
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
import { Plus, Search, Eye, PackageCheck, Trash2, FileDown, Upload, FileText, Image, Camera, Download, X, Pencil, Banknote, Printer, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { generateReceptionPDF } from '@/lib/pdf/reception'
import { generatePaymentReceiptPDF } from '@/lib/pdf/paymentReceipt'
import { useCompanySettings } from '@/hooks/useCompanySettings'

interface Reception {
  id: string
  reception_number: string
  purchase_order_id: string | null
  supplier_id: string
  reception_date: string
  total_ht: number | null
  notes: string | null
  payment_status: 'paye' | 'non_paye' | 'annule'
  bon_image_url: string | null
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
  quantity_ordered: number | string
  quantity_received: number | string
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

function ReceptionsPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [receptions, setReceptions] = useState<Reception[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [supplies, setSupplies] = useState<Supply[]>([])
  const [supplyCategories, setSupplyCategories] = useState<SupplyCategory[]>([])
  const [articlesWeightMap, setArticlesWeightMap] = useState<Map<string, number>>(new Map())
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [articleFilter, setArticleFilter] = useState<string>('all')
  const [monthFilter, setMonthFilter] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isNewOnlyMode, setIsNewOnlyMode] = useState(false)

  // Ouvrir le dialog si ?action=new (mode formulaire uniquement)
  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setIsDialogOpen(true)
      setIsNewOnlyMode(true)
    }
  }, [searchParams])
  const [isSubmitting, setIsSubmitting] = useState(false)
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

  // Draft state
  const [hasDraft, setHasDraft] = useState(false)
  const [showDraftPrompt, setShowDraftPrompt] = useState(false)
  const DRAFT_KEY = 'reception_draft'

  // Bon image state
  const [isUploadingBon, setIsUploadingBon] = useState<string | null>(null)
  const [previewBonImage, setPreviewBonImage] = useState<{ url: string; receptionNumber: string } | null>(null)

  // Payment dialog state
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [payingReception, setPayingReception] = useState<Reception | null>(null)
  const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false)
  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    payment_method: 'cash',
    payment_date: new Date().toISOString().split('T')[0],
    reference: '',
    notes: '',
  })

  // Sauvegarder le brouillon dans localStorage
  const saveDraft = () => {
    if (!formData.supplier_id && receptionItems.length === 0) return

    const draft = {
      formData,
      receptionItems: receptionItems.map(item => ({
        ...item,
        // Exclure les fichiers car non sérialisables
      })),
      savedAt: new Date().toISOString(),
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  }

  // Charger le brouillon depuis localStorage
  const loadDraft = () => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved) {
        const draft = JSON.parse(saved)
        setFormData(draft.formData)
        setReceptionItems(draft.receptionItems || [])
        setShowDraftPrompt(false)
        setHasDraft(false)
      }
    } catch (e) {
      console.error('Erreur lors du chargement du brouillon:', e)
    }
  }

  // Vérifier s'il existe un brouillon
  const checkDraft = () => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved) {
        const draft = JSON.parse(saved)
        // Vérifier si le brouillon a des données
        if (draft.formData?.supplier_id || (draft.receptionItems && draft.receptionItems.length > 0)) {
          setHasDraft(true)
          return true
        }
      }
    } catch (e) {
      console.error('Erreur lors de la vérification du brouillon:', e)
    }
    setHasDraft(false)
    return false
  }

  // Supprimer le brouillon
  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY)
    setHasDraft(false)
  }

  // Obtenir les infos du brouillon pour affichage
  const getDraftInfo = () => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved) {
        const draft = JSON.parse(saved)
        const supplier = suppliers.find(s => s.id === draft.formData?.supplier_id)
        return {
          supplierName: supplier?.name || 'Fournisseur inconnu',
          itemsCount: draft.receptionItems?.length || 0,
          savedAt: draft.savedAt ? new Date(draft.savedAt).toLocaleString('fr-FR') : '',
        }
      }
    } catch (e) {
      console.error('Erreur:', e)
    }
    return null
  }

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
          payment_status,
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

  // Récupérer les poids net des articles de vente (pour calculer les kg des articles composés)
  const fetchArticlesWeight = async () => {
    const { data } = await supabase.from('articles')
      .select('code, weight_net')
    const map = new Map<string, number>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(data || []).forEach((a: any) => {
      if (a.code && a.weight_net) {
        map.set(a.code.toUpperCase(), a.weight_net)
      }
    })
    setArticlesWeightMap(map)
  }

  useEffect(() => {
    fetchReceptions()
    fetchSuppliers()
    fetchPurchaseOrders()
    fetchSupplies()
    fetchSupplyCategories()
    fetchArticlesWeight()
  }, [])

  // Sauvegarder automatiquement le brouillon quand les données changent
  useEffect(() => {
    if (isDialogOpen && (formData.supplier_id || receptionItems.length > 0)) {
      saveDraft()
    }
  }, [formData, receptionItems, isDialogOpen])

  // Vérifier le brouillon quand le dialogue s'ouvre
  useEffect(() => {
    if (isDialogOpen) {
      // Seulement vérifier si le formulaire est vide
      if (!formData.supplier_id && receptionItems.length === 0) {
        if (checkDraft()) {
          setShowDraftPrompt(true)
        }
      }
    }
  }, [isDialogOpen])

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
    // Garder la chaîne brute pour permettre la saisie de décimales (ex: "10." ou "10,5")
    items[index].quantity_received = newQuantityStr
    // Calculer le total avec la valeur numérique
    const numericQuantity = parseDecimalInput(newQuantityStr)
    items[index].total_ht = numericQuantity * items[index].unit_price
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

    // Protection contre le double-clic
    if (isSubmitting) return

    if (!formData.supplier_id || receptionItems.length === 0) {
      alert('Veuillez sélectionner un fournisseur et ajouter des articles')
      return
    }

    setIsSubmitting(true)

    try {
      const total_ht = receptionItems.reduce((sum, item) => sum + item.total_ht, 0)

      // Vérifier s'il existe déjà un BR similaire (même fournisseur, même date)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingReceptions } = await (supabase.from('receptions') as any)
        .select('reception_number, total_ht, supplier:suppliers(name)')
        .eq('supplier_id', formData.supplier_id)
        .eq('reception_date', formData.reception_date)

      if (existingReceptions && existingReceptions.length > 0) {
        const existingList = existingReceptions
          .map((r: { reception_number: string; total_ht: number; supplier?: { name: string } }) =>
            `- ${r.reception_number} (${formatPrice(r.total_ht)})`
          )
          .join('\n')

        const supplierName = existingReceptions[0]?.supplier?.name || 'ce fournisseur'
        const confirmCreate = confirm(
          `Attention ! Il existe déjà ${existingReceptions.length} BR pour ${supplierName} à cette date:\n\n${existingList}\n\nVoulez-vous vraiment créer un nouveau BR ?`
        )

        if (!confirmCreate) {
          setIsSubmitting(false)
          return
        }
      }

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
        alert(`Erreur lors de la création du BR:\n${receptionError.message || receptionError.code || JSON.stringify(receptionError)}`)
        return
      }

    // Create reception items (convertir les quantités en nombres)
      const itemsToInsert = receptionItems.map(item => ({
        reception_id: newReception.id,
        article_id: item.article_id,
        quantity_expected: typeof item.quantity_ordered === 'string' ? parseDecimalInput(item.quantity_ordered) : item.quantity_ordered,
        quantity_received: typeof item.quantity_received === 'string' ? parseDecimalInput(item.quantity_received) : item.quantity_received,
        unit_price: item.unit_price,
      }))

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: itemsError } = await (supabase.from('reception_items') as any)
        .insert(itemsToInsert)

      if (itemsError) {
        console.error('Error creating reception items:', itemsError)
        alert(`Erreur lors de l'ajout des articles:\n${itemsError.message || itemsError.code || JSON.stringify(itemsError)}`)
        return
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
        const quantityReceived = typeof item.quantity_received === 'string'
          ? parseDecimalInput(item.quantity_received)
          : item.quantity_received

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
              quantity: existingStock.quantity + quantityReceived,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingStock.id)
        } else {
          // Create new stock entry
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('stock') as any)
            .insert([{
              article_id: item.article_id,
              quantity: quantityReceived,
              warehouse: 'principal',
            }])
        }

        // Create stock movement
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('stock_movements') as any)
          .insert([{
            article_id: item.article_id,
            quantity: quantityReceived,
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

      // Succès - nettoyer le brouillon
      clearDraft()
      fetchReceptions()
      fetchPurchaseOrders()
      if (isNewOnlyMode) {
        handleCloseNewOnly()
      } else {
        setIsDialogOpen(false)
        resetForm()
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error)
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error)
      alert(`Une erreur est survenue lors de la création du BR:\n${errorMessage}`)
    } finally {
      setIsSubmitting(false)
    }
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

  const handlePaymentStatusChange = async (receptionId: string, newStatus: 'paye' | 'non_paye' | 'annule') => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('receptions') as any)
      .update({ payment_status: newStatus })
      .eq('id', receptionId)

    if (error) {
      console.error('Error updating payment status:', error)
      alert('Erreur lors de la mise à jour du statut')
    } else {
      // Mettre à jour localement pour éviter un re-fetch
      setReceptions(receptions.map(r =>
        r.id === receptionId ? { ...r, payment_status: newStatus } : r
      ))
    }
  }

  // Ouvrir le dialog de paiement
  const openPaymentDialog = (reception: Reception) => {
    setPayingReception(reception)
    setPaymentFormData({
      amount: (reception.total_ht || 0).toString(),
      payment_method: 'cash',
      payment_date: new Date().toISOString().split('T')[0],
      reference: '',
      notes: '',
    })
    setIsPaymentDialogOpen(true)
  }

  // Générer un numéro de paiement unique
  const generatePaymentNumber = async (): Promise<string> => {
    const { data } = await supabase
      .from('payments')
      .select('payment_number')
      .like('payment_number', 'REC%')
      .order('payment_number', { ascending: false })
      .limit(1)

    if (data && data.length > 0) {
      const lastNum = parseInt(data[0].payment_number.replace('REC', ''), 10)
      return `REC${String(lastNum + 1).padStart(5, '0')}`
    }
    return 'REC00001'
  }

  // Soumettre le paiement fournisseur
  const handleSubmitPayment = async () => {
    if (!payingReception || !paymentFormData.amount) return

    setIsPaymentSubmitting(true)
    try {
      const paymentNumber = await generatePaymentNumber()

      // Créer le paiement dans la table payments
      const { error } = await supabase.from('payments').insert([{
        payment_number: paymentNumber,
        payment_type: 'fournisseur',
        supplier_id: payingReception.supplier_id,
        reception_id: payingReception.id,
        amount: parseFloat(paymentFormData.amount),
        payment_method: paymentFormData.payment_method,
        payment_date: paymentFormData.payment_date,
        reference: paymentFormData.reference || null,
        notes: paymentFormData.notes || `Paiement BR ${payingReception.reception_number}`,
      }])

      if (error) {
        console.error('Error creating payment:', error)
        alert('Erreur lors de la création du paiement')
        return
      }

      // Le trigger dans la BDD met automatiquement à jour le payment_status de la réception
      // et crée l'entrée dans cash_register

      // Mettre à jour l'état local
      setReceptions(receptions.map(r =>
        r.id === payingReception.id ? { ...r, payment_status: 'paye' } : r
      ))

      setIsPaymentDialogOpen(false)
      setPayingReception(null)
      // Proposer d'imprimer le reçu
      if (confirm(`Paiement ${paymentNumber} créé avec succès.\n\nVoulez-vous imprimer le reçu ?`)) {
        await printSupplierReceipt(payingReception, paymentNumber, parseFloat(paymentFormData.amount))
      }
    } catch (err) {
      console.error('Error in handleSubmitPayment:', err)
      alert('Erreur lors du paiement')
    } finally {
      setIsPaymentSubmitting(false)
    }
  }

  // Imprimer le reçu de paiement fournisseur
  const printSupplierReceipt = async (reception: Reception, paymentNumber: string, amount: number) => {
    const paymentData = {
      payment_number: paymentNumber,
      payment_date: new Date().toISOString().split('T')[0],
      amount: amount,
      payment_method: paymentFormData.payment_method,
      payment_type: 'fournisseur' as const,
      reference: paymentFormData.reference || null,
      supplier: {
        code: reception.supplier?.code || '',
        name: reception.supplier?.name || '',
        address: reception.supplier?.address || null,
        phone: reception.supplier?.phone || null,
      },
      document: {
        type: 'BR' as const,
        number: reception.reception_number,
      },
    }
    await generatePaymentReceiptPDF(paymentData, companySettings, companySettings?.logo_url || undefined)
  }

  // Imprimer le reçu d'une réception déjà payée
  const handlePrintPaymentReceipt = async (reception: Reception) => {
    // Récupérer le paiement associé à cette réception
    const { data: paymentData } = await supabase
      .from('payments')
      .select('*')
      .eq('reception_id', reception.id)
      .single()

    if (!paymentData) {
      alert('Aucun paiement trouvé pour cette réception')
      return
    }

    const receiptData = {
      payment_number: paymentData.payment_number,
      payment_date: paymentData.payment_date,
      amount: paymentData.amount,
      payment_method: paymentData.payment_method,
      payment_type: 'fournisseur' as const,
      reference: paymentData.reference || null,
      supplier: {
        code: reception.supplier?.code || '',
        name: reception.supplier?.name || '',
        address: reception.supplier?.address || null,
        phone: reception.supplier?.phone || null,
      },
      document: {
        type: 'BR' as const,
        number: reception.reception_number,
      },
    }
    await generatePaymentReceiptPDF(receiptData, companySettings, companySettings?.logo_url || undefined)
  }

  // Upload de l'image du bon
  const handleUploadBonImage = async (receptionId: string, file: File) => {
    setIsUploadingBon(receptionId)
    try {
      // Générer un nom de fichier unique
      const fileExt = file.name.split('.').pop()
      const fileName = `bons/${receptionId}/${Date.now()}.${fileExt}`

      // Upload vers Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('reception-documents')
        .upload(fileName, file, { upsert: true })

      if (uploadError) {
        console.error('Error uploading bon image:', uploadError)
        alert('Erreur lors de l\'upload de l\'image')
        return
      }

      // Récupérer l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('reception-documents')
        .getPublicUrl(fileName)

      // Mettre à jour la réception avec l'URL
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase.from('receptions') as any)
        .update({ bon_image_url: publicUrl })
        .eq('id', receptionId)

      if (updateError) {
        console.error('Error updating reception:', updateError)
        alert('Erreur lors de la mise à jour')
        return
      }

      // Mettre à jour localement
      setReceptions(receptions.map(r =>
        r.id === receptionId ? { ...r, bon_image_url: publicUrl } : r
      ))
    } catch (err) {
      console.error('Error in handleUploadBonImage:', err)
      alert('Erreur lors de l\'upload')
    } finally {
      setIsUploadingBon(null)
    }
  }

  // Supprimer l'image du bon
  const handleDeleteBonImage = async (receptionId: string) => {
    if (!confirm('Supprimer l\'image du bon ?')) return

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('receptions') as any)
        .update({ bon_image_url: null })
        .eq('id', receptionId)

      if (error) {
        alert('Erreur lors de la suppression')
        return
      }

      setReceptions(receptions.map(r =>
        r.id === receptionId ? { ...r, bon_image_url: null } : r
      ))
      setPreviewBonImage(null)
    } catch (err) {
      console.error('Error deleting bon image:', err)
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

  const handleUpdate = async () => {
    if (!editingReception || !formData.supplier_id || receptionItems.length === 0) {
      alert('Veuillez sélectionner un fournisseur et ajouter des articles')
      return
    }

    // Vérifier et rafraîchir la session si nécessaire
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !sessionData.session) {
        const { error: refreshError } = await supabase.auth.refreshSession()
        if (refreshError) {
          alert('Votre session a expiré. Veuillez vous reconnecter.')
          window.location.href = '/login'
          return
        }
      }
    } catch (err) {
      console.error('Session check error:', err)
    }

    const total_ht = receptionItems.reduce((sum, item) => sum + item.total_ht, 0)

    // Préparer les données de mise à jour
    const updateData: Record<string, unknown> = {
      supplier_id: formData.supplier_id,
      reception_date: formData.reception_date,
      total_ht,
      notes: formData.notes || null,
    }

    // N'inclure purchase_order_id que s'il a une valeur
    if (formData.purchase_order_id && formData.purchase_order_id.trim() !== '') {
      updateData.purchase_order_id = formData.purchase_order_id
    } else {
      updateData.purchase_order_id = null
    }

    // Mettre à jour la réception
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: receptionError } = await (supabase.from('receptions') as any)
      .update(updateData)
      .eq('id', editingReception.id)

    if (receptionError) {
      console.error('Error updating reception:', receptionError)
      // Si JWT expiré, essayer de rafraîchir et réessayer
      if (receptionError.message?.includes('JWT') || receptionError.message?.includes('expired')) {
        const { error: refreshError } = await supabase.auth.refreshSession()
        if (refreshError) {
          alert('Votre session a expiré. Veuillez vous reconnecter.')
          window.location.href = '/login'
          return
        }
        // Réessayer après rafraîchissement
        alert('Session rafraîchie. Veuillez réessayer.')
        return
      }
      alert(`Erreur lors de la mise à jour du BR: ${receptionError.message || JSON.stringify(receptionError)}`)
      return
    }

    // Supprimer les anciens articles
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: deleteError } = await (supabase.from('reception_items') as any)
      .delete()
      .eq('reception_id', editingReception.id)

    if (deleteError) {
      console.error('Error deleting old items:', deleteError)
      alert(`Erreur lors de la suppression des anciens articles: ${deleteError.message}`)
      return
    }

    // Insérer les nouveaux articles (convertir les quantités en nombres)
    const itemsToInsert = receptionItems.map(item => ({
      reception_id: editingReception.id,
      article_id: item.article_id,
      quantity_expected: typeof item.quantity_ordered === 'string' ? parseDecimalInput(item.quantity_ordered) : item.quantity_ordered,
      quantity_received: typeof item.quantity_received === 'string' ? parseDecimalInput(item.quantity_received) : item.quantity_received,
      unit_price: item.unit_price,
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: itemsError } = await (supabase.from('reception_items') as any)
      .insert(itemsToInsert)

    if (itemsError) {
      console.error('Error updating reception items:', itemsError)
      alert(`Erreur lors de l'ajout des articles: ${itemsError.message}`)
      return
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

  const handleCloseNewOnly = () => {
    router.replace('/')
  }

  // Calculer les mois disponibles
  const availableMonths = useMemo(() => {
    const months = new Set<string>()
    const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
    months.add(currentMonth)

    receptions.forEach((r) => {
      if (r.reception_date) {
        const month = r.reception_date.substring(0, 7)
        months.add(month)
      }
    })

    return Array.from(months).sort((a, b) => b.localeCompare(a))
  }, [receptions])

  const filteredReceptions = receptions.filter((reception) => {
    // Filtre par mois
    if (monthFilter !== 'all' && reception.reception_date) {
      if (!reception.reception_date.startsWith(monthFilter)) {
        return false
      }
    }
    // Filtre par article
    if (articleFilter !== 'all') {
      const hasArticle = reception.reception_items?.some(item => item.article_id === articleFilter)
      if (!hasArticle) {
        return false
      }
    }
    // Filtre par recherche
    if (searchTerm) {
      const matchesSearch =
        reception.reception_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reception.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      if (!matchesSearch) {
        return false
      }
    }
    return true
  })

  // Total global des réceptions filtrées
  const totalGlobalHT = filteredReceptions.reduce((sum, r) => sum + (r.total_ht || 0), 0)

  // Quantité totale de l'article sélectionné
  const totalArticleQuantity = useMemo(() => {
    if (articleFilter === 'all') return null

    let total = 0
    filteredReceptions.forEach(reception => {
      reception.reception_items?.forEach(item => {
        if (item.article_id === articleFilter) {
          total += item.quantity_received || 0
        }
      })
    })
    return total
  }, [filteredReceptions, articleFilter])

  // Nom de l'article sélectionné
  const selectedArticleName = useMemo(() => {
    if (articleFilter === 'all') return null
    const supply = supplies.find(s => s.id === articleFilter)
    return supply ? `${supply.code} - ${supply.name}` : null
  }, [articleFilter, supplies])

  // Vérifier si l'article sélectionné est un emballage ou étiquette (compte en unités)
  const isSelectedArticleInUnits = useMemo(() => {
    if (articleFilter === 'all') return false
    const supply = supplies.find(s => s.id === articleFilter)
    if (!supply) return false
    const code = supply.code.toUpperCase().trim()
    // Emballages : Se9L, Bi5L, Bo1, etc.
    const emballagePatterns = [
      /^SE\d+L?$/i, /^BO\d+$/i, /^BI\d+L?$/i, /^BT\d+L?$/i,
      /^SC\d+$/i, /^BQ\d+$/i, /^CA\d+X?$/i, /^FL\d+$/i, /^PT\d+$/i,
    ]
    // Étiquettes : ETQ...
    if (code.startsWith('ETQ')) return true
    return emballagePatterns.some(pattern => pattern.test(code))
  }, [articleFilter, supplies])

  // Catégories qui comptent pour les kg (légumes, olive, sauce)
  const CATEGORIES_KG = ['légumes', 'olive', 'sauce', 'legumes']

  // Vérifier si une catégorie compte pour les kg
  const isCategoryKg = (categoryId: string | null | undefined): boolean => {
    if (!categoryId) return false
    const category = supplyCategories.find(c => c.id === categoryId)
    if (!category) return false
    return CATEGORIES_KG.some(cat =>
      category.name.toLowerCase().includes(cat.toLowerCase())
    )
  }

  // Fonction pour vérifier si un article est en vrac
  const isVracArticle = (articleCode: string): boolean => {
    return /[-\s]?vrac$/i.test(articleCode.trim())
  }

  // Fonction pour extraire le code emballage d'un article (Se9LOVE -> Se9L)
  const extractEmballageCode = (articleCode: string): string | null => {
    if (isVracArticle(articleCode)) return null
    const code = articleCode.trim()
    const emballagePatterns = [
      /^(Se\d+L)/i, /^(Bo\d+)/i, /^(Bi\d+L?)/i, /^(Bt\d+L?)/i,
      /^(Sc\d+)/i, /^(Bq\d+)/i, /^(Ca\d+x?)/i, /^(Fl\d+)/i, /^(Pt\d+)/i,
    ]
    for (const pattern of emballagePatterns) {
      const match = code.match(pattern)
      if (match) return match[1].toUpperCase()
    }
    return null
  }

  // Total kg achetés (filtré par catégorie : légumes, olive, sauce)
  const totalKgAchetes = useMemo(() => {
    let total = 0
    filteredReceptions.forEach(reception => {
      reception.reception_items?.forEach(item => {
        const supply = supplies.find(s => s.id === item.article_id)
        if (!supply) return

        // Filtrer par catégorie (légumes, olive, sauce uniquement)
        if (!isCategoryKg(supply.category_id)) return

        const rawCode = supply.code.trim()
        if (!rawCode) return

        const qty = item.quantity_received || 0
        if (qty <= 0) return

        // Articles vrac : quantité directement en kg
        if (isVracArticle(rawCode)) {
          total += qty
          return
        }

        // Articles composés (avec emballage) : utiliser le poids net
        const emballageCode = extractEmballageCode(rawCode)
        if (emballageCode) {
          const weightNet = articlesWeightMap.get(rawCode.toUpperCase()) || 0
          total += qty * weightNet
        } else {
          // Fourniture pure : quantité en kg
          total += qty
        }
      })
    })
    return total
  }, [filteredReceptions, supplies, articlesWeightMap, supplyCategories])

  // Total étiquettes (unités)
  const totalEtiquettes = useMemo(() => {
    let total = 0
    filteredReceptions.forEach(reception => {
      reception.reception_items?.forEach(item => {
        const supply = supplies.find(s => s.id === item.article_id)
        if (!supply) return
        const code = supply.code.toUpperCase().trim()
        if (code.startsWith('ETQ')) {
          total += item.quantity_received || 0
        }
      })
    })
    return total
  }, [filteredReceptions, supplies])

  // Total emballages (unités)
  const totalEmballages = useMemo(() => {
    let total = 0
    const emballagePatterns = [
      /^SE\d+L?$/i, /^BO\d+$/i, /^BI\d+L?$/i, /^BT\d+L?$/i,
      /^SC\d+$/i, /^BQ\d+$/i, /^CA\d+X?$/i, /^FL\d+$/i, /^PT\d+$/i,
    ]
    filteredReceptions.forEach(reception => {
      reception.reception_items?.forEach(item => {
        const supply = supplies.find(s => s.id === item.article_id)
        if (!supply) return
        const code = supply.code.toUpperCase().trim()
        if (emballagePatterns.some(pattern => pattern.test(code))) {
          total += item.quantity_received || 0
        }
      })
    })
    return total
  }, [filteredReceptions, supplies])

  const formatPrice = (price: number | null) => {
    if (price === null) return '-'
    const formatted = price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    return `${formatted} MAD`
  }

  // Export Excel des réceptions filtrées
  const handleExportExcel = () => {
    if (filteredReceptions.length === 0) return

    // Trouver le nom de l'article filtré si applicable
    const selectedSupply = articleFilter !== 'all' ? supplies.find(s => s.id === articleFilter) : null

    const data = filteredReceptions.map(reception => {
      const items = reception.reception_items || []
      const itemsDetails = items.map(item => {
        const supply = supplies.find(s => s.id === item.article_id)
        return `${supply?.code || '-'}: ${item.quantity_received}`
      }).join(', ')

      // Base des données
      const row: Record<string, string | number> = {
        'N° BR': reception.reception_number,
        'Ref BC': reception.purchase_order?.po_number || '-',
        'Fournisseur': reception.supplier?.name || '-',
        'Date': format(new Date(reception.reception_date), 'dd/MM/yyyy'),
        'Total HT': reception.total_ht || 0,
        'Statut Paiement': reception.payment_status === 'paye' ? 'Payé' : reception.payment_status === 'annule' ? 'Annulé' : 'Non payé',
        'Articles': itemsDetails,
      }

      // Si un article est filtré, ajouter sa quantité
      if (selectedSupply) {
        const articleItem = items.find(item => item.article_id === articleFilter)
        row[`Qté ${selectedSupply.code}`] = articleItem?.quantity_received || 0
      }

      // Ajouter les notes
      row['Notes'] = reception.notes || ''

      return row
    })

    const worksheet = XLSX.utils.json_to_sheet(data)

    // Définir les largeurs de colonnes
    const cols = [
      { wch: 18 },  // N° BR
      { wch: 15 },  // Ref BC
      { wch: 25 },  // Fournisseur
      { wch: 12 },  // Date
      { wch: 15 },  // Total HT
      { wch: 12 },  // Statut
      { wch: 40 },  // Articles
    ]
    if (selectedSupply) {
      cols.push({ wch: 15 })  // Qté article
    }
    cols.push({ wch: 30 })  // Notes
    worksheet['!cols'] = cols

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Réceptions')

    const filename = `receptions_${monthFilter !== 'all' ? monthFilter : format(new Date(), 'yyyy-MM')}${selectedSupply ? '_' + selectedSupply.code : ''}.xlsx`
    XLSX.writeFile(workbook, filename)
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

  // Fonction de rendu du formulaire pour éviter la duplication
  const renderForm = (onCancel: () => void, isFullScreen = false) => (
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
              <Label className="text-xs text-gray-500 mb-1 block">Qté Reçue</Label>
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
            <div className={isFullScreen ? "max-h-[400px] overflow-y-auto border rounded-md" : "max-h-[250px] overflow-y-auto border rounded-md"}>
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
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc, index) => (
                  <TableRow key={index}>
                    <TableCell>{doc.nom}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{doc.type.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell>
                      {doc.type.startsWith('image') ? (
                        <img src={doc.chemin} alt={doc.nom} className="h-10 w-10 object-cover rounded" />
                      ) : (
                        <FileText className="h-6 w-6 text-gray-400" />
                      )}
                    </TableCell>
                    <TableCell>
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
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button
          type="submit"
          className="bg-[#B8860B] hover:bg-[#9A7209]"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Création en cours...' : 'Créer le BR'}
        </Button>
      </div>
    </form>
  )

  // Mode plein écran pour nouveau BR via Actions
  if (isNewOnlyMode) {
    return (
      <ProtectedModule module="receptions">
        <div className="min-h-screen bg-gray-50 p-6">
          <Card className="max-w-4xl mx-auto">
            <CardHeader className="border-b bg-[#B8860B] text-white rounded-t-lg">
              <CardTitle className="text-xl flex items-center gap-2">
                <PackageCheck className="h-5 w-5" />
                Nouveau bon de réception
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {/* Prompt de restauration du brouillon */}
              {showDraftPrompt && hasDraft && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-amber-800">Brouillon trouvé</p>
                      {(() => {
                        const info = getDraftInfo()
                        return info ? (
                          <p className="text-sm text-amber-700 mt-1">
                            {info.supplierName} - {info.itemsCount} article(s)
                            <br />
                            <span className="text-xs">Sauvegardé le {info.savedAt}</span>
                          </p>
                        ) : null
                      })()}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          clearDraft()
                          setShowDraftPrompt(false)
                        }}
                      >
                        Ignorer
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-700"
                        onClick={loadDraft}
                      >
                        Restaurer
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              {renderForm(handleCloseNewOnly, true)}
            </CardContent>
          </Card>
        </div>
      </ProtectedModule>
    )
  }

  return (
    <ProtectedModule module="receptions">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Réceptions</h1>
            <p className="text-gray-500">Gérez vos bons de réception (BR)</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            if (open) resetForm()
            setIsDialogOpen(open)
          }}>
            <DialogContent resizable className="w-[900px] min-w-[600px] min-h-[500px] max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>Nouveau bon de réception</DialogTitle>
              </DialogHeader>

              {/* Prompt de restauration du brouillon */}
              {showDraftPrompt && hasDraft && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-amber-800">Brouillon trouvé</p>
                      {(() => {
                        const info = getDraftInfo()
                        return info ? (
                          <p className="text-sm text-amber-700 mt-1">
                            {info.supplierName} - {info.itemsCount} article(s)
                            <br />
                            <span className="text-xs">Sauvegardé le {info.savedAt}</span>
                          </p>
                        ) : null
                      })()}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          clearDraft()
                          setShowDraftPrompt(false)
                        }}
                      >
                        Ignorer
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-700"
                        onClick={loadDraft}
                      >
                        Restaurer
                      </Button>
                    </div>
                  </div>
                </div>
              )}

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
                  <Button
                    type="submit"
                    className="bg-[#B8860B] hover:bg-[#9A7209]"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Création en cours...' : 'Créer le BR'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
          <Card className="bg-purple-50 border-purple-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-700">
                Fournitures (kg)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-purple-600">
                {totalKgAchetes.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kg
              </span>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">
                Emballages (unités)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-blue-600">
                {totalEmballages.toLocaleString('fr-FR')}
              </span>
            </CardContent>
          </Card>
          <Card className="bg-pink-50 border-pink-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-pink-700">
                Étiquettes (unités)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-pink-600">
                {totalEtiquettes.toLocaleString('fr-FR')}
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
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total réglé
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-green-600">
                {formatPrice(receptions.filter(r => r.payment_status === 'paye').reduce((sum, r) => sum + (r.total_ht || 0), 0))}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                BR non réglés
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-orange-600">
                {formatPrice(receptions.filter(r => r.payment_status !== 'paye' && r.payment_status !== 'annule').reduce((sum, r) => sum + (r.total_ht || 0), 0))}
              </span>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher un bon de réception..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-gray-600 whitespace-nowrap">Mois:</Label>
                <Select value={monthFilter} onValueChange={setMonthFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Mois" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    {availableMonths.map((month) => (
                      <SelectItem key={month} value={month}>
                        {format(new Date(month + '-01'), 'MMM yyyy', { locale: fr })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-gray-600 whitespace-nowrap">Article:</Label>
                <Select value={articleFilter} onValueChange={setArticleFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les articles</SelectItem>
                    {supplies.filter(s => s.is_active !== false).map((supply) => (
                      <SelectItem key={supply.id} value={supply.id}>
                        {supply.code} - {supply.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Bouton Export Excel */}
              <Button
                onClick={handleExportExcel}
                disabled={filteredReceptions.length === 0}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Export Excel
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-4">
              <div className="flex items-center gap-2 bg-[#B8860B]/10 px-4 py-2 rounded-lg border border-[#B8860B]">
                <span className="text-sm font-medium text-gray-700">Total:</span>
                <span className="text-lg font-bold text-[#B8860B]">{formatPrice(totalGlobalHT)}</span>
                <span className="text-xs text-gray-500">({filteredReceptions.length} BR)</span>
              </div>
              <div className="flex items-center gap-2 bg-green-100 px-4 py-2 rounded-lg border border-green-500">
                <span className="text-sm font-medium text-gray-700">Réglé:</span>
                <span className="text-lg font-bold text-green-700">
                  {formatPrice(filteredReceptions.filter(r => r.payment_status === 'paye').reduce((sum, r) => sum + (r.total_ht || 0), 0))}
                </span>
                <span className="text-xs text-gray-500">
                  ({filteredReceptions.filter(r => r.payment_status === 'paye').length} BR)
                </span>
              </div>
              {articleFilter !== 'all' && totalArticleQuantity !== null && (
                <div className="flex items-center gap-2 bg-green-100 px-4 py-2 rounded-lg border border-green-500">
                  <span className="text-sm font-medium text-gray-700">Qté {selectedArticleName}:</span>
                  <span className="text-lg font-bold text-green-700">
                    {isSelectedArticleInUnits
                      ? `${Math.round(totalArticleQuantity)} unités`
                      : `${totalArticleQuantity.toFixed(2)} kg`
                    }
                  </span>
                </div>
              )}
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
                    <TableHead>Paiement</TableHead>
                    <TableHead className="text-center">Bon</TableHead>
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
                      <TableCell>
                        {reception.payment_status === 'paye' ? (
                          <div className="flex items-center gap-1">
                            <Badge className="bg-green-100 text-green-800 border border-green-300">
                              Payé
                            </Badge>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => handlePrintPaymentReceipt(reception)}
                              title="Imprimer le reçu"
                            >
                              <Printer className="h-3 w-3 text-[#B8860B]" />
                            </Button>
                          </div>
                        ) : reception.payment_status === 'annule' ? (
                          <Badge className="bg-red-100 text-red-800 border border-red-300">
                            Annulé
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100"
                            onClick={() => openPaymentDialog(reception)}
                          >
                            <Banknote className="h-3 w-3 mr-1" />
                            Payer
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {reception.bon_image_url ? (
                            <button
                              onClick={() => setPreviewBonImage({
                                url: reception.bon_image_url!,
                                receptionNumber: reception.reception_number
                              })}
                              className="relative group"
                            >
                              <img
                                src={reception.bon_image_url}
                                alt="Bon"
                                className="h-10 w-10 object-cover rounded border border-gray-200 hover:border-[#B8860B] transition-colors"
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 rounded flex items-center justify-center transition-opacity">
                                <Eye className="h-4 w-4 text-white" />
                              </div>
                            </button>
                          ) : (
                            <div className="h-10 w-10 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400">
                              <Image className="h-4 w-4" />
                            </div>
                          )}
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleUploadBonImage(reception.id, file)
                                e.target.value = ''
                              }}
                              disabled={isUploadingBon === reception.id}
                            />
                            <div className={`p-1.5 rounded hover:bg-gray-100 transition-colors ${isUploadingBon === reception.id ? 'animate-pulse' : ''}`}>
                              {isUploadingBon === reception.id ? (
                                <div className="h-4 w-4 border-2 border-[#B8860B] border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Camera className="h-4 w-4 text-[#B8860B]" />
                              )}
                            </div>
                          </label>
                        </div>
                      </TableCell>
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
                <Button
                  type="button"
                  className="bg-[#B8860B] hover:bg-[#9A7209]"
                  onClick={() => handleUpdate()}
                >
                  Enregistrer les modifications
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog prévisualisation image du bon */}
        <Dialog open={!!previewBonImage} onOpenChange={() => setPreviewBonImage(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Bon de réception - {previewBonImage?.receptionNumber}</span>
              </DialogTitle>
            </DialogHeader>
            {previewBonImage && (
              <div className="space-y-4">
                <div className="flex justify-center bg-gray-100 rounded-lg p-4 max-h-[60vh] overflow-auto">
                  <img
                    src={previewBonImage.url}
                    alt="Bon de réception"
                    className="max-w-full h-auto rounded shadow-lg"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => window.open(previewBonImage.url, '_blank')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      const reception = receptions.find(r => r.reception_number === previewBonImage.receptionNumber)
                      if (reception) handleDeleteBonImage(reception.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </Button>
                  <Button onClick={() => setPreviewBonImage(null)}>
                    Fermer
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog de paiement fournisseur */}
        <Dialog open={isPaymentDialogOpen} onOpenChange={(open) => {
          setIsPaymentDialogOpen(open)
          if (!open) setPayingReception(null)
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-[#B8860B]" />
                Paiement fournisseur
              </DialogTitle>
            </DialogHeader>
            {payingReception && (
              <div className="space-y-4 pt-2">
                {/* Info réception */}
                <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Bon de réception</span>
                    <span className="font-mono font-medium">{payingReception.reception_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Fournisseur</span>
                    <span className="font-medium">{payingReception.supplier?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Montant total</span>
                    <span className="font-bold text-red-600">
                      {(payingReception.total_ht || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} MAD
                    </span>
                  </div>
                </div>

                {/* Montant à payer */}
                <div className="space-y-2">
                  <Label>Montant à payer (MAD) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentFormData.amount}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                {/* Mode de paiement */}
                <div className="space-y-2">
                  <Label>Mode de paiement</Label>
                  <Select
                    value={paymentFormData.payment_method}
                    onValueChange={(value) => setPaymentFormData({ ...paymentFormData, payment_method: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Espèces</SelectItem>
                      <SelectItem value="check">Chèque</SelectItem>
                      <SelectItem value="transfer">Virement</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date du paiement */}
                <div className="space-y-2">
                  <Label>Date du paiement</Label>
                  <Input
                    type="date"
                    value={paymentFormData.payment_date}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_date: e.target.value })}
                  />
                </div>

                {/* Référence */}
                <div className="space-y-2">
                  <Label>Référence (optionnel)</Label>
                  <Input
                    value={paymentFormData.reference}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, reference: e.target.value })}
                    placeholder="N° chèque, réf virement..."
                  />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Notes (optionnel)</Label>
                  <Input
                    value={paymentFormData.notes}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                    placeholder="Notes supplémentaires"
                  />
                </div>

                {/* Boutons */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsPaymentDialogOpen(false)
                      setPayingReception(null)
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleSubmitPayment}
                    disabled={isPaymentSubmitting || !paymentFormData.amount}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {isPaymentSubmitting ? 'Traitement...' : 'Confirmer le paiement'}
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

export default function ReceptionsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Chargement...</div>}>
      <ReceptionsPageContent />
    </Suspense>
  )
}
