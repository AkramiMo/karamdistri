import { NextRequest, NextResponse } from 'next/server'
import {
  verifyDriverAuth,
  verifyRoundOwnership,
  supabaseAdmin,
  errorResponse,
  successResponse
} from '@/lib/api/mobile-auth'

export async function GET(
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

    // Fetch complete round details
    const { data: round, error } = await supabaseAdmin
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
        depot_lat,
        depot_lng,
        notes,
        driver:users!delivery_rounds_driver_id_fkey(id, full_name, email),
        delivery_round_items(
          id,
          sequence_order,
          status,
          delivered_at,
          notes,
          delivery:deliveries(
            id,
            delivery_number,
            status,
            total_ht,
            notes,
            amount_paid,
            balance_due,
            payment_status,
            client:clients(
              id,
              code,
              name,
              address,
              city,
              phone,
              gps_lat,
              gps_lng
            ),
            delivery_items(
              id,
              article_id,
              quantity_ordered,
              quantity_delivered,
              quantity_returned,
              unit_price,
              article:articles(
                id,
                code,
                name
              )
            )
          )
        )
      `)
      .eq('id', roundId)
      .single()

    if (error || !round) {
      console.error('Fetch round detail error:', error)
      return errorResponse('Tournée non trouvée', 404)
    }

    // Transform data for mobile app
    const deliveries = ((round as any).delivery_round_items || [])
      .sort((a: any, b: any) => (a.sequence_order || 0) - (b.sequence_order || 0))
      .map((item: any) => {
        const delivery = item.delivery
        if (!delivery) return null

        const client = delivery.client
        const items = (delivery.delivery_items || []).map((di: any) => ({
          id: di.id,
          article_id: di.article_id,
          name: di.article?.name || '',
          code: di.article?.code || '',
          quantity_ordered: di.quantity_ordered,
          quantity_delivered: di.quantity_delivered,
          quantity_returned: di.quantity_returned || 0,
          unit_price: di.unit_price
        }))

        // Calculate total TTC (assuming no TVA for simplicity, adjust if needed)
        const totalHT = delivery.total_ht || 0
        const totalTTC = totalHT

        return {
          sequence: item.sequence_order,
          id: delivery.id,
          round_item_id: item.id,
          delivery_number: delivery.delivery_number,
          status: item.status,
          delivered_at: item.delivered_at,
          client: client ? {
            id: client.id,
            name: client.name,
            code: client.code,
            address: client.address,
            city: client.city,
            phone: client.phone,
            lat: client.gps_lat,
            lng: client.gps_lng
          } : null,
          total_ht: delivery.total_ht,
          total_ttc: totalTTC,
          amount_paid: delivery.amount_paid || 0,
          balance_due: delivery.balance_due || totalTTC,
          payment_status: delivery.payment_status || 'pending',
          items,
          notes: delivery.notes || item.notes
        }
      })
      .filter(Boolean)

    const formattedRound = {
      id: round.id,
      round_number: round.round_number,
      status: round.status,
      round_date: round.round_date,
      start_time: round.start_time,
      end_time: round.end_time,
      total_distance: round.total_distance,
      total_duration: round.total_duration,
      depot: round.depot_lat && round.depot_lng ? {
        lat: round.depot_lat,
        lng: round.depot_lng
      } : null,
      driver: round.driver,
      notes: round.notes,
      deliveries
    }

    return successResponse({ round: formattedRound })

  } catch (error) {
    console.error('Round detail API error:', error)
    return errorResponse('Erreur serveur', 500)
  }
}
