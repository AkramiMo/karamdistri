'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ProtectedModule } from '@/components/auth/ProtectedModule'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  FileText,
  Download,
  Users,
  Package,
  Truck,
  Calendar,
  TrendingUp,
  Check,
  ChevronsUpDown,
  Eye,
  FileSpreadsheet,
  Image,
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts'
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns'
import { fr } from 'date-fns/locale'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { toPng } from 'html-to-image'
import { cn } from '@/lib/utils'
import { useCompanySettings } from '@/hooks/useCompanySettings'

interface Client {
  id: string
  code: string
  name: string
}

interface Article {
  id: string
  code: string
  name: string
}

interface DeliveryItem {
  id: string
  article_id: string
  quantity_ordered: number
  quantity_delivered: number
  quantity_returned: number
  unit_price: number
  article?: {
    code: string
    name: string
    description: string | null
  }
}

interface Delivery {
  id: string
  delivery_number: string
  client_id: string
  status: string
  delivery_date: string | null
  total_ht: number | null
  total_ttc: number | null
  amount_paid: number | null
  balance_due: number | null
  payment_status: string | null
  notes: string | null
  client?: {
    code: string
    name: string
  }
  delivery_items?: DeliveryItem[]
}

interface ArticleDeliveryData {
  delivery_number: string
  delivery_date: string
  client_code: string
  client_name: string
  quantity_delivered: number
  quantity_returned: number
  quantity_net: number
  unit_price: number
  total_ht: number
}

interface ChartData {
  date: string
  label: string
  montant: number
  count: number
}

interface ArticleChartData {
  date: string
  label: string
  quantite: number
}

type TabType = 'client' | 'article'

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  partial: 'bg-orange-100 text-orange-800',
  returned: 'bg-pink-100 text-pink-800',
  cancelled: 'bg-red-100 text-red-800',
}

const statusLabels: Record<string, string> = {
  pending: 'En attente',
  in_progress: 'En cours',
  delivered: 'Livree',
  partial: 'Partielle',
  returned: 'Retournee',
  cancelled: 'Annulee',
}

const paymentStatusColors: Record<string, string> = {
  pending: 'bg-red-100 text-red-800',
  partial: 'bg-orange-100 text-orange-800',
  paid: 'bg-amber-100 text-[#9A7209]',
}

const paymentStatusLabels: Record<string, string> = {
  pending: 'Non paye',
  partial: 'Partiel',
  paid: 'Paye',
}

