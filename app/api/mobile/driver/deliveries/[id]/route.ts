import { NextRequest, NextResponse } from 'next/server'
import {
  verifyDriverAuth,
  verifyDeliveryAccess,
  supabaseAdmin,
  errorResponse,
  successResponse
} from '@/lib/api/mobile-auth'

// Valid delivery statuses and transitions
const VALID_STATUSES = ['delivered', 'partial', 'returned']
const ALLOWED_FROM_STATUSES = ['pending', 'in_delivery', 'partial']

interface DeliveryItemUpdate {
  article_id: string
  quantity_delivered?: number
  quantity_returned?: number
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: deliveryId } = await params

    // Verify driver authentication
    const authResult = await verifyDriverAuth(request)

    if (!authResult.success) {
      return errorResponse(authResult.error!, authResult.status)
    }

    // Verify delivery access
    const accessResult = await verifyDeliveryAccess(deliveryId, authResult.user!.id)

    if (!accessResult.success) {
      return errorResponse(accessResult.error!, 403)
    }

    const delivery = accessResult.delivery
    const roundItem = accessResult.roundItem

    // Parse request body
    const body = await request.json()
    const { status, notes, items } = body

    // Validate status
    if (!status || !VALID_STATUSES.includes(status)) {
      return errorResponse(
        `Statut invalide. Valeurs autorisées: ${VALID_STATUSES.join(', ')}`,
        400
      )
    }

    // Check if transition is allowed
    if (!ALLOWED_FROM_STATUSES.includes(delivery.status)) {
      return errorResponse(
        `Impossible de modifier une livraison avec le statut "${delivery.status}"`,
        400
      )
    }

    const now = new Date().toISOString()

    // Process item updates if provided (for partial deliveries)
    if (items && Array.isArray(items) && items.length > 0) {
      for (const item of items as DeliveryItemUpdate[]) {
        if (!item.article_id) continue

        // Find the delivery item
        const { data: deliveryItem, error: findError } = await supabaseAdmin
          .from('delivery_items')
          .select('id, quantity_delivered, quantity_ordered')
          .eq('delivery_id', deliveryId)
          .eq('article_id', item.article_id)
          .single()

        if (findError || !deliveryItem) {
          console.error('Find delivery item error:', findError)
          continue
        }

        // Update quantities
        const updateData: any = {}

        if (item.quantity_delivered !== undefined) {
          updateData.quantity_delivered = item.quantity_delivered
        }

        if (item.quantity_returned !== undefined) {
          updateData.quantity_returned = item.quantity_returned
        }

        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabaseAdmin
            .from('delivery_items')
            .update(updateData)
            .eq('id', deliveryItem.id)

          if (updateError) {
            console.error('Update delivery item error:', updateError)
          }

          // If items are returned, create return records
          if (item.quantity_returned && item.quantity_returned > 0 && roundItem) {
            // Check if return record exists
            const { data: existingReturn } = await supabaseAdmin
              .from('delivery_returns')
              .select('id')
              .eq('delivery_id', deliveryId)
              .eq('article_id', item.article_id)
              .single()

            if (existingReturn) {
              // Update existing return
              await supabaseAdmin
                .from('delivery_returns')
                .update({
                  quantity_returned: item.quantity_returned,
                  updated_at: now
                })
                .eq('id', existingReturn.id)
            } else {
              // Create new return record
              await supabaseAdmin
                .from('delivery_returns')
                .insert({
                  delivery_id: deliveryId,
                  round_id: roundItem.round_id,
                  article_id: item.article_id,
                  quantity_returned: item.quantity_returned,
                  reason: 'Retour livreur',
                  notes: notes || null
                })
            }
          }
        }
      }
    }

    // Update delivery status
    const deliveryUpdateData: any = {
      status,
      updated_at: now
    }

    if (notes) {
      deliveryUpdateData.notes = notes
    }

    const { error: deliveryError } = await supabaseAdmin
      .from('deliveries')
      .update(deliveryUpdateData)
      .eq('id', deliveryId)

    if (deliveryError) {
      console.error('Update delivery error:', deliveryError)
      return errorResponse('Erreur lors de la mise à jour de la livraison', 500)
    }

    // Update round item status if exists
    if (roundItem) {
      const roundItemUpdate: any = {
        status,
        notes: notes || roundItem.notes
      }

      if (status === 'delivered' || status === 'partial') {
        roundItemUpdate.delivered_at = now
      }

      const { error: roundItemError } = await supabaseAdmin
        .from('delivery_round_items')
        .update(roundItemUpdate)
        .eq('id', roundItem.id)

      if (roundItemError) {
        console.error('Update round item error:', roundItemError)
      }
    }

    // Update associated order status if exists
    if (delivery.order_id) {
      await supabaseAdmin
        .from('orders')
        .update({ status, updated_at: now })
        .eq('id', delivery.order_id)
    }

    return successResponse({
      delivery: {
        id: deliveryId,
        status,
        delivered_at: status === 'delivered' || status === 'partial' ? now : null
      }
    })

  } catch (error) {
    console.error('Update delivery API error:', error)
    return errorResponse('Erreur serveur', 500)
  }
}

// GET endpoint to fetch delivery details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: deliveryId } = await params

    // Verify driver authentication
    const authResult = await verifyDriverAuth(request)

    if (!authResult.success) {
      return errorResponse(authResult.error!, authResult.status)
    }

    // Verify delivery access
    const accessResult = await verifyDeliveryAccess(deliveryId, authResult.user!.id)

    if (!accessResult.success) {
      return errorResponse(accessResult.error!, 403)
    }

    // Fetch complete delivery details
    const { data: delivery, error } = await supabaseAdmin
      .from('deliveries')
      .select(`
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
      `)
      .eq('id', deliveryId)
      .single()

    if (error || !delivery) {
      return errorResponse('Livraison non trouvée', 404)
    }

    return successResponse({ delivery })

  } catch (error) {
    console.error('Get delivery API error:', error)
    return errorResponse('Erreur serveur', 500)
  }
}
