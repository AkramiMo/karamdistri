import { NextRequest, NextResponse } from 'next/server'
import { verifyMobileAuth, errorResponse, successResponse } from '@/lib/api/mobile-auth'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyMobileAuth(request)

    if (!authResult.success) {
      return errorResponse(authResult.error!, authResult.status)
    }

    // Return user profile
    return successResponse({
      user: authResult.user
    })

  } catch (error) {
    console.error('Me API error:', error)
    return errorResponse('Erreur serveur', 500)
  }
}
