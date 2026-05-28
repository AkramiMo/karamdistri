'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ProtectedModule } from '@/components/auth/ProtectedModule'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, DollarSign, Save, RotateCcw, Check } from 'lucide-react'

interface Client {
  id: string
  code: string
  name: string
}

interface Article {
  id: string
  code: string
  name: string
  price_ht: number
}

interface ClientPrice {
  id: string
  client_id: string
  article_id: string
  custom_price: number
}

export default function ClientPricesPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [clientPrices, setClientPrices] = useState<ClientPrice[]>([])
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [editedPrices, setEditedPrices] = useState<Record<string, string>>({})
  const [savingArticleId, setSavingArticleId] = useState<string | null>(null)
  const supabase = createClient()

  const fetchClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, code, name')
      .eq('is_active', true)
      .order('code')
    setClients(data || [])
  }

  const fetchArticles = async () => {
    const { data } = await supabase
      .from('articles')
      .select('id, code, name, price_ht')
      .eq('is_active', true)
      .order('code')
    setArticles(data || [])
  }

  const fetchClientPrices = async (clientId: string) => {
    if (!clientId) {
      setClientPrices([])
      return
    }
    const { data } = await supabase
      .from('client_prices')
      .select('*')
      .eq('client_id', clientId)
    setClientPrices(data || [])
  }

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await Promise.all([fetchClients(), fetchArticles()])
      setIsLoading(false)
    }
    loadData()
  }, [])

  useEffect(() => {
    if (selectedClient) {
      fetchClientPrices(selectedClient)
      setEditedPrices({})
    }
  }, [selectedClient])

  const getClientPrice = (articleId: string): number | null => {
    const cp = clientPrices.find(p => p.article_id === articleId)
    return cp ? cp.custom_price : null
  }

  const handlePriceChange = (articleId: string, value: string) => {
    setEditedPrices(prev => ({
      ...prev,
      [articleId]: value,
    }))
  }

  const handleSavePrice = async (articleId: string, defaultPrice: number) => {
    if (!selectedClient) return

    const newPrice = editedPrices[articleId]
    if (newPrice === undefined || newPrice === '') return

    const priceValue = parseFloat(newPrice)
    if (isNaN(priceValue) || priceValue < 0) {
      alert('Prix invalide')
      return
    }

    setSavingArticleId(articleId)

    const existingPrice = clientPrices.find(p => p.article_id === articleId)

    if (existingPrice) {
      // Update existing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('client_prices') as any)
        .update({ custom_price: priceValue, updated_at: new Date().toISOString() })
        .eq('id', existingPrice.id)

      if (error) {
        console.error('Error updating price:', error)
        alert('Erreur lors de la mise a jour du prix')
      }
    } else {
      // Insert new
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('client_prices') as any).insert([{
        client_id: selectedClient,
        article_id: articleId,
        custom_price: priceValue,
      }])

      if (error) {
        console.error('Error saving price:', error)
        alert('Erreur lors de l\'enregistrement du prix')
      }
    }

    await fetchClientPrices(selectedClient)
    setEditedPrices(prev => {
      const updated = { ...prev }
      delete updated[articleId]
      return updated
    })
    setSavingArticleId(null)
  }

  const handleResetPrice = async (articleId: string) => {
    if (!selectedClient) return

    const existingPrice = clientPrices.find(p => p.article_id === articleId)
    if (!existingPrice) return

    if (!confirm('Supprimer le prix personnalise et revenir au prix par defaut ?')) {
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('client_prices') as any)
      .delete()
      .eq('id', existingPrice.id)

    if (error) {
      console.error('Error deleting price:', error)
      alert('Erreur lors de la suppression')
    } else {
      await fetchClientPrices(selectedClient)
    }
  }

  const filteredArticles = articles.filter(
    (article) =>
      article.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
    }).format(price)
  }

  const customPricesCount = clientPrices.length
  const selectedClientData = clients.find(c => c.id === selectedClient)

  return (
    <ProtectedModule module="clients">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Prix par Client</h1>
            <p className="text-gray-500">Gerez les prix de vente personnalises pour chaque client</p>
          </div>
        </div>

        {/* Client Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Selection du Client</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1 max-w-md">
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selectionner un client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.code} - {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedClientData && (
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="text-lg py-1 px-3">
                    {selectedClientData.code}
                  </Badge>
                  <span className="font-medium">{selectedClientData.name}</span>
                  <Badge className="bg-amber-100 text-[#9A7209]">
                    {customPricesCount} prix personnalises
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        {selectedClient && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Articles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-bold">{articles.length}</span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Prix Personnalises
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-6 w-6 text-[#B8860B]" />
                  <span className="text-2xl font-bold text-[#B8860B]">{customPricesCount}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Prix par Defaut
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-bold text-gray-600">
                  {articles.length - customPricesCount}
                </span>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Articles Table */}
        {selectedClient && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher un article..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">Chargement...</div>
              ) : filteredArticles.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Aucun article trouve
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Article</TableHead>
                      <TableHead className="text-right">Prix par Defaut</TableHead>
                      <TableHead className="text-right">Prix Client</TableHead>
                      <TableHead className="text-center">Ecart</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredArticles.map((article) => {
                      const customPrice = getClientPrice(article.id)
                      const editedValue = editedPrices[article.id]
                      const displayPrice = editedValue !== undefined ? editedValue : (customPrice?.toString() || '')
                      const effectivePrice = customPrice !== null ? customPrice : article.price_ht
                      const priceDiff = effectivePrice - article.price_ht
                      const priceDiffPercent = article.price_ht > 0 ? (priceDiff / article.price_ht) * 100 : 0

                      return (
                        <TableRow key={article.id}>
                          <TableCell className="font-mono text-sm">{article.code}</TableCell>
                          <TableCell className="font-medium">{article.name}</TableCell>
                          <TableCell className="text-right text-gray-500">
                            {formatPrice(article.price_ht)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={displayPrice}
                                onChange={(e) => handlePriceChange(article.id, e.target.value)}
                                placeholder={formatPrice(article.price_ht)}
                                className="w-32 text-right"
                              />
                              {customPrice !== null && (
                                <Badge className="bg-amber-100 text-[#9A7209]">
                                  <Check className="h-3 w-3" />
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {customPrice !== null && (
                              <Badge
                                className={
                                  priceDiff > 0
                                    ? 'bg-amber-100 text-[#9A7209]'
                                    : priceDiff < 0
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-gray-100 text-gray-800'
                                }
                              >
                                {priceDiff >= 0 ? '+' : ''}{priceDiffPercent.toFixed(1)}%
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {editedPrices[article.id] !== undefined && (
                                <Button
                                  size="sm"
                                  className="bg-[#B8860B] hover:bg-[#9A7209]"
                                  onClick={() => handleSavePrice(article.id, article.price_ht)}
                                  disabled={savingArticleId === article.id}
                                >
                                  <Save className="h-4 w-4 mr-1" />
                                  {savingArticleId === article.id ? '...' : 'Enregistrer'}
                                </Button>
                              )}
                              {customPrice !== null && editedPrices[article.id] === undefined && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleResetPrice(article.id)}
                                  title="Revenir au prix par defaut"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {!selectedClient && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-gray-500">
                <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Selectionnez un client</p>
                <p className="text-sm">pour gerer ses prix personnalises</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedModule>
  )
}
