'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ProtectedModule } from '@/components/auth/ProtectedModule'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Shield, Save } from 'lucide-react'
import type { Role, Module } from '@/types/database'

interface RolePermission {
  role_id: string
  module_id: string
  can_view: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [modules, setModules] = useState<Module[]>([])
  const [permissions, setPermissions] = useState<RolePermission[]>([])
  const [selectedRole, setSelectedRole] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const supabase = createClient()

  const fetchData = async () => {
    setIsLoading(true)

    const { data: rolesData } = await supabase.from('roles').select('*').order('name')
    const { data: modulesData } = await supabase.from('modules').select('*').order('sort_order')
    const { data: permissionsData } = await supabase.from('role_permissions').select('*')

    if (rolesData) {
      setRoles(rolesData as Role[])
      if (rolesData.length > 0 && !selectedRole) {
        setSelectedRole((rolesData as Role[])[0].id)
      }
    }
    if (modulesData) setModules(modulesData as Module[])
    if (permissionsData) setPermissions(permissionsData as RolePermission[])

    setIsLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const getPermission = (moduleId: string) => {
    return permissions.find(
      (p) => p.role_id === selectedRole && p.module_id === moduleId
    ) || {
      role_id: selectedRole,
      module_id: moduleId,
      can_view: false,
      can_create: false,
      can_edit: false,
      can_delete: false,
    }
  }

  const handlePermissionChange = (
    moduleId: string,
    field: 'can_view' | 'can_create' | 'can_edit' | 'can_delete',
    value: boolean
  ) => {
    setPermissions((prev) => {
      const existing = prev.find(
        (p) => p.role_id === selectedRole && p.module_id === moduleId
      )

      if (existing) {
        return prev.map((p) =>
          p.role_id === selectedRole && p.module_id === moduleId
            ? { ...p, [field]: value }
            : p
        )
      } else {
        return [
          ...prev,
          {
            role_id: selectedRole,
            module_id: moduleId,
            can_view: field === 'can_view' ? value : false,
            can_create: field === 'can_create' ? value : false,
            can_edit: field === 'can_edit' ? value : false,
            can_delete: field === 'can_delete' ? value : false,
          },
        ]
      }
    })
  }

  const handleSave = async () => {
    setIsSaving(true)

    const rolePermissions = permissions.filter((p) => p.role_id === selectedRole)

    for (const perm of rolePermissions) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('role_permissions') as any).upsert(
        {
          role_id: perm.role_id,
          module_id: perm.module_id,
          can_view: perm.can_view,
          can_create: perm.can_create,
          can_edit: perm.can_edit,
          can_delete: perm.can_delete,
        },
        {
          onConflict: 'role_id,module_id',
        }
      )

      if (error) {
        console.error('Error saving permission:', error)
      }
    }

    setIsSaving(false)
    alert('Permissions sauvegardées avec succès !')
  }

  const selectedRoleName = roles.find((r) => r.id === selectedRole)?.name

  return (
    <ProtectedModule module="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rôles & Permissions</h1>
            <p className="text-gray-500">Configurez les permissions de chaque rôle</p>
          </div>

          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[#B8860B] hover:bg-[#9A7209]"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Chargement...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Liste des rôles */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Rôles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {roles.map((role) => (
                    <Button
                      key={role.id}
                      variant={selectedRole === role.id ? 'default' : 'outline'}
                      className={`w-full justify-start ${
                        selectedRole === role.id
                          ? 'bg-[#B8860B] hover:bg-[#9A7209]'
                          : ''
                      }`}
                      onClick={() => setSelectedRole(role.id)}
                    >
                      {role.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tableau des permissions */}
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-lg">
                  Permissions du rôle : <span className="text-[#B8860B] capitalize">{selectedRoleName}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Module</TableHead>
                      <TableHead className="text-center">Voir</TableHead>
                      <TableHead className="text-center">Créer</TableHead>
                      <TableHead className="text-center">Modifier</TableHead>
                      <TableHead className="text-center">Supprimer</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modules.map((module) => {
                      const perm = getPermission(module.id)
                      const isAdmin = selectedRoleName === 'admin'

                      return (
                        <TableRow key={module.id}>
                          <TableCell className="font-medium">{module.name}</TableCell>
                          <TableCell className="text-center">
                            <Checkbox
                              checked={isAdmin || perm.can_view}
                              disabled={isAdmin}
                              onCheckedChange={(checked) =>
                                handlePermissionChange(module.id, 'can_view', !!checked)
                              }
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Checkbox
                              checked={isAdmin || perm.can_create}
                              disabled={isAdmin}
                              onCheckedChange={(checked) =>
                                handlePermissionChange(module.id, 'can_create', !!checked)
                              }
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Checkbox
                              checked={isAdmin || perm.can_edit}
                              disabled={isAdmin}
                              onCheckedChange={(checked) =>
                                handlePermissionChange(module.id, 'can_edit', !!checked)
                              }
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Checkbox
                              checked={isAdmin || perm.can_delete}
                              disabled={isAdmin}
                              onCheckedChange={(checked) =>
                                handlePermissionChange(module.id, 'can_delete', !!checked)
                              }
                            />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
                {selectedRoleName === 'admin' && (
                  <p className="text-sm text-gray-500 mt-4">
                    Le rôle Admin a automatiquement toutes les permissions.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ProtectedModule>
  )
}
