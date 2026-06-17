/* eslint-disable @typescript-eslint/no-explicit-any */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Type générique pour toutes les tables - permet d'éviter les erreurs TypeScript
type GenericTable = {
  Row: Record<string, any>
  Insert: Record<string, any>
  Update: Record<string, any>
}

export interface Database {
  public: {
    Tables: {
      [key: string]: GenericTable
      articles: GenericTable
      articles_vendus: GenericTable
      cash_register: GenericTable
      categories: GenericTable
      client_balances: GenericTable
      client_prices: GenericTable
      client_quote_request_items: GenericTable
      client_quote_requests: GenericTable
      client_transactions: GenericTable
      clients: GenericTable
      company_settings: GenericTable
      deliveries: GenericTable
      delivery_items: GenericTable
      delivery_return_items: GenericTable
      delivery_returns: GenericTable
      delivery_round_items: GenericTable
      delivery_rounds: GenericTable
      document_sequences: GenericTable
      emballages: GenericTable
      factures: GenericTable
      fiches_trajet: GenericTable
      lots: GenericTable
      modules: GenericTable
      order_items: GenericTable
      orders: GenericTable
      packagings: GenericTable
      packs: GenericTable
      payments: GenericTable
      purchase_order_items: GenericTable
      purchase_orders: GenericTable
      reception_items: GenericTable
      receptions: GenericTable
      role_permissions: GenericTable
      roles: GenericTable
      sales: GenericTable
      stock: GenericTable
      stock_movements: GenericTable
      supplier_quote_request_items: GenericTable
      supplier_quote_requests: GenericTable
      supplier_quote_response_items: GenericTable
      supplier_quote_responses: GenericTable
      suppliers: GenericTable
      supplies: GenericTable
      supply_categories: GenericTable
      supply_stock: GenericTable
      supply_stock_movements: GenericTable
      users: GenericTable
    }
  }
}

// Types utilitaires
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
