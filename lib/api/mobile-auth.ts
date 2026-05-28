import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Create admin client for server-side operations
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

export interface MobileUser {
  id: string
  email: string
  full_name: string | null
  role: {
    id: string
    name: string
  } | null
}

export interface AuthResult {
  success: boolean
  user?: MobileUser
  error?: string
  status?: number
}

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)
}

/**
 * Verify JWT token and get user information
 * Returns the authenticated user or an error response
 */
export async function verifyMobileAuth(request: NextRequest): Promise<AuthResult> {
  const token = extractBearerToken(request)

  if (!token) {
    return {
      success: false,
      error: 'Token d\'authentification manquant',
      status: 401
    }
  }

  try {
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return {
        success: false,
        error: 'Token invalide ou expiré',
        status: 401
      }
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
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return {
        success: false,
        error: 'Profil utilisateur non trouvé',
        status: 404
      }
    }

    if (!profile.is_active) {
      return {
        success: false,
        error: 'Compte désactivé',
        status: 403
      }
    }

    return {
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role as { id: string; name: string } | null
      }
    }
  } catch (error) {
    console.error('Auth verification error:', error)
    return {
      success: false,
      error: 'Erreur de vérification d\'authentification',
      status: 500
    }
  }
}

/**
 * Verify that the user is a driver (chauffeur/livreur)
 */
export async function verifyDriverAuth(request: NextRequest): Promise<AuthResult> {
  const authResult = await verifyMobileAuth(request)

  if (!authResult.success) {
    return authResult
  }

  // Check if user has driver role
  const roleName = authResult.user?.role?.name?.toLowerCase()
  if (!roleName || !['chauffeur', 'livreur', 'driver', 'admin'].includes(roleName)) {
    return {
      success: false,
      error: 'Accès réservé aux livreurs',
      status: 403
    }
  }

  return authResult
}

/**
 * Verify that a round belongs to the authenticated driver
 */
export async function verifyRoundOwnership(
  roundId: string,
  userId: string
): Promise<{ success: boolean; round?: any; error?: string }> {
  try {
    const { data: round, error } = await supabaseAdmin
      .from('delivery_rounds')
      .select('*')
      .eq('id', roundId)
      .single()

    if (error || !round) {
      return {
        success: false,
        error: 'Tournée non trouvée'
      }
    }

    // Admin can access all rounds
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('role:roles(name)')
      .eq('id', userId)
      .single()

    const roleName = (userProfile?.role as any)?.name?.toLowerCase()

    if (roleName === 'admin') {
      return { success: true, round }
    }

    // Check ownership for non-admin users
    if (round.driver_id !== userId) {
      return {
        success: false,
        error: 'Accès non autorisé à cette tournée'
      }
    }

    return { success: true, round }
  } catch (error) {
    console.error('Round ownership verification error:', error)
    return {
      success: false,
      error: 'Erreur de vérification'
    }
  }
}

/**
 * Verify that a delivery belongs to a round owned by the driver
 */
export async function verifyDeliveryAccess(
  deliveryId: string,
  userId: string
): Promise<{ success: boolean; delivery?: any; roundItem?: any; error?: string }> {
  try {
    // Get the delivery and its round association
    const { data: roundItem, error: roundItemError } = await supabaseAdmin
      .from('delivery_round_items')
      .select(`
        *,
        round:delivery_rounds(id, driver_id, status),
        delivery:deliveries(*)
      `)
      .eq('delivery_id', deliveryId)
      .single()

    if (roundItemError || !roundItem) {
      // Check if delivery exists without round assignment
      const { data: delivery, error: deliveryError } = await supabaseAdmin
        .from('deliveries')
        .select('*')
        .eq('id', deliveryId)
        .single()

      if (deliveryError || !delivery) {
        return {
          success: false,
          error: 'Livraison non trouvée'
        }
      }

      // Check if delivery is assigned to the driver
      if (delivery.driver_id !== userId) {
        return {
          success: false,
          error: 'Accès non autorisé à cette livraison'
        }
      }

      return { success: true, delivery }
    }

    // Admin can access all deliveries
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('role:roles(name)')
      .eq('id', userId)
      .single()

    const roleName = (userProfile?.role as any)?.name?.toLowerCase()

    if (roleName === 'admin') {
      return {
        success: true,
        delivery: roundItem.delivery,
        roundItem
      }
    }

    // Check round ownership
    const round = roundItem.round as any
    if (round?.driver_id !== userId) {
      return {
        success: false,
        error: 'Accès non autorisé à cette livraison'
      }
    }

    return {
      success: true,
      delivery: roundItem.delivery,
      roundItem
    }
  } catch (error) {
    console.error('Delivery access verification error:', error)
    return {
      success: false,
      error: 'Erreur de vérification'
    }
  }
}

/**
 * Create error response helper
 */
export function errorResponse(message: string, status: number = 400): NextResponse {
  return NextResponse.json(
    { success: false, error: message },
    { status }
  )
}

/**
 * Create success response helper
 */
export function successResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(
    { success: true, ...data },
    { status }
  )
}

export { supabaseAdmin }
