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
    if (round.status !== 'pending') {
      return errorResponse(
        round.status === 'in_progress'
          ? 'Cette tournée est déjà en cours'
          : 'Cette tournée ne peut pas être démarrée',
        400
      )
    }

    // Parse optional GPS position from request body
    let depotLat = round.depot_lat
    let depotLng = round.depot_lng

    try {
      const body = await request.json()
      if (body.lat && body.lng) {
        depotLat = body.lat
        depotLng = body.lng
      }
    } catch {
      // No body or invalid JSON, use existing depot coordinates
    }

    const startTime = new Date().toISOString()

    // Update round status
    const { error: roundError } = await supabaseAdmin
      .from('delivery_rounds')
      .update({
        status: 'in_progress',
        start_time: startTime,
        depot_lat: depotLat,
        depot_lng: depotLng,
        updated_at: startTime
      })
      .eq('id', roundId)

    if (roundError) {
      console.error('Update round error:', roundError)
      return errorResponse('Erreur lors du démarrage de la tournée', 500)
    }

    // Get all delivery IDs from this round
    const { data: roundItems, error: itemsError } = await supabaseAdmin
      .from('delivery_round_items')
      .select('delivery_id')
      .eq('round_id', roundId)

    if (itemsError) {
      console.error('Fetch round items error:', itemsError)
    }

    // Update all deliveries to 'in_delivery' status
    if (roundItems && roundItems.length > 0) {
      const deliveryIds = roundItems.map(item => item.delivery_id).filter(Boolean)

      if (deliveryIds.length > 0) {
        const { error: deliveryError } = await supabaseAdmin
          .from('deliveries')
          .update({ status: 'in_delivery' })
          .in('id', deliveryIds)

        if (deliveryError) {
          console.error('Update deliveries error:', deliveryError)
        }

        // Also update associated orders
        const { data: deliveries } = await supabaseAdmin
          .from('deliveries')
          .select('order_id')
          .in('id', deliveryIds)

        if (deliveries) {
          const orderIds = deliveries
            .map(d => d.order_id)
            .filter((id, index, self) => id && self.indexOf(id) === index)

          if (orderIds.length > 0) {
            await supabaseAdmin
              .from('orders')
              .update({ status: 'in_delivery' })
              .in('id', orderIds)
          }
        }
      }
    }

    return successResponse({
      round: {
        id: roundId,
        status: 'in_progress',
        start_time: startTime
      }
    })

  } catch (error) {
    console.error('Start round API error:', error)
    return errorResponse('Erreur serveur', 500)
  }
}