export default function HistoriqueVALPage() {
  const [activeTab, setActiveTab] = useState<TabType>('client')
  const [clients, setClients] = useState<Client[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()
  const { companySettings } = useCompanySettings()
  const chartRef = useRef<HTMLDivElement>(null)

  // Client tab state
  const [selectedClientId, setSelectedClientId] = useState('')
  const [clientOpen, setClientOpen] = useState(false)
  const [clientDateFrom, setClientDateFrom] = useState(() => {
    const d = startOfMonth(new Date())
    return format(d, 'yyyy-MM-dd')
  })
  const [clientDateTo, setClientDateTo] = useState(() => {
    const d = endOfMonth(new Date())
    return format(d, 'yyyy-MM-dd')
  })
  const [clientDeliveries, setClientDeliveries] = useState<Delivery[]>([])
  const [viewingDelivery, setViewingDelivery] = useState<Delivery | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)

  // Article tab state
  const [selectedArticleId, setSelectedArticleId] = useState('')
  const [articleOpen, setArticleOpen] = useState(false)
  const [articleDateFrom, setArticleDateFrom] = useState(() => {
    const d = startOfMonth(new Date())
    return format(d, 'yyyy-MM-dd')
  })
  const [articleDateTo, setArticleDateTo] = useState(() => {
    const d = endOfMonth(new Date())
    return format(d, 'yyyy-MM-dd')
  })
  const [articleDeliveries, setArticleDeliveries] = useState<ArticleDeliveryData[]>([])

  // Fetch clients and articles
  useEffect(() => {
    const fetchData = async () => {
      const [clientsResult, articlesResult] = await Promise.all([
        supabase
          .from('clients')
          .select('id, code, name')
          .eq('is_active', true)
          .order('code'),
        supabase
          .from('articles')
          .select('id, code, name')
          .eq('is_active', true)
          .order('code'),
      ])

      setClients(clientsResult.data || [])
      setArticles(articlesResult.data || [])
    }

    fetchData()
  }, [supabase])

  // Fetch client deliveries
  const fetchClientDeliveries = async () => {
    if (!selectedClientId) return

    setIsLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('deliveries') as any)
      .select(`
        id, delivery_number, client_id, status, delivery_date, total_ht, total_ttc,
        amount_paid, balance_due, payment_status, notes,
        client:clients(code, name),
        delivery_items(id, article_id, quantity_ordered, quantity_delivered, quantity_returned, unit_price, article:articles(code, name, description))
      `)
      .eq('client_id', selectedClientId)
      .gte('delivery_date', clientDateFrom)
      .lte('delivery_date', clientDateTo)
      .order('delivery_date', { ascending: false })

    if (error) {
      console.error('Error fetching deliveries:', error)
    } else {
      setClientDeliveries(data || [])
    }
    setIsLoading(false)
  }

  // Fetch article deliveries
  const fetchArticleDeliveries = async () => {
    if (!selectedArticleId) return

    setIsLoading(true)
    // D'abord récupérer les livraisons dans la période
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: deliveriesData, error: deliveriesError } = await (supabase.from('deliveries') as any)
      .select(`
        id, delivery_number, delivery_date,
        client:clients(code, name),
        delivery_items!inner(id, article_id, quantity_ordered, quantity_delivered, quantity_returned, unit_price)
      `)
      .eq('delivery_items.article_id', selectedArticleId)
      .gte('delivery_date', articleDateFrom)
      .lte('delivery_date', articleDateTo)
      .order('delivery_date', { ascending: false })

    if (deliveriesError) {
      console.error('Error fetching article deliveries:', deliveriesError)
    } else {
      const formattedData: ArticleDeliveryData[] = []

      ;(deliveriesData || []).forEach((delivery: any) => {
        const items = delivery.delivery_items?.filter((item: any) => item.article_id === selectedArticleId) || []
        items.forEach((item: any) => {
          formattedData.push({
            delivery_number: delivery.delivery_number,
            delivery_date: delivery.delivery_date,
            client_code: delivery.client?.code || '',
            client_name: delivery.client?.name || '',
            quantity_delivered: item.quantity_delivered || 0,
            quantity_returned: item.quantity_returned || 0,
            quantity_net: (item.quantity_delivered || 0) - (item.quantity_returned || 0),
            unit_price: item.unit_price || 0,
            total_ht: ((item.quantity_delivered || 0) - (item.quantity_returned || 0)) * (item.unit_price || 0),
          })
        })
      })

      setArticleDeliveries(formattedData)
    }
    setIsLoading(false)
  }

  // Calculate client statistics
  const clientStats = useMemo(() => {
    const totalBL = clientDeliveries.length
    const totalHT = clientDeliveries.reduce((sum, d) => {
      const recette = d.delivery_items?.reduce(
        (s, item) => s + (item.quantity_delivered - item.quantity_returned) * item.unit_price,
        0
      ) || 0
      return sum + recette
    }, 0)
    const totalPaid = clientDeliveries.reduce((sum, d) => sum + (d.amount_paid || 0), 0)
    const totalReste = totalHT - totalPaid

    return { totalBL, totalHT, totalPaid, totalReste }
  }, [clientDeliveries])

  // Calculate article statistics
  const articleStats = useMemo(() => {
    const totalDelivered = articleDeliveries.reduce((sum, d) => sum + d.quantity_delivered, 0)
    const totalReturned = articleDeliveries.reduce((sum, d) => sum + d.quantity_returned, 0)
    const totalNet = totalDelivered - totalReturned
    const totalHT = articleDeliveries.reduce((sum, d) => sum + d.total_ht, 0)

    return { totalDelivered, totalReturned, totalNet, totalHT }
  }, [articleDeliveries])

  // Prepare chart data for client
  const clientChartData = useMemo(() => {
    const dataMap = new Map<string, { montant: number; count: number }>()

    clientDeliveries.forEach((d) => {
      if (!d.delivery_date) return
      const date = d.delivery_date
      const recette = d.delivery_items?.reduce(
        (s, item) => s + (item.quantity_delivered - item.quantity_returned) * item.unit_price,
        0
      ) || 0

      if (dataMap.has(date)) {
        const existing = dataMap.get(date)!
        dataMap.set(date, {
          montant: existing.montant + recette,
          count: existing.count + 1,
        })
      } else {
        dataMap.set(date, { montant: recette, count: 1 })
      }
    })

    return Array.from(dataMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        label: format(parseISO(date), 'dd/MM', { locale: fr }),
        montant: data.montant,
        count: data.count,
      }))
  }, [clientDeliveries])

  // Prepare chart data for article
  const articleChartData = useMemo(() => {
    const dataMap = new Map<string, number>()

    articleDeliveries.forEach((d) => {
      if (!d.delivery_date) return
      const date = d.delivery_date

      if (dataMap.has(date)) {
        dataMap.set(date, dataMap.get(date)! + d.quantity_net)
      } else {
        dataMap.set(date, d.quantity_net)
      }
    })

    return Array.from(dataMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, quantite]) => ({
        date,
        label: format(parseISO(date), 'dd/MM', { locale: fr }),
        quantite,
      }))
  }, [articleDeliveries])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
    }).format(price)
  }

  // Export functions
  const exportClientPDF = async () => {
    const client = clients.find((c) => c.id === selectedClientId)
    if (!client) return

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()

    // Logo à gauche
    try {
      const img = new window.Image()
      img.crossOrigin = 'anonymous'
      await new Promise<void>((resolve) => {
        img.onload = () => {
          try {
            doc.addImage(img, 'PNG', 5, 5, 40, 25)
          } catch (e) {
            console.error('Error adding logo:', e)
          }
          resolve()
        }
        img.onerror = () => resolve()
        img.src = '/Logo.png'
      })
    } catch (e) {
      console.error('Error loading logo:', e)
    }

    // ICE, IF, TP en dessous du logo
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 80)
    let companyY = 33
    if (companySettings?.ice) {
      doc.text(`ICE: ${companySettings.ice}`, 15, companyY)
      companyY += 4
    }
    if (companySettings?.if_number) {
      doc.text(`IF: ${companySettings.if_number}`, 15, companyY)
      companyY += 4
    }
    if (companySettings?.patente) {
      doc.text(`TP: ${companySettings.patente}`, 15, companyY)
    }

    // Titre centré
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('Historique des Livraisons', pageWidth / 2, 20, { align: 'center' })

    // Informations client
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Client: ${client.code} - ${client.name}`, 14, 50)
    doc.text(`Periode: ${format(parseISO(clientDateFrom), 'dd/MM/yyyy')} - ${format(parseISO(clientDateTo), 'dd/MM/yyyy')}`, 14, 56)

    // Table
    const tableData = clientDeliveries.map((d) => {
      const recette = d.delivery_items?.reduce(
        (s, item) => s + (item.quantity_delivered - item.quantity_returned) * item.unit_price,
        0
      ) || 0
      return [
        d.delivery_number,
        d.delivery_date ? format(parseISO(d.delivery_date), 'dd/MM/yyyy') : '-',
        formatPrice(recette),
        statusLabels[d.status] || d.status,
        paymentStatusLabels[d.payment_status || 'pending'] || d.payment_status,
      ]
    })

    autoTable(doc, {
      startY: 62,
      head: [['N BL', 'Date', 'Montant HT', 'Statut', 'Paiement']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [184, 134, 11] },
    })

    // Summary à droite
    const finalY = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text(`Total BL: ${clientStats.totalBL}`, pageWidth - 14, finalY, { align: 'right' })
    doc.text(`Total HT: ${formatPrice(clientStats.totalHT)}`, pageWidth - 14, finalY + 6, { align: 'right' })
    doc.text(`Total Paye: ${formatPrice(clientStats.totalPaid)}`, pageWidth - 14, finalY + 12, { align: 'right' })
    doc.text(`Reste: ${formatPrice(clientStats.totalReste)}`, pageWidth - 14, finalY + 18, { align: 'right' })

    doc.save(`historique_${client.code}_${clientDateFrom}_${clientDateTo}.pdf`)
  }

  const exportClientExcel = () => {
    const client = clients.find((c) => c.id === selectedClientId)
    if (!client) return

    // Create CSV content
    let csv = 'N BL;Date;Montant HT;Statut;Paiement\n'

    clientDeliveries.forEach((d) => {
      const recette = d.delivery_items?.reduce(
        (s, item) => s + (item.quantity_delivered - item.quantity_returned) * item.unit_price,
        0
      ) || 0
      csv += `${d.delivery_number};${d.delivery_date ? format(parseISO(d.delivery_date), 'dd/MM/yyyy') : '-'};${recette.toFixed(2)};${statusLabels[d.status] || d.status};${paymentStatusLabels[d.payment_status || 'pending'] || d.payment_status}\n`
    })

    csv += `\nTotal BL;${clientStats.totalBL}\n`
    csv += `Total HT;${clientStats.totalHT.toFixed(2)}\n`
    csv += `Total Paye;${clientStats.totalPaid.toFixed(2)}\n`
    csv += `Reste;${clientStats.totalReste.toFixed(2)}\n`

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `historique_${client.code}_${clientDateFrom}_${clientDateTo}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const exportArticlePDF = async () => {
    const article = articles.find((a) => a.id === selectedArticleId)
    if (!article) return

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()

    // Logo à gauche
    try {
      const img = new window.Image()
      img.crossOrigin = 'anonymous'
      await new Promise<void>((resolve) => {
        img.onload = () => {
          try {
            doc.addImage(img, 'PNG', 5, 5, 40, 25)
          } catch (e) {
            console.error('Error adding logo:', e)
          }
          resolve()
        }
        img.onerror = () => resolve()
        img.src = '/Logo.png'
      })
    } catch (e) {
      console.error('Error loading logo:', e)
    }

    // ICE, IF, TP en dessous du logo
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 80)
    let companyY = 33
    if (companySettings?.ice) {
      doc.text(`ICE: ${companySettings.ice}`, 15, companyY)
      companyY += 4
    }
    if (companySettings?.if_number) {
      doc.text(`IF: ${companySettings.if_number}`, 15, companyY)
      companyY += 4
    }
    if (companySettings?.patente) {
      doc.text(`TP: ${companySettings.patente}`, 15, companyY)
    }

    // Titre centré
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('Historique Article', pageWidth / 2, 20, { align: 'center' })

    // Informations article
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Article: ${article.code} - ${article.name}`, 14, 50)
    doc.text(`Periode: ${format(parseISO(articleDateFrom), 'dd/MM/yyyy')} - ${format(parseISO(articleDateTo), 'dd/MM/yyyy')}`, 14, 56)

    // Table
    const tableData = articleDeliveries.map((d) => [
      d.delivery_number,
      d.delivery_date ? format(parseISO(d.delivery_date), 'dd/MM/yyyy') : '-',
      `${d.client_code} - ${d.client_name}`,
      d.quantity_delivered.toString(),
      d.quantity_returned.toString(),
      d.quantity_net.toString(),
    ])

    autoTable(doc, {
      startY: 62,
      head: [['N BL', 'Date', 'Client', 'Qte Livree', 'Qte Retour', 'Qte Nette']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [184, 134, 11] },
    })

    // Summary à droite
    const finalY = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text(`Total Livre: ${articleStats.totalDelivered}`, pageWidth - 14, finalY, { align: 'right' })
    doc.text(`Total Retours: ${articleStats.totalReturned}`, pageWidth - 14, finalY + 6, { align: 'right' })
    doc.text(`Quantite Nette: ${articleStats.totalNet}`, pageWidth - 14, finalY + 12, { align: 'right' })
    doc.text(`Total HT: ${formatPrice(articleStats.totalHT)}`, pageWidth - 14, finalY + 18, { align: 'right' })

    doc.save(`historique_article_${article.code}_${articleDateFrom}_${articleDateTo}.pdf`)
  }

  const exportArticleExcel = () => {
    const article = articles.find((a) => a.id === selectedArticleId)
    if (!article) return

    // Create CSV content
    let csv = 'N BL;Date;Client;Qte Livree;Qte Retour;Qte Nette;Prix Unit;Total HT\n'

    articleDeliveries.forEach((d) => {
      csv += `${d.delivery_number};${d.delivery_date ? format(parseISO(d.delivery_date), 'dd/MM/yyyy') : '-'};${d.client_code} - ${d.client_name};${d.quantity_delivered};${d.quantity_returned};${d.quantity_net};${d.unit_price.toFixed(2)};${d.total_ht.toFixed(2)}\n`
    })

    csv += `\nTotal Livre;${articleStats.totalDelivered}\n`
    csv += `Total Retours;${articleStats.totalReturned}\n`
    csv += `Quantite Nette;${articleStats.totalNet}\n`
    csv += `Total HT;${articleStats.totalHT.toFixed(2)}\n`

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `historique_article_${article.code}_${articleDateFrom}_${articleDateTo}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const exportChartAsImage = async () => {
    if (!chartRef.current) return

    try {
      const dataUrl = await toPng(chartRef.current, { backgroundColor: '#ffffff' })
      const link = document.createElement('a')
      link.download = `graphique_${activeTab}_${new Date().toISOString().split('T')[0]}.png`
      link.href = dataUrl
      link.click()
    } catch (error) {
      console.error('Error exporting chart:', error)
    }
  }

  const handleViewDelivery = (delivery: Delivery) => {
    setViewingDelivery(delivery)
    setIsViewDialogOpen(true)
  }

  return (
    <ProtectedModule module="historique-val">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Historique VAL</h1>
          <p className="text-gray-500">Ventes - Articles - Livraisons</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 pb-2">
          <Button
            variant={activeTab === 'client' ? 'default' : 'outline'}
            onClick={() => setActiveTab('client')}
            className={activeTab === 'client' ? 'bg-[#B8860B] hover:bg-[#9A7209]' : ''}
          >
            <Users className="h-4 w-4 mr-2" />
            Par Client
          </Button>
          <Button
            variant={activeTab === 'article' ? 'default' : 'outline'}
            onClick={() => setActiveTab('article')}
            className={activeTab === 'article' ? 'bg-[#B8860B] hover:bg-[#9A7209]' : ''}
          >
            <Package className="h-4 w-4 mr-2" />
            Par Article
          </Button>
        </div>

        {/* Client Tab */}
        {activeTab === 'client' && (
          <div className="space-y-6">
            {/* Filters */}
            <Card className="border-2 border-[#B8860B]">
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="flex-1 min-w-[250px]">
                    <Label>Client</Label>
                    <Popover open={clientOpen} onOpenChange={setClientOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={clientOpen}
                          className="w-full justify-between bg-[#F5E6C8]"
                        >
                          {selectedClientId
                            ? clients.find((c) => c.id === selectedClientId)?.name || 'Client selectionne'
                            : 'Rechercher un client...'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Rechercher par nom ou code..." />
                          <CommandList>
                            <CommandEmpty>Aucun client trouve.</CommandEmpty>
                            <CommandGroup>
                              {clients.map((client) => (
                                <CommandItem
                                  key={client.id}
                                  value={`${client.code} ${client.name}`}
                                  onSelect={() => {
                                    setSelectedClientId(client.id)
                                    setClientOpen(false)
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      selectedClientId === client.id ? 'opacity-100' : 'opacity-0'
                                    )}
                                  />
                                  <span className="font-medium">{client.code}</span>
                                  <span className="ml-2 text-gray-600">{client.name}</span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>Du</Label>
                    <Input
                      type="date"
                      value={clientDateFrom}
                      onChange={(e) => setClientDateFrom(e.target.value)}
                      className="bg-[#F5E6C8]"
                    />
                  </div>
                  <div>
                    <Label>Au</Label>
                    <Input
                      type="date"
                      value={clientDateTo}
                      onChange={(e) => setClientDateTo(e.target.value)}
                      className="bg-[#F5E6C8]"
                    />
                  </div>
                  <Button
                    onClick={fetchClientDeliveries}
                    className="bg-[#B8860B] hover:bg-[#9A7209]"
                    disabled={!selectedClientId}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Rechercher
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Results */}
            {clientDeliveries.length > 0 && (
              <>
                {/* Statistics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="border-[#B8860B]">
                    <CardContent className="pt-4">
                      <div className="text-sm text-gray-500">Total BL</div>
                      <div className="text-2xl font-bold text-[#B8860B]">{clientStats.totalBL}</div>
                    </CardContent>
                  </Card>
                  <Card className="border-[#B8860B]">
                    <CardContent className="pt-4">
                      <div className="text-sm text-gray-500">Total HT</div>
                      <div className="text-2xl font-bold text-[#B8860B]">{formatPrice(clientStats.totalHT)}</div>
                    </CardContent>
                  </Card>
                  <Card className="border-[#B8860B]">
                    <CardContent className="pt-4">
                      <div className="text-sm text-gray-500">Total Paye</div>
                      <div className="text-2xl font-bold text-green-600">{formatPrice(clientStats.totalPaid)}</div>
                    </CardContent>
                  </Card>
                  <Card className="border-[#B8860B]">
                    <CardContent className="pt-4">
                      <div className="text-sm text-gray-500">Reste</div>
                      <div className="text-2xl font-bold text-red-600">{formatPrice(clientStats.totalReste)}</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Chart */}
                <Card className="border-2 border-[#B8860B]">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-[#B8860B]" />
                      Evolution des livraisons
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={exportChartAsImage}>
                      <Image className="h-4 w-4 mr-2" />
                      Export Image
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div ref={chartRef} className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={clientChartData} barSize={40}>
                          <XAxis dataKey="label" axisLine={false} tickLine={false} />
                          <YAxis axisLine={false} tickLine={false} />
                          <Tooltip
                            formatter={(value: number) => formatPrice(value)}
                            labelFormatter={(label) => `Date: ${label}`}
                            cursor={false}
                          />
                          <Bar dataKey="montant" name="Montant HT" fill="#22c55e" radius={[8, 8, 0, 0]}>
                            <LabelList
                              dataKey="montant"
                              position="top"
                              formatter={(value: number) => new Intl.NumberFormat('fr-FR').format(value)}
                              style={{ fill: '#166534', fontSize: 11, fontWeight: 600 }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Table */}
                <Card className="border-2 border-[#B8860B]">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="h-5 w-5 text-[#B8860B]" />
                      Liste des BL
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={exportClientPDF}>
                        <FileText className="h-4 w-4 mr-2" />
                        PDF
                      </Button>
                      <Button variant="outline" size="sm" onClick={exportClientExcel}>
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Excel
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>N BL</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Montant HT</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead>Paiement</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {clientDeliveries.map((delivery) => {
                            const recette = delivery.delivery_items?.reduce(
                              (s, item) => s + (item.quantity_delivered - item.quantity_returned) * item.unit_price,
                              0
                            ) || 0
                            return (
                              <TableRow key={delivery.id}>
                                <TableCell className="font-mono font-medium">{delivery.delivery_number}</TableCell>
                                <TableCell>
                                  {delivery.delivery_date
                                    ? format(parseISO(delivery.delivery_date), 'dd/MM/yyyy', { locale: fr })
                                    : '-'}
                                </TableCell>
                                <TableCell className="text-right font-medium">{formatPrice(recette)}</TableCell>
                                <TableCell>
                                  <Badge className={statusColors[delivery.status]}>
                                    {statusLabels[delivery.status]}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge className={paymentStatusColors[delivery.payment_status || 'pending']}>
                                    {paymentStatusLabels[delivery.payment_status || 'pending']}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleViewDelivery(delivery)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {selectedClientId && clientDeliveries.length === 0 && !isLoading && (
              <Card className="border-2 border-gray-200">
                <CardContent className="py-8 text-center text-gray-500">
                  Aucun BL trouve pour cette periode
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Article Tab */}
        {activeTab === 'article' && (
          <div className="space-y-6">
            {/* Filters */}
            <Card className="border-2 border-[#B8860B]">
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="flex-1 min-w-[250px]">
                    <Label>Article</Label>
                    <Popover open={articleOpen} onOpenChange={setArticleOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={articleOpen}
                          className="w-full justify-between bg-[#F5E6C8]"
                        >
                          {selectedArticleId
                            ? articles.find((a) => a.id === selectedArticleId)?.name || 'Article selectionne'
                            : 'Rechercher un article...'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Rechercher par code ou nom..." />
                          <CommandList>
                            <CommandEmpty>Aucun article trouve.</CommandEmpty>
                            <CommandGroup>
                              {articles.map((article) => (
                                <CommandItem
                                  key={article.id}
                                  value={`${article.code} ${article.name}`}
                                  onSelect={() => {
                                    setSelectedArticleId(article.id)
                                    setArticleOpen(false)
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      selectedArticleId === article.id ? 'opacity-100' : 'opacity-0'
                                    )}
                                  />
                                  <span className="font-medium">{article.code}</span>
                                  <span className="ml-2 text-gray-600">{article.name}</span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>Du</Label>
                    <Input
                      type="date"
                      value={articleDateFrom}
                      onChange={(e) => setArticleDateFrom(e.target.value)}
                      className="bg-[#F5E6C8]"
                    />
                  </div>
                  <div>
                    <Label>Au</Label>
                    <Input
                      type="date"
                      value={articleDateTo}
                      onChange={(e) => setArticleDateTo(e.target.value)}
                      className="bg-[#F5E6C8]"
                    />
                  </div>
                  <Button
                    onClick={fetchArticleDeliveries}
                    className="bg-[#B8860B] hover:bg-[#9A7209]"
                    disabled={!selectedArticleId}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Rechercher
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Results */}
            {articleDeliveries.length > 0 && (
              <>
                {/* Statistics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="border-[#B8860B]">
                    <CardContent className="pt-4">
                      <div className="text-sm text-gray-500">Qte Livree</div>
                      <div className="text-2xl font-bold text-[#B8860B]">{articleStats.totalDelivered}</div>
                    </CardContent>
                  </Card>
                  <Card className="border-[#B8860B]">
                    <CardContent className="pt-4">
                      <div className="text-sm text-gray-500">Qte Retours</div>
                      <div className="text-2xl font-bold text-orange-600">{articleStats.totalReturned}</div>
                    </CardContent>
                  </Card>
                  <Card className="border-[#B8860B]">
                    <CardContent className="pt-4">
                      <div className="text-sm text-gray-500">Qte Nette</div>
                      <div className="text-2xl font-bold text-green-600">{articleStats.totalNet}</div>
                    </CardContent>
                  </Card>
                  <Card className="border-[#B8860B]">
                    <CardContent className="pt-4">
                      <div className="text-sm text-gray-500">Total HT</div>
                      <div className="text-2xl font-bold text-[#B8860B]">{formatPrice(articleStats.totalHT)}</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Chart */}
                <Card className="border-2 border-[#B8860B]">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-[#B8860B]" />
                      Evolution des quantites
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={exportChartAsImage}>
                      <Image className="h-4 w-4 mr-2" />
                      Export Image
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div ref={chartRef} className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={articleChartData}>
                          <XAxis dataKey="label" axisLine={false} tickLine={false} />
                          <YAxis axisLine={false} tickLine={false} />
                          <Tooltip labelFormatter={(label) => `Date: ${label}`} />
                          <Line
                            type="monotone"
                            dataKey="quantite"
                            name="Quantite"
                            stroke="#22c55e"
                            strokeWidth={3}
                            dot={{ fill: '#22c55e', r: 5 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Table */}
                <Card className="border-2 border-[#B8860B]">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-[#B8860B]" />
                      Detail des livraisons
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={exportArticlePDF}>
                        <FileText className="h-4 w-4 mr-2" />
                        PDF
                      </Button>
                      <Button variant="outline" size="sm" onClick={exportArticleExcel}>
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Excel
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>N BL</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead className="text-right">Qte Livree</TableHead>
                            <TableHead className="text-right">Qte Retour</TableHead>
                            <TableHead className="text-right">Qte Nette</TableHead>
                            <TableHead className="text-right">Total HT</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {articleDeliveries.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-mono font-medium">{item.delivery_number}</TableCell>
                              <TableCell>
                                {item.delivery_date
                                  ? format(parseISO(item.delivery_date), 'dd/MM/yyyy', { locale: fr })
                                  : '-'}
                              </TableCell>
                              <TableCell>
                                <span className="font-medium">{item.client_code}</span>
                                <span className="text-gray-500 ml-2">{item.client_name}</span>
                              </TableCell>
                              <TableCell className="text-right">{item.quantity_delivered}</TableCell>
                              <TableCell className="text-right text-orange-600">{item.quantity_returned}</TableCell>
                              <TableCell className="text-right font-medium text-green-600">{item.quantity_net}</TableCell>
                              <TableCell className="text-right font-medium">{formatPrice(item.total_ht)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {selectedArticleId && articleDeliveries.length === 0 && !isLoading && (
              <Card className="border-2 border-gray-200">
                <CardContent className="py-8 text-center text-gray-500">
                  Aucune livraison trouvee pour cette periode
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* View Delivery Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-[#B8860B]" />
                BL {viewingDelivery?.delivery_number}
              </DialogTitle>
            </DialogHeader>
            {viewingDelivery && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-500">Date</Label>
                    <p className="font-medium">
                      {viewingDelivery.delivery_date
                        ? format(parseISO(viewingDelivery.delivery_date), 'dd MMMM yyyy', { locale: fr })
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Statut</Label>
                    <Badge className={statusColors[viewingDelivery.status]}>
                      {statusLabels[viewingDelivery.status]}
                    </Badge>
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Code</TableHead>
                        <TableHead>Article</TableHead>
                        <TableHead className="text-right">Qte Cmd</TableHead>
                        <TableHead className="text-right">Qte Liv</TableHead>
                        <TableHead className="text-right">Qte Ret</TableHead>
                        <TableHead className="text-right">Prix Unit</TableHead>
                        <TableHead className="text-right">Total HT</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewingDelivery.delivery_items?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-sm">{item.article?.code}</TableCell>
                          <TableCell>{item.article?.name}</TableCell>
                          <TableCell className="text-right">{item.quantity_ordered}</TableCell>
                          <TableCell className="text-right">{item.quantity_delivered}</TableCell>
                          <TableCell className="text-right text-orange-600">{item.quantity_returned}</TableCell>
                          <TableCell className="text-right">{formatPrice(item.unit_price)}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatPrice((item.quantity_delivered - item.quantity_returned) * item.unit_price)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={() => setIsViewDialogOpen(false)} className="bg-[#B8860B] hover:bg-[#9A7209]">
                    Fermer
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {isLoading && (
          <div className="text-center py-8 text-gray-500">Chargement...</div>
        )}
      </div>
    </ProtectedModule>
  )
}
