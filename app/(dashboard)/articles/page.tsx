'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSupabase, queryWithRetry } from '@/hooks/useSupabase'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Edit, Trash2, Package, Eye, Leaf, Droplets, Carrot, Box, AlertCircle, RefreshCw } from 'lucide-react'

interface Category {
  id: string
  name: string
  description: string | null
  parent_id: string | null
}

interface Packaging {
  id: string
  name: string
  volume: number | null
  weight: number | null
}

interface Article {
  id: string
  code: string
  barcode: string | null
  name: string
  description: string | null
  category_id: string | null
  unit: string
  price_ht: number
  tva_rate: number
  weight_net: number | null
  weight_gross: number | null
  packaging_id: string | null
  min_stock: number
  is_active: boolean
  created_at: string
  category?: Category
  packaging?: Packaging
}

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [packagings, setPackagings] = useState<Packaging[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [packagingFilter, setPackagingFilter] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [viewingArticle, setViewingArticle] = useState<Article | null>(null)
  const [editingArticle, setEditingArticle] = useState<Article | null>(null)
  const supabase = useSupabase()

  const [formData, setFormData] = useState({
    code: '',
    barcode: '',
    name: '',
    description: '',
    category_id: '',
    unit: 'unité',
    price_ht: '',
    tva_rate: '0',
    weight_net: '',
    weight_gross: '',
    packaging_id: '',
    min_stock: '0',
  })

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)

    try {
      // Fetch articles with relations
      const articlesResult = await queryWithRetry(() =>
        supabase
          .from('articles')
          .select(`
            *,
            category:categories(*),
            packaging:packagings(*)
          `)
          .order('code', { ascending: true })
          .limit(200)
      )

      if (articlesResult.error) {
        console.error('Error fetching articles:', articlesResult.error)
        throw new Error(`Erreur articles: ${articlesResult.error.message || 'Erreur inconnue'}`)
      }

      setArticles((articlesResult.data as Article[]) || [])

      // Fetch categories and packagings in parallel
      const [categoriesResult, packagingsResult] = await Promise.all([
        queryWithRetry(() =>
          supabase.from('categories').select('*').order('name')
        ),
        queryWithRetry(() =>
          supabase.from('packagings').select('*').order('name')
        ),
      ])

      setCategories((categoriesResult.data as Category[]) || [])
      setPackagings((packagingsResult.data as Packaging[]) || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      setLoadError(error instanceof Error ? error.message : 'Erreur de chargement')
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const articleData = {
      code: formData.code,
      barcode: formData.barcode || null,
      name: formData.name,
      description: formData.description || null,
      category_id: formData.category_id || null,
      unit: formData.unit,
      price_ht: parseFloat(formData.price_ht),
      tva_rate: parseFloat(formData.tva_rate),
      weight_net: formData.weight_net ? parseFloat(formData.weight_net) : null,
      weight_gross: formData.weight_gross ? parseFloat(formData.weight_gross) : null,
      packaging_id: formData.packaging_id || null,
      min_stock: parseInt(formData.min_stock),
    }

    if (editingArticle) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('articles') as any)
        .update(articleData)
        .eq('id', editingArticle.id)

      if (!error) {
        fetchData()
        setIsDialogOpen(false)
        resetForm()
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('articles') as any).insert([articleData])

      if (!error) {
        fetchData()
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
      category_id: article.category_id || '',
      unit: article.unit,
      price_ht: article.price_ht.toString(),
      tva_rate: article.tva_rate.toString(),
      weight_net: article.weight_net?.toString() || '',
      weight_gross: article.weight_gross?.toString() || '',
      packaging_id: article.packaging_id || '',
      min_stock: article.min_stock.toString(),
    })
    setIsDialogOpen(true)
  }

  const handleView = (article: Article) => {
    setViewingArticle(article)
    setIsViewDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('articles') as any).delete().eq('id', id)
      if (!error) {
        fetchData()
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
      category_id: '',
      unit: 'unité',
      price_ht: '',
      tva_rate: '0',
      weight_net: '',
      weight_gross: '',
      packaging_id: '',
      min_stock: '0',
    })
  }

  const filteredArticles = articles.filter((article) => {
    const matchesSearch =
      article.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (article.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)

    const matchesCategory =
      categoryFilter === 'all' || article.category?.name === categoryFilter

    const matchesPackaging =
      packagingFilter === 'all' || article.packaging?.name === packagingFilter

    return matchesSearch && matchesCategory && matchesPackaging
  })

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
    }).format(price)
  }

  // Get unique main categories for stats
  const mainCategories = categories.filter(c => c.parent_id === null)

  // Stats by main category
  const getStatsByCategory = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName && c.parent_id === null)
    if (!category) return 0
    const childCategories = categories.filter(c => c.parent_id === category.id).map(c => c.id)
    const allCategoryIds = [category.id, ...childCategories]
    return articles.filter(a => a.category_id && allCategoryIds.includes(a.category_id)).length
  }

  const olivesCount = getStatsByCategory('Olives')
  const saucesCount = getStatsByCategory('Sauces')
  const legumesCount = getStatsByCategory('Légumes')

  // Get unique categories and packagings for filters
  const uniqueCategories = [...new Set(articles.map(a => a.category?.name).filter(Boolean))]
  const uniquePackagings = [...new Set(articles.map(a => a.packaging?.name).filter(Boolean))]

  const getCategoryBadgeColor = (categoryName: string | undefined) => {
    if (!categoryName) return 'bg-gray-100 text-gray-800'
    if (categoryName.includes('Olive')) return 'bg-green-100 text-green-800'
    if (categoryName.includes('Sauce') || categoryName.includes('Harissa') || categoryName.includes('Vinaigre')) return 'bg-red-100 text-red-800'
    if (categoryName.includes('Cornichon') || categoryName.includes('Citron') || categoryName.includes('Câpre') || categoryName.includes('Légumes')) return 'bg-orange-100 text-orange-800'
    return 'bg-gray-100 text-gray-800'
  }

  const getPackagingBadgeColor = (packagingName: string | undefined) => {
    if (!packagingName) return 'bg-gray-100 text-gray-600'
    if (packagingName.includes('Bocal')) return 'bg-blue-100 text-blue-800'
    if (packagingName.includes('Seau')) return 'bg-purple-100 text-purple-800'
    if (packagingName.includes('Bidon')) return 'bg-cyan-100 text-cyan-800'
    if (packagingName.includes('Boite')) return 'bg-amber-100 text-amber-800'
    if (packagingName.includes('Sachet')) return 'bg-pink-100 text-pink-800'
    return 'bg-gray-100 text-gray-600'
  }

  return (
    <ProtectedModule module="articles">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Articles</h1>
            <p className="text-gray-500">Gérez votre catalogue de produits</p>
          </div>

          <ProtectedModule module="articles" action="create">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
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
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingArticle ? "Modifier l'article" : 'Nouvel article'}
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
                    <Label htmlFor="description">Description BL</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="Description affichée sur le bon de livraison"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category_id">Catégorie</Label>
                    <Select
                      value={formData.category_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, category_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.parent_id ? '— ' : ''}{category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="packaging_id">Type Emballage</Label>
                    <Select
                      value={formData.packaging_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, packaging_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        {packagings.map((packaging) => (
                          <SelectItem key={packaging.id} value={packaging.id}>
                            {packaging.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <Select
                      value={formData.unit}
                      onValueChange={(value) =>
                        setFormData({ ...formData, unit: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unité">Unité</SelectItem>
                        <SelectItem value="kg">Kilogramme (kg)</SelectItem>
                        <SelectItem value="L">Litre (L)</SelectItem>
                        <SelectItem value="carton">Carton</SelectItem>
                      </SelectContent>
                    </Select>
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
          </ProtectedModule>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Olives
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Leaf className="h-8 w-8 text-green-500" />
                <span className="text-2xl font-bold">{olivesCount}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Sauces
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Droplets className="h-8 w-8 text-red-500" />
                <span className="text-2xl font-bold">{saucesCount}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Légumes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Carrot className="h-8 w-8 text-orange-500" />
                <span className="text-2xl font-bold">{legumesCount}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filters */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par code, nom ou description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes catégories</SelectItem>
                  {uniqueCategories.map((cat) => (
                    <SelectItem key={cat} value={cat!}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={packagingFilter} onValueChange={setPackagingFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Emballage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous emballages</SelectItem>
                  {uniquePackagings.map((pkg) => (
                    <SelectItem key={pkg} value={pkg!}>
                      {pkg}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loadError ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 mb-4">{loadError}</p>
                <Button onClick={fetchData} variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Réessayer
                </Button>
              </div>
            ) : isLoading ? (
              <div className="text-center py-8 text-gray-500">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                Chargement des articles...
              </div>
            ) : filteredArticles.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Aucun article trouvé
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Désignation</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Emballage</TableHead>
                      <TableHead className="text-right">Prix HT</TableHead>
                      <TableHead className="text-center">Poids</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredArticles.map((article) => (
                      <TableRow key={article.id}>
                        <TableCell className="font-mono font-medium text-sm">
                          {article.code}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{article.name}</div>
                            {article.description && (
                              <div className="text-sm text-gray-500">{article.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {article.category && (
                            <Badge className={getCategoryBadgeColor(article.category.name)}>
                              {article.category.name}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {article.packaging && (
                            <Badge className={getPackagingBadgeColor(article.packaging.name)}>
                              <Box className="h-3 w-3 mr-1" />
                              {article.packaging.name}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {article.price_ht > 0 ? formatPrice(article.price_ht) : '-'}
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {article.weight_net ? `${article.weight_net} kg` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={article.is_active ? 'default' : 'secondary'}
                            className={article.is_active ? 'bg-green-100 text-green-800' : ''}
                          >
                            {article.is_active ? 'Actif' : 'Inactif'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleView(article)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
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
              </div>
            )}
            <div className="mt-4 text-sm text-gray-500 text-right">
              {filteredArticles.length} article(s) affiché(s)
            </div>
          </CardContent>
        </Card>

        {/* View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Détails de l&apos;article</DialogTitle>
            </DialogHeader>
            {viewingArticle && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-500">Code</Label>
                    <p className="font-mono font-bold text-lg">{viewingArticle.code}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Code-barres</Label>
                    <p>{viewingArticle.barcode || '-'}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-500">Désignation</Label>
                  <p className="font-medium text-lg">{viewingArticle.name}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Description BL</Label>
                  <p>{viewingArticle.description || '-'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-500">Catégorie</Label>
                    <p>
                      {viewingArticle.category ? (
                        <Badge className={getCategoryBadgeColor(viewingArticle.category.name)}>
                          {viewingArticle.category.name}
                        </Badge>
                      ) : '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Emballage</Label>
                    <p>
                      {viewingArticle.packaging ? (
                        <Badge className={getPackagingBadgeColor(viewingArticle.packaging.name)}>
                          {viewingArticle.packaging.name}
                        </Badge>
                      ) : '-'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-gray-500">Prix HT</Label>
                    <p className="font-bold text-green-600">
                      {viewingArticle.price_ht > 0 ? formatPrice(viewingArticle.price_ht) : '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-500">TVA</Label>
                    <p>{viewingArticle.tva_rate}%</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Unité</Label>
                    <p>{viewingArticle.unit}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-gray-500">Poids net</Label>
                    <p>{viewingArticle.weight_net ? `${viewingArticle.weight_net} kg` : '-'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Poids brut</Label>
                    <p>{viewingArticle.weight_gross ? `${viewingArticle.weight_gross} kg` : '-'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Stock min.</Label>
                    <p>{viewingArticle.min_stock}</p>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsViewDialogOpen(false)}
                  >
                    Fermer
                  </Button>
                  <ProtectedModule module="articles" action="edit">
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        setIsViewDialogOpen(false)
                        handleEdit(viewingArticle)
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Modifier
                    </Button>
                  </ProtectedModule>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedModule>
  )
}
