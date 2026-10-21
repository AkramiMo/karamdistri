'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useSupabase } from '@/hooks/useSupabase'
import { ProtectedModule } from '@/components/auth/ProtectedModule'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Search, Package, RefreshCw, Weight, Calendar, TrendingUp, Leaf } from 'lucide-react'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import { fr } from 'date-fns/locale'

interface ArticleVenduWithWeight {
  id: string
  sale_id: string
  sale_date: string
  sale_number: string
  article_id: string
  article_code: string
  client_id: string
  client_code: string
  quantity_sold: number
  delivery_id: string | null
  created_at: string
  article?: {
    code: string
    name: string
    weight_net: number | null
    category?: { name: string } | null
  }
  client?: { code: string; name: string }
}

interface FournitureKgSummary {
  fourniture_code: string
  fourniture_name: string
  total_quantity: number
  total_kg: number
  articles_count: number
}

// Mapping des codes fournitures vers leurs noms complets
const fournitureNames: Record<string, string> = {
  'OVE': 'Olives Vertes Entieres',
  'OVD': 'Olives Vertes Denoyautees',
  'OVR': 'Olives Vertes Rondelles',
  'OVC': 'Olives Vertes Cassees',
  'OVT': 'Olives Vertes Tranchees',
  'ONO': 'Olives Noires Oxydees',
  'ONN': 'Olives Noires Naturelles',
  'ONR': 'Olives Noires Rondelles',
  'ONFG': 'Olives Noires Façon Grèce',
  'OTR': 'Olives Tournantes',
  'OVI': 'Olives Violettes',
  'OMX': 'Olives Mix',
  'OCKTM': 'Olive Cocktail Mariné',
  'HR': 'Harissa',
  'COR': 'Cornichons',
  'CIT': 'Citrons Confits',
  'CTR': 'Citrons',
  'CAP': 'Capres',
  'VIN': 'Vinaigre',
  'SAU': 'Sauce',
}

// Fonction pour extraire le code fourniture du code article
// Ex: Se9LOVE -> OVE, Bo370OTR -> OTR, Se11LOVE -> OVE, Ctr-Vrac -> Ctr
// Ex: Se9LHr7 -> HAR, Se9LHr5 -> HAR, Bi5LHr -> HAR (tous les harissas regroupés)
const extractFournitureCode = (articleCode: string): string => {
  let code = articleCode.trim()

  // D'abord, retirer le suffixe "-Vrac" si présent (insensible à la casse)
  const vracMatch = code.match(/[-\s]?vrac$/i)
  if (vracMatch) {
    code = code.slice(0, -vracMatch[0].length).trim()
    const vracCode = code.toUpperCase()
    // Vérifier si c'est une variante de Harissa
    if (/^HR[\d.]*$/i.test(vracCode) || vracCode === 'HAR') {
      return 'HR'
    }
    return vracCode
  }

  // Patterns d'emballages : Se9L, Se11L, Se5L, Se18L, Bo370, Bo720, Bi5L, Bt1L, Sc200, Bq500, Ca6x...
  const emballagePatterns = [
    /^Se\d+L/i,      // Seau (Se9L, Se11L, Se5L, Se18L)
    /^Bo\d+/i,       // Bocal (Bo370, Bo720, Bo200)
    /^Bi\d+L?/i,     // Bidon (Bi5L, Bi10L)
    /^Bt\d+L?/i,     // Bouteille (Bt1L, Bt500)
    /^Sc\d+/i,       // Sachet (Sc200, Sc500)
    /^Bq\d+/i,       // Barquette
    /^Ca\d+x?/i,     // Carton/Caisse
    /^Fl\d+/i,       // Flacon
    /^Pt\d+/i,       // Pot
  ]

  let fournitureCode = code

  for (const pattern of emballagePatterns) {
    const match = code.match(pattern)
    if (match) {
      fournitureCode = code.substring(match[0].length)
      break
    }
  }

  // Normaliser en majuscules
  fournitureCode = (fournitureCode || code).toUpperCase()

  // Regrouper toutes les variantes de harissa sous "HR"
  // Hr, Hr5, Hr7, Hr5.5, HAR -> HR (harissa 5kg, 7kg, 5.5kg etc.)
  if (/^HR[\d.]*$/i.test(fournitureCode) || fournitureCode === 'HAR') {
    return 'HR'
  }

  return fournitureCode
}

