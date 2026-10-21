'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSupabase } from '@/hooks/useSupabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Users,
  Package,
  ShoppingCart,
  Truck,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Warehouse,
  FileDown,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  PackageCheck,
  CreditCard,
  Receipt,
  Banknote,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  LabelList,
} from 'recharts'
import { format, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subWeeks } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAuth } from '@/hooks/useAuth'
import { generateBilanMensuelPDF } from '@/lib/pdf/bilanMensuel'
import { useCompanySettings } from '@/hooks/useCompanySettings'

interface DashboardStats {
  clients: number
  articles: number
  orders: number
  ordersThisMonth: number
  deliveries: number
  deliveriesPending: number
  salesThisMonth: number
  salesLastMonth: number
  mbThisMonth: number
  mbLastMonth: number
  cashBalance: number
  lowStockItems: number
  suppliers: number
}

interface RecentOrder {
  id: string
  order_number: string
  client_name: string
  total_ttc: number
  status: string
  order_date: string
}

interface RecentDelivery {
  id: string
  delivery_number: string
  client_name: string
  status: string
  delivery_date: string
}

interface MonthlySales {
  month: string
  total: number
}

interface OrdersByStatus {
  status: string
  count: number
  label: string
  [key: string]: string | number
}

interface ArticleSales {
  article: string
  quantity: number
}

interface DailyMB {
  day: number
  dayLabel: string
  mb: number
}

interface MonthlyTracking {
  month: string
  monthLabel: string
  valRecette: number
  quantiteTotale: number
  quantiteOlive: number
  quantiteHarissa: number
  benefice: number
  pourcentage: number
}

interface DiffAchatVente {
  code: string
  qteAchetee: number
  qteVendue: number
  diff: number
  isEmballage: boolean // true = unités, false = kg
}

interface BilanMensuel {
  receptionsKg: number
  livraisonsKg: number
  commandesCount: number
  livraisonsCount: number
  ventesCount: number
  caVentes: number
  marge: number
  paiementsRecus: number
  paiementsEffectues: number
  restePaiements: number
  valBRRecue: number
  valBRReglee: number
  diffBR: number
}

// Fonction pour extraire le code fourniture du code article
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

  const emballagePatterns = [
    /^Se\d+L/i, /^Bo\d+/i, /^Bi\d+L?/i, /^Bt\d+L?/i,
    /^Sc\d+/i, /^Bq\d+/i, /^Ca\d+x?/i, /^Fl\d+/i, /^Pt\d+/i,
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
  if (/^HR[\d.]*$/i.test(fournitureCode) || fournitureCode === 'HAR') {
    return 'HR'
  }

  return fournitureCode
}

const isOlive = (code: string): boolean => {
  const oliveCodes = ['OVE', 'OVD', 'OVR', 'OVC', 'OVT', 'ONO', 'ONN', 'OTR', 'OVI', 'OMX']
  return oliveCodes.includes(code.toUpperCase())
}

