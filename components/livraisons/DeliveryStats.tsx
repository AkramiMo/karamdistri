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
import { Download, TrendingUp, Calendar } from 'lucide-react'
import { downloadDeliveriesExcel, getMonthlyDeliveryQuantities, type DeliveryItemForExport } from '@/lib/excel/livraisons'

interface Article {
  id: string
  code: string
  name: string
}

export function DeliveryStats() {
  const [deliveryItems, setDeliveryItems] = useState<DeliveryItemForExport[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
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

    // Récupérer tous les articles
    const { data: articlesData } = await supabase
      .from('articles')
      .select('id, code, name')
      .order('code')

    setArticles(articlesData || [])

    // Récupérer tous les items de livraison avec leurs livraisons parentes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: items, error } = await (supabase as any)
      .from('delivery_items')
      .select(`
        article_id,
        quantity_delivered,
        quantity_returned,
        delivery:deliveries(delivery_date, status)
      `)

    if (error) {
      console.error('Error fetching delivery items:', error)
      setIsLoading(false)
      return
    }

    // Transformer les données avec les codes/noms des articles
    // Filtrer uniquement les livraisons avec statut "delivered"
    const articlesMap = new Map((articlesData || []).map(a => [a.id, a]))
    const transformedItems: DeliveryItemForExport[] = (items || [])
      .filter((item: any) => item.delivery?.delivery_date && item.delivery?.status === 'delivered')
      .map((item: any) => {
        const article = articlesMap.get(item.article_id)
        return {
          article_code: article?.code || 'N/A',
          article_name: article?.name || 'Inconnu',
          quantity_delivered: item.quantity_delivered || 0,
          quantity_returned: item.quantity_returned || 0,
          delivery_date: item.delivery.delivery_date,
        }
      })

    setDeliveryItems(transformedItems)
    setIsLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Calculer les quantités pour le mois sélectionné
  const monthlyQuantities = useMemo(() => {
    if (!selectedMonth) return []
    return getMonthlyDeliveryQuantities(deliveryItems, selectedMonth)
  }, [deliveryItems, selectedMonth])

  // Calculer le total
  const totalQuantity = monthlyQuantities.reduce((sum, item) => sum + item.quantity, 0)

  const handleExport = () => {
    if (!selectedMonth) return
    downloadDeliveriesExcel(deliveryItems, selectedMonth)
  }

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split('-')
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
    return `${monthNames[parseInt(monthNum) - 1]} ${year}`
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#B8860B]" />
            <CardTitle>Quantités Vendues par Article</CardTitle>
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
            Aucune vente pour {selectedMonth ? formatMonth(selectedMonth) : 'ce mois'}
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
                    <TableHead className="text-right w-32">Quantité</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyQuantities.map((item) => (
                    <TableRow key={item.code}>
                      <TableCell className="font-mono text-sm">{item.code}</TableCell>
                      <TableCell>{item.name}</TableCell>
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
  )
}
