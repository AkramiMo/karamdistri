import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Create Supabase client for auth operations
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Admin client for profile lookup
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email et mot de passe requis' },
        { status: 400 }
      )
    }

    // Attempt to sign in
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (authError) {
      console.error('Login error:', authError)
      return NextResponse.json(
        { success: false, error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      )
    }

    if (!authData.user || !authData.session) {
      return NextResponse.json(
        { success: false, error: 'Erreur d\'authentification' },
        { status: 401 }
      )
    }

    // Get user profile with role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        email,
        full_name,
        is_active,
        role:roles(id, name)
      `)
      .eq('id', authData.user.id)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      return NextResponse.json(
        { success: false, error: 'Profil utilisateur non trouvé' },
        { status: 404 }
      )
    }

    if (!profile.is_active) {
      return NextResponse.json(
        { success: false, error: 'Compte désactivé' },
        { status: 403 }
      )
    }

    // Return success with user info and session tokens
    return NextResponse.json({
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role
      },
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_at: authData.session.expires_at
      }
    })

  } catch (error) {
    console.error('Login API error:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
