import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create admin client with service role key
const supabaseAdmin = createClient(
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
    const { email, password, full_name, role_id } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email et mot de passe requis' },
        { status: 400 }
      )
    }

    // Create user in Supabase Auth using admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name
      }
    })

    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Erreur lors de la creation de l\'utilisateur' },
        { status: 500 }
      )
    }

    // Create user record in public.users table
    const { error: userError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: authData.user.id,
        email: email,
        full_name: full_name || null,
        role_id: role_id || null,
        is_active: true,
      })

    if (userError) {
      console.error('User table error:', userError)
      // User was created in auth, return success anyway
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email
      }
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId, newPassword } = await request.json()

    if (!userId || !newPassword) {
      return NextResponse.json(
        { error: 'ID utilisateur et nouveau mot de passe requis' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 6 caractères' },
        { status: 400 }
      )
    }

    // Update password using admin API
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword
    })

    if (error) {
      console.error('Password update error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('id')

    if (!userId) {
      return NextResponse.json(
        { error: 'ID utilisateur requis' },
        { status: 400 }
      )
    }

    // First, remove references to this user in other tables
    // Set user references to NULL to avoid foreign key constraint errors
    await supabaseAdmin.from('clients').update({ commercial_id: null }).eq('commercial_id', userId)
    await supabaseAdmin.from('orders').update({ commercial_id: null }).eq('commercial_id', userId)
    await supabaseAdmin.from('deliveries').update({ driver_id: null }).eq('driver_id', userId)
    await supabaseAdmin.from('sales').update({ user_id: null }).eq('user_id', userId)
    await supabaseAdmin.from('cash_register').update({ user_id: null }).eq('user_id', userId)
    await supabaseAdmin.from('stock_movements').update({ user_id: null }).eq('user_id', userId)
    await supabaseAdmin.from('purchase_orders').update({ user_id: null }).eq('user_id', userId)
    await supabaseAdmin.from('receptions').update({ user_id: null }).eq('user_id', userId)
    await supabaseAdmin.from('fiches_trajet').update({ driver_id: null }).eq('driver_id', userId)
    await supabaseAdmin.from('delivery_rounds').update({ driver_id: null }).eq('driver_id', userId)

    // Delete from public.users first
    const { error: userError } = await supabaseAdmin.from('users').delete().eq('id', userId)

    if (userError) {
      console.error('User delete error:', userError)
      return NextResponse.json(
        { error: `Erreur suppression utilisateur: ${userError.message}` },
        { status: 400 }
      )
    }

    // Delete from auth
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (error) {
      console.error('Delete error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
