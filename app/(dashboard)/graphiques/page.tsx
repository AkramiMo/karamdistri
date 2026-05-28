'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
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
import { BarChart3, TrendingUp, RefreshCw, Download, Image } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { format, subDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import jsPDF from 'jspdf'
import { toPng } from 'html-to-image'

interface Order {
  id: string
  order_date: string
  total_ht: number
  status: string
}

interface ChartData {
  date: string
  dateLabel: string
  commandes: number
  totalHT: number
}

export default function GraphiquesPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)
  const [period, setPeriod] = useState<string>('30')
  const [chartWidth, setChartWidth] = useState(900)
  const supabase = createClient()

  const containerRef = useRef<HTMLDivElement>(null)
  const chartCommandesRef = useRef<HTMLDivElement>(null)
  const chartCARef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth - 60
        setChartWidth(Math.max(width, 600))
      }
    }
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  const fetchOrders = async () => {
    setIsLoading(true)
    const daysAgo = parseInt(period)
    const startDate = subDays(new Date(), daysAgo)

    const { data, error } = await supabase
      .from('orders')
      .select('id, order_date, total_ht, status')
      .gte('order_date', format(startDate, 'yyyy-MM-dd'))
      .order('order_date', { ascending: true })

    if (error) {
      console.error('Error fetching orders:', error)
    } else {
      setOrders(data || [])
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchOrders()
  }, [period])

  const chartData = useMemo(() => {
    const daysAgo = parseInt(period)
    const dataMap = new Map<string, { commandes: number; totalHT: number }>()

    for (let i = daysAgo; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd')
      dataMap.set(date, { commandes: 0, totalHT: 0 })
    }

    orders.forEach((order) => {
      const date = order.order_date
      if (dataMap.has(date)) {
        const current = dataMap.get(date)!
        dataMap.set(date, {
          commandes: current.commandes + 1,
          totalHT: current.totalHT + (order.total_ht || 0),
        })
      }
    })

    const result: ChartData[] = []
    dataMap.forEach((value, key) => {
      result.push({
        date: key,
        dateLabel: format(new Date(key), 'dd/MM', { locale: fr }),
        commandes: value.commandes,
        totalHT: value.totalHT,
      })
    })

    return result
  }, [orders, period])

  const totalCommandes = orders.length
  const totalCA = orders.reduce((sum, o) => sum + (o.total_ht || 0), 0)
  const avgPerDay = totalCommandes / (parseInt(period) + 1)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
    }).format(price || 0)
  }

  // Télécharger en PNG avec titre
  const downloadPNG = async (chartRef: React.RefObject<HTMLDivElement>, title: string, filename: string) => {
    if (!chartRef.current) return

    setIsDownloading(true)
    try {
      const chartDataUrl = await toPng(chartRef.current, {
        backgroundColor: '#ffffff',
        quality: 1,
        pixelRatio: 2,
      })

      // Charger l'image du graphique
      const chartImg = new window.Image()
      chartImg.src = chartDataUrl

      await new Promise<void>((resolve) => {
        chartImg.onload = () => {
          // Créer un canvas avec espace pour le titre
          const headerHeight = 80
          const canvas = document.createElement('canvas')
          canvas.width = chartImg.width
          canvas.height = chartImg.height + headerHeight

          const ctx = canvas.getContext('2d')
          if (!ctx) return

          // Fond blanc
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, canvas.width, canvas.height)

          // En-tête doré
          ctx.fillStyle = '#B8860B'
          ctx.fillRect(0, 0, canvas.width, 50)

          // Titre
          ctx.fillStyle = '#ffffff'
          ctx.font = 'bold 28px Arial'
          ctx.textAlign = 'center'
          ctx.fillText(title, canvas.width / 2, 35)

          // Sous-titre avec période et date
          ctx.fillStyle = '#666666'
          ctx.font = '18px Arial'
          ctx.fillText(
            `Période: ${period} derniers jours | Généré le: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
            canvas.width / 2,
            70
          )

          // Dessiner le graphique
          ctx.drawImage(chartImg, 0, headerHeight)

          // Télécharger
          const link = document.createElement('a')
          link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.png`
          link.href = canvas.toDataURL('image/png')
          link.click()

          resolve()
        }
      })
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors du téléchargement')
    }
    setIsDownloading(false)
  }

  // Télécharger en PDF avec la courbe
  const downloadPDF = async (chartRef: React.RefObject<HTMLDivElement>, title: string, filename: string) => {
    if (!chartRef.current) return

    setIsDownloading(true)
    try {
      const dataUrl = await toPng(chartRef.current, {
        backgroundColor: '#ffffff',
        quality: 1,
        pixelRatio: 2,
      })

      const pdf = new jsPDF('landscape', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()

      // En-tête
      pdf.setFillColor(184, 134, 11)
      pdf.rect(0, 0, pageWidth, 20, 'F')

      pdf.setFontSize(16)
      pdf.setTextColor(255, 255, 255)
      pdf.text(title, pageWidth / 2, 13, { align: 'center' })

      // Infos
      pdf.setFontSize(10)
      pdf.setTextColor(100, 100, 100)
      pdf.text(
        `Période: ${period} derniers jours | Généré le: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
        pageWidth / 2,
        28,
        { align: 'center' }
      )

      // Statistiques
      pdf.setFontSize(11)
      pdf.setTextColor(0, 0, 0)
      pdf.text(`Total: ${totalCommandes} commandes | CA: ${formatPrice(totalCA)} | Moyenne: ${avgPerDay.toFixed(1)}/jour`, pageWidth / 2, 36, { align: 'center' })

      // Image du graphique
      const img = new window.Image()
      img.src = dataUrl

      await new Promise<void>((resolve) => {
        img.onload = () => {
          const imgWidth = pageWidth - 20
          const imgHeight = (img.height / img.width) * imgWidth
          const yPosition = 42

          pdf.addImage(dataUrl, 'PNG', 10, yPosition, imgWidth, Math.min(imgHeight, pageHeight - yPosition - 10))
          resolve()
        }
      })

      pdf.save(`${filename}_${format(new Date(), 'yyyy-MM-dd')}.pdf`)
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors du téléchargement du PDF')
    }
    setIsDownloading(false)
  }

  return (
    <div className="space-y-6" ref={containerRef}>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Graphiques</h1>
          <p className="text-gray-500">Visualisez les statistiques de vos commandes</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-44 border-2 border-[#B8860B]">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 derniers jours</SelectItem>
              <SelectItem value="14">14 derniers jours</SelectItem>
              <SelectItem value="30">30 derniers jours</SelectItem>
              <SelectItem value="60">60 derniers jours</SelectItem>
              <SelectItem value="90">90 derniers jours</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={fetchOrders}
            className="border-2 border-[#B8860B]"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-2 border-[#B8860B]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-gray-600">Total Commandes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-[#B8860B]" />
              <span className="text-2xl font-bold">{totalCommandes}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-[#B8860B]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-gray-600">CA Total (HT)</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-xl font-bold text-[#B8860B]">{formatPrice(totalCA)}</span>
          </CardContent>
        </Card>
        <Card className="border-2 border-[#B8860B]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-gray-600">Moyenne / Jour</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-green-600" />
              <span className="text-2xl font-bold">{avgPerDay.toFixed(1)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphique Commandes par Jour */}
      <Card className="border-2 border-[#B8860B]">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#B8860B]" />
              Nombre de commandes par jour
            </CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => downloadPNG(chartCommandesRef, 'Nombre de commandes par jour', 'commandes')}
                disabled={isDownloading || isLoading}
                className="border-[#B8860B] text-[#B8860B] hover:bg-[#B8860B] hover:text-white"
              >
                <Image className="h-4 w-4 mr-1" />
                PNG
              </Button>
              <Button
                size="sm"
                onClick={() => downloadPDF(chartCommandesRef, 'Nombre de commandes par jour', 'commandes')}
                disabled={isDownloading || isLoading}
                className="bg-[#B8860B] hover:bg-[#9A7209]"
              >
                <Download className="h-4 w-4 mr-1" />
                PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-80">
              <RefreshCw className="h-8 w-8 animate-spin text-[#B8860B]" />
            </div>
          ) : (
            <div ref={chartCommandesRef} style={{ backgroundColor: 'white', padding: '10px' }}>
              <LineChart
                width={chartWidth}
                height={400}
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fill: '#374151', fontSize: 11 }}
                  tickLine={{ stroke: '#9CA3AF' }}
                  axisLine={{ stroke: '#9CA3AF' }}
                />
                <YAxis
                  tick={{ fill: '#374151', fontSize: 11 }}
                  tickLine={{ stroke: '#9CA3AF' }}
                  axisLine={{ stroke: '#9CA3AF' }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFF',
                    border: '2px solid #B8860B',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [value, 'Commandes']}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="commandes"
                  name="Commandes"
                  stroke="#B8860B"
                  strokeWidth={3}
                  dot={{ fill: '#B8860B', strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 7, fill: '#9A7209' }}
                />
              </LineChart>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Graphique CA par Jour */}
      <Card className="border-2 border-[#B8860B]">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#B8860B]" />
              Chiffre d'affaires par jour (HT)
            </CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => downloadPNG(chartCARef, "Chiffre d'affaires par jour (HT)", 'chiffre_affaires')}
                disabled={isDownloading || isLoading}
                className="border-[#B8860B] text-[#B8860B] hover:bg-[#B8860B] hover:text-white"
              >
                <Image className="h-4 w-4 mr-1" />
                PNG
              </Button>
              <Button
                size="sm"
                onClick={() => downloadPDF(chartCARef, "Chiffre d'affaires par jour (HT)", 'chiffre_affaires')}
                disabled={isDownloading || isLoading}
                className="bg-[#B8860B] hover:bg-[#9A7209]"
              >
                <Download className="h-4 w-4 mr-1" />
                PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-80">
              <RefreshCw className="h-8 w-8 animate-spin text-[#B8860B]" />
            </div>
          ) : (
            <div ref={chartCARef} style={{ backgroundColor: 'white', padding: '10px' }}>
              <LineChart
                width={chartWidth}
                height={400}
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fill: '#374151', fontSize: 11 }}
                  tickLine={{ stroke: '#9CA3AF' }}
                  axisLine={{ stroke: '#9CA3AF' }}
                />
                <YAxis
                  tick={{ fill: '#374151', fontSize: 11 }}
                  tickLine={{ stroke: '#9CA3AF' }}
                  axisLine={{ stroke: '#9CA3AF' }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFF',
                    border: '2px solid #B8860B',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [formatPrice(value), 'CA HT']}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="totalHT"
                  name="CA HT"
                  stroke="#16A34A"
                  strokeWidth={3}
                  dot={{ fill: '#16A34A', strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 7, fill: '#15803D' }}
                />
              </LineChart>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
