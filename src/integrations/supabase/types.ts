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
          google_event_id: string | null
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
          google_event_id?: string | null
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
          google_event_id?: string | null
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
      artists: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      bot_response_templates: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          response_text: string
          template_key: string
          template_label: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          response_text: string
          template_key: string
          template_label: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          response_text?: string
          template_key?: string
          template_label?: string
          updated_at?: string
        }
        Relationships: []
      }
      campaign_recipients: {
        Row: {
          campaign_id: string
          created_at: string
          delivered_at: string | null
          id: string
          meta_message_id: string | null
          name: string
          phone: string
          read_at: string | null
          replied: boolean
          status: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          meta_message_id?: string | null
          name?: string
          phone: string
          read_at?: string | null
          replied?: boolean
          status?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          meta_message_id?: string | null
          name?: string
          phone?: string
          read_at?: string | null
          replied?: boolean
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          bookings_generated: number
          campaign_name: string
          created_at: string
          cta_label: string | null
          cta_type: string | null
          id: string
          media_url: string | null
          message_content: string
          messages_delivered: number
          messages_read: number
          messages_sent: number
          replies_received: number
          sent_at: string | null
          status: string
          total_recipients: number
          updated_at: string
        }
        Insert: {
          bookings_generated?: number
          campaign_name: string
          created_at?: string
          cta_label?: string | null
          cta_type?: string | null
          id?: string
          media_url?: string | null
          message_content: string
          messages_delivered?: number
          messages_read?: number
          messages_sent?: number
          replies_received?: number
          sent_at?: string | null
          status?: string
          total_recipients?: number
          updated_at?: string
        }
        Update: {
          bookings_generated?: number
          campaign_name?: string
          created_at?: string
          cta_label?: string | null
          cta_type?: string | null
          id?: string
          media_url?: string | null
          message_content?: string
          messages_delivered?: number
          messages_read?: number
          messages_sent?: number
          replies_received?: number
          sent_at?: string | null
          status?: string
          total_recipients?: number
          updated_at?: string
        }
        Relationships: []
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
      consent_forms: {
        Row: {
          client_name: string
          consent_text: string
          created_at: string
          id: string
          lead_id: string
          signature_data: string | null
          signed_at: string | null
        }
        Insert: {
          client_name: string
          consent_text: string
          created_at?: string
          id?: string
          lead_id: string
          signature_data?: string | null
          signed_at?: string | null
        }
        Update: {
          client_name?: string
          consent_text?: string
          created_at?: string
          id?: string
          lead_id?: string
          signature_data?: string | null
          signed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consent_forms_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_notifications: {
        Row: {
          budget: string | null
          chat_summary: string | null
          created_at: string
          id: string
          is_read: boolean
          lead_id: string | null
          lead_name: string
          lead_phone: string
          lead_score: string | null
          lead_source: string | null
          notification_type: string
          placement: string | null
          size: string | null
          tattoo_idea: string | null
          timeline: string | null
        }
        Insert: {
          budget?: string | null
          chat_summary?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          lead_id?: string | null
          lead_name: string
          lead_phone: string
          lead_score?: string | null
          lead_source?: string | null
          notification_type?: string
          placement?: string | null
          size?: string | null
          tattoo_idea?: string | null
          timeline?: string | null
        }
        Update: {
          budget?: string | null
          chat_summary?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          lead_id?: string | null
          lead_name?: string
          lead_phone?: string
          lead_score?: string | null
          lead_source?: string | null
          notification_type?: string
          placement?: string | null
          size?: string | null
          tattoo_idea?: string | null
          timeline?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_notifications_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
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
          google_calendar_event_id: string | null
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
          google_calendar_event_id?: string | null
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
          google_calendar_event_id?: string | null
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
      google_calendar_tokens: {
        Row: {
          access_token: string
          calendar_id: string
          created_at: string
          id: string
          refresh_token: string
          token_expiry: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          calendar_id?: string
          created_at?: string
          id?: string
          refresh_token: string
          token_expiry: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          calendar_id?: string
          created_at?: string
          id?: string
          refresh_token?: string
          token_expiry?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      instagram_bot_state: {
        Row: {
          bot_enabled: boolean
          collected_data: Json
          created_at: string
          current_step: string
          followup_sent: boolean
          id: string
          instagram_sender_id: string
          last_message_at: string
          lead_id: string | null
          updated_at: string
        }
        Insert: {
          bot_enabled?: boolean
          collected_data?: Json
          created_at?: string
          current_step?: string
          followup_sent?: boolean
          id?: string
          instagram_sender_id: string
          last_message_at?: string
          lead_id?: string | null
          updated_at?: string
        }
        Update: {
          bot_enabled?: boolean
          collected_data?: Json
          created_at?: string
          current_step?: string
          followup_sent?: boolean
          id?: string
          instagram_sender_id?: string
          last_message_at?: string
          lead_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_bot_state_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_faq: {
        Row: {
          answer: string | null
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          question: string
          updated_at: string
        }
        Insert: {
          answer?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          question: string
          updated_at?: string
        }
        Update: {
          answer?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          question?: string
          updated_at?: string
        }
        Relationships: []
      }
      instagram_messages: {
        Row: {
          created_at: string
          delivered_at: string | null
          delivery_status: string | null
          direction: string
          error_message: string | null
          file_name: string | null
          id: string
          instagram_sender_id: string
          instagram_username: string
          is_escalated: boolean
          is_internal_note: boolean
          lead_id: string | null
          lead_name: string
          lead_phone: string
          media_url: string | null
          message_body: string | null
          message_type: string | null
          meta_message_id: string | null
          read_at: string | null
          starred: boolean
          status: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          delivery_status?: string | null
          direction?: string
          error_message?: string | null
          file_name?: string | null
          id?: string
          instagram_sender_id?: string
          instagram_username?: string
          is_escalated?: boolean
          is_internal_note?: boolean
          lead_id?: string | null
          lead_name: string
          lead_phone?: string
          media_url?: string | null
          message_body?: string | null
          message_type?: string | null
          meta_message_id?: string | null
          read_at?: string | null
          starred?: boolean
          status?: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          delivery_status?: string | null
          direction?: string
          error_message?: string | null
          file_name?: string | null
          id?: string
          instagram_sender_id?: string
          instagram_username?: string
          is_escalated?: boolean
          is_internal_note?: boolean
          lead_id?: string | null
          lead_name?: string
          lead_phone?: string
          media_url?: string | null
          message_body?: string | null
          message_type?: string | null
          meta_message_id?: string | null
          read_at?: string | null
          starred?: boolean
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_messages_lead_id_fkey"
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
      lead_notes: {
        Row: {
          artist_name: string
          created_at: string
          id: string
          lead_id: string
          note_text: string
        }
        Insert: {
          artist_name?: string
          created_at?: string
          id?: string
          lead_id: string
          note_text: string
        }
        Update: {
          artist_name?: string
          created_at?: string
          id?: string
          lead_id?: string
          note_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
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
          client_id_code: string | null
          created_at: string
          full_name: string
          id: string
          instagram_username: string | null
          last_contacted_at: string | null
          lead_score: string | null
          next_followup_date: string | null
          notes: string | null
          phone: string
          placement: string | null
          preferred_date: string | null
          size: string | null
          source: string
          status: string
          tags: string[]
          tattoo_style: string | null
          timeline: string | null
          updated_at: string
          whatsapp_opt_in: boolean
        }
        Insert: {
          bot_enabled?: boolean
          budget?: string | null
          client_id_code?: string | null
          created_at?: string
          full_name: string
          id?: string
          instagram_username?: string | null
          last_contacted_at?: string | null
          lead_score?: string | null
          next_followup_date?: string | null
          notes?: string | null
          phone: string
          placement?: string | null
          preferred_date?: string | null
          size?: string | null
          source?: string
          status?: string
          tags?: string[]
          tattoo_style?: string | null
          timeline?: string | null
          updated_at?: string
          whatsapp_opt_in?: boolean
        }
        Update: {
          bot_enabled?: boolean
          budget?: string | null
          client_id_code?: string | null
          created_at?: string
          full_name?: string
          id?: string
          instagram_username?: string | null
          last_contacted_at?: string | null
          lead_score?: string | null
          next_followup_date?: string | null
          notes?: string | null
          phone?: string
          placement?: string | null
          preferred_date?: string | null
          size?: string | null
          source?: string
          status?: string
          tags?: string[]
          tattoo_style?: string | null
          timeline?: string | null
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
      reviews: {
        Row: {
          admin_reply: string | null
          artist_name: string | null
          client_name: string | null
          client_phone: string | null
          created_at: string
          final_review_text: string | null
          generated_reviews: Json
          google_redirected_at: string | null
          id: string
          lead_id: string | null
          placement: string | null
          posted_to_google: boolean
          rating: number | null
          review_text: string | null
          source: string
          status: string
          tattoo_style: string | null
          token: string | null
          tone: string | null
        }
        Insert: {
          admin_reply?: string | null
          artist_name?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          final_review_text?: string | null
          generated_reviews?: Json
          google_redirected_at?: string | null
          id?: string
          lead_id?: string | null
          placement?: string | null
          posted_to_google?: boolean
          rating?: number | null
          review_text?: string | null
          source?: string
          status?: string
          tattoo_style?: string | null
          token?: string | null
          tone?: string | null
        }
        Update: {
          admin_reply?: string | null
          artist_name?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          final_review_text?: string | null
          generated_reviews?: Json
          google_redirected_at?: string | null
          id?: string
          lead_id?: string | null
          placement?: string | null
          posted_to_google?: boolean
          rating?: number | null
          review_text?: string | null
          source?: string
          status?: string
          tattoo_style?: string | null
          token?: string | null
          tone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_lead_id_fkey"
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
      system_logs: {
        Row: {
          category: string
          created_at: string
          details: Json | null
          id: string
          is_resolved: boolean
          lead_id: string | null
          log_type: string
          message: string
        }
        Insert: {
          category?: string
          created_at?: string
          details?: Json | null
          id?: string
          is_resolved?: boolean
          lead_id?: string | null
          log_type?: string
          message: string
        }
        Update: {
          category?: string
          created_at?: string
          details?: Json | null
          id?: string
          is_resolved?: boolean
          lead_id?: string | null
          log_type?: string
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      tattoo_completions: {
        Row: {
          aftercare_notes: string | null
          artist_name: string
          client_id_code: string
          created_at: string
          id: string
          invoice_url: string | null
          lead_id: string
          photo_urls: string[]
          tattoo_price: number
        }
        Insert: {
          aftercare_notes?: string | null
          artist_name: string
          client_id_code: string
          created_at?: string
          id?: string
          invoice_url?: string | null
          lead_id: string
          photo_urls?: string[]
          tattoo_price?: number
        }
        Update: {
          aftercare_notes?: string | null
          artist_name?: string
          client_id_code?: string
          created_at?: string
          id?: string
          invoice_url?: string | null
          lead_id?: string
          photo_urls?: string[]
          tattoo_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "tattoo_completions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
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
          file_name: string | null
          id: string
          is_escalated: boolean
          is_internal_note: boolean
          lead_id: string | null
          lead_name: string
          lead_phone: string
          media_url: string | null
          message_body: string | null
          message_type: string | null
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
          file_name?: string | null
          id?: string
          is_escalated?: boolean
          is_internal_note?: boolean
          lead_id?: string | null
          lead_name: string
          lead_phone: string
          media_url?: string | null
          message_body?: string | null
          message_type?: string | null
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
          file_name?: string | null
          id?: string
          is_escalated?: boolean
          is_internal_note?: boolean
          lead_id?: string | null
          lead_name?: string
          lead_phone?: string
          media_url?: string | null
          message_body?: string | null
          message_type?: string | null
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
