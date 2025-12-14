'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import type { Permission, PermissionAction } from '@/types/auth'

export function usePermissions() {
  const { profile, isAuthenticated } = useAuth()
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const fetchPermissions = useCallback(async () => {
    if (!profile?.role_id) {
      setPermissions([])
      setIsLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select(`
          *,
          module:modules(*)
        `)
        .eq('role_id', profile.role_id)

      if (error) {
        console.error('Error fetching permissions:', error)
        setPermissions([])
        return
      }

      const formattedPermissions: Permission[] = (data || []).map((rp: any) => ({
        moduleId: rp.module.id,
        moduleCode: rp.module.code,
        moduleName: rp.module.name,
        modulePath: rp.module.path,
        moduleIcon: rp.module.icon,
        canView: rp.can_view,
        canCreate: rp.can_create,
        canEdit: rp.can_edit,
        canDelete: rp.can_delete,
      }))

      setPermissions(formattedPermissions)
    } catch (error) {
      console.error('Error in fetchPermissions:', error)
      setPermissions([])
    } finally {
      setIsLoading(false)
    }
  }, [profile?.role_id, supabase])

  useEffect(() => {
    if (isAuthenticated && profile) {
      fetchPermissions()
    } else {
      setPermissions([])
      setIsLoading(false)
    }
  }, [isAuthenticated, profile, fetchPermissions])

  // Vérifier si l'utilisateur est admin
  const isAdmin = profile?.role?.name === 'admin'

  // Vérifier une permission spécifique
  const can = useCallback(
    (moduleCode: string, action: PermissionAction): boolean => {
      // Admin a tous les droits
      if (isAdmin) return true

      const permission = permissions.find((p) => p.moduleCode === moduleCode)
      if (!permission) return false

      switch (action) {
        case 'view':
          return permission.canView
        case 'create':
          return permission.canCreate
        case 'edit':
          return permission.canEdit
        case 'delete':
          return permission.canDelete
        default:
          return false
      }
    },
    [permissions, isAdmin]
  )

  // Vérifier si l'utilisateur peut accéder à un module
  const canAccessModule = useCallback(
    (moduleCode: string): boolean => {
      return can(moduleCode, 'view')
    },
    [can]
  )

  // Obtenir les modules accessibles pour la navigation
  const getAccessibleModules = useCallback(() => {
    if (isAdmin) {
      return permissions
    }
    return permissions.filter((p) => p.canView)
  }, [permissions, isAdmin])

  return {
    permissions,
    isLoading,
    isAdmin,
    can,
    canAccessModule,
    getAccessibleModules,
    refetch: fetchPermissions,
  }
}
