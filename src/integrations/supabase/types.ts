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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      advice_records: {
        Row: {
          acknowledged_at: string | null
          advice_type: string
          advisor_id: string
          client_acknowledged: boolean | null
          client_id: string
          created_at: string
          id: string
          rationale: string | null
          recommendation: string
          risk_considerations: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          advice_type: string
          advisor_id: string
          client_acknowledged?: boolean | null
          client_id: string
          created_at?: string
          id?: string
          rationale?: string | null
          recommendation: string
          risk_considerations?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          advice_type?: string
          advisor_id?: string
          client_acknowledged?: boolean | null
          client_id?: string
          created_at?: string
          id?: string
          rationale?: string | null
          recommendation?: string
          risk_considerations?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advice_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
          user_agent: string | null
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      client_activities: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          client_id: string
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          metadata: Json | null
          scheduled_at: string | null
          title: string
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          client_id: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          metadata?: Json | null
          scheduled_at?: string | null
          title: string
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          client_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          scheduled_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_consents: {
        Row: {
          client_id: string
          consent_type: Database["public"]["Enums"]["consent_type"]
          created_at: string
          document_version: string | null
          expires_at: string | null
          id: string
          ip_address: string | null
          signed_at: string | null
          status: Database["public"]["Enums"]["consent_status"]
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          client_id: string
          consent_type: Database["public"]["Enums"]["consent_type"]
          created_at?: string
          document_version?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["consent_status"]
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          client_id?: string
          consent_type?: Database["public"]["Enums"]["consent_type"]
          created_at?: string
          document_version?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["consent_status"]
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_consents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_documents: {
        Row: {
          client_id: string
          created_at: string
          document_type: Database["public"]["Enums"]["document_type"]
          expiry_date: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          notes: string | null
          uploaded_by: string
        }
        Insert: {
          client_id: string
          created_at?: string
          document_type: Database["public"]["Enums"]["document_type"]
          expiry_date?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          uploaded_by: string
        }
        Update: {
          client_id?: string
          created_at?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          expiry_date?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_family_members: {
        Row: {
          client_id: string
          created_at: string
          date_of_birth: string | null
          email: string | null
          id: string
          is_nominee: boolean | null
          name: string
          phone: string | null
          relationship: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          id?: string
          is_nominee?: boolean | null
          name: string
          phone?: string | null
          relationship: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          id?: string
          is_nominee?: boolean | null
          name?: string
          phone?: string | null
          relationship?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_family_members_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_life_goals: {
        Row: {
          client_id: string
          created_at: string
          description: string | null
          goal_type: string
          id: string
          name: string
          priority: string | null
          status: string | null
          target_amount: number | null
          target_date: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          goal_type: string
          id?: string
          name: string
          priority?: string | null
          status?: string | null
          target_amount?: number | null
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          goal_type?: string
          id?: string
          name?: string
          priority?: string | null
          status?: string | null
          target_amount?: number | null
          target_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_life_goals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_nominees: {
        Row: {
          address: string | null
          client_id: string
          created_at: string
          date_of_birth: string | null
          id: string
          id_proof_number: string | null
          id_proof_type: string | null
          name: string
          percentage: number
          relationship: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          client_id: string
          created_at?: string
          date_of_birth?: string | null
          id?: string
          id_proof_number?: string | null
          id_proof_type?: string | null
          name: string
          percentage: number
          relationship: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          client_id?: string
          created_at?: string
          date_of_birth?: string | null
          id?: string
          id_proof_number?: string | null
          id_proof_type?: string | null
          name?: string
          percentage?: number
          relationship?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_nominees_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notes: {
        Row: {
          client_id: string
          content: string
          created_at: string
          created_by: string
          id: string
          is_pinned: boolean | null
          title: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          content: string
          created_at?: string
          created_by: string
          id?: string
          is_pinned?: boolean | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          is_pinned?: boolean | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_reminders: {
        Row: {
          client_id: string
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_completed: boolean | null
          is_recurring: boolean | null
          recurrence_pattern: string | null
          reminder_date: string
          reminder_type: Database["public"]["Enums"]["reminder_type"]
          title: string
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_completed?: boolean | null
          is_recurring?: boolean | null
          recurrence_pattern?: string | null
          reminder_date: string
          reminder_type: Database["public"]["Enums"]["reminder_type"]
          title: string
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_completed?: boolean | null
          is_recurring?: boolean | null
          recurrence_pattern?: string | null
          reminder_date?: string
          reminder_type?: Database["public"]["Enums"]["reminder_type"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_reminders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_tags: {
        Row: {
          client_id: string
          created_at: string
          id: string
          tag: Database["public"]["Enums"]["client_tag"]
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          tag: Database["public"]["Enums"]["client_tag"]
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          tag?: Database["public"]["Enums"]["client_tag"]
        }
        Relationships: [
          {
            foreignKeyName: "client_tags_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          aadhar_number: string | null
          address: string | null
          advisor_id: string
          anniversary_date: string | null
          client_name: string
          created_at: string
          date_of_birth: string | null
          email: string | null
          id: string
          kyc_expiry_date: string | null
          pan_number: string | null
          phone: string | null
          risk_profile: string | null
          status: string | null
          total_assets: number | null
          updated_at: string
        }
        Insert: {
          aadhar_number?: string | null
          address?: string | null
          advisor_id: string
          anniversary_date?: string | null
          client_name: string
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          id?: string
          kyc_expiry_date?: string | null
          pan_number?: string | null
          phone?: string | null
          risk_profile?: string | null
          status?: string | null
          total_assets?: number | null
          updated_at?: string
        }
        Update: {
          aadhar_number?: string | null
          address?: string | null
          advisor_id?: string
          anniversary_date?: string | null
          client_name?: string
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          id?: string
          kyc_expiry_date?: string | null
          pan_number?: string | null
          phone?: string | null
          risk_profile?: string | null
          status?: string | null
          total_assets?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      communication_logs: {
        Row: {
          attachments: Json | null
          client_id: string
          communication_type: string
          content: string | null
          created_at: string
          direction: string
          id: string
          sent_at: string
          sent_by: string
          subject: string | null
        }
        Insert: {
          attachments?: Json | null
          client_id: string
          communication_type: string
          content?: string | null
          created_at?: string
          direction?: string
          id?: string
          sent_at?: string
          sent_by: string
          subject?: string | null
        }
        Update: {
          attachments?: Json | null
          client_id?: string
          communication_type?: string
          content?: string | null
          created_at?: string
          direction?: string
          id?: string
          sent_at?: string
          sent_by?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_alerts: {
        Row: {
          alert_type: string
          client_id: string | null
          created_at: string
          description: string | null
          id: string
          is_resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          title: string
        }
        Insert: {
          alert_type: string
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title: string
        }
        Update: {
          alert_type?: string
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_alerts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          client_id: string
          created_at: string
          current_amount: number | null
          description: string | null
          id: string
          name: string
          priority: string | null
          status: string | null
          target_amount: number
          target_date: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          current_amount?: number | null
          description?: string | null
          id?: string
          name: string
          priority?: string | null
          status?: string | null
          target_amount: number
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          current_amount?: number | null
          description?: string | null
          id?: string
          name?: string
          priority?: string | null
          status?: string | null
          target_amount?: number
          target_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activities: {
        Row: {
          activity_type: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          lead_id: string
          title: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          lead_id: string
          title: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          lead_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string
          converted_at: string | null
          converted_client_id: string | null
          created_at: string
          email: string | null
          expected_value: number | null
          id: string
          last_activity_at: string | null
          lead_score: number | null
          name: string
          notes: string | null
          phone: string | null
          probability: number | null
          source: Database["public"]["Enums"]["lead_source"]
          stage: Database["public"]["Enums"]["lead_stage"]
          updated_at: string
        }
        Insert: {
          assigned_to: string
          converted_at?: string | null
          converted_client_id?: string | null
          created_at?: string
          email?: string | null
          expected_value?: number | null
          id?: string
          last_activity_at?: string | null
          lead_score?: number | null
          name: string
          notes?: string | null
          phone?: string | null
          probability?: number | null
          source?: Database["public"]["Enums"]["lead_source"]
          stage?: Database["public"]["Enums"]["lead_stage"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string
          converted_at?: string | null
          converted_client_id?: string | null
          created_at?: string
          email?: string | null
          expected_value?: number | null
          id?: string
          last_activity_at?: string | null
          lead_score?: number | null
          name?: string
          notes?: string | null
          phone?: string | null
          probability?: number | null
          source?: Database["public"]["Enums"]["lead_source"]
          stage?: Database["public"]["Enums"]["lead_stage"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_converted_client_id_fkey"
            columns: ["converted_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          executed_at: string | null
          execution_price: number | null
          execution_type: Database["public"]["Enums"]["execution_type"] | null
          expires_at: string | null
          id: string
          limit_price: number | null
          notes: string | null
          order_type: Database["public"]["Enums"]["order_type"]
          price: number | null
          quantity: number
          status: Database["public"]["Enums"]["order_status"] | null
          symbol: string
          total_amount: number | null
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          executed_at?: string | null
          execution_price?: number | null
          execution_type?: Database["public"]["Enums"]["execution_type"] | null
          expires_at?: string | null
          id?: string
          limit_price?: number | null
          notes?: string | null
          order_type: Database["public"]["Enums"]["order_type"]
          price?: number | null
          quantity: number
          status?: Database["public"]["Enums"]["order_status"] | null
          symbol: string
          total_amount?: number | null
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          executed_at?: string | null
          execution_price?: number | null
          execution_type?: Database["public"]["Enums"]["execution_type"] | null
          expires_at?: string | null
          id?: string
          limit_price?: number | null
          notes?: string | null
          order_type?: Database["public"]["Enums"]["order_type"]
          price?: number | null
          quantity?: number
          status?: Database["public"]["Enums"]["order_status"] | null
          symbol?: string
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          data: Json | null
          description: string | null
          generated_by: string
          id: string
          report_type: Database["public"]["Enums"]["report_type"]
          title: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          description?: string | null
          generated_by: string
          id?: string
          report_type: Database["public"]["Enums"]["report_type"]
          title: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          description?: string | null
          generated_by?: string
          id?: string
          report_type?: Database["public"]["Enums"]["report_type"]
          title?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string
          client_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          due_time: string | null
          id: string
          is_recurring: boolean | null
          next_occurrence: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          recurrence_pattern: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          trigger_reference_id: string | null
          trigger_type: Database["public"]["Enums"]["task_trigger"]
          updated_at: string
        }
        Insert: {
          assigned_to: string
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          is_recurring?: boolean | null
          next_occurrence?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          recurrence_pattern?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          trigger_reference_id?: string | null
          trigger_type?: Database["public"]["Enums"]["task_trigger"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          is_recurring?: boolean | null
          next_occurrence?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          recurrence_pattern?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          trigger_reference_id?: string | null
          trigger_type?: Database["public"]["Enums"]["task_trigger"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
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
      is_client: { Args: never; Returns: boolean }
      is_client_advisor: { Args: { _client_id: string }; Returns: boolean }
      is_compliance_officer: { Args: never; Returns: boolean }
      is_wealth_advisor: { Args: never; Returns: boolean }
    }
    Enums: {
      activity_type:
        | "call"
        | "email"
        | "meeting"
        | "note"
        | "document"
        | "reminder"
      app_role: "wealth_advisor" | "compliance_officer" | "client"
      client_tag:
        | "hni"
        | "uhni"
        | "prospect"
        | "active"
        | "dormant"
        | "vip"
        | "nri"
      consent_status: "pending" | "signed" | "expired" | "revoked"
      consent_type:
        | "risk_disclosure"
        | "investment_policy"
        | "data_privacy"
        | "fee_agreement"
        | "kyc_authorization"
        | "portfolio_discretion"
        | "electronic_delivery"
      document_type:
        | "kyc"
        | "agreement"
        | "statement"
        | "id_proof"
        | "address_proof"
        | "other"
      execution_type: "market" | "limit" | "fill_or_kill" | "good_till_cancel"
      lead_source:
        | "referral"
        | "website"
        | "social_media"
        | "event"
        | "cold_call"
        | "advertisement"
        | "partner"
        | "other"
      lead_stage:
        | "new"
        | "contacted"
        | "meeting"
        | "proposal"
        | "closed_won"
        | "lost"
      order_status: "pending" | "executed" | "cancelled"
      order_type: "buy" | "sell"
      reminder_type:
        | "birthday"
        | "anniversary"
        | "kyc_expiry"
        | "maturity_date"
        | "review_meeting"
        | "custom"
      report_type: "compliance" | "analytics" | "performance" | "risk"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "todo" | "in_progress" | "done" | "cancelled"
      task_trigger:
        | "manual"
        | "new_client"
        | "new_lead"
        | "meeting_logged"
        | "proposal_sent"
        | "quarterly_review"
        | "sip_missed"
        | "recurring"
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
      activity_type: [
        "call",
        "email",
        "meeting",
        "note",
        "document",
        "reminder",
      ],
      app_role: ["wealth_advisor", "compliance_officer", "client"],
      client_tag: [
        "hni",
        "uhni",
        "prospect",
        "active",
        "dormant",
        "vip",
        "nri",
      ],
      consent_status: ["pending", "signed", "expired", "revoked"],
      consent_type: [
        "risk_disclosure",
        "investment_policy",
        "data_privacy",
        "fee_agreement",
        "kyc_authorization",
        "portfolio_discretion",
        "electronic_delivery",
      ],
      document_type: [
        "kyc",
        "agreement",
        "statement",
        "id_proof",
        "address_proof",
        "other",
      ],
      execution_type: ["market", "limit", "fill_or_kill", "good_till_cancel"],
      lead_source: [
        "referral",
        "website",
        "social_media",
        "event",
        "cold_call",
        "advertisement",
        "partner",
        "other",
      ],
      lead_stage: [
        "new",
        "contacted",
        "meeting",
        "proposal",
        "closed_won",
        "lost",
      ],
      order_status: ["pending", "executed", "cancelled"],
      order_type: ["buy", "sell"],
      reminder_type: [
        "birthday",
        "anniversary",
        "kyc_expiry",
        "maturity_date",
        "review_meeting",
        "custom",
      ],
      report_type: ["compliance", "analytics", "performance", "risk"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["todo", "in_progress", "done", "cancelled"],
      task_trigger: [
        "manual",
        "new_client",
        "new_lead",
        "meeting_logged",
        "proposal_sent",
        "quarterly_review",
        "sip_missed",
        "recurring",
      ],
    },
  },
} as const
