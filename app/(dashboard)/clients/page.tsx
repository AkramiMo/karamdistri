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
import { Plus, Search, Edit, Trash2, Users } from 'lucide-react'
import type { Client } from '@/types/database'

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const supabase = createClient()

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    contact_name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    category: '',
  })

  const fetchClients = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching clients:', error)
    } else {
      setClients(data || [])
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchClients()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (editingClient) {
      // Update
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('clients') as any)
        .update(formData)
        .eq('id', editingClient.id)

      if (!error) {
        fetchClients()
        setIsDialogOpen(false)
        resetForm()
      }
    } else {
      // Create
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('clients') as any).insert([formData])

      if (!error) {
        fetchClients()
        setIsDialogOpen(false)
        resetForm()
      }
    }
  }

  const handleEdit = (client: Client) => {
    setEditingClient(client)
    setFormData({
      code: client.code,
      name: client.name,
      contact_name: client.contact_name || '',
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || '',
      city: client.city || '',
      category: client.category || '',
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('clients') as any).delete().eq('id', id)
      if (!error) {
        fetchClients()
      }
    }
  }

  const resetForm = () => {
    setEditingClient(null)
    setFormData({
      code: '',
      name: '',
      contact_name: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      category: '',
    })
  }

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.city?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <ProtectedModule module="clients">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
            <p className="text-gray-500">Gérez vos clients</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <ProtectedModule module="clients" action="create">
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    resetForm()
                    setIsDialogOpen(true)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nouveau client
                </Button>
              </ProtectedModule>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingClient ? 'Modifier le client' : 'Nouveau client'}
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
                    <Label htmlFor="name">Nom *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_name">Contact</Label>
                    <Input
                      id="contact_name"
                      value={formData.contact_name}
                      onChange={(e) =>
                        setFormData({ ...formData, contact_name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Ville</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="address">Adresse</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Catégorie</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
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
                    {editingClient ? 'Modifier' : 'Créer'}
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
                Total Clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-8 w-8 text-green-600" />
                <span className="text-2xl font-bold">{clients.length}</span>
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
                  placeholder="Rechercher un client..."
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
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Aucun client trouvé
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Ville</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.code}</TableCell>
                      <TableCell>{client.name}</TableCell>
                      <TableCell>{client.contact_name}</TableCell>
                      <TableCell>{client.phone}</TableCell>
                      <TableCell>{client.city}</TableCell>
                      <TableCell>{client.category}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <ProtectedModule module="clients" action="edit">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(client)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </ProtectedModule>
                          <ProtectedModule module="clients" action="delete">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600"
                              onClick={() => handleDelete(client.id)}
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
