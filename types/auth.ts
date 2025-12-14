import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { User, Role, Module, RolePermission } from './database'

export interface AuthUser extends SupabaseUser {
  user_metadata: {
    full_name?: string
    avatar_url?: string
  }
}

export interface UserWithRole extends User {
  role: Role | null
}

export interface Permission {
  moduleId: string
  moduleCode: string
  moduleName: string
  modulePath: string
  moduleIcon: string | null
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
}

export interface ModuleWithPermission extends Module {
  permission?: RolePermission
}

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete'

export interface AuthState {
  user: AuthUser | null
  profile: UserWithRole | null
  permissions: Permission[]
  isLoading: boolean
  isAuthenticated: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface SignUpCredentials extends LoginCredentials {
  fullName: string
}
