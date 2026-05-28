'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import type { AuthUser, UserWithRole, LoginCredentials } from '@/types/auth'

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<UserWithRole | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        role:roles(*)
      `)
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching profile:', error.message, error.code, error.details)
      return null
    }

    return data as UserWithRole
  }, [supabase])

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          setUser(user as AuthUser)
          const userProfile = await fetchProfile(user.id)
          setProfile(userProfile)
        }
      } catch (error) {
        console.error('Error getting user:', error)
      } finally {
        setIsLoading(false)
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user as AuthUser)
          const userProfile = await fetchProfile(session.user.id)
          setProfile(userProfile)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, fetchProfile])

  const signIn = async ({ email, password }: LoginCredentials) => {
    setIsLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setIsLoading(false)
      throw error
    }

    if (data.user) {
      setUser(data.user as AuthUser)
      const userProfile = await fetchProfile(data.user.id)
      setProfile(userProfile)
    }

    setIsLoading(false)
    router.push('/')
    router.refresh()
  }

  const signOut = async () => {
    setIsLoading(true)
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setIsLoading(false)
    router.push('/login')
    router.refresh()
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })

    if (error) {
      throw error
    }
  }

  return {
    user,
    profile,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signOut,
    resetPassword,
  }
}
