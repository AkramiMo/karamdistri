'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSupabase } from '@/hooks/useSupabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  PieChart,
  Pie,
  Cell,
  LabelList,
} from 'recharts'
import { format, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subWeeks } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAuth } from '@/hooks/useAuth'

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

// Fonction pour extraire le code fourniture du code article
const extractFournitureCode = (articleCode: string): string => {
  const emballagePatterns = [
    /^Se\d+L/i, /^Bo\d+/i, /^Bi\d+L?/i, /^Bt\d+L?/i,
    /^Sc\d+/i, /^Bq\d+/i, /^Ca\d+x?/i, /^Fl\d+/i, /^Pt\d+/i,
  ]
  let fournitureCode = articleCode
  for (const pattern of emballagePatterns) {
    const match = articleCode.match(pattern)
    if (match) {
      fournitureCode = articleCode.substring(match[0].length)
      break
    }
  }
  return fournitureCode || articleCode
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

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

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
  })
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [recentDeliveries, setRecentDeliveries] = useState<RecentDelivery[]>([])
  const [monthlySales, setMonthlySales] = useState<MonthlySales[]>([])
  const [ordersByStatus, setOrdersByStatus] = useState<OrdersByStatus[]>([])
  const [articleSales, setArticleSales] = useState<ArticleSales[]>([])
  const [monthlyTracking, setMonthlyTracking] = useState<MonthlyTracking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [salesViewMode, setSalesViewMode] = useState<'month' | 'week'>('month')
  const supabase = useSupabase()
  const { profile } = useAuth()
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

      // Fetch monthly sales for the last 6 months
      await fetchMonthlySales()

      // Fetch article sales
      await fetchArticleSales()

      // Fetch monthly tracking (suivi annuel)
      await fetchMonthlyTracking()
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMonthlySales = async () => {
    const months: MonthlySales[] = []
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() // 0-indexed (0 = January)

    // Parcourir les 6 derniers mois Y COMPRIS le mois en cours
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i)
      const monthStart = startOfMonth(monthDate).toISOString().split('T')[0]
      const monthEnd = endOfMonth(monthDate).toISOString().split('T')[0]

      const { data } = await supabase
        .from('sales')
        .select('total_ttc')
        .gte('sale_date', monthStart)
        .lte('sale_date', monthEnd)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const total = ((data || []) as any[]).reduce((sum: number, s: any) => sum + (s.total_ttc || 0), 0)

      months.push({
        month: format(monthDate, 'MMM yyyy', { locale: fr }),
        total,
      })
    }

    setMonthlySales(months)
  }

  const fetchWeeklySales = async () => {
    const weeks: MonthlySales[] = []
    const now = new Date()

    // Parcourir les 6 dernières semaines Y COMPRIS la semaine en cours
    for (let i = 5; i >= 0; i--) {
      const weekDate = subWeeks(now, i)
      const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 }).toISOString().split('T')[0]
      const weekEnd = endOfWeek(weekDate, { weekStartsOn: 1 }).toISOString().split('T')[0]

      const { data } = await supabase
        .from('sales')
        .select('total_ttc')
        .gte('sale_date', weekStart)
        .lte('sale_date', weekEnd)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const total = ((data || []) as any[]).reduce((sum: number, s: any) => sum + (s.total_ttc || 0), 0)

      weeks.push({
        month: `Sem. ${format(weekDate, 'w', { locale: fr })}`,
        total,
      })
    }

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

  const fetchMonthlyTracking = async () => {
    const currentYear = new Date().getFullYear()
    const tracking: MonthlyTracking[] = []

    for (const { key, label } of monthNames) {
      const monthStart = `${currentYear}-${key}-01`
      // Utiliser le dernier jour correct du mois
      const lastDay = new Date(currentYear, parseInt(key), 0).getDate()
      const monthEnd = `${currentYear}-${key}-${lastDay.toString().padStart(2, '0')}`

      // Fetch sales for this month
      const { data: salesData } = await supabase
        .from('sales')
        .select('total_ht, mb')
        .gte('sale_date', monthStart)
        .lte('sale_date', monthEnd)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const valRecette = ((salesData || []) as any[]).reduce((sum, s) => sum + (s.total_ht || 0), 0)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const benefice = ((salesData || []) as any[]).reduce((sum, s) => sum + (s.mb || 0), 0)

      // Fetch articles vendus for this month
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: articlesData } = await (supabase.from('articles_vendus') as any)
        .select('article_code, quantity_sold, article:articles(weight_net)')
        .gte('sale_date', monthStart)
        .lte('sale_date', monthEnd)

      let quantiteTotale = 0
      let quantiteHarissa = 0

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(articlesData || []).forEach((a: any) => {
        const fournitureCode = extractFournitureCode(a.article_code)
        const weightNet = a.article?.weight_net || 0
        const kg = a.quantity_sold * weightNet

        quantiteTotale += kg
        if (isHarissa(fournitureCode)) quantiteHarissa += kg
      })

      // Quantité olive = total - harissa
      const quantiteOlive = quantiteTotale - quantiteHarissa

      const pourcentage = valRecette > 0 ? (benefice / valRecette) * 100 : 0

      tracking.push({
        month: key,
        monthLabel: label,
        valRecette,
        quantiteTotale,
        quantiteOlive,
        quantiteHarissa,
        benefice,
        pourcentage,
      })
    }

    setMonthlyTracking(tracking)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const salesGrowth = stats.salesLastMonth > 0
    ? ((stats.salesThisMonth - stats.salesLastMonth) / stats.salesLastMonth) * 100
    : 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-[#B8860B]" />
        <span className="ml-2 text-gray-600">Chargement du tableau de bord...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-500">Vue d&apos;ensemble de votre activité</p>
      </div>

      {/* Stats Grid - Ligne 1: Commandes, Livraisons, Ventes */}
      {!isCommercial && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Commandes</CardTitle>
              <div className="p-2 rounded-lg bg-orange-500 flex-shrink-0">
                <ShoppingCart className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold truncate">{stats.ordersThisMonth}</div>
              <p className="text-xs text-gray-500 truncate">ce mois ({stats.orders} total)</p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Livraisons</CardTitle>
              <div className="p-2 rounded-lg bg-purple-500 flex-shrink-0">
                <Truck className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold truncate">{stats.deliveriesPending}</div>
              <p className="text-xs text-gray-500 truncate">en attente ({stats.deliveries} total)</p>
            </CardContent>
          </Card>

          {!isLivreur && (
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 truncate">Ventes (mois)</CardTitle>
                <div className="p-2 rounded-lg bg-teal-500 flex-shrink-0">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold truncate">{formatPrice(stats.salesThisMonth)}</div>
                <div className="flex items-center text-xs flex-wrap">
                  {salesGrowth >= 0 ? (
                    <ArrowUpRight className="h-3 w-3 text-[#DAA520] mr-1 flex-shrink-0" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-red-500 mr-1 flex-shrink-0" />
                  )}
                  <span className={salesGrowth >= 0 ? 'text-[#DAA520]' : 'text-red-500'}>
                    {Math.abs(salesGrowth).toFixed(1)}%
                  </span>
                  <span className="text-gray-500 ml-1 truncate">vs mois dernier</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Stats Grid - Ligne 2: Caisse, MB */}
      {!isLivreur && !isCommercial && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Caisse</CardTitle>
              <div className="p-2 rounded-lg bg-yellow-500 flex-shrink-0">
                <DollarSign className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-xl font-bold truncate ${stats.cashBalance >= 0 ? 'text-[#B8860B]' : 'text-red-600'}`}>
                {formatPrice(stats.cashBalance)}
              </div>
              <p className="text-xs text-gray-500">solde actuel</p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">MB (mois)</CardTitle>
              <div className="p-2 rounded-lg bg-green-500 flex-shrink-0">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-xl font-bold truncate ${stats.mbThisMonth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPrice(stats.mbThisMonth)}
              </div>
              <div className="flex items-center text-xs flex-wrap">
                {(() => {
                  const mbGrowth = stats.mbLastMonth > 0
                    ? ((stats.mbThisMonth - stats.mbLastMonth) / stats.mbLastMonth) * 100
                    : 0
                  return (
                    <>
                      {mbGrowth >= 0 ? (
                        <ArrowUpRight className="h-3 w-3 text-green-600 mr-1 flex-shrink-0" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 text-red-500 mr-1 flex-shrink-0" />
                      )}
                      <span className={mbGrowth >= 0 ? 'text-green-600' : 'text-red-500'}>
                        {Math.abs(mbGrowth).toFixed(1)}%
                      </span>
                      <span className="text-gray-500 ml-1 truncate">vs mois dernier</span>
                    </>
                  )
                })()}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stats Grid - Ligne 3: Fournisseurs, Articles, Clients, Stock */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/fournisseurs">
          <Card className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 truncate">Fournisseurs</CardTitle>
              <div className="p-2 rounded-lg bg-indigo-500 flex-shrink-0">
                <Users className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold truncate">-</div>
              <p className="text-xs text-gray-500 truncate">fournisseurs actifs</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/articles">
          <Card className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Articles</CardTitle>
              <div className="p-2 rounded-lg bg-amber-500 flex-shrink-0">
                <Package className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold truncate">{stats.articles}</div>
              <p className="text-xs text-gray-500 truncate">produits actifs</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/clients">
          <Card className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Clients</CardTitle>
              <div className="p-2 rounded-lg bg-blue-500 flex-shrink-0">
                <Users className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold truncate">{stats.clients}</div>
              <p className="text-xs text-gray-500 truncate">clients actifs</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/stocks/articles">
          <Card className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Stock</CardTitle>
              <div className="p-2 rounded-lg bg-green-500 flex-shrink-0">
                <Warehouse className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold truncate">{stats.lowStockItems > 0 ? (
                <span className="text-orange-500">{stats.lowStockItems}</span>
              ) : (
                <span className="text-green-600">OK</span>
              )}</div>
              <p className="text-xs text-gray-500 truncate">
                {stats.lowStockItems > 0 ? 'articles en alerte' : 'stock normal'}
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Low Stock Alert */}
      {stats.lowStockItems > 0 && !isCommercial && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <span className="text-orange-700">
              <strong>{stats.lowStockItems}</strong> article(s) avec stock faible ou épuisé
            </span>
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      {!isLivreur && !isCommercial && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Sales Chart */}
            <Card>
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

            {/* Orders by Status Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Répartition des commandes</CardTitle>
              </CardHeader>
              <CardContent>
                {ordersByStatus.length > 0 ? (
                  <div className="flex items-center">
                    <ResponsiveContainer width="60%" height={250}>
                      <PieChart>
                        <Pie
                          data={ordersByStatus}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="count"
                        >
                          {ordersByStatus.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={statusColors[entry.status] || CHART_COLORS[index % CHART_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value, name) => [value, statusLabels[String(name)] || name]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="w-[40%] space-y-2">
                      {ordersByStatus.map((entry, index) => (
                        <div key={entry.status} className="flex items-center gap-2 text-sm">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: statusColors[entry.status] || CHART_COLORS[index % CHART_COLORS.length] }}
                          />
                          <span className="text-gray-600">{entry.label}</span>
                          <span className="font-medium ml-auto">{entry.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-gray-500">
                    Aucune commande
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Article Sales Chart */}
          <Card>
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
          <Card>
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
            <CardHeader className="bg-[#B8860B] text-white">
              <CardTitle className="text-center">Suivi annuel ({new Date().getFullYear()})</CardTitle>
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
                    {monthlyTracking.map((row, index) => (
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
                    ))}
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
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Recent Activity */}
      {!isLivreur && !isCommercial && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <CardTitle>Dernières commandes</CardTitle>
            </CardHeader>
            <CardContent>
              {recentOrders.length > 0 ? (
                <div className="space-y-4">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium">{order.order_number}</p>
                        <p className="text-sm text-gray-500">{order.client_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatPrice(order.total_ttc)}</p>
                        <Badge
                          variant="secondary"
                          className="text-xs"
                          style={{ backgroundColor: `${statusColors[order.status]}20`, color: statusColors[order.status] }}
                        >
                          {statusLabels[order.status] || order.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Aucune commande pour le moment
                </p>
              )}
            </CardContent>
          </Card>

          {/* Recent Deliveries */}
          <Card>
            <CardHeader>
              <CardTitle>Livraisons récentes</CardTitle>
            </CardHeader>
            <CardContent>
              {recentDeliveries.length > 0 ? (
                <div className="space-y-4">
                  {recentDeliveries.map((delivery) => (
                    <div key={delivery.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium">{delivery.delivery_number}</p>
                        <p className="text-sm text-gray-500">{delivery.client_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          {delivery.delivery_date
                            ? format(new Date(delivery.delivery_date), 'dd/MM/yyyy', { locale: fr })
                            : 'N/A'}
                        </p>
                        <Badge
                          variant="secondary"
                          className="text-xs"
                          style={{ backgroundColor: `${statusColors[delivery.status]}20`, color: statusColors[delivery.status] }}
                        >
                          {statusLabels[delivery.status] || delivery.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Aucune livraison récente
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
