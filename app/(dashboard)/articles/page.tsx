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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Edit, Trash2, Package } from 'lucide-react'
import type { Article } from '@/types/database'

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingArticle, setEditingArticle] = useState<Article | null>(null)
  const supabase = createClient()

  const [formData, setFormData] = useState({
    code: '',
    barcode: '',
    name: '',
    description: '',
    unit: 'unité',
    price_ht: '',
    tva_rate: '20',
    weight_net: '',
    weight_gross: '',
    min_stock: '0',
  })

  const fetchArticles = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching articles:', error)
    } else {
      setArticles(data || [])
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchArticles()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const articleData = {
      code: formData.code,
      barcode: formData.barcode || null,
      name: formData.name,
      description: formData.description || null,
      unit: formData.unit,
      price_ht: parseFloat(formData.price_ht),
      tva_rate: parseFloat(formData.tva_rate),
      weight_net: formData.weight_net ? parseFloat(formData.weight_net) : null,
      weight_gross: formData.weight_gross ? parseFloat(formData.weight_gross) : null,
      min_stock: parseInt(formData.min_stock),
    }

    if (editingArticle) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('articles') as any)
        .update(articleData)
        .eq('id', editingArticle.id)

      if (!error) {
        fetchArticles()
        setIsDialogOpen(false)
        resetForm()
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('articles') as any).insert([articleData])

      if (!error) {
        fetchArticles()
        setIsDialogOpen(false)
        resetForm()
      }
    }
  }

  const handleEdit = (article: Article) => {
    setEditingArticle(article)
    setFormData({
      code: article.code,
      barcode: article.barcode || '',
      name: article.name,
      description: article.description || '',
      unit: article.unit,
      price_ht: article.price_ht.toString(),
      tva_rate: article.tva_rate.toString(),
      weight_net: article.weight_net?.toString() || '',
      weight_gross: article.weight_gross?.toString() || '',
      min_stock: article.min_stock.toString(),
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('articles') as any).delete().eq('id', id)
      if (!error) {
        fetchArticles()
      }
    }
  }

  const resetForm = () => {
    setEditingArticle(null)
    setFormData({
      code: '',
      barcode: '',
      name: '',
      description: '',
      unit: 'unité',
      price_ht: '',
      tva_rate: '20',
      weight_net: '',
      weight_gross: '',
      min_stock: '0',
    })
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

  return (
    <ProtectedModule module="articles">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Articles</h1>
            <p className="text-gray-500">Gérez votre catalogue de produits</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <ProtectedModule module="articles" action="create">
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    resetForm()
                    setIsDialogOpen(true)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvel article
                </Button>
              </ProtectedModule>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingArticle ? 'Modifier l\'article' : 'Nouvel article'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Code *</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="barcode">Code-barres</Label>
                    <Input
                      id="barcode"
                      value={formData.barcode}
                      onChange={(e) =>
                        setFormData({ ...formData, barcode: e.target.value })
                      }
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="name">Désignation *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price_ht">Prix HT (DH) *</Label>
                    <Input
                      id="price_ht"
                      type="number"
                      step="0.01"
                      value={formData.price_ht}
                      onChange={(e) =>
                        setFormData({ ...formData, price_ht: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tva_rate">TVA (%)</Label>
                    <Input
                      id="tva_rate"
                      type="number"
                      step="0.01"
                      value={formData.tva_rate}
                      onChange={(e) =>
                        setFormData({ ...formData, tva_rate: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unité</Label>
                    <Input
                      id="unit"
                      value={formData.unit}
                      onChange={(e) =>
                        setFormData({ ...formData, unit: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="min_stock">Stock minimum</Label>
                    <Input
                      id="min_stock"
                      type="number"
                      value={formData.min_stock}
                      onChange={(e) =>
                        setFormData({ ...formData, min_stock: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight_net">Poids net (kg)</Label>
                    <Input
                      id="weight_net"
                      type="number"
                      step="0.001"
                      value={formData.weight_net}
                      onChange={(e) =>
                        setFormData({ ...formData, weight_net: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight_gross">Poids brut (kg)</Label>
                    <Input
                      id="weight_gross"
                      type="number"
                      step="0.001"
                      value={formData.weight_gross}
                      onChange={(e) =>
                        setFormData({ ...formData, weight_gross: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" className="bg-green-600 hover:bg-green-700">
                    {editingArticle ? 'Modifier' : 'Créer'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Articles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Package className="h-8 w-8 text-green-600" />
                <span className="text-2xl font-bold">{articles.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Table */}
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
                Aucun article trouvé
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Désignation</TableHead>
                    <TableHead>Unité</TableHead>
                    <TableHead className="text-right">Prix HT</TableHead>
                    <TableHead className="text-right">TVA</TableHead>
                    <TableHead>Stock min.</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredArticles.map((article) => (
                    <TableRow key={article.id}>
                      <TableCell className="font-medium">{article.code}</TableCell>
                      <TableCell>{article.name}</TableCell>
                      <TableCell>{article.unit}</TableCell>
                      <TableCell className="text-right">
                        {formatPrice(article.price_ht)}
                      </TableCell>
                      <TableCell className="text-right">{article.tva_rate}%</TableCell>
                      <TableCell>{article.min_stock}</TableCell>
                      <TableCell>
                        <Badge
                          variant={article.is_active ? 'default' : 'secondary'}
                          className={article.is_active ? 'bg-green-100 text-green-800' : ''}
                        >
                          {article.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <ProtectedModule module="articles" action="edit">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(article)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </ProtectedModule>
                          <ProtectedModule module="articles" action="delete">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600"
                              onClick={() => handleDelete(article.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </ProtectedModule>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedModule>
  )
}
