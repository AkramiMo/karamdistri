'use client'

import { useEffect, useState, useCallback } from 'react'
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
import { Search, Package, RefreshCw, ShoppingCart, Users, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface ArticleVendu {
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
  article?: { code: string; name: string }
  client?: { code: string; name: string }
  delivery?: { delivery_number: string }
}

const formatPrice = (price: number | null) => {
  if (price === null) return '-'
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
  }).format(price)
}

export default function ArticlesVendusPage() {
  const supabase = useSupabase()

  const [articlesVendus, setArticlesVendus] = useState<ArticleVendu[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterClient, setFilterClient] = useState<string>('all')
  const [filterArticle, setFilterArticle] = useState<string>('all')

  const fetchArticlesVendus = useCallback(async () => {
    setIsLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('articles_vendus') as any)
      .select(`
        *,
        article:articles(code, name),
        client:clients(code, name),
        delivery:deliveries(delivery_number)
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

  // Listes uniques pour les filtres
  const uniqueClients = Array.from(
    new Map(articlesVendus.map(av => [av.client_code, { code: av.client_code, name: av.client?.name || av.client_code }])).values()
  ).sort((a, b) => a.code.localeCompare(b.code))

  const uniqueArticles = Array.from(
    new Map(articlesVendus.map(av => [av.article_code, { code: av.article_code, name: av.article?.name || av.article_code }])).values()
  ).sort((a, b) => a.code.localeCompare(b.code))

  // Filtrage
  const filtered = articlesVendus.filter((av) => {
    const matchesSearch =
      av.sale_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      av.article_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      av.client_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (av.article?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (av.client?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (av.delivery?.delivery_number || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesClient = filterClient === 'all' || av.client_code === filterClient
    const matchesArticle = filterArticle === 'all' || av.article_code === filterArticle
    return matchesSearch && matchesClient && matchesArticle
  })

  // Stats
  const totalQtySold = filtered.reduce((sum, av) => sum + av.quantity_sold, 0)
  const uniqueClientsCount = new Set(filtered.map(av => av.client_code)).size
  const uniqueArticlesCount = new Set(filtered.map(av => av.article_code)).size
  const uniqueSalesCount = new Set(filtered.map(av => av.sale_number)).size

  if (isLoading) {
    return (
      <ProtectedModule module="articles-vendus">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-[#B8860B]" />
        </div>
      </ProtectedModule>
    )
  }

  return (
    <ProtectedModule module="articles-vendus">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Articles Vendus</h1>
            <p className="text-gray-500">Historique des articles vendus par client et par vente</p>
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
              <CardTitle className="text-sm font-bold text-gray-600">Total Quantite</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Package className="h-8 w-8 text-[#B8860B]" />
                <span className="text-2xl font-bold">{totalQtySold}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2 border-[#B8860B]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-gray-600">Clients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-8 w-8 text-[#B8860B]" />
                <span className="text-2xl font-bold">{uniqueClientsCount}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2 border-[#B8860B]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-gray-600">Articles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Package className="h-8 w-8 text-[#B8860B]" />
                <span className="text-2xl font-bold">{uniqueArticlesCount}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2 border-[#B8860B]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-gray-600">Ventes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-8 w-8 text-[#B8860B]" />
                <span className="text-2xl font-bold">{uniqueSalesCount}</span>
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
                  placeholder="Rechercher par vente, article, client, BL..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-2 border-[#B8860B]"
                />
              </div>
              <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger className="w-full md:w-56 border-2 border-[#B8860B]">
                  <SelectValue placeholder="Client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les clients</SelectItem>
                  {uniqueClients.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code} - {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterArticle} onValueChange={setFilterArticle}>
                <SelectTrigger className="w-full md:w-56 border-2 border-[#B8860B]">
                  <SelectValue placeholder="Article" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les articles</SelectItem>
                  {uniqueArticles.map((a) => (
                    <SelectItem key={a.code} value={a.code}>
                      {a.code} - {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto border-2 border-[#B8860B] rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>N° Vente</TableHead>
                    <TableHead className="text-center">Quantité</TableHead>
                    <TableHead>Code Article</TableHead>
                    <TableHead>N° BL</TableHead>
                    <TableHead>Code Client</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Aucun article vendu trouve
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((av) => (
                      <TableRow key={av.id}>
                        <TableCell>
                          {format(new Date(av.sale_date), 'dd/MM/yyyy', { locale: fr })}
                        </TableCell>
                        <TableCell className="font-mono font-medium">{av.sale_number}</TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-amber-100 text-[#9A7209]">{av.quantity_sold}</Badge>
                        </TableCell>
                        <TableCell className="font-mono">{av.article_code}</TableCell>
                        <TableCell className="font-mono text-sm text-gray-500">
                          {av.delivery?.delivery_number || '-'}
                        </TableCell>
                        <TableCell className="font-mono">{av.client_code}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedModule>
  )
}
