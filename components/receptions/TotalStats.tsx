'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar, FileDown, Loader2, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { generateTotalStatsPDF } from '@/lib/pdf/totalStats'

interface Supplier {
  id: string
  name: string
}

interface Reception {
  id: string
  reception_date: string
  total_ht: number | null
  supplier_id: string
  payment_status: string
}

interface Payment {
  id: string
  amount: number
  payment_date: string
  supplier_id: string | null
  reception_id: string | null
  payment_type: string
}

interface ReceptionItem {
  quantity_received: number
  article_id: string
  reception: {
    reception_date: string
  }
}

interface Supply {
  id: string
  code: string
  name: string
  category_id?: string | null
}

interface SupplyCategory {
  id: string
  name: string
}

interface SupplierStats {
  id: string
  name: string
  totalReceptions: number
  totalPaid: number
  remaining: number
}

interface SupplyQuantity {
  code: string
  name: string
  quantity: number
}

export function TotalStats() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [receptions, setReceptions] = useState<Reception[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [receptionItems, setReceptionItems] = useState<ReceptionItem[]>([])
  const [supplies, setSupplies] = useState<Supply[]>([])
  const [supplyCategories, setSupplyCategories] = useState<SupplyCategory[]>([])
  const [articles, setArticles] = useState<{ code: string; weight_net: number }[]>([])
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const supabase = createClient()

  // Catégories qui comptent pour les kg (produits)
  const CATEGORIES_KG = ['légumes', 'olive', 'sauce', 'legumes']

  // Generate list of last 12 months
  const availableMonths = useMemo(() => {
    const months: string[] = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      months.push(month)
    }
    return months
  }, [])

  // Set current month as default
  useEffect(() => {
    if (!selectedMonth && availableMonths.length > 0) {
      setSelectedMonth(availableMonths[0])
    }
  }, [availableMonths, selectedMonth])

  const fetchData = async () => {
    setIsLoading(true)

    try {
      // Fetch suppliers
      const { data: suppliersData } = await supabase
        .from('suppliers')
        .select('id, name')
        .order('name')

      setSuppliers(suppliersData || [])

      // Fetch supplies with category
      const { data: suppliesData } = await supabase
        .from('supplies')
        .select('id, code, name, category_id')
        .order('code')

      setSupplies(suppliesData || [])

      // Fetch supply categories
      const { data: categoriesData } = await supabase
        .from('supply_categories')
        .select('id, name')

      setSupplyCategories(categoriesData || [])

      // Fetch articles for weight_net
      const { data: articlesData } = await supabase
        .from('articles')
        .select('code, weight_net')

      setArticles(articlesData || [])

      // Fetch all receptions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: receptionsData } = await (supabase as any)
        .from('receptions')
        .select('id, reception_date, total_ht, supplier_id, payment_status')
        .order('reception_date', { ascending: false })

      setReceptions(receptionsData || [])

      // Fetch supplier payments
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: paymentsData } = await (supabase as any)
        .from('payments')
        .select('id, amount, payment_date, supplier_id, reception_id, payment_type')
        .eq('payment_type', 'fournisseur')

      setPayments(paymentsData || [])

      // Fetch reception items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: itemsData } = await (supabase as any)
        .from('reception_items')
        .select(`
          quantity_received,
          article_id,
          reception:receptions(reception_date)
        `)

      setReceptionItems(itemsData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    }

    setIsLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Filter data by selected month
  const filteredData = useMemo(() => {
    if (!selectedMonth) return { receptions: [], payments: [], items: [] }

    const monthReceptions = receptions.filter(r =>
      r.reception_date?.startsWith(selectedMonth)
    )

    const monthPayments = payments.filter(p =>
      p.payment_date?.startsWith(selectedMonth)
    )

    const monthItems = receptionItems.filter(item =>
      item.reception?.reception_date?.startsWith(selectedMonth)
    )

    return {
      receptions: monthReceptions,
      payments: monthPayments,
      items: monthItems,
    }
  }, [selectedMonth, receptions, payments, receptionItems])

  // Calculate statistics
  const stats = useMemo(() => {
    const { receptions: monthReceptions, payments: monthPayments, items: monthItems } = filteredData

    // Total amount of receptions
    const totalReceptions = monthReceptions.reduce((sum, r) => sum + (r.total_ht || 0), 0)

    // Patterns pour emballages
    const emballagePatterns = [
      /^SE\d+L?$/i, /^BO\d+$/i, /^BI\d+L?$/i, /^BT\d+L?$/i,
      /^SC\d+$/i, /^BQ\d+$/i, /^CA\d+X?$/i, /^FL\d+$/i, /^PT\d+$/i,
    ]

    // Fonction pour vérifier si une catégorie compte pour les kg
    const isCategoryKg = (categoryId: string | null | undefined): boolean => {
      if (!categoryId) return false
      const category = supplyCategories.find(c => c.id === categoryId)
      if (!category) return false
      return CATEGORIES_KG.some(cat =>
        category.name.toLowerCase().includes(cat.toLowerCase())
      )
    }

    // Fonction pour extraire le code emballage
    const extractEmballageCode = (articleCode: string): string | null => {
      if (/[-\s]?vrac$/i.test(articleCode.trim())) return null
      const code = articleCode.trim()
      const patterns = [
        /^(Se\d+L)/i, /^(Bo\d+)/i, /^(Bi\d+L?)/i, /^(Bt\d+L?)/i,
        /^(Sc\d+)/i, /^(Bq\d+)/i, /^(Ca\d+x?)/i, /^(Fl\d+)/i, /^(Pt\d+)/i,
      ]
      for (const pattern of patterns) {
        const match = code.match(pattern)
        if (match) return match[1].toUpperCase()
      }
      return null
    }

    // Map code article -> poids net
    const articleWeightMap = new Map<string, number>()
    articles.forEach(a => {
      if (a.code && a.weight_net) {
        articleWeightMap.set(a.code.toUpperCase(), a.weight_net)
      }
    })

    // Calculer les différentes quantités
    let totalArticles = 0  // Tout en unités
    let totalEtiquettes = 0  // Étiquettes en unités
    let totalEmballages = 0  // Emballages en unités
    let totalProduitsKg = 0  // Olive+Légumes+Sauce en kg

    monthItems.forEach(item => {
      const supply = supplies.find(s => s.id === item.article_id)
      if (!supply) return

      const code = supply.code.toUpperCase().trim()
      const rawCode = supply.code.trim()
      const qty = item.quantity_received || 0

      // Total articles (tout)
      totalArticles += qty

      // Étiquettes
      if (code.startsWith('ETQ')) {
        totalEtiquettes += qty
        return
      }

      // Emballages purs
      if (emballagePatterns.some(pattern => pattern.test(code))) {
        totalEmballages += qty
        return
      }

      // Produits (olive+légumes+sauce) en kg - filtré par catégorie
      if (isCategoryKg(supply.category_id)) {
        // Vrac : quantité directement en kg
        if (/[-\s]?vrac$/i.test(rawCode)) {
          totalProduitsKg += qty
        } else {
          // Article composé ou fourniture pure
          const emballageCode = extractEmballageCode(rawCode)
          if (emballageCode) {
            const weightNet = articleWeightMap.get(code) || 0
            totalProduitsKg += qty * weightNet
          } else {
            // Fourniture pure en kg
            totalProduitsKg += qty
          }
        }
      }
    })

    // Total quantity received (legacy - keep for compatibility)
    const totalQuantity = totalArticles

    // Stats per supplier
    const supplierStatsMap = new Map<string, SupplierStats>()

    // Initialize with all suppliers that have receptions this month
    monthReceptions.forEach(r => {
      const supplier = suppliers.find(s => s.id === r.supplier_id)
      if (supplier && !supplierStatsMap.has(supplier.id)) {
        supplierStatsMap.set(supplier.id, {
          id: supplier.id,
          name: supplier.name,
          totalReceptions: 0,
          totalPaid: 0,
          remaining: 0,
        })
      }
      if (supplier) {
        const stats = supplierStatsMap.get(supplier.id)!
        stats.totalReceptions += r.total_ht || 0
      }
    })

    // Add payments to supplier stats
    monthPayments.forEach(p => {
      if (p.supplier_id) {
        const supplier = suppliers.find(s => s.id === p.supplier_id)
        if (supplier) {
          if (!supplierStatsMap.has(supplier.id)) {
            supplierStatsMap.set(supplier.id, {
              id: supplier.id,
              name: supplier.name,
              totalReceptions: 0,
              totalPaid: 0,
              remaining: 0,
            })
          }
          const stats = supplierStatsMap.get(supplier.id)!
          stats.totalPaid += p.amount || 0
        }
      }
    })

    // Calculate remaining for each supplier
    supplierStatsMap.forEach(stats => {
      stats.remaining = stats.totalReceptions - stats.totalPaid
    })

    const supplierStatsList = Array.from(supplierStatsMap.values())
      .filter(s => s.totalReceptions > 0 || s.totalPaid > 0)
      .sort((a, b) => b.totalReceptions - a.totalReceptions)

    // Total paid
    const totalPaid = monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0)

    // Total remaining
    const totalRemaining = totalReceptions - totalPaid

    // Quantities per supply for chart
    const supplyQuantitiesMap = new Map<string, SupplyQuantity>()
    monthItems.forEach(item => {
      const supply = supplies.find(s => s.id === item.article_id)
      if (supply) {
        const code = supply.code
        if (!supplyQuantitiesMap.has(code)) {
          supplyQuantitiesMap.set(code, {
            code: supply.code,
            name: supply.name,
            quantity: 0,
          })
        }
        supplyQuantitiesMap.get(code)!.quantity += item.quantity_received || 0
      }
    })

    const supplyQuantities = Array.from(supplyQuantitiesMap.values())
      .filter(s => s.quantity > 0)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 15) // Top 15 for chart

    return {
      totalReceptions,
      totalQuantity,
      totalArticles,
      totalEtiquettes,
      totalEmballages,
      totalProduitsKg,
      supplierStats: supplierStatsList,
      totalPaid,
      totalRemaining,
      supplyQuantities,
    }
  }, [filteredData, suppliers, supplies, supplyCategories, articles])

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split('-')
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
    return `${monthNames[parseInt(monthNum) - 1]} ${year}`
  }

  const formatPrice = (price: number) => {
    return Math.round(price).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' DH'
  }

  const formatQuantity = (qty: number) => {
    return Math.round(qty).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' kg'
  }

  const handleExportPDF = async () => {
    if (!selectedMonth) return
    setIsExporting(true)
    try {
      await generateTotalStatsPDF({
        month: selectedMonth,
        monthLabel: formatMonth(selectedMonth),
        totalReceptions: stats.totalReceptions,
        totalQuantity: stats.totalQuantity,
        totalArticles: stats.totalArticles,
        totalEtiquettes: stats.totalEtiquettes,
        totalEmballages: stats.totalEmballages,
        totalProduitsKg: stats.totalProduitsKg,
        supplierStats: stats.supplierStats,
        totalPaid: stats.totalPaid,
        totalRemaining: stats.totalRemaining,
        supplyQuantities: stats.supplyQuantities,
      })
    } catch (error) {
      console.error('Error exporting PDF:', error)
    }
    setIsExporting(false)
  }

  // Colors for chart bars
  const chartColors = [
    '#B8860B', '#D4A84B', '#E8C878', '#F5DDA0', '#8B6914',
    '#C9983A', '#DEB85C', '#EFCD7D', '#A67C00', '#BF9730',
    '#D9B85B', '#EDD38B', '#9A7200', '#B38B28', '#CDAA55',
  ]

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          Chargement des statistiques totales...
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-2 border-emerald-600">
      <CardHeader className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Statistique Totale
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[180px] bg-white/20 border-white/30 text-white">
                  <SelectValue placeholder="Sélectionner un mois" />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.map((month) => (
                    <SelectItem key={month} value={month}>
                      {formatMonth(month)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportPDF}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <FileDown className="h-4 w-4 mr-2" />
              )}
              Exporter PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Summary Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-emerald-100 border-b-2 border-emerald-600">
                <th className="px-4 py-3 text-left font-bold text-gray-700">Indicateur</th>
                <th className="px-4 py-3 text-right font-bold text-gray-700">Valeur</th>
              </tr>
            </thead>
            <tbody>
              {/* Total receptions */}
              <tr className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">Montant total des réceptions</td>
                <td className="px-4 py-3 text-right font-bold text-[#B8860B]">
                  {formatPrice(stats.totalReceptions)}
                </td>
              </tr>

              {/* Total articles received (units) */}
              <tr className="border-b hover:bg-gray-50 bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">Qté articles reçus</td>
                <td className="px-4 py-3 text-right font-bold text-blue-600">
                  {stats.totalArticles.toLocaleString('fr-FR')} unités
                </td>
              </tr>

              {/* Total etiquettes (units) */}
              <tr className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800 pl-8">↳ Qté Étiquettes</td>
                <td className="px-4 py-3 text-right font-bold text-pink-600">
                  {stats.totalEtiquettes.toLocaleString('fr-FR')} unités
                </td>
              </tr>

              {/* Total emballages (units) */}
              <tr className="border-b hover:bg-gray-50 bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800 pl-8">↳ Qté Emballages</td>
                <td className="px-4 py-3 text-right font-bold text-indigo-600">
                  {stats.totalEmballages.toLocaleString('fr-FR')} unités
                </td>
              </tr>

              {/* Total produits kg (olive+legumes+sauce) */}
              <tr className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800 pl-8">↳ Qté Produits (Olive+Légumes+Sauce)</td>
                <td className="px-4 py-3 text-right font-bold text-purple-600">
                  {stats.totalProduitsKg.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kg
                </td>
              </tr>

              {/* Divider for suppliers */}
              {stats.supplierStats.length > 0 && (
                <tr className="bg-emerald-50">
                  <td colSpan={2} className="px-4 py-2 font-bold text-emerald-800 text-center">
                    Montant par Fournisseur
                  </td>
                </tr>
              )}

              {/* Per supplier amounts */}
              {stats.supplierStats.map((supplier, index) => (
                <tr key={supplier.id} className={`border-b hover:bg-gray-50 ${index % 2 === 0 ? '' : 'bg-gray-50'}`}>
                  <td className="px-4 py-2 text-gray-700 pl-8">{supplier.name}</td>
                  <td className="px-4 py-2 text-right font-semibold text-[#B8860B]">
                    {formatPrice(supplier.totalReceptions)}
                  </td>
                </tr>
              ))}

              {/* Total paid */}
              <tr className="border-b hover:bg-gray-50 bg-green-50">
                <td className="px-4 py-3 font-medium text-gray-800">Montant total réglé</td>
                <td className="px-4 py-3 text-right font-bold text-green-600">
                  {formatPrice(stats.totalPaid)}
                </td>
              </tr>

              {/* Remaining to pay */}
              <tr className="bg-amber-50 border-t-2 border-emerald-600">
                <td className="px-4 py-3 font-bold text-gray-900">Montant reste à payer</td>
                <td className={`px-4 py-3 text-right font-bold ${stats.totalRemaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatPrice(stats.totalRemaining)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Bar Chart for Supplies */}
        {stats.supplyQuantities.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              Quantités par Fourniture (Top 15)
            </h3>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.supplyQuantities}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(value) => `${value.toLocaleString('fr-FR')} kg`} />
                  <YAxis
                    type="category"
                    dataKey="code"
                    width={90}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value.toLocaleString('fr-FR')} kg`, 'Quantité']}
                    labelFormatter={(label) => {
                      const supply = stats.supplyQuantities.find(s => s.code === label)
                      return supply ? `${supply.code} - ${supply.name}` : label
                    }}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '8px 12px',
                    }}
                  />
                  <Bar dataKey="quantity" radius={[0, 4, 4, 0]}>
                    {stats.supplyQuantities.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {stats.supplyQuantities.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Aucune donnée de fourniture pour {selectedMonth ? formatMonth(selectedMonth) : 'ce mois'}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
