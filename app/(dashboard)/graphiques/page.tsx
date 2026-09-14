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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from 'recharts'
import { format, subDays, subWeeks, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear } from 'date-fns'
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

interface CumulativeData {
  label: string
  recettes: number
  cumul: number
}

interface VentesKgData {
  fourniture_code: string
  fourniture_name: string
  total_kg: number
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
  'HAR': 'Harissa',
  'COR': 'Cornichons',
  'CIT': 'Citrons Confits',
  'CTR': 'Citrons',
  'CAP': 'Capres',
  'VIN': 'Vinaigre',
  'SAU': 'Sauce',
}

// Fonction pour extraire le code fourniture du code article
// Ex: Se9LOVE -> OVE, Bo370OTR -> OTR, Se11LOVE -> OVE, Ctr-Vrac -> CTR
// Ex: Se9LHr7 -> HAR, Se9LHr5 -> HAR, Bi5LHr -> HAR (tous les harissas regroupés)
const extractFournitureCode = (articleCode: string): string => {
  let code = articleCode

  // D'abord, retirer le suffixe "-Vrac" si présent
  if (code.toLowerCase().endsWith('-vrac')) {
    code = code.slice(0, -5) // Retirer les 5 derniers caractères "-Vrac"
    return code.toUpperCase() // Retourner le code fourniture en majuscules
  }

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

  // Regrouper toutes les variantes de harissa sous "HAR"
  // Hr, Hr5, Hr7, HAR -> HAR (harissa 5kg, 7kg, 5.5kg etc.)
  if (/^HR\d*$/i.test(fournitureCode) || fournitureCode === 'HAR') {
    return 'HAR'
  }

  return fournitureCode
}

const getFournitureName = (code: string): string => {
  return fournitureNames[code] || code
}

interface MBCumulativeData {
  label: string
  mb: number
  cumul: number
}

