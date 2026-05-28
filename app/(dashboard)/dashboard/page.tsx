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
} from 'recharts'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
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
    cashBalance: 0,
    lowStockItems: 0,
  })
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [recentDeliveries, setRecentDeliveries] = useState<RecentDelivery[]>([])
  const [monthlySales, setMonthlySales] = useState<MonthlySales[]>([])
  const [ordersByStatus, setOrdersByStatus] = useState<OrdersByStatus[]>([])
  const [articleSales, setArticleSales] = useState<ArticleSales[]>([])
  const [isLoading, setIsLoading] = useState(true)
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
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMonthlySales = async () => {
    const months: MonthlySales[] = []
    const now = new Date()
    const currentYear = 2026
    const currentMonth = now.getMonth() // 0-indexed (0 = January)

    // Parcourir seulement les mois terminés de l'année 2026
    for (let monthIndex = 0; monthIndex < currentMonth; monthIndex++) {
      const monthDate = new Date(currentYear, monthIndex, 1)
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
        month: format(monthDate, 'MMM', { locale: fr }),
        total,
      })
    }

    setMonthlySales(months)
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Clients</CardTitle>
            <div className="p-2 rounded-lg bg-blue-500">
              <Users className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.clients}</div>
            <p className="text-xs text-gray-500">clients actifs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Articles</CardTitle>
            <div className="p-2 rounded-lg bg-amber-500">
              <Package className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.articles}</div>
            <p className="text-xs text-gray-500">produits actifs</p>
          </CardContent>
        </Card>

        <Link href="/stocks/articles">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Stock</CardTitle>
              <div className="p-2 rounded-lg bg-green-500">
                <Warehouse className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.lowStockItems > 0 ? (
                <span className="text-orange-500">{stats.lowStockItems}</span>
              ) : (
                <span className="text-green-600">OK</span>
              )}</div>
              <p className="text-xs text-gray-500">
                {stats.lowStockItems > 0 ? 'articles en alerte' : 'stock normal'}
              </p>
            </CardContent>
          </Card>
        </Link>

        {!isCommercial && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Commandes</CardTitle>
                <div className="p-2 rounded-lg bg-orange-500">
                  <ShoppingCart className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.ordersThisMonth}</div>
                <p className="text-xs text-gray-500">ce mois ({stats.orders} total)</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Livraisons</CardTitle>
                <div className="p-2 rounded-lg bg-purple-500">
                  <Truck className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.deliveriesPending}</div>
                <p className="text-xs text-gray-500">en attente ({stats.deliveries} total)</p>
              </CardContent>
            </Card>
          </>
        )}

        {!isLivreur && !isCommercial && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Ventes (mois)</CardTitle>
                <div className="p-2 rounded-lg bg-teal-500">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPrice(stats.salesThisMonth)}</div>
                <div className="flex items-center text-xs">
                  {salesGrowth >= 0 ? (
                    <ArrowUpRight className="h-3 w-3 text-[#DAA520] mr-1" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                  )}
                  <span className={salesGrowth >= 0 ? 'text-[#DAA520]' : 'text-red-500'}>
                    {Math.abs(salesGrowth).toFixed(1)}%
                  </span>
                  <span className="text-gray-500 ml-1">vs mois dernier</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Caisse</CardTitle>
                <div className="p-2 rounded-lg bg-yellow-500">
                  <DollarSign className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stats.cashBalance >= 0 ? 'text-[#B8860B]' : 'text-red-600'}`}>
                  {formatPrice(stats.cashBalance)}
                </div>
                <p className="text-xs text-gray-500">solde actuel</p>
              </CardContent>
            </Card>
          </>
        )}
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
              <CardHeader>
                <CardTitle>Évolution des ventes (6 derniers mois)</CardTitle>
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
                  <BarChart data={articleSales} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="article" width={80} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value) => [`${value} unités`, 'Quantité']}
                      labelStyle={{ color: '#374151' }}
                    />
                    <Bar dataKey="quantity" fill="#B8860B" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-gray-500">
                  Aucune donnée de ventes par article
                </div>
              )}
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