// Fonction pour obtenir le nom de la fourniture
const getFournitureName = (code: string): string => {
  return fournitureNames[code] || code
}

// Fonction pour vérifier si un article est en vrac
const isVracArticle = (articleCode: string): boolean => {
  return /[-\s]?vrac$/i.test(articleCode.trim())
}

// Fonction pour obtenir le poids net effectif d'un article
// Pour les articles vrac, le poids net = 1 kg (quantité = kg)
const getEffectiveWeightNet = (articleCode: string, weightNet: number | null): number => {
  if (isVracArticle(articleCode)) {
    return 1 // 1 kg par unité pour les articles vrac
  }
  return weightNet || 0
}

type PeriodFilter = 'day' | 'week' | 'month' | 'all'

export default function VentesKgPage() {
  const supabase = useSupabase()

  const [articlesVendus, setArticlesVendus] = useState<ArticleVenduWithWeight[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('month')
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [selectedFourniture, setSelectedFourniture] = useState<string | null>(null)

  const fetchArticlesVendus = useCallback(async () => {
    setIsLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('articles_vendus') as any)
      .select(`
        *,
        article:articles(code, name, weight_net, category:categories(name)),
        client:clients(code, name)
      `)
      .order('sale_date', { ascending: false })

    if (error) {
      console.error('Error fetching articles vendus:', error)
    } else {
      setArticlesVendus(data || [])
    }
    setIsLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchArticlesVendus()
  }, [fetchArticlesVendus])

  // Calculer les mois disponibles
  const availableMonths = useMemo(() => {
    const months = new Set<string>()
    const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
    months.add(currentMonth)

    articlesVendus.forEach((av) => {
      const month = av.sale_date.substring(0, 7) // YYYY-MM
      months.add(month)
    })

    return Array.from(months).sort((a, b) => b.localeCompare(a))
  }, [articlesVendus])

  // Filtrer par periode
  const filteredByPeriod = useMemo(() => {
    const now = new Date()

    return articlesVendus.filter((av) => {
      const saleDate = new Date(av.sale_date)

      switch (periodFilter) {
        case 'day':
          return format(saleDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')
        case 'week':
          const weekStart = startOfWeek(now, { weekStartsOn: 1 })
          const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
          return isWithinInterval(saleDate, { start: weekStart, end: weekEnd })
        case 'month':
          // Filtrer par le mois sélectionné
          return av.sale_date.startsWith(selectedMonth)
        case 'all':
        default:
          return true
      }
    })
  }, [articlesVendus, periodFilter, selectedMonth])

  // Grouper par FOURNITURE (matiere premiere) et calculer les kg
  const fournituresSummary = useMemo(() => {
    const summaryMap = new Map<string, FournitureKgSummary>()
    const articlesPerFourniture = new Map<string, Set<string>>()

    filteredByPeriod.forEach((av) => {
      const fournitureCode = extractFournitureCode(av.article_code)
      const existing = summaryMap.get(fournitureCode)
      const weightNet = getEffectiveWeightNet(av.article_code, av.article?.weight_net ?? null)
      const kgSold = av.quantity_sold * weightNet

      // Track unique articles per fourniture
      if (!articlesPerFourniture.has(fournitureCode)) {
        articlesPerFourniture.set(fournitureCode, new Set())
      }
      articlesPerFourniture.get(fournitureCode)!.add(av.article_code)

      if (existing) {
        existing.total_quantity += av.quantity_sold
        existing.total_kg += kgSold
        existing.articles_count = articlesPerFourniture.get(fournitureCode)!.size
      } else {
        summaryMap.set(fournitureCode, {
          fourniture_code: fournitureCode,
          fourniture_name: getFournitureName(fournitureCode),
          total_quantity: av.quantity_sold,
          total_kg: kgSold,
          articles_count: 1,
        })
      }
    })

    return Array.from(summaryMap.values())
      .sort((a, b) => b.total_kg - a.total_kg)
  }, [filteredByPeriod])

  // Filtrage par recherche
  const filteredSummary = fournituresSummary.filter((item) => {
    const matchesSearch =
      item.fourniture_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.fourniture_name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  // Stats
  const totalKg = filteredSummary.reduce((sum, item) => sum + item.total_kg, 0)
  const totalQuantity = filteredSummary.reduce((sum, item) => sum + item.total_quantity, 0)
  const fournituresCount = filteredSummary.length

  // Détail des articles pour la fourniture sélectionnée
  const fournitureDetail = useMemo(() => {
    if (!selectedFourniture) return []

    const detailMap = new Map<string, {
      article_code: string
      article_name: string
      weight_net: number
      quantity_sold: number
      total_kg: number
    }>()

    filteredByPeriod.forEach((av) => {
      const fournitureCode = extractFournitureCode(av.article_code)
      if (fournitureCode !== selectedFourniture) return

      const weightNet = getEffectiveWeightNet(av.article_code, av.article?.weight_net ?? null)
      const kgSold = av.quantity_sold * weightNet
      const key = av.article_code

      const existing = detailMap.get(key)
      if (existing) {
        existing.quantity_sold += av.quantity_sold
        existing.total_kg += kgSold
      } else {
        detailMap.set(key, {
          article_code: av.article_code,
          article_name: av.article?.name || '',
          weight_net: weightNet, // Utilise le poids effectif (1 kg pour vrac)
          quantity_sold: av.quantity_sold,
          total_kg: kgSold,
        })
      }
    })

    return Array.from(detailMap.values()).sort((a, b) => b.total_kg - a.total_kg)
  }, [filteredByPeriod, selectedFourniture])

  const formatKg = (kg: number) => {
    const formatted = kg.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    return `${formatted} kg`
  }

  const getPeriodLabel = () => {
    const now = new Date()
    switch (periodFilter) {
      case 'day':
        return format(now, 'dd MMMM yyyy', { locale: fr })
      case 'week':
        const weekStart = startOfWeek(now, { weekStartsOn: 1 })
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
        return `${format(weekStart, 'dd/MM', { locale: fr })} - ${format(weekEnd, 'dd/MM/yyyy', { locale: fr })}`
      case 'month':
        return format(now, 'MMMM yyyy', { locale: fr })
      case 'all':
        return 'Toutes les periodes'
      default:
        return ''
    }
  }

  if (isLoading) {
    return (
      <ProtectedModule module="ventes">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-[#B8860B]" />
        </div>
      </ProtectedModule>
    )
  }

  return (
    <ProtectedModule module="ventes">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ventes en Kg</h1>
            <p className="text-gray-500">Quantites vendues par matiere premiere (fourniture) en kilogrammes</p>
          </div>
          <Button variant="outline" onClick={fetchArticlesVendus}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-2 border-[#B8860B]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-gray-600">Total Kg Vendus</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Weight className="h-8 w-8 text-[#B8860B]" />
                <span className="text-2xl font-bold">{formatKg(totalKg)}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2 border-[#B8860B]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-gray-600">Total Unites</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Package className="h-8 w-8 text-[#B8860B]" />
                <span className="text-2xl font-bold">{totalQuantity}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2 border-[#B8860B]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-gray-600">Fournitures</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Leaf className="h-8 w-8 text-[#B8860B]" />
                <span className="text-2xl font-bold">{fournituresCount}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2 border-[#B8860B]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-gray-600">Periode</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Calendar className="h-8 w-8 text-[#B8860B]" />
                <span className="text-sm font-medium">{getPeriodLabel()}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filters */}
        <Card className="border-2 border-[#B8860B]">
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par code ou nom de fourniture (OVE, OTR...)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-2 border-[#B8860B]"
                />
              </div>
              <Select value={periodFilter} onValueChange={(val) => setPeriodFilter(val as PeriodFilter)}>
                <SelectTrigger className="w-full md:w-44 border-2 border-[#B8860B]">
                  <SelectValue placeholder="Periode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Aujourd&apos;hui</SelectItem>
                  <SelectItem value="week">Cette semaine</SelectItem>
                  <SelectItem value="month">Par mois</SelectItem>
                  <SelectItem value="all">Toutes periodes</SelectItem>
                </SelectContent>
              </Select>
              {periodFilter === 'month' && (
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-full md:w-40 border-2 border-[#B8860B]">
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Mois" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMonths.map((month) => (
                      <SelectItem key={month} value={month}>
                        {format(new Date(month + '-01'), 'MMMM yyyy', { locale: fr })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto border-2 border-[#B8860B] rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code Fourniture</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead className="text-center">Nb Articles</TableHead>
                    <TableHead className="text-center">Quantite Vendue</TableHead>
                    <TableHead className="text-right">Total Kg</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSummary.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        Aucune vente trouvee pour cette periode
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSummary.map((item) => (
                      <>
                        <TableRow
                          key={item.fourniture_code}
                          className={`cursor-pointer hover:bg-amber-50 ${selectedFourniture === item.fourniture_code ? 'bg-amber-100' : ''}`}
                          onClick={() => setSelectedFourniture(selectedFourniture === item.fourniture_code ? null : item.fourniture_code)}
                        >
                          <TableCell>
                            <Badge className="bg-amber-100 text-[#9A7209] font-mono font-bold text-base">
                              {item.fourniture_code}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{item.fourniture_name}</TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-gray-100 text-gray-700">{item.articles_count}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-blue-100 text-blue-800">{item.total_quantity}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge className="bg-green-100 text-green-800 text-base px-3 py-1 font-bold">
                              {formatKg(item.total_kg)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                        {selectedFourniture === item.fourniture_code && fournitureDetail.length > 0 && (
                          <TableRow key={`${item.fourniture_code}-detail`}>
                            <TableCell colSpan={5} className="bg-gray-50 p-4">
                              <div className="text-sm font-medium mb-2 text-gray-700">
                                Détail des articles pour {item.fourniture_code} :
                              </div>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Code Article</TableHead>
                                    <TableHead>Nom</TableHead>
                                    <TableHead className="text-right">Poids Net</TableHead>
                                    <TableHead className="text-right">Qté Vendue</TableHead>
                                    <TableHead className="text-right">Total Kg</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {fournitureDetail.map((detail) => (
                                    <TableRow key={detail.article_code}>
                                      <TableCell className="font-mono">{detail.article_code}</TableCell>
                                      <TableCell>{detail.article_name}</TableCell>
                                      <TableCell className="text-right">{detail.weight_net} kg</TableCell>
                                      <TableCell className="text-right">{detail.quantity_sold}</TableCell>
                                      <TableCell className="text-right font-bold">{formatKg(detail.total_kg)}</TableCell>
                                    </TableRow>
                                  ))}
                                  <TableRow className="bg-amber-50 font-bold">
                                    <TableCell colSpan={4} className="text-right">Total :</TableCell>
                                    <TableCell className="text-right">{formatKg(fournitureDetail.reduce((sum, d) => sum + d.total_kg, 0))}</TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
              <span>{filteredSummary.length} fourniture(s) affichee(s)</span>
              <span className="font-bold text-[#B8860B]">Total: {formatKg(totalKg)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedModule>
  )
}
