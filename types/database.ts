export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      roles: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
        }
      }
      modules: {
        Row: {
          id: string
          code: string
          name: string
          icon: string | null
          path: string
          parent_id: string | null
          sort_order: number
          is_active: boolean
        }
        Insert: {
          id?: string
          code: string
          name: string
          icon?: string | null
          path: string
          parent_id?: string | null
          sort_order?: number
          is_active?: boolean
        }
        Update: {
          id?: string
          code?: string
          name?: string
          icon?: string | null
          path?: string
          parent_id?: string | null
          sort_order?: number
          is_active?: boolean
        }
      }
      role_permissions: {
        Row: {
          id: string
          role_id: string
          module_id: string
          can_view: boolean
          can_create: boolean
          can_edit: boolean
          can_delete: boolean
        }
        Insert: {
          id?: string
          role_id: string
          module_id: string
          can_view?: boolean
          can_create?: boolean
          can_edit?: boolean
          can_delete?: boolean
        }
        Update: {
          id?: string
          role_id?: string
          module_id?: string
          can_view?: boolean
          can_create?: boolean
          can_edit?: boolean
          can_delete?: boolean
        }
      }
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          role_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          role_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          code: string
          category: string | null
          name: string
          contact_name: string | null
          phone: string | null
          email: string | null
          address: string | null
          city: string | null
          gps_lat: number | null
          gps_lng: number | null
          image_url: string | null
          commercial_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          category?: string | null
          name: string
          contact_name?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          city?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          image_url?: string | null
          commercial_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          category?: string | null
          name?: string
          contact_name?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          city?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          image_url?: string | null
          commercial_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          description: string | null
          parent_id: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          parent_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          parent_id?: string | null
        }
      }
      articles: {
        Row: {
          id: string
          code: string
          barcode: string | null
          name: string
          description: string | null
          category_id: string | null
          unit: string
          price_ht: number
          tva_rate: number
          weight_net: number | null
          weight_gross: number | null
          packaging_id: string | null
          min_stock: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          barcode?: string | null
          name: string
          description?: string | null
          category_id?: string | null
          unit?: string
          price_ht: number
          tva_rate?: number
          weight_net?: number | null
          weight_gross?: number | null
          packaging_id?: string | null
          min_stock?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          barcode?: string | null
          name?: string
          description?: string | null
          category_id?: string | null
          unit?: string
          price_ht?: number
          tva_rate?: number
          weight_net?: number | null
          weight_gross?: number | null
          packaging_id?: string | null
          min_stock?: number
          is_active?: boolean
          created_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          order_number: string
          client_id: string
          commercial_id: string | null
          status: string
          order_date: string
          delivery_date: string | null
          total_ht: number
          total_tva: number
          total_ttc: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_number: string
          client_id: string
          commercial_id?: string | null
          status?: string
          order_date?: string
          delivery_date?: string | null
          total_ht?: number
          total_tva?: number
          total_ttc?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_number?: string
          client_id?: string
          commercial_id?: string | null
          status?: string
          order_date?: string
          delivery_date?: string | null
          total_ht?: number
          total_tva?: number
          total_ttc?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      deliveries: {
        Row: {
          id: string
          delivery_number: string
          order_id: string | null
          client_id: string
          driver_id: string | null
          status: string
          delivery_date: string | null
          total_ht: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          delivery_number: string
          order_id?: string | null
          client_id: string
          driver_id?: string | null
          status?: string
          delivery_date?: string | null
          total_ht?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          delivery_number?: string
          order_id?: string | null
          client_id?: string
          driver_id?: string | null
          status?: string
          delivery_date?: string | null
          total_ht?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sales: {
        Row: {
          id: string
          sale_number: string
          delivery_id: string | null
          client_id: string
          sale_date: string
          total_ht: number | null
          total_ttc: number | null
          payment_method: string | null
          payment_status: string
          created_at: string
        }
        Insert: {
          id?: string
          sale_number: string
          delivery_id?: string | null
          client_id: string
          sale_date?: string
          total_ht?: number | null
          total_ttc?: number | null
          payment_method?: string | null
          payment_status?: string
          created_at?: string
        }
        Update: {
          id?: string
          sale_number?: string
          delivery_id?: string | null
          client_id?: string
          sale_date?: string
          total_ht?: number | null
          total_ttc?: number | null
          payment_method?: string | null
          payment_status?: string
          created_at?: string
        }
      }
      cash_register: {
        Row: {
          id: string
          transaction_date: string
          category: string | null
          operation_type: string | null
          amount: number
          reference: string | null
          reference_id: string | null
          notes: string | null
          user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          transaction_date?: string
          category?: string | null
          operation_type?: string | null
          amount: number
          reference?: string | null
          reference_id?: string | null
          notes?: string | null
          user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          transaction_date?: string
          category?: string | null
          operation_type?: string | null
          amount?: number
          reference?: string | null
          reference_id?: string | null
          notes?: string | null
          user_id?: string | null
          created_at?: string
        }
      }
      stock: {
        Row: {
          id: string
          article_id: string
          quantity: number
          warehouse: string
          updated_at: string
        }
        Insert: {
          id?: string
          article_id: string
          quantity?: number
          warehouse?: string
          updated_at?: string
        }
        Update: {
          id?: string
          article_id?: string
          quantity?: number
          warehouse?: string
          updated_at?: string
        }
      }
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

// Types spécifiques
export type Role = Tables<'roles'>
export type Module = Tables<'modules'>
export type RolePermission = Tables<'role_permissions'>
export type User = Tables<'users'>
export type Client = Tables<'clients'>
export type Category = Tables<'categories'>
export type Article = Tables<'articles'>
export type Order = Tables<'orders'>
export type Delivery = Tables<'deliveries'>
export type Sale = Tables<'sales'>
export type CashRegister = Tables<'cash_register'>
export type Stock = Tables<'stock'>
