'use client'

import { usePermissions } from '@/hooks/usePermissions'
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
  const { can, isLoading } = usePermissions()

  if (isLoading) {
    return null
  }

  if (!can(module, action)) {
    return fallback ?? <AccessDenied />
  }

  return <>{children}</>
}

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <div className="rounded-full bg-red-100 p-4 mb-4">
        <svg
          className="w-12 h-12 text-red-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        Accès non autorisé
      </h2>
      <p className="text-gray-600">
        Vous n&apos;avez pas les permissions nécessaires pour accéder à cette page.
      </p>
    </div>
  )
}
