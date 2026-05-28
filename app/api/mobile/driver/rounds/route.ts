import { NextRequest, NextResponse } from 'next/server'
import { verifyDriverAuth, supabaseAdmin, errorResponse, successResponse } from '@/lib/api/mobile-auth'

export async function GET(request: NextRequest) {
  try {
    // Verify driver authentication
    const authResult = await verifyDriverAuth(request)

    if (!authResult.success) {
      return errorResponse(authResult.error!, authResult.status)
    }

    const userId = authResult.user!.id
    const isAdmin = authResult.user?.role?.name?.toLowerCase() === 'admin'

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const date = searchParams.get('date')

    // Build query
    let query = supabaseAdmin
      .from('delivery_rounds')
      .select(`
        id,
        round_number,
        status,
        round_date,
        start_time,
        end_time,
        total_distance,
        total_duration,
        notes,
        driver:users!delivery_rounds_driver_id_fkey(id, full_name),
        delivery_round_items(
          id,
          delivery_id,
          status
        )
      `)

    // Filter by driver if not admin
    if (!isAdmin) {
      query = query.eq('driver_id', userId)
    }

    // Filter by status if provided
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    // Filter by date only if explicitly provided (not when filtering by status alone)
    if (date) {
      query = query.eq('round_date', date)
    } else if (!status) {
      // Default to today only if no status filter is applied
      query = query.eq('round_date', new Date().toISOString().split('T')[0])
    }

    // Order by creation date
    query = query.order('created_at', { ascending: false })

    const { data: rounds, error } = await query

    if (error) {
      console.error('Fetch rounds error:', error)
      return errorResponse('Erreur lors de la récupération des tournées', 500)
    }

    // Transform data for mobile app
    const formattedRounds = (rounds || []).map(round => {
      const items = round.delivery_round_items || []
      const deliveredCount = items.filter((item: any) =>
        item.status === 'delivered' || item.status === 'partial'
      ).length

      return {
        id: round.id,
        round_number: round.round_number,
        status: round.status,
        round_date: round.round_date,
        start_time: round.start_time,
        end_time: round.end_time,
        total_distance: round.total_distance,
        estimated_duration: round.total_duration,
        deliveries_count: items.length,
        delivered_count: deliveredCount,
        driver: round.driver
      }
    })

    return successResponse({ rounds: formattedRounds })

  } catch (error) {
    console.error('Rounds API error:', error)
    return errorResponse('Erreur serveur', 500)
  }
}
