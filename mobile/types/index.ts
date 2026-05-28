// Types pour l'application mobile AKKA ERP

export interface User {
  id: string
  email: string
  full_name: string | null
  role_id: string | null
}

export interface Client {
  id: string
  code: string
  name: string
  contact_name: string | null
  phone: string | null
  address: string | null
  city: string | null
  gps_lat: number | null
  gps_lng: number | null
}

export interface Article {
  id: string
  code: string
  name: string
  price_ht: number
  unit: string
}

export interface DeliveryRound {
  id: string
  round_number: string
  round_date: string
  driver_id: string | null
  status: string
  notes: string | null
}

export interface Delivery {
  id: string
  delivery_number: string
  order_id: string | null
  client_id: string
  client?: Client
  driver_id: string | null
  status: string
  delivery_date: string | null
  total_ht: number | null
  notes: string | null
  round_id: string | null
}

export interface DeliveryItem {
  id: string
  delivery_id: string
  article_id: string
  article?: Article
  quantity: number
  unit_price: number
  total_ht: number
}

export interface DeliveryReturn {
  id: string
  delivery_id: string
  round_id: string | null
  article_id: string
  article?: Article
  quantity_returned: number
  reason: string | null
  notes: string | null
}

export interface Payment {
  id: string
  payment_date: string
  client_id: string
  amount: number
  payment_method: 'cash' | 'check' | 'transfer' | 'card'
  reference: string | null
  notes: string | null
}

// Statuts de livraison
export type DeliveryStatus =
  | 'pending'      // En attente
  | 'in_delivery'  // En cours de livraison
  | 'delivered'    // Livrée
  | 'partial'      // Partielle
  | 'cancelled'    // Annulée

export const DeliveryStatusLabels: Record<DeliveryStatus, string> = {
  pending: 'En attente',
  in_delivery: 'En livraison',
  delivered: 'Livrée',
  partial: 'Partielle',
  cancelled: 'Annulée',
}

export const DeliveryStatusColors: Record<DeliveryStatus, string> = {
  pending: '#FFA500',
  in_delivery: '#3B82F6',
  delivered: '#22C55E',
  partial: '#EAB308',
  cancelled: '#EF4444',
}