export default function GraphiquesPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)
  const [period, setPeriod] = useState<string>('30')
  const [chartWidth, setChartWidth] = useState(900)
  const [cumulativePeriod, setCumulativePeriod] = useState<'week' | 'month' | '6months' | 'year'>('month')
  const [cumulativeData, setCumulativeData] = useState<CumulativeData[]>([])
  const [isLoadingCumulative, setIsLoadingCumulative] = useState(false)
  const [ventesKgData, setVentesKgData] = useState<VentesKgData[]>([])
  const [isLoadingVentesKg, setIsLoadingVentesKg] = useState(false)
  const [ventesKgPeriod, setVentesKgPeriod] = useState<'week' | 'month' | '6months' | 'year'>('month')
  const [mbCumulativeData, setMbCumulativeData] = useState<MBCumulativeData[]>([])
  const [isLoadingMB, setIsLoadingMB] = useState(false)
  const [mbPeriod, setMbPeriod] = useState<'week' | 'month' | '6months' | 'year'>('month')
  const supabase = createClient()

  const containerRef = useRef<HTMLDivElement>(null)
  const chartCommandesRef = useRef<HTMLDivElement>(null)
  const chartCARef = useRef<HTMLDivElement>(null)
  const chartCumulativeRef = useRef<HTMLDivElement>(null)
  const chartVentesKgRef = useRef<HTMLDivElement>(null)
  const chartMBRef = useRef<HTMLDivElement>(null)

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

  const fetchCumulativeData = async (selectedPeriod: 'week' | 'month' | '6months' | 'year') => {
    setIsLoadingCumulative(true)
    const now = new Date()
    let startDate: Date
    let groupBy: 'day' | 'week' | 'month'
    let periods: { start: Date; end: Date; label: string }[] = []

    switch (selectedPeriod) {
      case 'week':
        startDate = startOfWeek(now, { weekStartsOn: 1 })
        // 7 jours de la semaine
        for (let i = 0; i < 7; i++) {
          const day = new Date(startDate)
          day.setDate(startDate.getDate() + i)
          periods.push({
            start: day,
            end: day,
            label: format(day, 'EEE dd', { locale: fr }),
          })
        }
        break
      case 'month':
        startDate = startOfMonth(now)
        // Semaines du mois
        let weekStart = startOfWeek(startDate, { weekStartsOn: 1 })
        const monthEnd = endOfMonth(now)
        let weekNum = 1
        while (weekStart <= monthEnd) {
          const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
          periods.push({
            start: weekStart > startDate ? weekStart : startDate,
            end: weekEnd > monthEnd ? monthEnd : weekEnd,
            label: `Sem. ${weekNum}`,
          })
          weekStart = new Date(weekEnd)
          weekStart.setDate(weekStart.getDate() + 1)
          weekNum++
        }
        break
      case '6months':
        // 6 derniers mois
        for (let i = 5; i >= 0; i--) {
          const monthDate = subMonths(now, i)
          periods.push({
            start: startOfMonth(monthDate),
            end: i === 0 ? now : endOfMonth(monthDate),
            label: format(monthDate, 'MMM', { locale: fr }),
          })
        }
        break
      case 'year':
        startDate = startOfYear(now)
        // 12 mois de l'année
        for (let i = 0; i <= now.getMonth(); i++) {
          const monthDate = new Date(now.getFullYear(), i, 1)
          periods.push({
            start: startOfMonth(monthDate),
            end: i === now.getMonth() ? now : endOfMonth(monthDate),
            label: format(monthDate, 'MMM', { locale: fr }),
          })
        }
        break
    }

    // Récupérer les ventes pour chaque période
    const results: CumulativeData[] = []
    let cumul = 0

    for (const period of periods) {
      const startStr = format(period.start, 'yyyy-MM-dd')
      const endStr = format(period.end, 'yyyy-MM-dd')

      const { data } = await supabase
        .from('sales')
        .select('total_ttc')
        .gte('sale_date', startStr)
        .lte('sale_date', endStr)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recettes = ((data || []) as any[]).reduce((sum: number, s: any) => sum + (s.total_ttc || 0), 0)
      cumul += recettes

      results.push({
        label: period.label,
        recettes,
        cumul,
      })
    }

    setCumulativeData(results)
    setIsLoadingCumulative(false)
  }

  useEffect(() => {
    fetchCumulativeData(cumulativePeriod)
  }, [cumulativePeriod])

  // Fetch data for Ventes en Kg chart
  const fetchVentesKgData = async (selectedPeriod: 'week' | 'month' | '6months' | 'year') => {
    setIsLoadingVentesKg(true)
    const now = new Date()
    let startDate: Date

    switch (selectedPeriod) {
      case 'week':
        startDate = startOfWeek(now, { weekStartsOn: 1 })
        break
      case 'month':
        startDate = startOfMonth(now)
        break
      case '6months':
        startDate = subMonths(now, 6)
        break
      case 'year':
        startDate = startOfYear(now)
        break
    }

    const startStr = format(startDate, 'yyyy-MM-dd')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await supabase
      .from('articles_vendus')
      .select(`
        quantity_sold,
        article_code,
        article:articles(code, name, weight_net)
      `)
      .gte('sale_date', startStr) as any

    if (data) {
      // Group by FOURNITURE (matiere premiere) and calculate total kg
      const fournitureMap = new Map<string, VentesKgData>()

      data.forEach((item: any) => {
        const fournitureCode = extractFournitureCode(item.article_code)
        const weightNet = item.article?.weight_net || 0
        const kg = item.quantity_sold * weightNet
        const existing = fournitureMap.get(fournitureCode)

        if (existing) {
          existing.total_kg += kg
        } else {
          fournitureMap.set(fournitureCode, {
            fourniture_code: fournitureCode,
            fourniture_name: getFournitureName(fournitureCode),
            total_kg: kg,
          })
        }
      })

      // Sort by total_kg descending (afficher tous les articles)
      const sortedData = Array.from(fournitureMap.values())
        .sort((a, b) => b.total_kg - a.total_kg)

      setVentesKgData(sortedData)
    }

    setIsLoadingVentesKg(false)
  }

  useEffect(() => {
    fetchVentesKgData(ventesKgPeriod)
  }, [ventesKgPeriod])

  // Fetch data for MB Cumulative chart
  const fetchMBCumulativeData = async (selectedPeriod: 'week' | 'month' | '6months' | 'year') => {
    setIsLoadingMB(true)
    const now = new Date()
    let periods: { start: Date; end: Date; label: string }[] = []

    switch (selectedPeriod) {
      case 'week':
        const weekStart = startOfWeek(now, { weekStartsOn: 1 })
        for (let i = 0; i < 7; i++) {
          const day = new Date(weekStart)
          day.setDate(weekStart.getDate() + i)
          periods.push({
            start: day,
            end: day,
            label: format(day, 'EEE dd', { locale: fr }),
          })
        }
        break
      case 'month':
        const monthStart = startOfMonth(now)
        let weekStartDate = startOfWeek(monthStart, { weekStartsOn: 1 })
        const monthEnd = endOfMonth(now)
        let weekNum = 1
        while (weekStartDate <= monthEnd) {
          const weekEndDate = endOfWeek(weekStartDate, { weekStartsOn: 1 })
          periods.push({
            start: weekStartDate > monthStart ? weekStartDate : monthStart,
            end: weekEndDate > monthEnd ? monthEnd : weekEndDate,
            label: `Sem. ${weekNum}`,
          })
          weekStartDate = new Date(weekEndDate)
          weekStartDate.setDate(weekStartDate.getDate() + 1)
          weekNum++
        }
        break
      case '6months':
        for (let i = 5; i >= 0; i--) {
          const monthDate = subMonths(now, i)
          periods.push({
            start: startOfMonth(monthDate),
            end: i === 0 ? now : endOfMonth(monthDate),
            label: format(monthDate, 'MMM', { locale: fr }),
          })
        }
        break
      case 'year':
        for (let i = 0; i <= now.getMonth(); i++) {
          const monthDate = new Date(now.getFullYear(), i, 1)
          periods.push({
            start: startOfMonth(monthDate),
            end: i === now.getMonth() ? now : endOfMonth(monthDate),
            label: format(monthDate, 'MMM', { locale: fr }),
          })
        }
        break
    }

    const results: MBCumulativeData[] = []
    let cumul = 0

    for (const period of periods) {
      const startStr = format(period.start, 'yyyy-MM-dd')
      const endStr = format(period.end, 'yyyy-MM-dd')

      const { data } = await supabase
        .from('sales')
        .select('mb')
        .gte('sale_date', startStr)
        .lte('sale_date', endStr)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mb = ((data || []) as any[]).reduce((sum: number, s: any) => sum + (s.mb || 0), 0)
      cumul += mb

      results.push({
        label: period.label,
        mb,
        cumul,
      })
    }

    setMbCumulativeData(results)
    setIsLoadingMB(false)
  }

  useEffect(() => {
    fetchMBCumulativeData(mbPeriod)
  }, [mbPeriod])

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

      {/* Graphique Recettes Cumulées Croissantes */}
      <Card className="border-2 border-[#B8860B]">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#B8860B]" />
              Recettes cumulées des ventes
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={cumulativePeriod} onValueChange={(val) => setCumulativePeriod(val as 'week' | 'month' | '6months' | 'year')}>
                <SelectTrigger className="w-40 border-2 border-[#B8860B]">
                  <SelectValue placeholder="Période" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Cette semaine</SelectItem>
                  <SelectItem value="month">Ce mois</SelectItem>
                  <SelectItem value="6months">6 derniers mois</SelectItem>
                  <SelectItem value="year">Cette année</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                onClick={() => downloadPNG(chartCumulativeRef, 'Recettes cumulées des ventes', 'recettes_cumulees')}
                disabled={isDownloading || isLoadingCumulative}
                className="border-[#B8860B] text-[#B8860B] hover:bg-[#B8860B] hover:text-white"
              >
                <Image className="h-4 w-4 mr-1" />
                PNG
              </Button>
              <Button
                size="sm"
                onClick={() => downloadPDF(chartCumulativeRef, 'Recettes cumulées des ventes', 'recettes_cumulees')}
                disabled={isDownloading || isLoadingCumulative}
                className="bg-[#B8860B] hover:bg-[#9A7209]"
              >
                <Download className="h-4 w-4 mr-1" />
                PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingCumulative ? (
            <div className="flex items-center justify-center h-80">
              <RefreshCw className="h-8 w-8 animate-spin text-[#B8860B]" />
            </div>
          ) : (
            <div ref={chartCumulativeRef} style={{ backgroundColor: 'white', padding: '10px' }}>
              <LineChart
                width={chartWidth}
                height={400}
                data={cumulativeData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="label"
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
                  formatter={(value: number, name: string) => [
                    formatPrice(value),
                    name === 'cumul' ? 'Cumul' : 'Recettes période'
                  ]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="cumul"
                  name="Cumul"
                  stroke="#B8860B"
                  strokeWidth={3}
                  dot={{ fill: '#B8860B', strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 7, fill: '#9A7209' }}
                />
                <Line
                  type="monotone"
                  dataKey="recettes"
                  name="Recettes période"
                  stroke="#16A34A"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#16A34A', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#15803D' }}
                />
              </LineChart>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Graphique Ventes en Kg (Diagramme en barres) */}
      <Card className="border-2 border-[#B8860B]">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#B8860B]" />
              Quantites vendues en Kg par Fourniture
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={ventesKgPeriod} onValueChange={(val) => setVentesKgPeriod(val as 'week' | 'month' | '6months' | 'year')}>
                <SelectTrigger className="w-40 border-2 border-[#B8860B]">
                  <SelectValue placeholder="Periode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Cette semaine</SelectItem>
                  <SelectItem value="month">Ce mois</SelectItem>
                  <SelectItem value="6months">6 derniers mois</SelectItem>
                  <SelectItem value="year">Cette annee</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                onClick={() => downloadPNG(chartVentesKgRef, 'Quantites vendues en Kg', 'ventes_kg')}
                disabled={isDownloading || isLoadingVentesKg}
                className="border-[#B8860B] text-[#B8860B] hover:bg-[#B8860B] hover:text-white"
              >
                <Image className="h-4 w-4 mr-1" />
                PNG
              </Button>
              <Button
                size="sm"
                onClick={() => downloadPDF(chartVentesKgRef, 'Quantites vendues en Kg', 'ventes_kg')}
                disabled={isDownloading || isLoadingVentesKg}
                className="bg-[#B8860B] hover:bg-[#9A7209]"
              >
                <Download className="h-4 w-4 mr-1" />
                PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingVentesKg ? (
            <div className="flex items-center justify-center h-80">
              <RefreshCw className="h-8 w-8 animate-spin text-[#B8860B]" />
            </div>
          ) : ventesKgData.length === 0 ? (
            <div className="flex items-center justify-center h-80 text-gray-500">
              Aucune donnee pour cette periode
            </div>
          ) : (
            <div ref={chartVentesKgRef} style={{ backgroundColor: 'white', padding: '10px' }}>
              <BarChart
                width={chartWidth}
                height={400}
                data={ventesKgData}
                margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="fourniture_code"
                  tick={{ fill: '#374151', fontSize: 12, fontWeight: 'bold' }}
                  tickLine={{ stroke: '#9CA3AF' }}
                  axisLine={{ stroke: '#9CA3AF' }}
                  interval={0}
                  height={50}
                />
                <YAxis
                  tick={{ fill: '#374151', fontSize: 11 }}
                  tickLine={{ stroke: '#9CA3AF' }}
                  axisLine={{ stroke: '#9CA3AF' }}
                  tickFormatter={(value) => `${value.toFixed(0)} kg`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFF',
                    border: '2px solid #B8860B',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${value.toFixed(2)} kg`, 'Quantite']}
                  labelFormatter={(label) => {
                    const item = ventesKgData.find(d => d.fourniture_code === label)
                    return item ? `${item.fourniture_name} (${label})` : label
                  }}
                />
                <Legend />
                <Bar
                  dataKey="total_kg"
                  name="Kg vendus"
                  fill="#B8860B"
                  radius={[4, 4, 0, 0]}
                >
                  <LabelList
                    dataKey="total_kg"
                    position="top"
                    formatter={(value: number) => value > 0 ? `${Math.round(value)} kg` : ''}
                    style={{ fontSize: 10, fill: '#B8860B', fontWeight: 'bold' }}
                  />
                </Bar>
              </BarChart>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Graphique Marge Brute Cumulee */}
      <Card className="border-2 border-[#B8860B]">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#B8860B]" />
              Marge Brute cumulee (MB)
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={mbPeriod} onValueChange={(val) => setMbPeriod(val as 'week' | 'month' | '6months' | 'year')}>
                <SelectTrigger className="w-40 border-2 border-[#B8860B]">
                  <SelectValue placeholder="Periode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Cette semaine</SelectItem>
                  <SelectItem value="month">Ce mois</SelectItem>
                  <SelectItem value="6months">6 derniers mois</SelectItem>
                  <SelectItem value="year">Cette annee</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                onClick={() => downloadPNG(chartMBRef, 'Marge Brute cumulee', 'mb_cumulee')}
                disabled={isDownloading || isLoadingMB}
                className="border-[#B8860B] text-[#B8860B] hover:bg-[#B8860B] hover:text-white"
              >
                <Image className="h-4 w-4 mr-1" />
                PNG
              </Button>
              <Button
                size="sm"
                onClick={() => downloadPDF(chartMBRef, 'Marge Brute cumulee', 'mb_cumulee')}
                disabled={isDownloading || isLoadingMB}
                className="bg-[#B8860B] hover:bg-[#9A7209]"
              >
                <Download className="h-4 w-4 mr-1" />
                PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingMB ? (
            <div className="flex items-center justify-center h-80">
              <RefreshCw className="h-8 w-8 animate-spin text-[#B8860B]" />
            </div>
          ) : mbCumulativeData.length === 0 ? (
            <div className="flex items-center justify-center h-80 text-gray-500">
              Aucune donnee pour cette periode
            </div>
          ) : (
            <div ref={chartMBRef} style={{ backgroundColor: 'white', padding: '10px' }}>
              <LineChart
                width={chartWidth}
                height={400}
                data={mbCumulativeData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="label"
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
                  formatter={(value: number, name: string) => [
                    formatPrice(value),
                    name === 'cumul' ? 'Cumul MB' : 'MB periode'
                  ]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="cumul"
                  name="Cumul MB"
                  stroke="#16A34A"
                  strokeWidth={3}
                  dot={{ fill: '#16A34A', strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 7, fill: '#15803D' }}
                />
                <Line
                  type="monotone"
                  dataKey="mb"
                  name="MB periode"
                  stroke="#B8860B"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#B8860B', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#9A7209' }}
                />
              </LineChart>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
