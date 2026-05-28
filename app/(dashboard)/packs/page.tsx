'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSupabase } from '@/hooks/useSupabase'
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
import { Plus, Search, Edit, Trash2, Package, RefreshCw, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface Pack {
  id: string
  code: string
  name: string
  description: string | null
  quantity: number | null
  price: number | null
  is_active: boolean
  created_at?: string
}

export default function PacksPage() {
  const [packs, setPacks] = useState<Pack[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPack, setEditingPack] = useState<Pack | null>(null)
  const supabase = useSupabase()

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    quantity: '',
    price: '',
  })

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('packs') as any)
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching packs:', error)
        throw new Error(`Erreur: ${error.message || 'Erreur inconnue'}`)
      }

      setPacks(data || [])
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

    const packData = {
      code: formData.code.trim(),
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      quantity: formData.quantity ? parseInt(formData.quantity) : null,
      price: formData.price ? parseFloat(formData.price) : null,
      is_active: true,
    }

    if (!packData.code || !packData.name) {
      toast.error('Le code et le nom sont obligatoires')
      return
    }

    try {
      if (editingPack) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('packs') as any)
          .update(packData)
          .eq('id', editingPack.id)

        if (error) throw error
        toast.success('Pack modifié avec succès')
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('packs') as any).insert([packData])

        if (error) throw error
        toast.success('Pack créé avec succès')
      }

      fetchData()
      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error saving pack:', error)
      toast.error('Erreur lors de l\'enregistrement')
    }
  }

  const handleEdit = (pack: Pack) => {
    setEditingPack(pack)
    setFormData({
      code: pack.code,
      name: pack.name,
      description: pack.description || '',
      quantity: pack.quantity?.toString() || '',
      price: pack.price?.toString() || '',
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (pack: Pack) => {
    if (!confirm(`Supprimer le pack "${pack.name}" ?`)) return

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('packs') as any)
        .delete()
        .eq('id', pack.id)

      if (error) throw error
      toast.success('Pack supprimé')
      fetchData()
    } catch (error) {
      console.error('Error deleting pack:', error)
      toast.error('Erreur lors de la suppression')
    }
  }

  const resetForm = () => {
    setEditingPack(null)
    setFormData({
      code: '',
      name: '',
      description: '',
      quantity: '',
      price: '',
    })
  }

  const filteredPacks = packs.filter((pack) => {
    const matchesSearch =
      pack.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pack.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pack.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
    return matchesSearch
  })

  const formatPrice = (price: number | null) => {
    if (price === null) return '-'
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
            <h1 className="text-2xl font-bold text-gray-900">Packs</h1>
            <p className="text-gray-500">Gérez les packs de produits</p>
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
                  Nouveau pack
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingPack ? 'Modifier le pack' : 'Nouveau pack'}
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
                        placeholder="Ex: PACK001"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">Nom *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder="Ex: Pack 6 unités"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="Description du pack"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantité</Label>
                      <Input
                        id="quantity"
                        type="number"
                        value={formData.quantity}
                        onChange={(e) =>
                          setFormData({ ...formData, quantity: e.target.value })
                        }
                        placeholder="Ex: 6"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price">Prix (MAD)</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) =>
                          setFormData({ ...formData, price: e.target.value })
                        }
                        placeholder="Prix du pack"
                      />
                    </div>
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
                      {editingPack ? 'Modifier' : 'Créer'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </ProtectedModule>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Packs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Package className="h-8 w-8 text-[#B8860B]" />
                <span className="text-2xl font-bold">{packs.length}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Packs actifs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Package className="h-8 w-8 text-[#DAA520]" />
                <span className="text-2xl font-bold">
                  {packs.filter(p => p.is_active).length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par code, nom..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="icon" onClick={fetchData}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
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
                Chargement...
              </div>
            ) : filteredPacks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Aucun pack trouvé
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Quantité</TableHead>
                      <TableHead className="text-right">Prix</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPacks.map((pack) => (
                      <TableRow key={pack.id}>
                        <TableCell className="font-medium">{pack.code}</TableCell>
                        <TableCell>{pack.name}</TableCell>
                        <TableCell className="text-gray-500">
                          {pack.description || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {pack.quantity || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatPrice(pack.price)}
                        </TableCell>
                        <TableCell>
                          <Badge className={pack.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {pack.is_active ? 'Actif' : 'Inactif'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <ProtectedModule module="articles" action="edit">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(pack)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </ProtectedModule>
                            <ProtectedModule module="articles" action="delete">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(pack)}
                                className="text-red-600 hover:text-red-700"
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
              {filteredPacks.length} pack(s) affiché(s)
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedModule>
  )
}
