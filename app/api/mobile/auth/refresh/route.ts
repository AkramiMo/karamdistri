import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Create Supabase client for auth operations
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { refresh_token } = body

    // Validate input
    if (!refresh_token) {
      return NextResponse.json(
        { success: false, error: 'Refresh token requis' },
        { status: 400 }
      )
    }

    // Attempt to refresh the session
    const { data: sessionData, error: refreshError } = await supabase.auth.refreshSession({
      refresh_token
    })

    if (refreshError) {
      console.error('Refresh error:', refreshError)
      return NextResponse.json(
        { success: false, error: 'Token invalide ou expiré' },
        { status: 401 }
      )
    }

    if (!sessionData.session) {
      return NextResponse.json(
        { success: false, error: 'Impossible de renouveler la session' },
        { status: 401 }
      )
    }

    // Return new session tokens
    return NextResponse.json({
      success: true,
      session: {
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        expires_at: sessionData.session.expires_at
      }
    })

  } catch (error) {
    console.error('Refresh API error:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
