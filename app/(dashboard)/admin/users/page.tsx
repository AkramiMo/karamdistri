'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ProtectedModule } from '@/components/auth/ProtectedModule'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Badge } from '@/components/ui/badge'
import { Search, Users, Plus, Pencil, Trash2, UserCheck, UserX, Shield, Key } from 'lucide-react'
import type { Role } from '@/types/database'

interface UserWithRole {
  id: string
  email: string
  full_name: string | null
  is_active: boolean
  role_id: string | null
  created_at: string
  role: Role | null
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserWithRole[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null)
  const supabase = createClient()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role_id: '',
  })

  const [editFormData, setEditFormData] = useState({
    full_name: '',
    role_id: '',
  })

  const fetchData = async () => {
    setIsLoading(true)

    // Fetch users with roles
    const { data: usersData } = await supabase
      .from('users')
      .select(`*, role:roles(*)`)
      .order('created_at', { ascending: false })

    // Fetch all roles
    const { data: rolesData } = await supabase
      .from('roles')
      .select('*')
      .order('name')

    if (usersData) setUsers(usersData as UserWithRole[])
    if (rolesData) setRoles(rolesData)

    setIsLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.email || !formData.password) {
      alert('Email et mot de passe sont requis')
      return
    }

    try {
      // Create user via admin API
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          role_id: formData.role_id || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(`Erreur lors de la creation: ${data.error}`)
        return
      }

      fetchData()
      setIsDialogOpen(false)
      resetForm()
      alert('Utilisateur cree avec succes!')
    } catch (error) {
      console.error('Error:', error)
      alert('Erreur lors de la creation de l\'utilisateur')
    }
  }

  const handleEditUser = (user: UserWithRole) => {
    setEditingUser(user)
    setEditFormData({
      full_name: user.full_name || '',
      role_id: user.role_id || '',
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingUser) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('users') as any)
      .update({
        full_name: editFormData.full_name || null,
        role_id: editFormData.role_id || null,
      })
      .eq('id', editingUser.id)

    if (error) {
      alert(`Erreur: ${error.message}`)
      return
    }

    fetchData()
    setIsEditDialogOpen(false)
    setEditingUser(null)
  }

  const handleRoleChange = async (userId: string, roleId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('users') as any)
      .update({ role_id: roleId || null })
      .eq('id', userId)

    if (!error) {
      fetchData()
    }
  }

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('users') as any)
      .update({ is_active: !isActive })
      .eq('id', userId)

    if (!error) {
      fetchData()
    }
  }

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Etes-vous sur de vouloir supprimer l'utilisateur ${email} ?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users?id=${userId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        alert(`Erreur: ${data.error}`)
        return
      }

      fetchData()
    } catch (error) {
      console.error('Error:', error)
      alert('Erreur lors de la suppression')
    }
  }

  const handleResetPassword = async (userId: string, email: string) => {
    const newPassword = prompt(`Entrez le nouveau mot de passe pour ${email} (minimum 6 caracteres):`)

    if (!newPassword) return

    if (newPassword.length < 6) {
      alert('Le mot de passe doit contenir au moins 6 caracteres')
      return
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          newPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(`Erreur: ${data.error}`)
        return
      }

      alert('Mot de passe mis a jour avec succes!')
    } catch (error) {
      console.error('Error:', error)
      alert('Erreur lors de la mise a jour du mot de passe')
    }
  }

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      full_name: '',
      role_id: '',
    })
  }

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Stats by role
  const adminCount = users.filter(u => u.role?.name === 'admin').length
  const commercialCount = users.filter(u => u.role?.name === 'commercial').length
  const livreurCount = users.filter(u => u.role?.name === 'livreur').length

  return (
    <ProtectedModule module="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
            <p className="text-gray-500">Gerez les utilisateurs du systeme</p>
          </div>

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
                Nouvel Utilisateur
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Creer un nouvel utilisateur</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    placeholder="email@exemple.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                    placeholder="Minimum 6 caracteres"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nom complet</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Prenom Nom"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={formData.role_id}
                    onValueChange={(value) => setFormData({ ...formData, role_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selectionner un role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name} {role.description && `- ${role.description}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" className="bg-[#B8860B] hover:bg-[#9A7209]">
                    Creer l'utilisateur
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-8 w-8 text-blue-600" />
                <span className="text-2xl font-bold">{users.length}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Actifs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <UserCheck className="h-6 w-6 text-[#B8860B]" />
                <span className="text-2xl font-bold text-[#B8860B]">
                  {users.filter((u) => u.is_active).length}
                </span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Admins
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-purple-600" />
                <span className="text-2xl font-bold text-purple-600">{adminCount}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Commerciaux
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-blue-600">{commercialCount}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Livreurs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-orange-600">{livreurCount}</span>
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
                  placeholder="Rechercher un utilisateur..."
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
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Aucun utilisateur trouve
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.full_name || '-'}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Select
                            value={user.role_id || ''}
                            onValueChange={(value) => handleRoleChange(user.id, value)}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="Selectionner" />
                            </SelectTrigger>
                            <SelectContent>
                              {roles.map((role) => (
                                <SelectItem key={role.id} value={role.id}>
                                  {role.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              user.is_active
                                ? 'bg-amber-100 text-[#9A7209]'
                                : 'bg-red-100 text-red-800'
                            }
                          >
                            {user.is_active ? 'Actif' : 'Inactif'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Modifier"
                              onClick={() => handleEditUser(user)}
                            >
                              <Pencil className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Reinitialiser mot de passe"
                              onClick={() => handleResetPassword(user.id, user.email)}
                            >
                              <Key className="h-4 w-4 text-amber-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title={user.is_active ? 'Desactiver' : 'Activer'}
                              onClick={() => handleToggleActive(user.id, user.is_active)}
                            >
                              {user.is_active ? (
                                <UserX className="h-4 w-4 text-orange-600" />
                              ) : (
                                <UserCheck className="h-4 w-4 text-[#B8860B]" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Supprimer"
                              onClick={() => handleDeleteUser(user.id, user.email)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
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

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Modifier l'utilisateur</DialogTitle>
            </DialogHeader>
            {editingUser && (
              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={editingUser.email} disabled className="bg-gray-100" />
                  <p className="text-xs text-gray-500">L'email ne peut pas etre modifie</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_full_name">Nom complet</Label>
                  <Input
                    id="edit_full_name"
                    value={editFormData.full_name}
                    onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                    placeholder="Prenom Nom"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={editFormData.role_id}
                    onValueChange={(value) => setEditFormData({ ...editFormData, role_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selectionner un role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name} {role.description && `- ${role.description}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                    Enregistrer
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedModule>
  )
}
