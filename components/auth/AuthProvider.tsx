'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AuthUser, UserWithRole, Permission } from '@/types/auth'

interface AuthContextType {
  user: AuthUser | null
  profile: UserWithRole | null
  permissions: Permission[]
  isLoading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  permissions: [],
  isLoading: true,
  isAuthenticated: false,
  isAdmin: false,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<UserWithRole | null>(null)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          setUser(user as AuthUser)

          // Fetch user profile with role
          const { data: profileData } = await supabase
            .from('users')
            .select(`*, role:roles(*)`)
            .eq('id', user.id)
            .single()

          if (profileData) {
            const typedProfile = profileData as UserWithRole
            setProfile(typedProfile)

            // Fetch permissions
            if (typedProfile.role_id) {
              const { data: permData } = await supabase
                .from('role_permissions')
                .select(`*, module:modules(*)`)
                .eq('role_id', typedProfile.role_id)

              if (permData) {
                const formattedPermissions: Permission[] = permData.map((rp: any) => ({
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
              }
            }
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
          setPermissions([])
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const isAdmin = profile?.role?.name === 'admin'

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        permissions,
        isLoading,
        isAuthenticated: !!user,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuthContext = () => useContext(AuthContext)
