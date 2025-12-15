'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Package, Plus, Edit, Trash2, Search, Tag, Box, Leaf } from 'lucide-react'
import { ProtectedModule } from '@/components/auth/ProtectedModule'

interface SupplyCategory {
  id: string
  name: string
  description: string | null
  sort_order: number
}

interface Supply {
  id: string
  code: string
  name: string
  description: string | null
  category_id: string | null
  unit: string
  price_ht: number
  is_custom: boolean
  is_active: boolean
  created_at: string
  supply_categories?: SupplyCategory
}

const categoryIcons: Record<string, React.ReactNode> = {
  'Olives': <Leaf className="h-4 w-4" />,
  'Etiquettes': <Tag className="h-4 w-4" />,
  'Emballage': <Box className="h-4 w-4" />,
  'Autre': <Package className="h-4 w-4" />,
}

const categoryColors: Record<string, string> = {
  'Olives': 'bg-green-100 text-green-800',
  'Etiquettes': 'bg-blue-100 text-blue-800',
  'Emballage': 'bg-orange-100 text-orange-800',
  'Autre': 'bg-gray-100 text-gray-800',
}

export default function FournituresPage() {
  const [supplies, setSupplies] = useState<Supply[]>([])
  const [categories, setCategories] = useState<SupplyCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSupply, setEditingSupply] = useState<Supply | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const supabase = createClient()

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    category_id: '',
    unit: 'kg',
    price_ht: '',
  })

  const fetchCategories = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('supply_categories') as any)
      .select('*')
      .order('sort_order')

    if (error) {
      console.error('Error fetching categories:', error)
      return
    }
    setCategories((data as SupplyCategory[]) || [])
  }

  const fetchSupplies = async () => {
    setIsLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('supplies') as any)
      .select('*, supply_categories(*)')
      .order('code')

    if (error) {
      console.error('Error fetching supplies:', error)
    } else {
      setSupplies((data as Supply[]) || [])
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchCategories()
    fetchSupplies()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const supplyData = {
      code: formData.code.toUpperCase(),
      name: formData.name,
      description: formData.description || null,
      category_id: formData.category_id || null,
      unit: formData.unit,
      price_ht: parseFloat(formData.price_ht) || 0,
      is_custom: true,
    }

    if (editingSupply) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('supplies') as any)
        .update(supplyData)
        .eq('id', editingSupply.id)

      if (error) {
        console.error('Error updating supply:', error)
        alert('Erreur lors de la mise à jour')
        return
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('supplies') as any)
        .insert([supplyData])

      if (error) {
        console.error('Error creating supply:', error)
        alert('Erreur lors de la création')
        return
      }
    }

    setIsDialogOpen(false)
    resetForm()
    fetchSupplies()
  }

  const handleEdit = (supply: Supply) => {
    setEditingSupply(supply)
    setFormData({
      code: supply.code,
      name: supply.name,
      description: supply.description || '',
      category_id: supply.category_id || '',
      unit: supply.unit,
      price_ht: supply.price_ht?.toString() || '',
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette fourniture ?')) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('supplies') as any)
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting supply:', error)
      alert('Erreur lors de la suppression')
      return
    }

    fetchSupplies()
  }

  const resetForm = () => {
    setEditingSupply(null)
    setFormData({
      code: '',
      name: '',
      description: '',
      category_id: '',
      unit: 'kg',
      price_ht: '',
    })
  }

  const filteredSupplies = supplies.filter(supply => {
    const matchesSearch =
      supply.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supply.name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = categoryFilter === 'all' || supply.category_id === categoryFilter

    return matchesSearch && matchesCategory
  })

  // Stats by category
  const stats = categories.map(cat => ({
    ...cat,
    count: supplies.filter(s => s.category_id === cat.id).length
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fournitures d'Achat</h1>
          <p className="text-gray-500">Gestion des matières premières et fournitures</p>
        </div>
        <ProtectedModule module="achats" action="create">
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) resetForm()
          }}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle Fourniture
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingSupply ? 'Modifier la fourniture' : 'Nouvelle fourniture'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Code *</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="Ex: ETQ001"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nom de la fourniture"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Description optionnelle"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Catégorie</Label>
                    <Select
                      value={formData.category_id}
                      onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unité</Label>
                    <Select
                      value={formData.unit}
                      onValueChange={(value) => setFormData({ ...formData, unit: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">Kilogramme (kg)</SelectItem>
                        <SelectItem value="unité">Unité</SelectItem>
                        <SelectItem value="litre">Litre (L)</SelectItem>
                        <SelectItem value="mètre">Mètre (m)</SelectItem>
                        <SelectItem value="rouleau">Rouleau</SelectItem>
                        <SelectItem value="carton">Carton</SelectItem>
                        <SelectItem value="palette">Palette</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price_ht">Prix unitaire HT (MAD)</Label>
                  <Input
                    id="price_ht"
                    type="number"
                    step="0.01"
                    value={formData.price_ht}
                    onChange={(e) => setFormData({ ...formData, price_ht: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" className="bg-green-600 hover:bg-green-700">
                    {editingSupply ? 'Mettre à jour' : 'Créer'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </ProtectedModule>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Fournitures</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Package className="h-6 w-6 text-green-600" />
              <span className="text-2xl font-bold">{supplies.length}</span>
            </div>
          </CardContent>
        </Card>
        {stats.map(cat => (
          <Card key={cat.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{cat.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {categoryIcons[cat.name] || <Package className="h-6 w-6" />}
                <span className="text-2xl font-bold">{cat.count}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher par code ou nom..."
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
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Chargement...</div>
          ) : filteredSupplies.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Aucune fourniture trouvée</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Unité</TableHead>
                    <TableHead className="text-right">Prix HT</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSupplies.map((supply) => (
                    <TableRow key={supply.id}>
                      <TableCell className="font-mono font-medium">{supply.code}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{supply.name}</div>
                          {supply.description && (
                            <div className="text-xs text-gray-500">{supply.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {supply.supply_categories ? (
                          <Badge className={categoryColors[supply.supply_categories.name] || 'bg-gray-100'}>
                            {supply.supply_categories.name}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{supply.unit}</TableCell>
                      <TableCell className="text-right">
                        {supply.price_ht > 0 ? `${supply.price_ht.toFixed(2)} MAD` : '-'}
                      </TableCell>
                      <TableCell>
                        {supply.is_custom ? (
                          <Badge variant="outline" className="text-blue-600 border-blue-300">
                            Personnalisé
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-600">
                            Prédéfini
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <ProtectedModule module="achats" action="edit">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(supply)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </ProtectedModule>
                          {supply.is_custom && (
                            <ProtectedModule module="achats" action="delete">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-600"
                                onClick={() => handleDelete(supply.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </ProtectedModule>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
