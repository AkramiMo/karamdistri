'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Search, Edit, Trash2, Building2 } from 'lucide-react'

interface Supplier {
  id: string
  code: string
  name: string
  contact_name: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  is_active: boolean
}

export default function FournisseursPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isNewOnlyMode, setIsNewOnlyMode] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const supabase = createClient()

  // Ouvrir le dialog si ?action=new (mode formulaire uniquement)
  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setIsDialogOpen(true)
      setIsNewOnlyMode(true)
    }
  }, [searchParams])

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    contact_name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
  })

  const fetchSuppliers = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching suppliers:', error)
    } else {
      setSuppliers(data || [])
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchSuppliers()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (editingSupplier) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('suppliers') as any)
        .update(formData)
        .eq('id', editingSupplier.id)

      if (!error) {
        fetchSuppliers()
        setIsDialogOpen(false)
        resetForm()
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('suppliers') as any).insert([formData])

      if (!error) {
        fetchSuppliers()
        setIsDialogOpen(false)
        resetForm()
      }
    }
  }

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setFormData({
      code: supplier.code,
      name: supplier.name,
      contact_name: supplier.contact_name || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      city: supplier.city || '',
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur ?')) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('suppliers') as any).delete().eq('id', id)
      if (!error) {
        fetchSuppliers()
      }
    }
  }

  const resetForm = () => {
    setEditingSupplier(null)
    setFormData({
      code: '',
      name: '',
      contact_name: '',
      phone: '',
      email: '',
      address: '',
      city: '',
    })
  }

  const filteredSuppliers = suppliers.filter(
    (supplier) =>
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Fonction pour fermer le formulaire en mode plein écran
  const handleCloseNewOnly = () => {
    router.replace('/')
  }

  // Formulaire réutilisable
  const renderForm = (onCancel: () => void) => (
    <form onSubmit={async (e) => { await handleSubmit(e); if (isNewOnlyMode) handleCloseNewOnly(); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="code">Code *</Label>
          <Input id="code" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Nom *</Label>
          <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact_name">Contact</Label>
          <Input id="contact_name" value={formData.contact_name} onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Téléphone</Label>
          <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">Ville</Label>
          <Input id="city" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
        </div>
        <div className="col-span-2 space-y-2">
          <Label htmlFor="address">Adresse</Label>
          <Input id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
        <Button type="submit" className="bg-[#B8860B] hover:bg-[#9A7209]">{editingSupplier ? 'Modifier' : 'Créer'}</Button>
      </div>
    </form>
  )

  // Mode plein écran : afficher seulement le formulaire
  if (isNewOnlyMode) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="border-b bg-[#B8860B] text-white rounded-t-lg">
            <CardTitle className="text-xl flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Nouveau fournisseur
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {renderForm(handleCloseNewOnly)}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fournisseurs</h1>
          <p className="text-gray-500">Gérez vos fournisseurs</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (open) resetForm()
          setIsDialogOpen(open)
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingSupplier ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
              </DialogTitle>
            </DialogHeader>
            {renderForm(() => setIsDialogOpen(false))}
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Fournisseurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Building2 className="h-8 w-8 text-orange-600" />
              <span className="text-2xl font-bold">{suppliers.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher un fournisseur..."
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
          ) : filteredSuppliers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Aucun fournisseur trouvé</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">{supplier.code}</TableCell>
                    <TableCell>{supplier.name}</TableCell>
                    <TableCell>{supplier.contact_name}</TableCell>
                    <TableCell>{supplier.phone}</TableCell>
                    <TableCell>{supplier.city}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(supplier)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600"
                          onClick={() => handleDelete(supplier.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
  )
}