const isHarissa = (code: string): boolean => {
  const upperCode = code.toUpperCase()
  // HR = harissa, HR5 = harissa 5kg, HR7 = harissa 7kg, HAR = harissa générique
  return upperCode === 'HAR' || upperCode === 'HR' || upperCode === 'HR5' || upperCode === 'HR7' || upperCode.includes('HARISSA')
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

const monthNames = [
  { key: '01', label: 'Janvier' }, { key: '02', label: 'Fevrier' },
  { key: '03', label: 'Mars' }, { key: '04', label: 'Avril' },
  { key: '05', label: 'Mai' }, { key: '06', label: 'Juin' },
  { key: '07', label: 'Juillet' }, { key: '08', label: 'Aout' },
  { key: '09', label: 'Septembre' }, { key: '10', label: 'Octobre' },
  { key: '11', label: 'Novembre' }, { key: '12', label: 'Decembre' },
]

const statusColors: Record<string, string> = {
  pending: '#9CA3AF',
  confirmed: '#3B82F6',
  in_preparation: '#F59E0B',
  ready: '#10B981',
  in_delivery: '#8B5CF6',
  delivered: '#059669',
  partial: '#F97316',
  returned: '#EC4899',
  cancelled: '#EF4444',
  out_of_stock: '#64748B',
  in_progress: '#06B6D4',
}

const statusLabels: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  in_preparation: 'En préparation',
  ready: 'Prête',
  in_delivery: 'En livraison',
  delivered: 'Livrée',
  partial: 'Partielle',
  returned: 'Retournée',
  cancelled: 'Annulée',
  out_of_stock: 'Rupture de stock',
  in_progress: 'En cours',
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    clients: 0,
    articles: 0,
    orders: 0,
    ordersThisMonth: 0,
    deliveries: 0,
    deliveriesPending: 0,
    salesThisMonth: 0,
    salesLastMonth: 0,
    mbThisMonth: 0,
    mbLastMonth: 0,
    cashBalance: 0,
    lowStockItems: 0,
    suppliers: 0,
  })
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [recentDeliveries, setRecentDeliveries] = useState<RecentDelivery[]>([])
  const [monthlySales, setMonthlySales] = useState<MonthlySales[]>([])
  const [ordersByStatus, setOrdersByStatus] = useState<OrdersByStatus[]>([])
  const [articleSales, setArticleSales] = useState<ArticleSales[]>([])
  const [monthlyTracking, setMonthlyTracking] = useState<MonthlyTracking[]>([])
  const [isLoadingTracking, setIsLoadingTracking] = useState(false)
  const [trackingLastUpdate, setTrackingLastUpdate] = useState<string | null>(null)
  const [dailyMB, setDailyMB] = useState<DailyMB[]>([])
  const [selectedMBMonth, setSelectedMBMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [isLoading, setIsLoading] = useState(true)
  const [salesViewMode, setSalesViewMode] = useState<'month' | 'week'>('month')
  const [showDiffAchatVente, setShowDiffAchatVente] = useState(false)
  const [diffAchatVente, setDiffAchatVente] = useState<DiffAchatVente[]>([])
  const [isLoadingDiff, setIsLoadingDiff] = useState(false)
  const [selectedDiffMonth, setSelectedDiffMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  // Bilan Mensuel
  const [bilanMonth, setBilanMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [bilanMensuel, setBilanMensuel] = useState<BilanMensuel>({
    receptionsKg: 0,
    livraisonsKg: 0,
    commandesCount: 0,
    livraisonsCount: 0,
    ventesCount: 0,
    caVentes: 0,
    marge: 0,
    paiementsRecus: 0,
    paiementsEffectues: 0,
    restePaiements: 0,
    valBRRecue: 0,
    valBRReglee: 0,
    diffBR: 0,
  })
  const [isLoadingBilan, setIsLoadingBilan] = useState(false)
  const supabase = useSupabase()
  const { profile } = useAuth()
  const { companySettings } = useCompanySettings()
  const isLivreur = profile?.role?.name === 'livreur'
  const isCommercial = profile?.role?.name === 'commercial'

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setIsLoading(true)
    try {
      const now = new Date()
      const thisMonthStart = startOfMonth(now).toISOString()
      const thisMonthEnd = endOfMonth(now).toISOString()
      const lastMonthStart = startOfMonth(subMonths(now, 1)).toISOString()
      const lastMonthEnd = endOfMonth(subMonths(now, 1)).toISOString()

      // Fetch all counts in parallel
      const [
        clientsRes,
        articlesRes,
        ordersRes,
        ordersThisMonthRes,
        deliveriesRes,
        deliveriesPendingRes,
        salesThisMonthRes,
        salesLastMonthRes,
        mbThisMonthRes,
        mbLastMonthRes,
        cashRes,
        lowStockRes,
        recentOrdersRes,
        recentDeliveriesRes,
        orderStatusRes,
        suppliersRes,
      ] = await Promise.all([
        // Total clients
        supabase.from('clients').select('id', { count: 'exact', head: true }).eq('is_active', true),
        // Total articles
        supabase.from('articles').select('id', { count: 'exact', head: true }).eq('is_active', true),
        // Total orders
        supabase.from('orders').select('id', { count: 'exact', head: true }),
        // Orders this month
        supabase.from('orders').select('id', { count: 'exact', head: true })
          .gte('order_date', thisMonthStart.split('T')[0])
          .lte('order_date', thisMonthEnd.split('T')[0]),
        // Total deliveries
        supabase.from('deliveries').select('id', { count: 'exact', head: true }),
        // Pending deliveries
        supabase.from('deliveries').select('id', { count: 'exact', head: true })
          .in('status', ['pending', 'in_progress']),
        // Sales this month
        supabase.from('sales').select('total_ttc')
          .gte('sale_date', thisMonthStart.split('T')[0])
          .lte('sale_date', thisMonthEnd.split('T')[0]),
        // Sales last month
        supabase.from('sales').select('total_ttc')
          .gte('sale_date', lastMonthStart.split('T')[0])
          .lte('sale_date', lastMonthEnd.split('T')[0]),
        // MB this month
        supabase.from('sales').select('mb')
          .gte('sale_date', thisMonthStart.split('T')[0])
          .lte('sale_date', thisMonthEnd.split('T')[0]),
        // MB last month
        supabase.from('sales').select('mb')
          .gte('sale_date', lastMonthStart.split('T')[0])
          .lte('sale_date', lastMonthEnd.split('T')[0]),
        // Cash balance (sum of in - out)
        supabase.from('cash_register').select('amount, operation_type'),
        // Low stock items
        supabase.from('stock').select('id, quantity, article:articles(min_stock)'),
        // Recent orders (last 5)
        supabase.from('orders')
          .select('id, order_number, total_ttc, status, order_date, client:clients(name)')
          .order('created_at', { ascending: false })
          .limit(5),
        // Recent deliveries (last 5)
        supabase.from('deliveries')
          .select('id, delivery_number, status, delivery_date, client:clients(name)')
          .order('created_at', { ascending: false })
          .limit(5),
        // Orders by status for pie chart
        supabase.from('orders').select('status'),
        // Total suppliers
        supabase.from('suppliers').select('id', { count: 'exact', head: true }).eq('is_active', true),
      ])

      // Calculate stats
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const salesThisMonthTotal = ((salesThisMonthRes.data || []) as any[]).reduce(
        (sum: number, s: any) => sum + (s.total_ttc || 0), 0
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const salesLastMonthTotal = ((salesLastMonthRes.data || []) as any[]).reduce(
        (sum: number, s: any) => sum + (s.total_ttc || 0), 0
      )

      // MB (Marge Brute) calculations
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mbThisMonthTotal = ((mbThisMonthRes.data || []) as any[]).reduce(
        (sum: number, s: any) => sum + (s.mb || 0), 0
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mbLastMonthTotal = ((mbLastMonthRes.data || []) as any[]).reduce(
        (sum: number, s: any) => sum + (s.mb || 0), 0
      )

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cashBalance = ((cashRes.data || []) as any[]).reduce((sum: number, c: any) => {
        return c.operation_type === 'in' ? sum + (c.amount || 0) : sum - (c.amount || 0)
      }, 0)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lowStockCount = (lowStockRes.data || []).filter((s: any) => {
        const minStock = s.article?.min_stock || 0
        return s.quantity <= minStock
      }).length

      setStats({
        clients: clientsRes.count || 0,
        articles: articlesRes.count || 0,
        orders: ordersRes.count || 0,
        ordersThisMonth: ordersThisMonthRes.count || 0,
        deliveries: deliveriesRes.count || 0,
        deliveriesPending: deliveriesPendingRes.count || 0,
        salesThisMonth: salesThisMonthTotal,
        salesLastMonth: salesLastMonthTotal,
        mbThisMonth: mbThisMonthTotal,
        mbLastMonth: mbLastMonthTotal,
        cashBalance,
        lowStockItems: lowStockCount,
        suppliers: suppliersRes.count || 0,
      })

      // Format recent orders
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setRecentOrders((recentOrdersRes.data || []).map((o: any) => ({
        id: o.id,
        order_number: o.order_number,
        client_name: o.client?.name || 'N/A',
        total_ttc: o.total_ttc || 0,
        status: o.status,
        order_date: o.order_date,
      })))

      // Format recent deliveries
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setRecentDeliveries((recentDeliveriesRes.data || []).map((d: any) => ({
        id: d.id,
        delivery_number: d.delivery_number,
        client_name: d.client?.name || 'N/A',
        status: d.status,
        delivery_date: d.delivery_date,
      })))

      // Calculate orders by status
      const statusCounts: Record<string, number> = {}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(orderStatusRes.data || []).forEach((o: any) => {
        statusCounts[o.status] = (statusCounts[o.status] || 0) + 1
      })
      setOrdersByStatus(
        Object.entries(statusCounts).map(([status, count]) => ({
          status,
          count,
          label: statusLabels[status] || status,
        }))
      )

      // Fetch additional data in parallel (instead of sequentially)
      // Note: fetchMonthlyTracking is now on-demand (cached + refresh button)
      await Promise.all([
        fetchMonthlySales(),
        fetchArticleSales(),
        fetchDailyMB(),
      ])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMonthlySales = async () => {
    const now = new Date()

    // Calculer les dates pour les 6 derniers mois
    const monthsData = []
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i)
      monthsData.push({
        date: monthDate,
        start: startOfMonth(monthDate).toISOString().split('T')[0],
        end: endOfMonth(monthDate).toISOString().split('T')[0],
        label: format(monthDate, 'MMM yyyy', { locale: fr }),
      })
    }

    // Fetch all months in parallel
    const results = await Promise.all(
      monthsData.map(m =>
        supabase
          .from('sales')
          .select('total_ttc')
          .gte('sale_date', m.start)
          .lte('sale_date', m.end)
      )
    )

    const months: MonthlySales[] = results.map((res, i) => ({
      month: monthsData[i].label,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      total: ((res.data || []) as any[]).reduce((sum: number, s: any) => sum + (s.total_ttc || 0), 0),
    }))

    setMonthlySales(months)
  }

  const fetchWeeklySales = async () => {
    const now = new Date()

    // Calculer les dates pour les 6 dernières semaines
    const weeksData = []
    for (let i = 5; i >= 0; i--) {
      const weekDate = subWeeks(now, i)
      weeksData.push({
        date: weekDate,
        start: startOfWeek(weekDate, { weekStartsOn: 1 }).toISOString().split('T')[0],
        end: endOfWeek(weekDate, { weekStartsOn: 1 }).toISOString().split('T')[0],
        label: `Sem. ${format(weekDate, 'w', { locale: fr })}`,
      })
    }

    // Fetch all weeks in parallel
    const results = await Promise.all(
      weeksData.map(w =>
        supabase
          .from('sales')
          .select('total_ttc')
          .gte('sale_date', w.start)
          .lte('sale_date', w.end)
      )
    )

    const weeks: MonthlySales[] = results.map((res, i) => ({
      month: weeksData[i].label,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      total: ((res.data || []) as any[]).reduce((sum: number, s: any) => sum + (s.total_ttc || 0), 0),
    }))

    setMonthlySales(weeks)
  }

  const fetchArticleSales = async () => {
    // Récupérer les ventes par article (top 10)
    const { data } = await supabase
      .from('articles_vendus')
      .select('article_code, quantity_sold')

    if (data && data.length > 0) {
      // Grouper par article et sommer les quantités
      const articleTotals: Record<string, number> = {}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data.forEach((item: any) => {
        const code = item.article_code || 'N/A'
        articleTotals[code] = (articleTotals[code] || 0) + (item.quantity_sold || 0)
      })

      // Convertir en tableau et trier par quantité décroissante
      const sortedArticles = Object.entries(articleTotals)
        .map(([article, quantity]) => ({ article, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10) // Top 10

      setArticleSales(sortedArticles)
    }
  }

  // Load cached tracking data on mount
  useEffect(() => {
    const currentYear = new Date().getFullYear()
    const cacheKey = `monthlyTracking_${currentYear}`
    const cached = localStorage.getItem(cacheKey)
    const cachedTime = localStorage.getItem(`${cacheKey}_time`)

    if (cached) {
      try {
        setMonthlyTracking(JSON.parse(cached))
        if (cachedTime) {
          setTrackingLastUpdate(cachedTime)
        }
      } catch (e) {
        console.error('Error loading cached tracking:', e)
      }
    }
  }, [])

  const fetchMonthlyTracking = async () => {
    setIsLoadingTracking(true)
    try {
      const currentYear = new Date().getFullYear()
      const yearStart = `${currentYear}-01-01`
      const yearEnd = `${currentYear}-12-31`

      // Fetch all data for the year in 2 parallel queries instead of 24 sequential
      const [salesRes, articlesRes] = await Promise.all([
        supabase
          .from('sales')
          .select('sale_date, total_ht, mb')
          .gte('sale_date', yearStart)
          .lte('sale_date', yearEnd),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('articles_vendus') as any)
          .select('sale_date, article_code, quantity_sold, article:articles(weight_net)')
          .gte('sale_date', yearStart)
          .lte('sale_date', yearEnd),
      ])

      const salesData = salesRes.data || []
      const articlesData = articlesRes.data || []

      // Group by month in JavaScript
      const tracking: MonthlyTracking[] = monthNames.map(({ key, label }) => {
        const monthPrefix = `${currentYear}-${key}`

        // Filter sales for this month
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const monthSales = salesData.filter((s: any) => s.sale_date?.startsWith(monthPrefix))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const valRecette = monthSales.reduce((sum: number, s: any) => sum + (s.total_ht || 0), 0)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const benefice = monthSales.reduce((sum: number, s: any) => sum + (s.mb || 0), 0)

        // Filter articles for this month
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const monthArticles = articlesData.filter((a: any) => a.sale_date?.startsWith(monthPrefix))

        let quantiteTotale = 0
        let quantiteHarissa = 0

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        monthArticles.forEach((a: any) => {
          const fournitureCode = extractFournitureCode(a.article_code)
          const weightNet = getEffectiveWeightNet(a.article_code, a.article?.weight_net ?? null)
          const kg = a.quantity_sold * weightNet

          quantiteTotale += kg
          if (isHarissa(fournitureCode)) quantiteHarissa += kg
        })

        const quantiteOlive = quantiteTotale - quantiteHarissa
        const pourcentage = valRecette > 0 ? (benefice / valRecette) * 100 : 0

        return {
          month: key,
          monthLabel: label,
          valRecette,
          quantiteTotale,
          quantiteOlive,
          quantiteHarissa,
          benefice,
          pourcentage,
        }
      })

      setMonthlyTracking(tracking)

      // Save to cache
      const cacheKey = `monthlyTracking_${currentYear}`
      const now = format(new Date(), 'dd/MM/yyyy HH:mm', { locale: fr })
      localStorage.setItem(cacheKey, JSON.stringify(tracking))
      localStorage.setItem(`${cacheKey}_time`, now)
      setTrackingLastUpdate(now)
    } catch (error) {
      console.error('Error fetching monthly tracking:', error)
    } finally {
      setIsLoadingTracking(false)
    }
  }

  const fetchDailyMB = async (yearMonth?: string) => {
    const month = yearMonth || selectedMBMonth
    const [year, monthNum] = month.split('-').map(Number)
    const daysInMonth = new Date(year, monthNum, 0).getDate()

    const monthStart = `${month}-01`
    const monthEnd = `${month}-${String(daysInMonth).padStart(2, '0')}`

    // Fetch all sales for the month
    const { data: salesData } = await supabase
      .from('sales')
      .select('sale_date, mb')
      .gte('sale_date', monthStart)
      .lte('sale_date', monthEnd)

    // Group MB by day
    const mbByDay: Record<number, number> = {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(salesData || []).forEach((sale: any) => {
      const day = new Date(sale.sale_date).getDate()
      mbByDay[day] = (mbByDay[day] || 0) + (sale.mb || 0)
    })

    // Convert to array, filtering out days with 0 MB
    const dailyData: DailyMB[] = Object.entries(mbByDay)
      .filter(([_, mb]) => mb > 0)
      .map(([day, mb]) => ({
        day: parseInt(day),
        dayLabel: String(day),
        mb,
      }))
      .sort((a, b) => a.day - b.day)

    setDailyMB(dailyData)
  }

  // Fetch Diff Achat-Vente (à la demande)
  const fetchDiffAchatVente = async () => {
    setIsLoadingDiff(true)
    try {
      // Calculer les dates du mois sélectionné
      const [year, month] = selectedDiffMonth.split('-').map(Number)
      const lastDay = new Date(year, month, 0).getDate()
      const monthStart = `${selectedDiffMonth}-01`
      const monthEnd = `${selectedDiffMonth}-${String(lastDay).padStart(2, '0')}`

      // Catégories qui comptent pour les kg
      const CATEGORIES_KG_DIFF = ['légumes', 'olive', 'sauce', 'legumes']

      // Fonction pour vérifier si c'est un emballage (compté en unités)
      const isEmballageCode = (code: string): boolean => {
        const upperCode = code.toUpperCase().trim()
        const emballagePatterns = [
          /^SE\d+L?$/i, /^BO\d+$/i, /^BI\d+L?$/i, /^BT\d+L?$/i,
          /^SC\d+$/i, /^BQ\d+$/i, /^CA\d+X?$/i, /^FL\d+$/i, /^PT\d+$/i,
        ]
        return emballagePatterns.some(pattern => pattern.test(upperCode))
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

      // Fonction pour normaliser le code fourniture (HR-vrac, HR5, HR7 -> HR)
      const normalizeFournitureCode = (code: string): string => {
        const upperCode = code.toUpperCase().trim()
        if (upperCode === 'HR-VRAC' || upperCode === 'HR' || upperCode === 'HAR' ||
            /^HR[\d.]*$/i.test(upperCode) || /^HR-/i.test(upperCode)) {
          return 'HR'
        }
        return upperCode
      }

      // Récupérer les données en parallèle
      const [receptionsRes, articlesRes, categoriesRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('reception_items') as any).select(`
          quantity_received,
          reception:receptions!inner(reception_date),
          supply:supplies(code, category_id)
        `),
        supabase.from('articles').select('code, weight_net'),
        supabase.from('supply_categories').select('id, name'),
      ])

      const receptionsData = receptionsRes.data || []
      const categoriesDiff = categoriesRes.data || []

      // Map code article -> poids net
      const articleWeightMap = new Map<string, number>()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(articlesRes.data || []).forEach((a: any) => {
        if (a.code && a.weight_net) {
          articleWeightMap.set(a.code.toUpperCase(), a.weight_net)
        }
      })

      // Vérifier si une catégorie compte pour les kg
      const isCategoryKgDiff = (categoryId: string | null): boolean => {
        if (!categoryId) return false
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const category = categoriesDiff.find((c: any) => c.id === categoryId)
        if (!category) return false
        return CATEGORIES_KG_DIFF.some(cat =>
          category.name.toLowerCase().includes(cat.toLowerCase())
        )
      }

      // Maps pour les achats
      const achatsEmballagesMap = new Map<string, number>() // unités
      const achatsFournituresMap = new Map<string, number>() // kg

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(receptionsData || []).forEach((item: any) => {
        const receptionDate = item.reception?.reception_date
        if (!receptionDate || receptionDate < monthStart || receptionDate > monthEnd) return

        const categoryId = item.supply?.category_id || null
        const rawCode = (item.supply?.code || '').trim()
        if (!rawCode) return

        const qty = item.quantity_received || 0
        if (qty <= 0) return

        // Extraire l'emballage pour le comptage en unités (toutes catégories)
        const emballageCode = extractEmballageCode(rawCode)
        if (emballageCode) {
          achatsEmballagesMap.set(emballageCode, (achatsEmballagesMap.get(emballageCode) || 0) + qty)
        }

        // Pour les kg, filtrer par catégorie (légumes, olive, sauce)
        if (!isCategoryKgDiff(categoryId)) return

        // Traiter les articles vrac comme des fournitures en kg
        if (isVracArticle(rawCode)) {
          let fournitureCode = rawCode.replace(/[-\s]?vrac$/i, '').trim().toUpperCase()
          fournitureCode = normalizeFournitureCode(fournitureCode)
          if (fournitureCode) {
            achatsFournituresMap.set(fournitureCode, (achatsFournituresMap.get(fournitureCode) || 0) + qty)
          }
          return
        }

        // Extraire la fourniture du code (Bi5LHr -> HR, ou OVE -> OVE)
        let fournitureCode = extractFournitureCode(rawCode)
        fournitureCode = normalizeFournitureCode(fournitureCode)

        // Vérifier que ce n'est pas un emballage pur
        if (fournitureCode && !isEmballageCode(fournitureCode)) {
          let kgToAdd = qty
          if (emballageCode) {
            const weightNet = articleWeightMap.get(rawCode.toUpperCase()) || 0
            kgToAdd = qty * weightNet
          }
          if (kgToAdd > 0) {
            achatsFournituresMap.set(fournitureCode, (achatsFournituresMap.get(fournitureCode) || 0) + kgToAdd)
          }
        }
      })

      // Récupérer les ventes (articles vendus)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: ventesData } = await (supabase.from('articles_vendus') as any)
        .select('article_code, quantity_sold, sale_date, article:articles(weight_net)')
        .gte('sale_date', monthStart)
        .lte('sale_date', monthEnd)

      // Maps pour les ventes
      const ventesEmballagesMap = new Map<string, number>() // unités
      const ventesFournituresMap = new Map<string, number>() // kg

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(ventesData || []).forEach((item: any) => {
        const articleCode = item.article_code || ''
        if (articleCode.toUpperCase().startsWith('ETQ')) return

        const qtySold = item.quantity_sold || 0

        // Extraire le code emballage (null si vrac)
        const emballageCode = extractEmballageCode(articleCode)
        if (emballageCode) {
          // Compter l'emballage en unités
          ventesEmballagesMap.set(emballageCode, (ventesEmballagesMap.get(emballageCode) || 0) + qtySold)
        }

        // Extraire et compter la fourniture en kg
        let fournitureCode = extractFournitureCode(articleCode)
        fournitureCode = normalizeFournitureCode(fournitureCode)
        if (fournitureCode) {
          const weightNet = getEffectiveWeightNet(articleCode, item.article?.weight_net ?? null)
          const kg = qtySold * weightNet
          ventesFournituresMap.set(fournitureCode, (ventesFournituresMap.get(fournitureCode) || 0) + kg)
        }
      })

      // Combiner les données
      const diffData: DiffAchatVente[] = []

      // Emballages (unités)
      const allEmballages = new Set([...achatsEmballagesMap.keys(), ...ventesEmballagesMap.keys()])
      allEmballages.forEach(code => {
        const qteAchetee = achatsEmballagesMap.get(code) || 0
        const qteVendue = ventesEmballagesMap.get(code) || 0
        if (qteAchetee > 0 || qteVendue > 0) {
          diffData.push({
            code,
            qteAchetee,
            qteVendue,
            diff: qteAchetee - qteVendue,
            isEmballage: true,
          })
        }
      })

      // Fournitures (kg)
      const allFournitures = new Set([...achatsFournituresMap.keys(), ...ventesFournituresMap.keys()])
      allFournitures.forEach(code => {
        const qteAchetee = achatsFournituresMap.get(code) || 0
        const qteVendue = ventesFournituresMap.get(code) || 0
        if (qteAchetee > 0 || qteVendue > 0) {
          diffData.push({
            code,
            qteAchetee,
            qteVendue,
            diff: qteAchetee - qteVendue,
            isEmballage: false,
          })
        }
      })

      // Exclure PAL et BI5L du tableau
      const excludedCodes = ['PAL', 'BI5L']
      const filteredData = diffData.filter(item =>
        !excludedCodes.includes(item.code.toUpperCase())
      )

      // Trier : emballages d'abord, puis fournitures, alphabétiquement
      filteredData.sort((a, b) => {
        if (a.isEmballage !== b.isEmballage) return a.isEmballage ? -1 : 1
        return a.code.localeCompare(b.code)
      })

      setDiffAchatVente(filteredData)
      setShowDiffAchatVente(true)
    } catch (error) {
      console.error('Error fetching diff achat-vente:', error)
    } finally {
      setIsLoadingDiff(false)
    }
  }

  // Export Excel Diff Achat-Vente
  const exportDiffToExcel = () => {
    if (diffAchatVente.length === 0) return

    // Créer le contenu CSV (compatible Excel)
    const headers = ['Code', 'Type', 'Qté Achetée', 'Qté Vendue', 'Différence']
    const rows = diffAchatVente.map(row => {
      const unite = row.isEmballage ? 'unités' : 'kg'
      return [
        row.code,
        row.isEmballage ? 'Emballage' : 'Fourniture',
        `${row.qteAchetee.toFixed(row.isEmballage ? 0 : 2)} ${unite}`,
        `${row.qteVendue.toFixed(row.isEmballage ? 0 : 2)} ${unite}`,
        `${row.diff.toFixed(row.isEmballage ? 0 : 2)} ${unite}`,
      ]
    })

    // Ajouter les totaux séparés (emballages et fournitures)
    const emballages = diffAchatVente.filter(r => r.isEmballage)
    const fournitures = diffAchatVente.filter(r => !r.isEmballage)

    if (emballages.length > 0) {
      const totalEmb = emballages.reduce((sum, r) => sum + r.diff, 0)
      rows.push(['TOTAL EMBALLAGES', '', '', '', `${totalEmb.toFixed(0)} unités`])
    }
    if (fournitures.length > 0) {
      const totalFour = fournitures.reduce((sum, r) => sum + r.diff, 0)
      rows.push(['TOTAL FOURNITURES', '', '', '', `${totalFour.toFixed(2)} kg`])
    }

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n')

    // Créer et télécharger le fichier
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `diff-achat-vente-${selectedDiffMonth}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Fetch Bilan Mensuel
  const fetchBilanMensuel = async (yearMonth?: string) => {
    const month = yearMonth || bilanMonth
    setIsLoadingBilan(true)
    try {
      const [year, monthNum] = month.split('-').map(Number)
      const lastDay = new Date(year, monthNum, 0).getDate()
      const monthStart = `${month}-01`
      const monthEnd = `${month}-${String(lastDay).padStart(2, '0')}`

      // Catégories qui comptent pour les kg
      const CATEGORIES_KG = ['légumes', 'olive', 'sauce', 'legumes']

      // Fetch all data in parallel
      const [
        receptionsRes,
        articlesForWeightRes,
        categoriesRes,
        commandesRes,
        livraisonsRes,
        ventesRes,
        paiementsRecusRes,
        articlesVendusRes,
      ] = await Promise.all([
        // Réceptions du mois avec détails paiement, code fourniture et catégorie
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('receptions') as any)
          .select('id, total_ht, payment_status, reception_items(quantity_received, supply:supplies(code, category_id))')
          .gte('reception_date', monthStart)
          .lte('reception_date', monthEnd),
        // Articles pour récupérer le poids net
        supabase.from('articles').select('code, weight_net'),
        // Catégories de fournitures
        supabase.from('supply_categories').select('id, name'),
        // Commandes du mois
        supabase.from('orders')
          .select('id', { count: 'exact', head: true })
          .gte('order_date', monthStart)
          .lte('order_date', monthEnd),
        // Livraisons du mois
        supabase.from('deliveries')
          .select('id', { count: 'exact', head: true })
          .gte('delivery_date', monthStart)
          .lte('delivery_date', monthEnd),
        // Ventes du mois (CA et marge)
        supabase.from('sales')
          .select('id, total_ht, mb')
          .gte('sale_date', monthStart)
          .lte('sale_date', monthEnd),
        // Paiements reçus - comptés par date de livraison (BL)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('payments') as any)
          .select('amount, delivery:deliveries!inner(delivery_date)')
          .gte('delivery.delivery_date', monthStart)
          .lte('delivery.delivery_date', monthEnd),
        // Articles vendus du mois (pour calculer kg livrés)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('articles_vendus') as any)
          .select('quantity_sold, article:articles(weight_net), article_code')
          .gte('sale_date', monthStart)
          .lte('sale_date', monthEnd),
      ])

      // Calculer les KPI
      const receptions = receptionsRes.data || []
      const categories = categoriesRes.data || []
      let receptionsKg = 0
      let valBRRecue = 0
      let valBRReglee = 0

      // Construire le map code article -> poids net
      const articleWeightMap = new Map<string, number>()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(articlesForWeightRes.data || []).forEach((a: any) => {
        if (a.code && a.weight_net) {
          articleWeightMap.set(a.code.toUpperCase(), a.weight_net)
        }
      })

      // Vérifier si une catégorie compte pour les kg
      const isCategoryKgBilan = (categoryId: string | null): boolean => {
        if (!categoryId) return false
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const category = categories.find((c: any) => c.id === categoryId)
        if (!category) return false
        return CATEGORIES_KG.some(cat =>
          category.name.toLowerCase().includes(cat.toLowerCase())
        )
      }

      // Fonction pour vérifier si un article est en vrac
      const isVracArticleBilan = (articleCode: string): boolean => {
        return /[-\s]?vrac$/i.test(articleCode.trim())
      }

      // Fonction pour extraire le code emballage
      const extractEmballageCodeBilan = (articleCode: string): string | null => {
        if (isVracArticleBilan(articleCode)) return null
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      receptions.forEach((r: any) => {
        // Calculer le total kg des réceptions (filtré par catégorie)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (r.reception_items || []).forEach((item: any) => {
          const categoryId = item.supply?.category_id || null

          // Filtrer par catégorie (légumes, olive, sauce uniquement)
          if (!isCategoryKgBilan(categoryId)) return

          const rawCode = (item.supply?.code || '').trim()
          if (!rawCode) return

          const qty = item.quantity_received || 0
          if (qty <= 0) return

          // Articles vrac : quantité directement en kg
          if (isVracArticleBilan(rawCode)) {
            receptionsKg += qty
            return
          }

          // Articles composés (avec emballage) : utiliser le poids net
          const emballageCode = extractEmballageCodeBilan(rawCode)
          if (emballageCode) {
            const weightNet = articleWeightMap.get(rawCode.toUpperCase()) || 0
            receptionsKg += qty * weightNet
          } else {
            // Fourniture pure : quantité en kg
            receptionsKg += qty
          }
        })
        // Val BR reçue (total HT de toutes les réceptions)
        valBRRecue += r.total_ht || 0
        // Val BR réglée (réceptions payées)
        if (r.payment_status === 'paye') {
          valBRReglee += r.total_ht || 0
        }
      })

      // Calculer kg livrés (à partir des articles vendus)
      let livraisonsKg = 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(articlesVendusRes.data || []).forEach((a: any) => {
        const weightNet = getEffectiveWeightNet(a.article_code || '', a.article?.weight_net ?? null)
        livraisonsKg += (a.quantity_sold || 0) * weightNet
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const caVentes = (ventesRes.data || []).reduce((sum: number, v: any) => sum + (v.total_ht || 0), 0)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const marge = (ventesRes.data || []).reduce((sum: number, v: any) => sum + (v.mb || 0), 0)
      const ventesCount = (ventesRes.data || []).length

      // Paiements reçus (comptés par date de BL, pas date du paiement)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const paiementsRecus = (paiementsRecusRes.data || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
      // Paiements effectués = réceptions payées du mois (comptés par date de BR)
      const paiementsEffectues = valBRReglee

      setBilanMensuel({
        receptionsKg,
        livraisonsKg,
        commandesCount: commandesRes.count || 0,
        livraisonsCount: livraisonsRes.count || 0,
        ventesCount,
        caVentes,
        marge,
        paiementsRecus,
        paiementsEffectues,
        restePaiements: paiementsRecus - paiementsEffectues,
        valBRRecue,
        valBRReglee,
        diffBR: valBRRecue - valBRReglee,
      })
    } catch (error) {
      console.error('Error fetching bilan mensuel:', error)
    } finally {
      setIsLoadingBilan(false)
    }
  }

  // Navigation du bilan mensuel
  const navigateBilanMonth = (direction: 'prev' | 'next') => {
    const [year, month] = bilanMonth.split('-').map(Number)
    let newYear = year
    let newMonth = month

    if (direction === 'prev') {
      newMonth--
      if (newMonth < 1) {
        newMonth = 12
        newYear--
      }
    } else {
      newMonth++
      if (newMonth > 12) {
        newMonth = 1
        newYear++
      }
    }

    const newBilanMonth = `${newYear}-${String(newMonth).padStart(2, '0')}`
    setBilanMonth(newBilanMonth)
  }

  // Télécharger le bilan en PDF
  const handleDownloadBilanPDF = async () => {
    await generateBilanMensuelPDF({
      month: bilanMonth,
      ...bilanMensuel,
    }, companySettings)
  }

  // Fetch bilan when month changes
  useEffect(() => {
    if (!isLoading) {
      fetchBilanMensuel(bilanMonth)
    }
  }, [bilanMonth, isLoading])

  // Fetch daily MB when month changes
  useEffect(() => {
    if (!isLoading) {
      fetchDailyMB(selectedMBMonth)
    }
  }, [selectedMBMonth, isLoading])

  const formatPrice = (price: number) => {
    const formatted = Math.round(price).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    return `${formatted} MAD`
  }

  const salesGrowth = stats.salesLastMonth > 0
    ? ((stats.salesThisMonth - stats.salesLastMonth) / stats.salesLastMonth) * 100
    : 0

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#B8860B] to-[#DAA520] rounded-full animate-progress" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-500">Vue d&apos;ensemble de votre activité</p>
      </div>

      {/* BILAN MENSUEL */}
      {!isLivreur && !isCommercial && (
        <Card className="border-2 border-[#B8860B] overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-[#B8860B] to-[#DAA520] text-white pb-4">
            <div className="flex items-center justify-between">
              <div className="w-24"></div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigateBilanMonth('prev')}
                  className="p-2 rounded-full hover:bg-white/20 transition-colors"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <CardTitle className="text-xl font-bold">
                  BILAN MENSUEL - {format(new Date(bilanMonth + '-01'), 'MMMM yyyy', { locale: fr }).toUpperCase()}
                </CardTitle>
                <button
                  onClick={() => navigateBilanMonth('next')}
                  className="p-2 rounded-full hover:bg-white/20 transition-colors"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownloadBilanPDF}
                disabled={isLoadingBilan}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                <FileDown className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoadingBilan ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[#B8860B]" />
                <span className="ml-2 text-gray-500">Chargement du bilan...</span>
              </div>
            ) : (
              <div className="flex justify-center">
                <table className="border border-gray-200 rounded-lg overflow-hidden">
                  <tbody className="divide-y divide-gray-200">
                    <tr className="hover:bg-gray-50">
                      <td className="py-2 px-4 text-sm font-medium text-gray-700 whitespace-nowrap">Qté totale reçue</td>
                      <td className="py-2 px-4 text-sm font-bold text-right text-blue-600 whitespace-nowrap">
                        {bilanMensuel.receptionsKg.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kg
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="py-2 px-4 text-sm font-medium text-gray-700 whitespace-nowrap">Qté totale livrée</td>
                      <td className="py-2 px-4 text-sm font-bold text-right text-purple-600 whitespace-nowrap">
                        {bilanMensuel.livraisonsKg.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kg
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="py-2 px-4 text-sm font-medium text-gray-700 whitespace-nowrap">Nbre commandes</td>
                      <td className="py-2 px-4 text-sm font-bold text-right text-orange-600 whitespace-nowrap">
                        {bilanMensuel.commandesCount}
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="py-2 px-4 text-sm font-medium text-gray-700 whitespace-nowrap">Nbre livraisons</td>
                      <td className="py-2 px-4 text-sm font-bold text-right text-purple-600 whitespace-nowrap">
                        {bilanMensuel.livraisonsCount}
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="py-2 px-4 text-sm font-medium text-gray-700 whitespace-nowrap">Nbre ventes</td>
                      <td className="py-2 px-4 text-sm font-bold text-right text-teal-600 whitespace-nowrap">
                        {bilanMensuel.ventesCount}
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="py-2 px-4 text-sm font-medium text-gray-700 whitespace-nowrap">CA</td>
                      <td className="py-2 px-4 text-sm font-bold text-right text-teal-600 whitespace-nowrap">
                        {bilanMensuel.caVentes.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} DH
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="py-2 px-4 text-sm font-medium text-gray-700 whitespace-nowrap">MB</td>
                      <td className="py-2 px-4 text-sm font-bold text-right text-green-600 whitespace-nowrap">
                        {bilanMensuel.marge.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} DH
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="py-2 px-4 text-sm font-medium text-gray-700 whitespace-nowrap">Encaissement</td>
                      <td className="py-2 px-4 text-sm font-bold text-right text-emerald-600 whitespace-nowrap">
                        {bilanMensuel.paiementsRecus.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} DH
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="py-2 px-4 text-sm font-medium text-gray-700 whitespace-nowrap">Décaissement</td>
                      <td className="py-2 px-4 text-sm font-bold text-right text-red-600 whitespace-nowrap">
                        {bilanMensuel.paiementsEffectues.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} DH
                      </td>
                    </tr>
                    <tr className="bg-gray-100 hover:bg-gray-200">
                      <td className="py-2 px-4 text-sm font-bold text-gray-800 whitespace-nowrap">Reste</td>
                      <td className={`py-2 px-4 text-sm font-bold text-right whitespace-nowrap ${bilanMensuel.restePaiements >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {bilanMensuel.restePaiements.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} DH
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="py-2 px-4 text-sm font-medium text-gray-700 whitespace-nowrap">Val BR reçue</td>
                      <td className="py-2 px-4 text-sm font-bold text-right text-blue-600 whitespace-nowrap">
                        {bilanMensuel.valBRRecue.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} DH
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="py-2 px-4 text-sm font-medium text-gray-700 whitespace-nowrap">Val BR réglée</td>
                      <td className="py-2 px-4 text-sm font-bold text-right text-green-600 whitespace-nowrap">
                        {bilanMensuel.valBRReglee.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} DH
                      </td>
                    </tr>
                    <tr className="bg-gray-100 hover:bg-gray-200">
                      <td className="py-2 px-4 text-sm font-bold text-gray-800 whitespace-nowrap">Diff</td>
                      <td className={`py-2 px-4 text-sm font-bold text-right whitespace-nowrap ${bilanMensuel.diffBR <= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {bilanMensuel.diffBR.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} DH
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}



      {/* Charts Row */}
      {!isLivreur && !isCommercial && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Sales Chart */}
            <Card className="border-2 border-[#B8860B]">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Évolution des ventes ({salesViewMode === 'month' ? '6 derniers mois' : '6 dernières semaines'})</CardTitle>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSalesViewMode('month')
                      fetchMonthlySales()
                    }}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      salesViewMode === 'month'
                        ? 'bg-[#B8860B] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Mois
                  </button>
                  <button
                    onClick={() => {
                      setSalesViewMode('week')
                      fetchWeeklySales()
                    }}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      salesViewMode === 'week'
                        ? 'bg-[#B8860B] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Semaine
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                {monthlySales.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={monthlySales}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(value) => [formatPrice(Number(value) || 0), 'Ventes']}
                        labelStyle={{ color: '#374151' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="total"
                        stroke="#B8860B"
                        strokeWidth={3}
                        dot={{ fill: '#B8860B', strokeWidth: 2, r: 5 }}
                        activeDot={{ r: 7, fill: '#9A7209' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-gray-500">
                    Aucune donnée de ventes
                  </div>
                )}
              </CardContent>
            </Card>

            {/* MB par jour Chart */}
            <Card className="border-2 border-[#B8860B]">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  MB par jour
                </CardTitle>
                <input
                  type="month"
                  value={selectedMBMonth}
                  onChange={(e) => setSelectedMBMonth(e.target.value)}
                  className="px-3 py-1 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#B8860B]"
                />
              </CardHeader>
              <CardContent>
                {dailyMB.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={dailyMB} margin={{ left: 10, right: 10, bottom: 5, top: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="dayLabel"
                        tick={{ fontSize: 11 }}
                        label={{ value: 'Jour', position: 'insideBottom', offset: -5, fontSize: 12 }}
                      />
                      <YAxis
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip
                        formatter={(value) => [formatPrice(Number(value) || 0), 'Marge']}
                        labelFormatter={(label) => `Jour ${label}`}
                        labelStyle={{ color: '#374151' }}
                      />
                      <Bar dataKey="mb" name="MB" fill="#16A34A" radius={[4, 4, 0, 0]} minPointSize={8}>
                        <LabelList
                          dataKey="mb"
                          position="top"
                          formatter={(value: number) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : Math.round(value)}
                          style={{ fontSize: 9, fill: '#16A34A', fontWeight: 'bold' }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-gray-500">
                    Aucune marge pour ce mois
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Article Sales Chart */}
          <Card className="border-2 border-[#B8860B]">
            <CardHeader>
              <CardTitle>Ventes par article (Top 10)</CardTitle>
            </CardHeader>
            <CardContent>
              {articleSales.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={articleSales} margin={{ left: 20, right: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="article"
                      tick={{ fontSize: 11 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      formatter={(value) => [`${value} unités`, 'Quantité vendue']}
                      labelStyle={{ color: '#374151' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="quantity"
                      stroke="#B8860B"
                      strokeWidth={3}
                      dot={{ fill: '#B8860B', strokeWidth: 2, r: 5 }}
                      activeDot={{ r: 7, fill: '#9A7209' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-gray-500">
                  Aucune donnée de ventes par article
                </div>
              )}
            </CardContent>
          </Card>

          {/* Graphique Benefices par mois */}
          <Card className="border-2 border-[#B8860B]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Benefices par mois ({new Date().getFullYear()})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyTracking.some(m => m.benefice > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyTracking} margin={{ left: 20, right: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(value) => [formatPrice(Number(value) || 0), 'Benefice']}
                      labelStyle={{ color: '#374151' }}
                    />
                    <Bar dataKey="benefice" name="Benefice" fill="#16A34A" radius={[4, 4, 0, 0]}>
                      <LabelList
                        dataKey="benefice"
                        position="top"
                        formatter={(value: number) => value > 0 ? `${(value / 1000).toFixed(0)}k` : ''}
                        style={{ fontSize: 10, fill: '#16A34A', fontWeight: 'bold' }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-gray-500">
                  Aucune donnee de benefices
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tableau Suivi Annuel */}
          <Card className="border-2 border-[#B8860B]">
            <CardHeader className="bg-[#B8860B] text-white flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle>Suivi annuel ({new Date().getFullYear()})</CardTitle>
                {trackingLastUpdate && (
                  <span className="text-xs text-white/70">
                    Màj: {trackingLastUpdate}
                  </span>
                )}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={fetchMonthlyTracking}
                disabled={isLoadingTracking}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                {isLoadingTracking ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <TrendingUp className="h-4 w-4 mr-2" />
                )}
                Rafraîchir
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-100 border-b-2 border-[#B8860B]">
                      <th className="px-3 py-2 text-left font-bold text-gray-700 border-r">Mois</th>
                      <th className="px-3 py-2 text-center font-bold text-[#B8860B] border-r">Val recette</th>
                      <th className="px-3 py-2 text-center font-bold text-gray-700 border-r">Qte totale</th>
                      <th className="px-3 py-2 text-center font-bold text-green-700 border-r">Qte olive</th>
                      <th className="px-3 py-2 text-center font-bold text-red-600 border-r">Harissa</th>
                      <th className="px-3 py-2 text-center font-bold text-green-600 border-r">Benef</th>
                      <th className="px-3 py-2 text-center font-bold text-gray-700">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyTracking.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-gray-500">
                          {isLoadingTracking ? (
                            <div className="flex items-center justify-center gap-2">
                              <Loader2 className="h-5 w-5 animate-spin" />
                              Calcul en cours...
                            </div>
                          ) : (
                            <div>
                              <p>Aucune donnée en cache</p>
                              <p className="text-sm mt-1">Cliquez sur "Rafraîchir" pour calculer</p>
                            </div>
                          )}
                        </td>
                      </tr>
                    ) : (
                      monthlyTracking.map((row, index) => (
                        <tr key={row.month} className={`border-b hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="px-3 py-2 font-medium italic text-gray-800 border-r">{row.monthLabel}</td>
                          <td className="px-3 py-2 text-center font-bold text-[#B8860B] border-r">
                            {row.valRecette > 0 ? `${Math.round(row.valRecette).toLocaleString('fr-FR')} dh` : ''}
                          </td>
                          <td className="px-3 py-2 text-center text-gray-600 border-r">
                            {row.quantiteTotale > 0 ? `${Math.round(row.quantiteTotale).toLocaleString('fr-FR')} kg` : ''}
                          </td>
                          <td className="px-3 py-2 text-center text-green-700 border-r">
                            {row.quantiteOlive > 0 ? `${Math.round(row.quantiteOlive).toLocaleString('fr-FR')} kg` : ''}
                          </td>
                          <td className="px-3 py-2 text-center text-red-600 border-r">
                            {row.quantiteHarissa > 0 ? `${Math.round(row.quantiteHarissa).toLocaleString('fr-FR')} kg` : ''}
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-green-600 border-r">
                            {row.benefice > 0 ? `${Math.round(row.benefice).toLocaleString('fr-FR')} dh` : ''}
                          </td>
                          <td className="px-3 py-2 text-center text-gray-700">
                            {row.pourcentage > 0 ? `${row.pourcentage.toFixed(2)} %` : ''}
                          </td>
                        </tr>
                      ))
                    )}
                    {/* Total & Moyenne - only show when data exists */}
                    {monthlyTracking.length > 0 && (
                      <>
                        {/* Total */}
                        <tr className="bg-yellow-100 border-t-2 border-[#B8860B] font-bold">
                          <td className="px-3 py-2 text-gray-900 border-r">Total Annuel</td>
                          <td className="px-3 py-2 text-center text-[#B8860B] border-r">
                            {Math.round(monthlyTracking.reduce((s, m) => s + m.valRecette, 0)).toLocaleString('fr-FR')} dh
                          </td>
                          <td className="px-3 py-2 text-center text-gray-700 border-r">
                            {Math.round(monthlyTracking.reduce((s, m) => s + m.quantiteTotale, 0)).toLocaleString('fr-FR')} kg
                          </td>
                          <td className="px-3 py-2 text-center text-green-700 border-r">
                            {Math.round(monthlyTracking.reduce((s, m) => s + m.quantiteOlive, 0)).toLocaleString('fr-FR')} kg
                          </td>
                          <td className="px-3 py-2 text-center text-red-600 border-r">
                            {Math.round(monthlyTracking.reduce((s, m) => s + m.quantiteHarissa, 0)).toLocaleString('fr-FR')} kg
                          </td>
                          <td className="px-3 py-2 text-center text-green-600 border-r">
                            {Math.round(monthlyTracking.reduce((s, m) => s + m.benefice, 0)).toLocaleString('fr-FR')} dh
                          </td>
                          <td className="px-3 py-2 text-center text-gray-700">
                            {(() => {
                              const totalRecette = monthlyTracking.reduce((s, m) => s + m.valRecette, 0)
                              const totalBenef = monthlyTracking.reduce((s, m) => s + m.benefice, 0)
                              return totalRecette > 0 ? `${((totalBenef / totalRecette) * 100).toFixed(2)} %` : ''
                            })()}
                          </td>
                        </tr>
                        {/* Moyenne */}
                        <tr className="bg-yellow-50 font-bold">
                          <td className="px-3 py-2 text-gray-900 border-r">Moyenne</td>
                          <td className="px-3 py-2 text-center text-[#B8860B] border-r">
                            {(() => {
                              const months = monthlyTracking.filter(m => m.valRecette > 0).length || 1
                              return Math.round(monthlyTracking.reduce((s, m) => s + m.valRecette, 0) / months).toLocaleString('fr-FR')
                            })()} dh
                          </td>
                          <td className="px-3 py-2 text-center text-gray-700 border-r">
                            {(() => {
                              const months = monthlyTracking.filter(m => m.quantiteTotale > 0).length || 1
                              return Math.round(monthlyTracking.reduce((s, m) => s + m.quantiteTotale, 0) / months).toLocaleString('fr-FR')
                            })()} kg
                          </td>
                          <td className="px-3 py-2 text-center text-green-700 border-r">
                            {(() => {
                              const months = monthlyTracking.filter(m => m.quantiteOlive > 0).length || 1
                              return Math.round(monthlyTracking.reduce((s, m) => s + m.quantiteOlive, 0) / months).toLocaleString('fr-FR')
                            })()} kg
                          </td>
                          <td className="px-3 py-2 text-center text-red-600 border-r">
                            {(() => {
                              const months = monthlyTracking.filter(m => m.quantiteHarissa > 0).length || 1
                              return Math.round(monthlyTracking.reduce((s, m) => s + m.quantiteHarissa, 0) / months).toLocaleString('fr-FR')
                            })()} kg
                          </td>
                          <td className="px-3 py-2 text-center text-green-600 border-r">
                            {(() => {
                              const months = monthlyTracking.filter(m => m.benefice > 0).length || 1
                              return Math.round(monthlyTracking.reduce((s, m) => s + m.benefice, 0) / months).toLocaleString('fr-FR')
                            })()} dh
                          </td>
                          <td className="px-3 py-2 text-center text-gray-700">
                            {(() => {
                              const totalRecette = monthlyTracking.reduce((s, m) => s + m.valRecette, 0)
                              const totalBenef = monthlyTracking.reduce((s, m) => s + m.benefice, 0)
                              return totalRecette > 0 ? `${((totalBenef / totalRecette) * 100).toFixed(2)} %` : ''
                            })()}
                          </td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          {/* Diff Achat-Vente */}
          <Card className="border-2 border-[#B8860B]">
            <CardHeader className="bg-gradient-to-r from-[#B8860B] to-[#DAA520] text-white flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Diff Achat-Vente
              </CardTitle>
              <div className="flex items-center gap-2">
                <input
                  type="month"
                  value={selectedDiffMonth}
                  onChange={(e) => {
                    setSelectedDiffMonth(e.target.value)
                    setShowDiffAchatVente(false)
                  }}
                  className="px-2 py-1 text-sm border rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#B8860B]"
                />
                {!showDiffAchatVente ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={fetchDiffAchatVente}
                    disabled={isLoadingDiff}
                  >
                    {isLoadingDiff ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <BarChart3 className="h-4 w-4 mr-2" />
                    )}
                    Calculer
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={exportDiffToExcel}
                    >
                      <FileDown className="h-4 w-4 mr-2" />
                      Excel
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDiffAchatVente(false)}
                      className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                    >
                      Masquer
                    </Button>
                  </>
                )}
              </div>
            </CardHeader>
            {showDiffAchatVente && (
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-amber-50 border-b border-[#B8860B]">
                        <th colSpan={5} className="px-3 py-2 text-center font-bold text-[#9A7209]">
                          {format(new Date(selectedDiffMonth + '-01'), 'MMMM yyyy', { locale: fr })}
                        </th>
                      </tr>
                      <tr className="bg-gray-100 border-b-2 border-[#B8860B]">
                        <th className="px-3 py-2 text-left font-bold text-gray-700 border-r">Code</th>
                        <th className="px-3 py-2 text-center font-bold text-gray-500 border-r">Type</th>
                        <th className="px-3 py-2 text-right font-bold text-green-700 border-r">Achetée</th>
                        <th className="px-3 py-2 text-right font-bold text-red-600 border-r">Vendue</th>
                        <th className="px-3 py-2 text-right font-bold text-[#B8860B]">Diff</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diffAchatVente.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-gray-500">
                            Aucune donnée disponible
                          </td>
                        </tr>
                      ) : (
                        <>
                          {diffAchatVente.map((row, index) => {
                            const unite = row.isEmballage ? '' : ' kg'
                            const decimals = row.isEmballage ? 0 : 2
                            return (
                              <tr key={row.code} className={`border-b hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                <td className="px-3 py-2 font-medium text-gray-800 border-r">
                                  <Badge className={row.isEmballage ? "bg-blue-100 text-blue-800 font-mono" : "bg-amber-100 text-[#9A7209] font-mono"}>
                                    {row.code}
                                  </Badge>
                                </td>
                                <td className="px-3 py-2 text-center text-xs text-gray-500 border-r">
                                  {row.isEmballage ? 'Emb.' : 'Four.'}
                                </td>
                                <td className="px-3 py-2 text-right text-green-700 border-r">
                                  {row.qteAchetee > 0 ? `${row.qteAchetee.toLocaleString('fr-FR', { maximumFractionDigits: decimals })}${unite}` : '-'}
                                </td>
                                <td className="px-3 py-2 text-right text-red-600 border-r">
                                  {row.qteVendue > 0 ? `${row.qteVendue.toLocaleString('fr-FR', { maximumFractionDigits: decimals })}${unite}` : '-'}
                                </td>
                                <td className={`px-3 py-2 text-right font-bold ${row.diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {row.diff.toLocaleString('fr-FR', { maximumFractionDigits: decimals })}{unite}
                                </td>
                              </tr>
                            )
                          })}
                          {/* Total Emballages */}
                          {diffAchatVente.some(r => r.isEmballage) && (
                            <tr className="bg-blue-50 border-t border-blue-300 font-bold">
                              <td className="px-3 py-2 text-blue-800 border-r" colSpan={2}>TOTAL EMBALLAGES</td>
                              <td className="px-3 py-2 text-right text-green-700 border-r">
                                {diffAchatVente.filter(r => r.isEmballage).reduce((sum, r) => sum + r.qteAchetee, 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                              </td>
                              <td className="px-3 py-2 text-right text-red-600 border-r">
                                {diffAchatVente.filter(r => r.isEmballage).reduce((sum, r) => sum + r.qteVendue, 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                              </td>
                              <td className={`px-3 py-2 text-right ${diffAchatVente.filter(r => r.isEmballage).reduce((sum, r) => sum + r.diff, 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {diffAchatVente.filter(r => r.isEmballage).reduce((sum, r) => sum + r.diff, 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                              </td>
                            </tr>
                          )}
                          {/* Total Fournitures */}
                          {diffAchatVente.some(r => !r.isEmballage) && (
                            <tr className="bg-amber-100 border-t-2 border-[#B8860B] font-bold">
                              <td className="px-3 py-2 text-[#9A7209] border-r" colSpan={2}>TOTAL FOURNITURES (kg)</td>
                              <td className="px-3 py-2 text-right text-green-700 border-r">
                                {diffAchatVente.filter(r => !r.isEmballage).reduce((sum, r) => sum + r.qteAchetee, 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-3 py-2 text-right text-red-600 border-r">
                                {diffAchatVente.filter(r => !r.isEmballage).reduce((sum, r) => sum + r.qteVendue, 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })}
                              </td>
                              <td className={`px-3 py-2 text-right ${diffAchatVente.filter(r => !r.isEmballage).reduce((sum, r) => sum + r.diff, 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {diffAchatVente.filter(r => !r.isEmballage).reduce((sum, r) => sum + r.diff, 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          )}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            )}
          </Card>
        </>
      )}

    </div>
  )
}
