import { NextRequest, NextResponse } from 'next/server'
import {
  verifyDriverAuth,
  verifyRoundOwnership,
  supabaseAdmin,
  errorResponse,
  successResponse
} from '@/lib/api/mobile-auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roundId } = await params

    // Verify driver authentication
    const authResult = await verifyDriverAuth(request)

    if (!authResult.success) {
      return errorResponse(authResult.error!, authResult.status)
    }

    // Verify round ownership
    const ownershipResult = await verifyRoundOwnership(roundId, authResult.user!.id)

    if (!ownershipResult.success) {
      return errorResponse(ownershipResult.error!, 403)
    }

    const round = ownershipResult.round

    // Validate round status
    if (round.status !== 'in_progress') {
      return errorResponse(
        round.status === 'pending'
          ? 'Cette tournée n\'a pas encore été démarrée'
          : 'Cette tournée est déjà terminée',
        400
      )
    }

    const endTime = new Date().toISOString()

    // Get summary statistics
    const { data: roundItems, error: itemsError } = await supabaseAdmin
      .from('delivery_round_items')
      .select('status')
      .eq('round_id', roundId)

    if (itemsError) {
      console.error('Fetch round items error:', itemsError)
    }

    const items = roundItems || []
    const summary = {
      total_deliveries: items.length,
      delivered: items.filter((i: any) => i.status === 'delivered').length,
      partial: items.filter((i: any) => i.status === 'partial').length,
      returned: items.filter((i: any) => i.status === 'returned').length,
      pending: items.filter((i: any) => i.status === 'pending').length
    }

    // Calculate duration in minutes if we have start_time
    let totalDuration = round.total_duration
    if (round.start_time) {
      const startDate = new Date(round.start_time)
      const endDate = new Date(endTime)
      totalDuration = Math.round((endDate.getTime() - startDate.getTime()) / 60000)
    }

    // Update round status
    const { error: roundError } = await supabaseAdmin
      .from('delivery_rounds')
      .update({
        status: 'completed',
        end_time: endTime,
        total_duration: totalDuration,
        updated_at: endTime
      })
      .eq('id', roundId)

    if (roundError) {
      console.error('Update round error:', roundError)
      return errorResponse('Erreur lors de la terminaison de la tournée', 500)
    }

    // Update any remaining 'pending' delivery round items to 'returned'
    await supabaseAdmin
      .from('delivery_round_items')
      .update({ status: 'returned' })
      .eq('round_id', roundId)
      .eq('status', 'pending')

    return successResponse({
      round: {
        id: roundId,
        status: 'completed',
        start_time: round.start_time,
        end_time: endTime,
        total_duration: totalDuration,
        summary
      }
    })

  } catch (error) {
    console.error('Stop round API error:', error)
    return errorResponse('Erreur serveur', 500)
  }
}
