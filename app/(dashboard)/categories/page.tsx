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
import { Plus, Search, Edit, FolderTree, Folder, FolderOpen, RefreshCw, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface Category {
  id: string
  name: string
  description: string | null
  parent_id: string | null
  created_at?: string
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const supabase = useSupabase()

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parent_id: '',
  })

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)

    try {
      const result = await queryWithRetry(() =>
        supabase
          .from('categories')
          .select('*')
          .order('name', { ascending: true })
      )

      if (result.error) {
        console.error('Error fetching categories:', result.error)
        throw new Error(`Erreur: ${result.error.message || 'Erreur inconnue'}`)
      }

      setCategories((result.data as Category[]) || [])
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

    const categoryData = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      parent_id: formData.parent_id || null,
    }

    if (!categoryData.name) {
      toast.error('Le nom est obligatoire')
      return
    }

    try {
      if (editingCategory) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('categories') as any)
          .update(categoryData)
          .eq('id', editingCategory.id)

        if (error) throw error
        toast.success('Catégorie modifiée avec succès')
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('categories') as any).insert([categoryData])

        if (error) throw error
        toast.success('Catégorie créée avec succès')
      }

      fetchData()
      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error saving category:', error)
      toast.error('Erreur lors de l\'enregistrement')
    }
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      description: category.description || '',
      parent_id: category.parent_id || '',
    })
    setIsDialogOpen(true)
  }

  const resetForm = () => {
    setEditingCategory(null)
    setFormData({
      name: '',
      description: '',
      parent_id: '',
    })
  }

  // Get parent categories (categories without parent)
  const parentCategories = categories.filter(c => c.parent_id === null)

  // Get children of a category
  const getChildren = (parentId: string) => {
    return categories.filter(c => c.parent_id === parentId)
  }

  // Get parent name
  const getParentName = (parentId: string | null) => {
    if (!parentId) return null
    const parent = categories.find(c => c.id === parentId)
    return parent?.name || null
  }

  // Filter categories
  const filteredCategories = categories.filter((category) => {
    const matchesSearch =
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (category.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
    return matchesSearch
  })

  // Organize categories hierarchically for display
  const organizedCategories: Category[] = []
  parentCategories.forEach(parent => {
    if (filteredCategories.some(c => c.id === parent.id)) {
      organizedCategories.push(parent)
    }
    const children = getChildren(parent.id)
    children.forEach(child => {
      if (filteredCategories.some(c => c.id === child.id)) {
        organizedCategories.push(child)
      }
    })
  })

  // Count articles per category
  const totalCategories = categories.length
  const mainCategoriesCount = parentCategories.length
  const subCategoriesCount = categories.filter(c => c.parent_id !== null).length

  return (
    <ProtectedModule module="articles">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Catégories</h1>
            <p className="text-gray-500">Gérez les catégories de produits</p>
          </div>

          <ProtectedModule module="articles" action="create">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className="bg-[#B8860B] hover:bg-[#9A7209]"
                  onClick={() => {
                    resetForm()
                    setIsDialogOpen(true)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvelle catégorie
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Ex: Olives Vertes"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="Description de la catégorie"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parent_id">Catégorie parente</Label>
                    <Select
                      value={formData.parent_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, parent_id: value === 'none' ? '' : value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Aucune (catégorie principale)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucune (catégorie principale)</SelectItem>
                        {parentCategories
                          .filter(c => c.id !== editingCategory?.id)
                          .map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      Laissez vide pour créer une catégorie principale
                    </p>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Annuler
                    </Button>
                    <Button type="submit" className="bg-[#B8860B] hover:bg-[#9A7209]">
                      {editingCategory ? 'Modifier' : 'Créer'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </ProtectedModule>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Catégories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FolderTree className="h-8 w-8 text-[#B8860B]" />
                <span className="text-2xl font-bold">{totalCategories}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Catégories principales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Folder className="h-8 w-8 text-[#DAA520]" />
                <span className="text-2xl font-bold">{mainCategoriesCount}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Sous-catégories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FolderOpen className="h-8 w-8 text-amber-600" />
                <span className="text-2xl font-bold">{subCategoriesCount}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Table */}
        <Card>
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher par nom ou description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 max-w-md"
              />
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
                Chargement des catégories...
              </div>
            ) : organizedCategories.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Aucune catégorie trouvée
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Catégorie parente</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organizedCategories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {category.parent_id ? (
                              <span className="text-gray-400 ml-4">└─</span>
                            ) : null}
                            <span className={category.parent_id ? 'text-gray-700' : 'font-semibold'}>
                              {category.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-500">
                          {category.description || '-'}
                        </TableCell>
                        <TableCell>
                          {category.parent_id ? (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              Sous-catégorie
                            </Badge>
                          ) : (
                            <Badge className="bg-[#B8860B] hover:bg-[#B8860B]">
                              Principale
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {getParentName(category.parent_id) || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <ProtectedModule module="articles" action="edit">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(category)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </ProtectedModule>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <div className="mt-4 text-sm text-gray-500 text-right">
              {organizedCategories.length} catégorie(s) affichée(s)
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedModule>
  )
}
