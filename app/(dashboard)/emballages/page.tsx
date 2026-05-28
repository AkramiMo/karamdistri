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
import { Plus, Search, Edit, Trash2, Box, RefreshCw, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface Emballage {
  id: string
  code: string
  name: string
  description: string | null
  capacity: number | null
  unit: string | null
  price: number | null
  is_active: boolean
  created_at?: string
}

export default function EmballagesPage() {
  const [emballages, setEmballages] = useState<Emballage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingEmballage, setEditingEmballage] = useState<Emballage | null>(null)
  const supabase = useSupabase()

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    capacity: '',
    unit: 'kg',
    price: '',
  })

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('emballages') as any)
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching emballages:', error)
        throw new Error(`Erreur: ${error.message || 'Erreur inconnue'}`)
      }

      setEmballages(data || [])
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

    const emballageData = {
      code: formData.code.trim(),
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      capacity: formData.capacity ? parseFloat(formData.capacity) : null,
      unit: formData.unit || null,
      price: formData.price ? parseFloat(formData.price) : null,
      is_active: true,
    }

    if (!emballageData.code || !emballageData.name) {
      toast.error('Le code et le nom sont obligatoires')
      return
    }

    try {
      if (editingEmballage) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('emballages') as any)
          .update(emballageData)
          .eq('id', editingEmballage.id)

        if (error) throw error
        toast.success('Emballage modifié avec succès')
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('emballages') as any).insert([emballageData])

        if (error) throw error
        toast.success('Emballage créé avec succès')
      }

      fetchData()
      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error saving emballage:', error)
      toast.error('Erreur lors de l\'enregistrement')
    }
  }

  const handleEdit = (emballage: Emballage) => {
    setEditingEmballage(emballage)
    setFormData({
      code: emballage.code,
      name: emballage.name,
      description: emballage.description || '',
      capacity: emballage.capacity?.toString() || '',
      unit: emballage.unit || 'kg',
      price: emballage.price?.toString() || '',
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (emballage: Emballage) => {
    if (!confirm(`Supprimer l'emballage "${emballage.name}" ?`)) return

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('emballages') as any)
        .delete()
        .eq('id', emballage.id)

      if (error) throw error
      toast.success('Emballage supprimé')
      fetchData()
    } catch (error) {
      console.error('Error deleting emballage:', error)
      toast.error('Erreur lors de la suppression')
    }
  }

  const resetForm = () => {
    setEditingEmballage(null)
    setFormData({
      code: '',
      name: '',
      description: '',
      capacity: '',
      unit: 'kg',
      price: '',
    })
  }

  const filteredEmballages = emballages.filter((emballage) => {
    const matchesSearch =
      emballage.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emballage.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emballage.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
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
            <h1 className="text-2xl font-bold text-gray-900">Emballages</h1>
            <p className="text-gray-500">Gérez les types d'emballages</p>
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
                  Nouvel emballage
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingEmballage ? 'Modifier l\'emballage' : 'Nouvel emballage'}
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
                        placeholder="Ex: EMB001"
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
                        placeholder="Ex: Seau 5kg"
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
                      placeholder="Description de l'emballage"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="capacity">Capacité</Label>
                      <Input
                        id="capacity"
                        type="number"
                        step="0.01"
                        value={formData.capacity}
                        onChange={(e) =>
                          setFormData({ ...formData, capacity: e.target.value })
                        }
                        placeholder="Ex: 5"
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
                        placeholder="Ex: kg, L"
                      />
                    </div>
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
                      placeholder="Prix de l'emballage"
                    />
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
                      {editingEmballage ? 'Modifier' : 'Créer'}
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
                Total Emballages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Box className="h-8 w-8 text-[#B8860B]" />
                <span className="text-2xl font-bold">{emballages.length}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Emballages actifs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Box className="h-8 w-8 text-[#DAA520]" />
                <span className="text-2xl font-bold">
                  {emballages.filter(e => e.is_active).length}
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
            ) : filteredEmballages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Aucun emballage trouvé
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Capacité</TableHead>
                      <TableHead className="text-right">Prix</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmballages.map((emballage) => (
                      <TableRow key={emballage.id}>
                        <TableCell className="font-medium">{emballage.code}</TableCell>
                        <TableCell>{emballage.name}</TableCell>
                        <TableCell className="text-gray-500">
                          {emballage.description || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {emballage.capacity ? `${emballage.capacity} ${emballage.unit || ''}` : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatPrice(emballage.price)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <ProtectedModule module="articles" action="edit">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(emballage)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </ProtectedModule>
                            <ProtectedModule module="articles" action="delete">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(emballage)}
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
              {filteredEmballages.length} emballage(s) affiché(s)
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedModule>
  )
}
