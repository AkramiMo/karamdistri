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
import { Search, Users, Edit } from 'lucide-react'
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
  const supabase = createClient()

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

  const handleRoleChange = async (userId: string, roleId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('users') as any)
      .update({ role_id: roleId })
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

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <ProtectedModule module="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
            <p className="text-gray-500">Gérez les utilisateurs du système</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Utilisateurs
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
              <span className="text-2xl font-bold text-green-600">
                {users.filter((u) => u.is_active).length}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Inactifs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-red-600">
                {users.filter((u) => !u.is_active).length}
              </span>
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
                Aucun utilisateur trouvé
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rôle</TableHead>
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
                            <SelectValue placeholder="Sélectionner" />
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
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }
                        >
                          {user.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(user.id, user.is_active)}
                        >
                          {user.is_active ? 'Désactiver' : 'Activer'}
                        </Button>
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
