import { NextRequest, NextResponse } from 'next/server'
import {
  verifyDriverAuth,
  verifyDeliveryAccess,
  supabaseAdmin,
  errorResponse,
  successResponse
} from '@/lib/api/mobile-auth'

// Valid payment methods
const VALID_PAYMENT_METHODS = ['cash', 'check', 'card', 'transfer']

export async function POST(
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

    // Parse request body
    const body = await request.json()
    const { amount, method, notes } = body

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      return errorResponse('Montant invalide', 400)
    }

    // Validate payment method
    if (!method || !VALID_PAYMENT_METHODS.includes(method)) {
      return errorResponse(
        `Méthode de paiement invalide. Valeurs autorisées: ${VALID_PAYMENT_METHODS.join(', ')}`,
        400
      )
    }

    // Calculate current balance and recette
    // First, get delivery items to calculate actual recette
    const { data: deliveryItems, error: itemsError } = await supabaseAdmin
      .from('delivery_items')
      .select('quantity_delivered, quantity_returned, unit_price')
      .eq('delivery_id', deliveryId)

    if (itemsError) {
      console.error('Fetch delivery items error:', itemsError)
    }

    // Calculate recette (actual amount owed based on delivered - returned)
    let recette = delivery.total_ht || 0
    if (deliveryItems && deliveryItems.length > 0) {
      recette = deliveryItems.reduce((sum: number, item: any) => {
        const delivered = item.quantity_delivered || 0
        const returned = item.quantity_returned || 0
        return sum + ((delivered - returned) * item.unit_price)
      }, 0)
    }

    // Calculate new totals
    const currentPaid = delivery.amount_paid || 0
    const newAmountPaid = currentPaid + amount
    const newBalanceDue = Math.max(0, recette - newAmountPaid)

    // Determine new payment status
    let newPaymentStatus = 'pending'
    if (newBalanceDue <= 0) {
      newPaymentStatus = 'paid'
    } else if (newAmountPaid > 0) {
      newPaymentStatus = 'partial'
    }

    const now = new Date().toISOString()

    // Update delivery with payment info
    const { error: updateError } = await supabaseAdmin
      .from('deliveries')
      .update({
        amount_paid: newAmountPaid,
        balance_due: newBalanceDue,
        payment_status: newPaymentStatus,
        updated_at: now
      })
      .eq('id', deliveryId)

    if (updateError) {
      console.error('Update delivery payment error:', updateError)
      return errorResponse('Erreur lors de l\'enregistrement du paiement', 500)
    }

    // Generate payment number
    const { data: lastPayment } = await supabaseAdmin
      .from('payments')
      .select('payment_number')
      .like('payment_number', 'REC%')
      .order('payment_number', { ascending: false })
      .limit(1)
      .single()

    let nextNum = 1
    if (lastPayment?.payment_number) {
      const match = lastPayment.payment_number.match(/REC(\d+)/)
      if (match) {
        nextNum = parseInt(match[1], 10) + 1
      }
    }
    const paymentNumber = `REC${String(nextNum).padStart(5, '0')}`

    // Record in payments table
    try {
      await supabaseAdmin
        .from('payments')
        .insert({
          payment_number: paymentNumber,
          client_id: delivery.client_id,
          delivery_id: deliveryId,
          amount: amount,
          payment_method: method,
          payment_date: now.split('T')[0],
          reference: notes || null,
          notes: `Paiement mobile - ${delivery.delivery_number}`,
          created_by: authResult.user!.id
        })
    } catch (paymentError) {
      console.error('Payment insert error:', paymentError)
      // Don't fail, payment was already recorded on delivery
    }

    // Record in cash register if it's a cash payment
    if (method === 'cash') {
      try {
        await supabaseAdmin
          .from('cash_register')
          .insert({
            transaction_date: now.split('T')[0],
            category: 'vente',
            operation_type: 'encaissement',
            amount: amount,
            reference: `BL ${delivery.delivery_number}`,
            reference_id: deliveryId,
            notes: notes || `Paiement livraison ${delivery.delivery_number}`,
            user_id: authResult.user!.id
          })
      } catch (cashError) {
        console.error('Cash register insert error:', cashError)
        // Don't fail the payment, just log the error
      }
    }

    // If there's a sales record, update it too
    const { data: sale } = await supabaseAdmin
      .from('sales')
      .select('id, amount_paid, balance_due')
      .eq('delivery_id', deliveryId)
      .single()

    if (sale) {
      const saleNewPaid = (sale.amount_paid || 0) + amount
      const saleNewBalance = Math.max(0, (sale.balance_due || recette) - amount)

      await supabaseAdmin
        .from('sales')
        .update({
          amount_paid: saleNewPaid,
          balance_due: saleNewBalance,
          payment_status: saleNewBalance <= 0 ? 'paid' : saleNewPaid > 0 ? 'partial' : 'pending',
          payment_method: method
        })
        .eq('id', sale.id)
    }

    return successResponse({
      delivery: {
        id: deliveryId,
        amount_paid: newAmountPaid,
        balance_due: newBalanceDue,
        payment_status: newPaymentStatus
      },
      payment: {
        amount,
        method,
        recorded_at: now
      }
    })

  } catch (error) {
    console.error('Payment API error:', error)
    return errorResponse('Erreur serveur', 500)
  }
}
