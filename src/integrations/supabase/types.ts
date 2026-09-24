export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip_address: string | null
          session_token: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          session_token: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          session_token?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
        }
        Relationships: []
      }
      client_reports: {
        Row: {
          created_at: string | null
          customer_id: string | null
          id: string
          notes: string | null
          report_data: Json | null
          report_type: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          notes?: string | null
          report_data?: Json | null
          report_type?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          notes?: string | null
          report_data?: Json | null
          report_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_reports_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          birthday: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string
          total_purchases: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          birthday?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone: string
          total_purchases?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          birthday?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string
          total_purchases?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      emi_finance: {
        Row: {
          created_at: string | null
          customer_id: string | null
          customer_name: string
          down_payment: number | null
          emi_amount: number
          emi_months: number
          finance_company: string | null
          id: string
          loan_amount: number
          notes: string | null
          phone: string
          product_name: string
          sale_id: string | null
          start_date: string | null
          status: string | null
          total_amount: number
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          customer_name: string
          down_payment?: number | null
          emi_amount: number
          emi_months: number
          finance_company?: string | null
          id?: string
          loan_amount: number
          notes?: string | null
          phone: string
          product_name: string
          sale_id?: string | null
          start_date?: string | null
          status?: string | null
          total_amount: number
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string
          down_payment?: number | null
          emi_amount?: number
          emi_months?: number
          finance_company?: string | null
          id?: string
          loan_amount?: number
          notes?: string | null
          phone?: string
          product_name?: string
          sale_id?: string | null
          start_date?: string | null
          status?: string | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "emi_finance_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emi_finance_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      enquiries: {
        Row: {
          created_at: string | null
          customer_name: string
          email: string | null
          id: string
          message: string | null
          phone: string
          status: string | null
          subject: string | null
        }
        Insert: {
          created_at?: string | null
          customer_name: string
          email?: string | null
          id?: string
          message?: string | null
          phone: string
          status?: string | null
          subject?: string | null
        }
        Update: {
          created_at?: string | null
          customer_name?: string
          email?: string | null
          id?: string
          message?: string | null
          phone?: string
          status?: string | null
          subject?: string | null
        }
        Relationships: []
      }
      gallery: {
        Row: {
          caption: string | null
          created_at: string | null
          id: string
          image_url: string
          sort_order: number | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          id?: string
          image_url: string
          sort_order?: number | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          id?: string
          image_url?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      hamper_items: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          image: string | null
          is_active: boolean | null
          name: string
          price: number
          stock: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          image?: string | null
          is_active?: boolean | null
          name: string
          price: number
          stock?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          image?: string | null
          is_active?: boolean | null
          name?: string
          price?: number
          stock?: number | null
        }
        Relationships: []
      }
      inventory: {
        Row: {
          battery_health: number | null
          brand_id: string | null
          category: string | null
          condition: string | null
          created_at: string | null
          grade: string | null
          id: string
          images: string[] | null
          is_active: boolean | null
          is_featured: boolean | null
          model: string
          name: string
          original_price: number | null
          price: number
          product_type: string | null
          specs: Json | null
          stock: number | null
          updated_at: string | null
          warranty_months: number | null
        }
        Insert: {
          battery_health?: number | null
          brand_id?: string | null
          category?: string | null
          condition?: string | null
          created_at?: string | null
          grade?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          model: string
          name: string
          original_price?: number | null
          price: number
          product_type?: string | null
          specs?: Json | null
          stock?: number | null
          updated_at?: string | null
          warranty_months?: number | null
        }
        Update: {
          battery_health?: number | null
          brand_id?: string | null
          category?: string | null
          condition?: string | null
          created_at?: string | null
          grade?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          model?: string
          name?: string
          original_price?: number | null
          price?: number
          product_type?: string | null
          specs?: Json | null
          stock?: number | null
          updated_at?: string | null
          warranty_months?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          coupon_code: string | null
          created_at: string | null
          description: string | null
          discount_value: number | null
          display_mode: string
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          offer_type: string
          starts_at: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          coupon_code?: string | null
          created_at?: string | null
          description?: string | null
          discount_value?: number | null
          display_mode?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          offer_type: string
          starts_at?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          coupon_code?: string | null
          created_at?: string | null
          description?: string | null
          discount_value?: number | null
          display_mode?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          offer_type?: string
          starts_at?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          id: string
          role: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          role?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string | null
        }
        Relationships: []
      }
      repair_enquiries: {
        Row: {
          created_at: string | null
          customer_name: string
          description: string | null
          email: string | null
          id: string
          images: string[] | null
          phone: string
          phone_brand: string
          phone_model: string
          preferred_contact: string | null
          problem_type: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_name: string
          description?: string | null
          email?: string | null
          id?: string
          images?: string[] | null
          phone: string
          phone_brand: string
          phone_model: string
          preferred_contact?: string | null
          problem_type: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_name?: string
          description?: string | null
          email?: string | null
          id?: string
          images?: string[] | null
          phone?: string
          phone_brand?: string
          phone_model?: string
          preferred_contact?: string | null
          problem_type?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      repairs: {
        Row: {
          advance_paid: number | null
          completed_at: string | null
          created_at: string | null
          customer_id: string | null
          customer_name: string
          device_brand: string
          device_model: string
          diagnosis: string | null
          enquiry_id: string | null
          id: string
          notes: string | null
          parts_used: string | null
          phone: string
          problem: string
          received_at: string | null
          repair_cost: number | null
          status: string | null
          technician_id: string | null
          updated_at: string | null
        }
        Insert: {
          advance_paid?: number | null
          completed_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_name: string
          device_brand: string
          device_model: string
          diagnosis?: string | null
          enquiry_id?: string | null
          id?: string
          notes?: string | null
          parts_used?: string | null
          phone: string
          problem: string
          received_at?: string | null
          repair_cost?: number | null
          status?: string | null
          technician_id?: string | null
          updated_at?: string | null
        }
        Update: {
          advance_paid?: number | null
          completed_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string
          device_brand?: string
          device_model?: string
          diagnosis?: string | null
          enquiry_id?: string | null
          id?: string
          notes?: string | null
          parts_used?: string | null
          phone?: string
          problem?: string
          received_at?: string | null
          repair_cost?: number | null
          status?: string | null
          technician_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repairs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repairs_enquiry_id_fkey"
            columns: ["enquiry_id"]
            isOneToOne: false
            referencedRelation: "repair_enquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repairs_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          created_at: string | null
          customer_name: string
          id: string
          is_featured: boolean | null
          rating: number | null
          review_text: string | null
          source: string | null
        }
        Insert: {
          created_at?: string | null
          customer_name: string
          id?: string
          is_featured?: boolean | null
          rating?: number | null
          review_text?: string | null
          source?: string | null
        }
        Update: {
          created_at?: string | null
          customer_name?: string
          id?: string
          is_featured?: boolean | null
          rating?: number | null
          review_text?: string | null
          source?: string | null
        }
        Relationships: []
      }
      sales: {
        Row: {
          created_at: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          discount: number | null
          final_amount: number
          id: string
          invoice_number: string
          notes: string | null
          payment_method: string | null
          payment_status: string | null
          sale_type: string | null
          staff_id: string | null
          total_amount: number
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          discount?: number | null
          final_amount: number
          id?: string
          invoice_number: string
          notes?: string | null
          payment_method?: string | null
          payment_status?: string | null
          sale_type?: string | null
          staff_id?: string | null
          total_amount: number
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          discount?: number | null
          final_amount?: number
          id?: string
          invoice_number?: string
          notes?: string | null
          payment_method?: string | null
          payment_status?: string | null
          sale_type?: string | null
          staff_id?: string | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_items: {
        Row: {
          id: string
          inventory_id: string | null
          item_name: string
          quantity: number
          sale_id: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          id?: string
          inventory_id?: string | null
          item_name: string
          quantity?: number
          sale_id?: string | null
          total_price: number
          unit_price: number
        }
        Update: {
          id?: string
          inventory_id?: string | null
          item_name?: string
          quantity?: number
          sale_id?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          price: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number | null
        }
        Relationships: []
      }
      staff: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          joined_date: string | null
          name: string
          phone: string | null
          role: string | null
          salary: number | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          joined_date?: string | null
          name: string
          phone?: string | null
          role?: string | null
          salary?: number | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          joined_date?: string | null
          name?: string
          phone?: string | null
          role?: string | null
          salary?: number | null
        }
        Relationships: []
      }
      third_party_purchases: {
        Row: {
          created_at: string | null
          id: string
          item_name: string
          notes: string | null
          purchase_date: string | null
          quantity: number | null
          total_price: number
          unit_price: number
          vendor_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_name: string
          notes?: string | null
          purchase_date?: string | null
          quantity?: number | null
          total_price: number
          unit_price: number
          vendor_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          item_name?: string
          notes?: string | null
          purchase_date?: string | null
          quantity?: number | null
          total_price?: number
          unit_price?: number
          vendor_name?: string
        }
        Relationships: []
      }
      website_order_items: {
        Row: {
          hamper_item_id: string | null
          id: string
          inventory_id: string | null
          item_name: string
          item_type: string | null
          order_id: string | null
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          hamper_item_id?: string | null
          id?: string
          inventory_id?: string | null
          item_name: string
          item_type?: string | null
          order_id?: string | null
          quantity?: number
          total_price: number
          unit_price: number
        }
        Update: {
          hamper_item_id?: string | null
          id?: string
          inventory_id?: string | null
          item_name?: string
          item_type?: string | null
          order_id?: string | null
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "website_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "website_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      website_orders: {
        Row: {
          coupon_code: string | null
          created_at: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string
          discount_amount: number | null
          id: string
          notes: string | null
          order_number: string
          order_status: string | null
          order_type: string | null
          payment_method: string | null
          payment_status: string | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          coupon_code?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone: string
          discount_amount?: number | null
          id?: string
          notes?: string | null
          order_number: string
          order_status?: string | null
          order_type?: string | null
          payment_method?: string | null
          payment_status?: string | null
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          coupon_code?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          discount_amount?: number | null
          id?: string
          notes?: string | null
          order_number?: string
          order_status?: string | null
          order_type?: string | null
          payment_method?: string | null
          payment_status?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      customer_profiles: {
        Row: {
          id: string
          full_name: string
          phone: string
          email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          phone: string
          email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          phone?: string
          email?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_addresses: {
        Row: {
          id: string
          customer_id: string
          label: string
          full_name: string
          phone: string
          address_line: string
          city: string | null
          state: string | null
          pincode: string | null
          is_default: boolean
          created_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          label?: string
          full_name: string
          phone: string
          address_line: string
          city?: string | null
          state?: string | null
          pincode?: string | null
          is_default?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          label?: string
          full_name?: string
          phone?: string
          address_line?: string
          city?: string | null
          state?: string | null
          pincode?: string | null
          is_default?: boolean
          created_at?: string
        }
        Relationships: []
      }
      wishlist_items: {
        Row: {
          id: string
          customer_id: string
          inventory_id: string
          created_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          inventory_id: string
          created_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          inventory_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      return_requests: {
        Row: {
          id: string
          customer_id: string
          order_id: string
          reason: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          order_id: string
          reason: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          order_id?: string
          reason?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "website_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_feedback: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          rating: number | null
          repair_id: string | null
          requested_date: string | null
          submitted_at: string | null
          token: string
          wants_reschedule: boolean | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          rating?: number | null
          repair_id?: string | null
          requested_date?: string | null
          submitted_at?: string | null
          token?: string
          wants_reschedule?: boolean | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          rating?: number | null
          repair_id?: string | null
          requested_date?: string | null
          submitted_at?: string | null
          token?: string
          wants_reschedule?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "service_feedback_repair_id_fkey"
            columns: ["repair_id"]
            isOneToOne: false
            referencedRelation: "repairs"
            referencedColumns: ["id"]
          },
        ]
      }
      wholesaler_invoices: {
        Row: {
          created_at: string | null
          due_amount: number | null
          due_date: string | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          items: Json | null
          notes: string | null
          paid_amount: number | null
          payment_status: string | null
          total_amount: number
          wholesaler_name: string
        }
        Insert: {
          created_at?: string | null
          due_amount?: number | null
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          items?: Json | null
          notes?: string | null
          paid_amount?: number | null
          payment_status?: string | null
          total_amount: number
          wholesaler_name: string
        }
        Update: {
          created_at?: string | null
          due_amount?: number | null
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          items?: Json | null
          notes?: string | null
          paid_amount?: number | null
          payment_status?: string | null
          total_amount?: number
          wholesaler_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_staff_id: { Args: never; Returns: string }
      web_save_customer_birthday: {
        Args: { p_name: string; p_phone: string; p_email: string | null; p_address: string | null; p_birthday: string }
        Returns: undefined
      }
      web_track_orders: {
        Args: { p_phone: string }
        Returns: {
          id: string
          order_number: string
          customer_name: string
          total_amount: number
          payment_status: string
          order_status: string
          created_at: string
        }[]
      }
      web_track_repair_enquiries: {
        Args: { p_phone: string }
        Returns: {
          id: string
          phone_brand: string | null
          phone_model: string | null
          problem_type: string | null
          status: string
          created_at: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      get_email_by_phone: { Args: { p_phone: string }; Returns: string | null }
      get_service_feedback_by_token: {
        Args: { p_token: string }
        Returns: {
          repair_id: string
          device_brand: string
          device_model: string
          customer_name: string
          status: string
          rating: number | null
          comment: string | null
          wants_reschedule: boolean | null
          requested_date: string | null
          submitted_at: string | null
        }[]
      }
      submit_service_feedback: {
        Args: {
          p_token: string
          p_rating: number
          p_comment: string | null
          p_wants_reschedule: boolean
          p_requested_date: string | null
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
