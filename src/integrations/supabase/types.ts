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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          appointment_date: string
          created_at: string
          duration_minutes: number
          followup_sent: boolean
          id: string
          lead_id: string | null
          lead_name: string
          lead_phone: string
          notes: string | null
          reminder_1d_sent: boolean
          reminder_2h_sent: boolean
          status: string
          tattoo_style: string | null
          time_slot: string
          updated_at: string
        }
        Insert: {
          appointment_date: string
          created_at?: string
          duration_minutes?: number
          followup_sent?: boolean
          id?: string
          lead_id?: string | null
          lead_name: string
          lead_phone: string
          notes?: string | null
          reminder_1d_sent?: boolean
          reminder_2h_sent?: boolean
          status?: string
          tattoo_style?: string | null
          time_slot: string
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          created_at?: string
          duration_minutes?: number
          followup_sent?: boolean
          id?: string
          lead_id?: string | null
          lead_name?: string
          lead_phone?: string
          notes?: string | null
          reminder_1d_sent?: boolean
          reminder_2h_sent?: boolean
          status?: string
          tattoo_style?: string | null
          time_slot?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_rules: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          keywords: string[]
          priority: number
          reply_text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          keywords?: string[]
          priority?: number
          reply_text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          keywords?: string[]
          priority?: number
          reply_text?: string
          updated_at?: string
        }
        Relationships: []
      }
      design_tasks: {
        Row: {
          artist_name: string
          client_name: string
          client_phone: string
          created_at: string
          design_due_date: string
          design_fee: number
          design_start_date: string
          design_status: string
          design_type: string
          fee_status: string
          final_design_url: string | null
          final_tattoo_date: string | null
          id: string
          lead_id: string | null
          notes: string | null
          reference_images: string[]
          updated_at: string
        }
        Insert: {
          artist_name: string
          client_name: string
          client_phone: string
          created_at?: string
          design_due_date: string
          design_fee?: number
          design_start_date?: string
          design_status?: string
          design_type?: string
          fee_status?: string
          final_design_url?: string | null
          final_tattoo_date?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          reference_images?: string[]
          updated_at?: string
        }
        Update: {
          artist_name?: string
          client_name?: string
          client_phone?: string
          created_at?: string
          design_due_date?: string
          design_fee?: number
          design_start_date?: string
          design_status?: string
          design_type?: string
          fee_status?: string
          final_design_url?: string | null
          final_tattoo_date?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          reference_images?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category: string
          cost_per_unit: number
          created_at: string
          gauge: string | null
          grouping: string | null
          id: string
          item_name: string
          last_updated: string
          minimum_required: number
          needle_type: string | null
          purpose_notes: string | null
          quantity_in_stock: number
          supplier: string | null
        }
        Insert: {
          category?: string
          cost_per_unit?: number
          created_at?: string
          gauge?: string | null
          grouping?: string | null
          id?: string
          item_name: string
          last_updated?: string
          minimum_required?: number
          needle_type?: string | null
          purpose_notes?: string | null
          quantity_in_stock?: number
          supplier?: string | null
        }
        Update: {
          category?: string
          cost_per_unit?: number
          created_at?: string
          gauge?: string | null
          grouping?: string | null
          id?: string
          item_name?: string
          last_updated?: string
          minimum_required?: number
          needle_type?: string | null
          purpose_notes?: string | null
          quantity_in_stock?: number
          supplier?: string | null
        }
        Relationships: []
      }
      lead_interactions: {
        Row: {
          action_type: string
          created_at: string
          id: string
          lead_id: string
          new_value: string | null
          note: string | null
          old_value: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          lead_id: string
          new_value?: string | null
          note?: string | null
          old_value?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          lead_id?: string
          new_value?: string | null
          note?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_interactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          bot_enabled: boolean
          budget: string | null
          created_at: string
          full_name: string
          id: string
          notes: string | null
          phone: string
          placement: string | null
          preferred_date: string | null
          size: string | null
          source: string
          status: string
          tags: string[]
          tattoo_style: string | null
          updated_at: string
          whatsapp_opt_in: boolean
        }
        Insert: {
          bot_enabled?: boolean
          budget?: string | null
          created_at?: string
          full_name: string
          id?: string
          notes?: string | null
          phone: string
          placement?: string | null
          preferred_date?: string | null
          size?: string | null
          source?: string
          status?: string
          tags?: string[]
          tattoo_style?: string | null
          updated_at?: string
          whatsapp_opt_in?: boolean
        }
        Update: {
          bot_enabled?: boolean
          budget?: string | null
          created_at?: string
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string
          placement?: string | null
          preferred_date?: string | null
          size?: string | null
          source?: string
          status?: string
          tags?: string[]
          tattoo_style?: string | null
          updated_at?: string
          whatsapp_opt_in?: boolean
        }
        Relationships: []
      }
      needle_usage_log: {
        Row: {
          created_at: string
          id: string
          inventory_item_id: string
          lead_id: string | null
          notes: string | null
          quantity_used: number
          usage_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_item_id: string
          lead_id?: string | null
          notes?: string | null
          quantity_used?: number
          usage_type?: string
        }
        Update: {
          created_at?: string
          id?: string
          inventory_item_id?: string
          lead_id?: string | null
          notes?: string | null
          quantity_used?: number
          usage_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "needle_usage_log_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "needle_usage_log_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_availability: {
        Row: {
          created_at: string
          day_of_week: number | null
          end_time: string
          id: string
          is_available: boolean
          specific_date: string | null
          start_time: string
        }
        Insert: {
          created_at?: string
          day_of_week?: number | null
          end_time?: string
          id?: string
          is_available?: boolean
          specific_date?: string | null
          start_time?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number | null
          end_time?: string
          id?: string
          is_available?: boolean
          specific_date?: string | null
          start_time?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          created_at: string
          delivered_at: string | null
          delivery_status: string | null
          error_message: string | null
          id: string
          is_escalated: boolean
          is_internal_note: boolean
          lead_id: string | null
          lead_name: string
          lead_phone: string
          message_body: string | null
          meta_message_id: string | null
          read_at: string | null
          starred: boolean
          status: string
          template_name: string
          template_type: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          delivery_status?: string | null
          error_message?: string | null
          id?: string
          is_escalated?: boolean
          is_internal_note?: boolean
          lead_id?: string | null
          lead_name: string
          lead_phone: string
          message_body?: string | null
          meta_message_id?: string | null
          read_at?: string | null
          starred?: boolean
          status?: string
          template_name: string
          template_type: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          delivery_status?: string | null
          error_message?: string | null
          id?: string
          is_escalated?: boolean
          is_internal_note?: boolean
          lead_id?: string | null
          lead_name?: string
          lead_phone?: string
          message_body?: string | null
          meta_message_id?: string | null
          read_at?: string | null
          starred?: boolean
          status?: string
          template_name?: string
          template_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "staff"
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
  public: {
    Enums: {
      app_role: ["admin", "user", "staff"],
    },
  },
} as const
