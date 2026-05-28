'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import type { Permission, PermissionAction } from '@/types/auth'

export function usePermissions() {
  const { profile, isAuthenticated } = useAuth()
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [permissionsConfigured, setPermissionsConfigured] = useState(false)
  const supabase = createClient()

  const fetchPermissions = useCallback(async () => {
    if (!isAuthenticated) {
      setPermissions([])
      setIsLoading(false)
      setPermissionsConfigured(false)
      return
    }

    try {
      // First, check if the role_permissions table exists and has data
      const { data: rolePermsData, error: rolePermsError } = await supabase
        .from('role_permissions')
        .select('id')
        .limit(1)

      // If table doesn't exist or is empty, permissions are not configured
      if (rolePermsError || !rolePermsData || rolePermsData.length === 0) {
        setPermissionsConfigured(false)
        setPermissions([])
        setIsLoading(false)
        return
      }

      setPermissionsConfigured(true)

      // If user has no role, allow all (first user setup)
      if (!profile?.role_id) {
        setPermissions([])
        setIsLoading(false)
        return
      }

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

      // Debug: afficher les permissions chargées
      console.log('Permissions chargées:', formattedPermissions.map(p => ({ code: p.moduleCode, canView: p.canView })))

      setPermissions(formattedPermissions)
    } catch (error) {
      console.error('Error in fetchPermissions:', error)
      setPermissionsConfigured(false)
      setPermissions([])
    } finally {
      setIsLoading(false)
    }
  }, [profile?.role_id, isAuthenticated, supabase])

  useEffect(() => {
    fetchPermissions()
  }, [fetchPermissions])

  // Check if user is admin
  const isAdmin = profile?.role?.name === 'admin'

  // Check a specific permission
  // If permissions are not configured, allow everything (permissive mode)
  const can = useCallback(
    (moduleCode: string, action: PermissionAction): boolean => {
      // If permissions system is not configured, allow everything
      if (!permissionsConfigured) {
        return true
      }

      // Admin has all rights
      if (isAdmin) return true

      // If user has no role assigned yet, allow everything
      if (!profile?.role_id) {
        return true
      }

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
    [permissions, isAdmin, permissionsConfigured, profile?.role_id]
  )

  // Check if user can access a module
  const canAccessModule = useCallback(
    (moduleCode: string): boolean => {
      return can(moduleCode, 'view')
    },
    [can]
  )

  // Get accessible modules for navigation
  const getAccessibleModules = useCallback(() => {
    if (!permissionsConfigured || isAdmin) {
      return permissions
    }
    return permissions.filter((p) => p.canView)
  }, [permissions, isAdmin, permissionsConfigured])

  return {
    permissions,
    isLoading,
    isAdmin,
    permissionsConfigured,
    can,
    canAccessModule,
    getAccessibleModules,
    refetch: fetchPermissions,
  }
}
