import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { User } from '@/types'

interface AuthContextType {
  session: Session | null
  user: User | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Récupérer la session existante
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        fetchUserProfile(session.user.id)
      } else {
        setIsLoading(false)
      }
    })

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        if (session?.user) {
          await fetchUserProfile(session.user.id)
        } else {
          setUser(null)
          setIsLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId)
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, role_id')
        .eq('id', userId)
        .single()

      console.log('Profile result:', { data, error })

      if (error) {
        console.error('Profile fetch error:', error.message, error.code)
        throw error
      }

      if (!data) {
        console.error('No user profile found for id:', userId)
        // Sign out if no profile exists
        await supabase.auth.signOut()
        return
      }

      setUser(data)
    } catch (error: any) {
      console.error('Erreur lors de la récupération du profil:', error?.message || error)
      // Sign out on error to avoid infinite loading
      await supabase.auth.signOut()
    } finally {
      setIsLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      return { error }
    } catch (error) {
      return { error: error as Error }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ session, user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
