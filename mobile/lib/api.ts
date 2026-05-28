import { supabase } from './supabase'

// Base URL de l'API (ajuster selon environnement)
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'

/**
 * Client API pour les endpoints mobile
 */
class MobileApiClient {
  private accessToken: string | null = null

  /**
   * Obtenir le token d'accès actuel
   */
  private async getAccessToken(): Promise<string | null> {
    if (this.accessToken) return this.accessToken

    const { data: { session } } = await supabase.auth.getSession()
    this.accessToken = session?.access_token || null
    return this.accessToken
  }

  /**
   * Mettre à jour le token (appelé après refresh)
   */
  setAccessToken(token: string | null) {
    this.accessToken = token
  }

  /**
   * Effectuer une requête API avec authentification
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      const token = await this.getAccessToken()

      console.log('API Request:', API_BASE_URL + endpoint)
      console.log('Token:', token ? 'Present' : 'MISSING')

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      })

      const text = await response.text()
      console.log('API Response status:', response.status)
      console.log('API Response:', text.substring(0, 200))

      let data
      try {
        data = JSON.parse(text)
      } catch (e) {
        console.error('JSON parse error, response was:', text.substring(0, 500))
        return { success: false, error: 'Réponse invalide du serveur' }
      }

      if (!response.ok) {
        // Si token expiré, essayer de refresh
        if (response.status === 401) {
          const refreshed = await this.refreshToken()
          if (refreshed) {
            // Réessayer la requête
            return this.request(endpoint, options)
          }
        }
        return { success: false, error: data.error || 'Erreur serveur' }
      }

      return { success: true, data }
    } catch (error) {
      console.error('API request error:', error)
      return { success: false, error: 'Erreur de connexion' }
    }
  }

  /**
   * Rafraîchir le token d'accès
   */
  private async refreshToken(): Promise<boolean> {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession()
      if (error || !session) return false

      this.accessToken = session.access_token
      return true
    } catch {
      return false
    }
  }

  // ==================== AUTH ====================

  /**
   * Connexion avec email/mot de passe
   */
  async login(email: string, password: string) {
    const result = await this.request<{
      user: {
        id: string
        email: string
        full_name: string | null
        role: { id: string; name: string } | null
      }
      session: {
        access_token: string
        refresh_token: string
        expires_at: number
      }
    }>('/api/mobile/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })

    if (result.success && result.data?.session) {
      this.accessToken = result.data.session.access_token
    }

    return result
  }

  /**
   * Récupérer le profil utilisateur connecté
   */
  async getProfile() {
    return this.request<{
      user: {
        id: string
        email: string
        full_name: string | null
        role: { id: string; name: string } | null
      }
    }>('/api/mobile/auth/me')
  }

  // ==================== TOURNEES ====================

  /**
   * Lister les tournées du livreur
   */
  async getRounds(params?: { status?: string; date?: string }) {
    const queryParams = new URLSearchParams()
    if (params?.status) queryParams.append('status', params.status)
    if (params?.date) queryParams.append('date', params.date)

    const query = queryParams.toString()
    return this.request<{
      rounds: Array<{
        id: string
        round_number: string
        status: string
        round_date: string
        start_time: string | null
        end_time: string | null
        total_distance: number | null
        estimated_duration: number | null
        deliveries_count: number
        delivered_count: number
      }>
    }>(`/api/mobile/driver/rounds${query ? `?${query}` : ''}`)
  }

  /**
   * Détail d'une tournée
   */
  async getRoundDetail(roundId: string) {
    return this.request<{
      round: {
        id: string
        round_number: string
        status: string
        round_date: string
        start_time: string | null
        end_time: string | null
        total_distance: number | null
        total_duration: number | null
        depot: { lat: number; lng: number } | null
        notes: string | null
        deliveries: Array<{
          sequence: number
          id: string
          round_item_id: string
          delivery_number: string
          status: string
          delivered_at: string | null
          client: {
            id: string
            name: string
            code: string
            address: string | null
            city: string | null
            phone: string | null
            lat: number | null
            lng: number | null
          } | null
          total_ht: number | null
          total_ttc: number
          amount_paid: number
          balance_due: number
          payment_status: string
          items: Array<{
            id: string
            article_id: string
            name: string
            code: string
            quantity_ordered: number
            quantity_delivered: number
            quantity_returned: number
            unit_price: number
          }>
          notes: string | null
        }>
      }
    }>(`/api/mobile/driver/rounds/${roundId}`)
  }

  /**
   * Démarrer une tournée
   */
  async startRound(roundId: string, position?: { lat: number; lng: number }) {
    return this.request<{
      round: {
        id: string
        status: string
        start_time: string
      }
    }>(`/api/mobile/driver/rounds/${roundId}/start`, {
      method: 'POST',
      body: JSON.stringify(position || {}),
    })
  }

  /**
   * Terminer une tournée
   */
  async stopRound(roundId: string) {
    return this.request<{
      round: {
        id: string
        status: string
        start_time: string
        end_time: string
        total_duration: number
        summary: {
          total_deliveries: number
          delivered: number
          partial: number
          returned: number
          pending: number
        }
      }
    }>(`/api/mobile/driver/rounds/${roundId}/stop`, {
      method: 'POST',
    })
  }

  // ==================== LIVRAISONS ====================

  /**
   * Détail d'une livraison
   */
  async getDeliveryDetail(deliveryId: string) {
    return this.request<{
      delivery: {
        id: string
        delivery_number: string
        status: string
        total_ht: number | null
        notes: string | null
        amount_paid: number
        balance_due: number
        payment_status: string
        client: any
        delivery_items: any[]
      }
    }>(`/api/mobile/driver/deliveries/${deliveryId}`)
  }

  /**
   * Mettre à jour le statut d'une livraison
   */
  async updateDelivery(
    deliveryId: string,
    data: {
      status: 'delivered' | 'partial' | 'returned'
      notes?: string
      items?: Array<{
        article_id: string
        quantity_delivered?: number
        quantity_returned?: number
      }>
    }
  ) {
    return this.request<{
      delivery: {
        id: string
        status: string
        delivered_at: string | null
      }
    }>(`/api/mobile/driver/deliveries/${deliveryId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * Enregistrer un paiement
   */
  async recordPayment(
    deliveryId: string,
    data: {
      amount: number
      method: 'cash' | 'check' | 'card' | 'transfer'
      notes?: string
    }
  ) {
    return this.request<{
      delivery: {
        id: string
        amount_paid: number
        balance_due: number
        payment_status: string
      }
      payment: {
        amount: number
        method: string
        recorded_at: string
      }
    }>(`/api/mobile/driver/deliveries/${deliveryId}/payment`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }
}

// Instance singleton
export const api = new MobileApiClient()

// Types exportés pour utilisation dans les composants
export type RoundSummary = Awaited<ReturnType<typeof api.getRounds>>['data'] extends { rounds: infer R } ? R[number] : never
export type RoundDetail = Awaited<ReturnType<typeof api.getRoundDetail>>['data'] extends { round: infer R } ? R : never
export type DeliveryInRound = RoundDetail['deliveries'][number]
