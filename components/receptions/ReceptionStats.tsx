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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Download, Package, Calendar, Calculator, FileDown, Loader2 } from 'lucide-react'
import { downloadReceptionsExcel, type ReceptionItemForExport } from '@/lib/excel/receptions'

interface Supply {
  id: string
  code: string
  name: string
  category_id: string | null
}

interface SupplyCategory {
  id: string
  name: string
}

interface MonthlySummary {
  month: string
  monthLabel: string
  nbrBR: number
  montantTotal: number
  qteTotal: number
  qteOlive: number
  qteHarissa: number
  qteLegumes: number
}

export function ReceptionStats() {
  const [receptionItems, setReceptionItems] = useState<ReceptionItemForExport[]>([])
  const [supplies, setSupplies] = useState<Supply[]>([])
  const [categories, setCategories] = useState<SupplyCategory[]>([])
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [showMonthlySummary, setShowMonthlySummary] = useState(false)
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary[]>([])
  const [isLoadingSummary, setIsLoadingSummary] = useState(false)
  const supabase = createClient()

  // Générer la liste des 12 derniers mois
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

  // Définir le mois courant par défaut
  useEffect(() => {
    if (!selectedMonth && availableMonths.length > 0) {
      setSelectedMonth(availableMonths[0])
    }
  }, [availableMonths, selectedMonth])

  const fetchData = async () => {
    setIsLoading(true)

    // Récupérer les catégories
    const { data: categoriesData } = await supabase
      .from('supply_categories')
      .select('id, name')
      .order('name')

    setCategories(categoriesData || [])

    // Récupérer toutes les fournitures avec catégorie
    const { data: suppliesData } = await supabase
      .from('supplies')
      .select('id, code, name, category_id')
      .order('code')

    setSupplies(suppliesData || [])

    // Récupérer tous les items de réception avec leurs réceptions parentes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: items, error } = await (supabase as any)
      .from('reception_items')
      .select(`
        article_id,
        quantity_received,
        reception:receptions(reception_date)
      `)

    if (error) {
      console.error('Error fetching reception items:', error)
      setIsLoading(false)
      return
    }

    // Créer une map des catégories
    const categoriesMap = new Map((categoriesData || []).map(c => [c.id, c.name]))

    // Transformer les données avec les codes/noms/catégories des fournitures
    const suppliesMap = new Map((suppliesData || []).map(s => [s.id, s]))
    const transformedItems: ReceptionItemForExport[] = (items || [])
      .filter((item: any) => item.reception?.reception_date)
      .map((item: any) => {
        const supply = suppliesMap.get(item.article_id)
        const categoryName = supply?.category_id ? categoriesMap.get(supply.category_id) : null
        return {
          article_code: supply?.code || 'N/A',
          article_name: supply?.name || 'Inconnu',
          category: categoryName || 'Non classé',
          quantity_received: item.quantity_received || 0,
          reception_date: item.reception.reception_date,
        }
      })

    setReceptionItems(transformedItems)
    setIsLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Calculer les quantités pour le mois sélectionné avec catégorie
  const monthlyQuantities = useMemo(() => {
    if (!selectedMonth) return []

    const aggregated = new Map<string, { code: string; name: string; category: string; quantity: number }>()

    for (const item of receptionItems) {
      const itemMonth = item.reception_date.substring(0, 7)
      if (itemMonth !== selectedMonth) continue

      const key = item.article_code
      const existing = aggregated.get(key)
      if (existing) {
        existing.quantity += item.quantity_received
      } else {
        aggregated.set(key, {
          code: item.article_code,
          name: item.article_name,
          category: item.category || 'Non classé',
          quantity: item.quantity_received,
        })
      }
    }

    return Array.from(aggregated.values()).sort((a, b) => {
      // Trier par catégorie puis par code
      const catCompare = a.category.localeCompare(b.category)
      if (catCompare !== 0) return catCompare
      return a.code.localeCompare(b.code)
    })
  }, [receptionItems, selectedMonth])

  // Calculer le total
  const totalQuantity = monthlyQuantities.reduce((sum, item) => sum + item.quantity, 0)

  const handleExport = () => {
    if (!selectedMonth) return
    downloadReceptionsExcel(receptionItems, selectedMonth)
  }

  // Calculer le récapitulatif mensuel (à la demande)
  const calculateMonthlySummary = async () => {
    setIsLoadingSummary(true)
    try {
      const currentYear = new Date().getFullYear()
      const summaryData: MonthlySummary[] = []

      const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                          'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

      // Récupérer toutes les réceptions de l'année
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: receptionsData } = await (supabase as any)
        .from('receptions')
        .select(`
          id,
          reception_date,
          total_ht,
          reception_items(
            quantity_received,
            article_id
          )
        `)
        .gte('reception_date', `${currentYear}-01-01`)
        .lte('reception_date', `${currentYear}-12-31`)

      // Créer une map des fournitures avec leurs catégories
      const suppliesMap = new Map(supplies.map(s => [s.id, s]))
      const categoriesMap = new Map(categories.map(c => [c.id, c.name]))

      // Regrouper par mois
      const monthsMap = new Map<string, MonthlySummary>()

      for (let m = 1; m <= 12; m++) {
        const monthKey = `${currentYear}-${String(m).padStart(2, '0')}`
        monthsMap.set(monthKey, {
          month: monthKey,
          monthLabel: monthNames[m - 1],
          nbrBR: 0,
          montantTotal: 0,
          qteTotal: 0,
          qteOlive: 0,
          qteHarissa: 0,
          qteLegumes: 0,
        })
      }

      // Parcourir les réceptions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(receptionsData || []).forEach((reception: any) => {
        const receptionMonth = reception.reception_date?.substring(0, 7)
        if (!receptionMonth || !monthsMap.has(receptionMonth)) return

        const summary = monthsMap.get(receptionMonth)!
        summary.nbrBR += 1
        summary.montantTotal += reception.total_ht || 0

        // Parcourir les items de réception
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(reception.reception_items || []).forEach((item: any) => {
          const qty = item.quantity_received || 0
          const supply = suppliesMap.get(item.article_id)
          const supplyCode = (supply?.code || '').toUpperCase()

          // Exclure les ETQ (étiquettes) et emballages du calcul
          if (supplyCode.startsWith('ETQ') || supplyCode.startsWith('EMB')) {
            return
          }

          // Harissa (HR, HR-vrac, Hr, HAR, etc.)
          if (supplyCode === 'HR' || supplyCode === 'HR-VRAC' || supplyCode === 'HAR' ||
              supplyCode.startsWith('HR-') || supplyCode.startsWith('HR.') ||
              /^HR[\d.]*$/i.test(supplyCode) || supplyCode.includes('HARISSA')) {
            summary.qteHarissa += qty
            summary.qteTotal += qty
          }
          // Légumes (Cornichons, Câpres, Citrons)
          else if (supplyCode.startsWith('COR') || supplyCode === 'COR' ||
                   supplyCode.startsWith('CAP') || supplyCode === 'CAP' ||
                   supplyCode.startsWith('CIT') || supplyCode === 'CIT' ||
                   supplyCode.startsWith('CTR') || supplyCode === 'CTR' ||
                   supplyCode === 'VAR') {
            summary.qteLegumes += qty
            summary.qteTotal += qty
          }
          // Olives (tous les codes O...)
          else if (supplyCode.startsWith('O')) {
            summary.qteOlive += qty
            summary.qteTotal += qty
          }
        })
      })

      // Convertir en tableau et filtrer les mois sans données
      const result = Array.from(monthsMap.values())
        .filter(m => m.nbrBR > 0)
        .sort((a, b) => a.month.localeCompare(b.month))

      setMonthlySummary(result)
      setShowMonthlySummary(true)
    } catch (error) {
      console.error('Error calculating monthly summary:', error)
    } finally {
      setIsLoadingSummary(false)
    }
  }

  // Export Excel du récapitulatif mensuel
  const exportMonthlySummaryToExcel = () => {
    if (monthlySummary.length === 0) return

    const headers = ['Mois', 'Nbr BR', 'Montant Total (DH)', 'Qté Totale', 'Qté Olive', 'Qté Harissa', 'Qté Légumes']
    const rows = monthlySummary.map(row => [
      row.monthLabel,
      row.nbrBR.toString(),
      row.montantTotal.toFixed(2),
      row.qteTotal.toFixed(2),
      row.qteOlive.toFixed(2),
      row.qteHarissa.toFixed(2),
      row.qteLegumes.toFixed(2),
    ])

    // Totaux
    const totals = monthlySummary.reduce((acc, r) => ({
      nbrBR: acc.nbrBR + r.nbrBR,
      montantTotal: acc.montantTotal + r.montantTotal,
      qteTotal: acc.qteTotal + r.qteTotal,
      qteOlive: acc.qteOlive + r.qteOlive,
      qteHarissa: acc.qteHarissa + r.qteHarissa,
      qteLegumes: acc.qteLegumes + r.qteLegumes,
    }), { nbrBR: 0, montantTotal: 0, qteTotal: 0, qteOlive: 0, qteHarissa: 0, qteLegumes: 0 })

    rows.push(['TOTAL', totals.nbrBR.toString(), totals.montantTotal.toFixed(2),
               totals.qteTotal.toFixed(2), totals.qteOlive.toFixed(2),
               totals.qteHarissa.toFixed(2), totals.qteLegumes.toFixed(2)])

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n')

    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `recap-receptions-${new Date().getFullYear()}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split('-')
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
    return `${monthNames[parseInt(monthNum) - 1]} ${year}`
  }

  // Couleurs pour les catégories
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Olives': 'bg-green-100 text-green-800',
      'Etiquettes': 'bg-blue-100 text-blue-800',
      'Emballage': 'bg-orange-100 text-orange-800',
      'Autre': 'bg-gray-100 text-gray-800',
      'Non classé': 'bg-gray-100 text-gray-600',
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          Chargement des statistiques...
        </CardContent>
      </Card>
    )
  }

  const formatPrice = (price: number) => {
    const formatted = Math.round(price).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    return `${formatted} MAD`
  }

  return (
    <div className="space-y-6">
      {/* Récapitulatif Mensuel */}
      <Card className="border-2 border-[#B8860B]">
        <CardHeader className="bg-gradient-to-r from-amber-600 to-amber-700 text-white flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Récapitulatif Mensuel ({new Date().getFullYear()})
          </CardTitle>
          <div className="flex gap-2">
            {!showMonthlySummary ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={calculateMonthlySummary}
                disabled={isLoadingSummary}
              >
                {isLoadingSummary ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Calculator className="h-4 w-4 mr-2" />
                )}
                Calculer
              </Button>
            ) : (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={exportMonthlySummaryToExcel}
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMonthlySummary(false)}
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                >
                  Masquer
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        {showMonthlySummary && (
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b-2 border-amber-600">
                    <th className="px-3 py-2 text-left font-bold text-gray-700 border-r">Mois</th>
                    <th className="px-3 py-2 text-center font-bold text-gray-700 border-r">Nbr BR</th>
                    <th className="px-3 py-2 text-right font-bold text-[#B8860B] border-r">Montant Total</th>
                    <th className="px-3 py-2 text-right font-bold text-gray-700 border-r">Qté Totale</th>
                    <th className="px-3 py-2 text-right font-bold text-green-700 border-r">Qté Olive</th>
                    <th className="px-3 py-2 text-right font-bold text-red-600 border-r">Qté Harissa</th>
                    <th className="px-3 py-2 text-right font-bold text-blue-700">Qté Légumes</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlySummary.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-500">
                        Aucune réception cette année
                      </td>
                    </tr>
                  ) : (
                    <>
                      {monthlySummary.map((row, index) => (
                        <tr key={row.month} className={`border-b hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="px-3 py-2 font-medium text-gray-800 border-r">{row.monthLabel}</td>
                          <td className="px-3 py-2 text-center text-gray-700 border-r">{row.nbrBR}</td>
                          <td className="px-3 py-2 text-right font-bold text-[#B8860B] border-r">{formatPrice(row.montantTotal)}</td>
                          <td className="px-3 py-2 text-right text-gray-700 border-r">{row.qteTotal.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kg</td>
                          <td className="px-3 py-2 text-right text-green-700 border-r">{row.qteOlive.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kg</td>
                          <td className="px-3 py-2 text-right text-red-600 border-r">{row.qteHarissa.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kg</td>
                          <td className="px-3 py-2 text-right text-blue-700">{row.qteLegumes.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kg</td>
                        </tr>
                      ))}
                      {/* Total */}
                      <tr className="bg-amber-100 border-t-2 border-amber-600 font-bold">
                        <td className="px-3 py-2 text-gray-900 border-r">TOTAL</td>
                        <td className="px-3 py-2 text-center text-gray-900 border-r">
                          {monthlySummary.reduce((sum, r) => sum + r.nbrBR, 0)}
                        </td>
                        <td className="px-3 py-2 text-right text-[#B8860B] border-r">
                          {formatPrice(monthlySummary.reduce((sum, r) => sum + r.montantTotal, 0))}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-900 border-r">
                          {monthlySummary.reduce((sum, r) => sum + r.qteTotal, 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kg
                        </td>
                        <td className="px-3 py-2 text-right text-green-700 border-r">
                          {monthlySummary.reduce((sum, r) => sum + r.qteOlive, 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kg
                        </td>
                        <td className="px-3 py-2 text-right text-red-600 border-r">
                          {monthlySummary.reduce((sum, r) => sum + r.qteHarissa, 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kg
                        </td>
                        <td className="px-3 py-2 text-right text-blue-700">
                          {monthlySummary.reduce((sum, r) => sum + r.qteLegumes, 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kg
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Quantités par Article */}
      <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-[#B8860B]" />
            <CardTitle>Quantités Reçues par Article</CardTitle>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[180px]">
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
              onClick={handleExport}
              disabled={monthlyQuantities.length === 0}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <Download className="h-4 w-4" />
              Exporter Excel
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {monthlyQuantities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Aucune réception pour {selectedMonth ? formatMonth(selectedMonth) : 'ce mois'}
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between bg-amber-50 px-4 py-2 rounded-lg border border-amber-200">
              <span className="text-sm font-medium text-amber-800">
                Total: {monthlyQuantities.length} articles
              </span>
              <span className="text-lg font-bold text-[#B8860B]">
                {totalQuantity.toLocaleString('fr-FR')} unités
              </span>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Code</TableHead>
                    <TableHead>Désignation</TableHead>
                    <TableHead className="w-32">Catégorie</TableHead>
                    <TableHead className="text-right w-32">Quantité</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyQuantities.map((item) => (
                    <TableRow key={item.code}>
                      <TableCell className="font-mono text-sm">{item.code}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>
                        <Badge className={getCategoryColor(item.category)}>
                          {item.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {item.quantity.toLocaleString('fr-FR')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
    </div>
  )
}
