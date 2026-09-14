'use client'

import { usePermissions } from '@/hooks/usePermissions'
import { useAuth } from '@/hooks/useAuth'
import type { PermissionAction } from '@/types/auth'

interface ProtectedModuleProps {
  module: string
  action?: PermissionAction
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ProtectedModule({
  module,
  action = 'view',
  children,
  fallback,
}: ProtectedModuleProps) {
  const { can, isLoading, permissionsConfigured, isAdmin } = usePermissions()
  const { isLoading: isAuthLoading } = useAuth()

  // Admin voit tout immédiatement - pas besoin d'attendre
  if (isAdmin) {
    return <>{children}</>
  }

  // Pendant le chargement pour les non-admins, ne rien afficher
  if (isLoading || isAuthLoading) {
    return null
  }

  // Si les permissions ne sont pas configurées (aucun rôle assigné), autoriser tout
  if (!permissionsConfigured) {
    return <>{children}</>
  }

  // Vérifier les permissions - si pas autorisé, ne rien afficher
  if (!can(module, action)) {
    return fallback ?? null
  }

  return <>{children}</>
}
