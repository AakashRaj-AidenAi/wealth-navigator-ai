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
      campaign_message_logs: {
        Row: {
          campaign_id: string
          channel: string
          client_id: string
          content: string | null
          created_at: string
          delivered_at: string | null
          error_message: string | null
          id: string
          sent_at: string | null
          status: string
          subject: string | null
        }
        Insert: {
          campaign_id: string
          channel: string
          client_id: string
          content?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          subject?: string | null
        }
        Update: {
          campaign_id?: string
          channel?: string
          client_id?: string
          content?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_message_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_message_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_recipients: {
        Row: {
          campaign_id: string
          client_id: string
          created_at: string
          delivered_at: string | null
          error_message: string | null
          id: string
          opened_at: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          campaign_id: string
          client_id: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          opened_at?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string
          client_id?: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          opened_at?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "communication_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_segments: {
        Row: {
          client_count: number
          created_at: string
          created_by: string
          description: string | null
          filter_criteria: Json
          id: string
          is_auto_updating: boolean
          name: string
          updated_at: string
        }
        Insert: {
          client_count?: number
          created_at?: string
          created_by: string
          description?: string | null
          filter_criteria?: Json
          id?: string
          is_auto_updating?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          client_count?: number
          created_at?: string
          created_by?: string
          description?: string | null
          filter_criteria?: Json
          id?: string
          is_auto_updating?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      campaigns_v2: {
        Row: {
          attachment_paths: string[] | null
          channel: string
          completed_at: string | null
          content: string
          created_at: string
          created_by: string
          description: string | null
          failed_count: number | null
          id: string
          name: string
          scheduled_at: string | null
          segment_id: string | null
          sent_at: string | null
          sent_count: number | null
          status: string
          subject: string | null
          template_id: string | null
          total_recipients: number | null
          updated_at: string
          variables_used: string[] | null
        }
        Insert: {
          attachment_paths?: string[] | null
          channel?: string
          completed_at?: string | null
          content?: string
          created_at?: string
          created_by: string
          description?: string | null
          failed_count?: number | null
          id?: string
          name: string
          scheduled_at?: string | null
          segment_id?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          subject?: string | null
          template_id?: string | null
          total_recipients?: number | null
          updated_at?: string
          variables_used?: string[] | null
        }
        Update: {
          attachment_paths?: string[] | null
          channel?: string
          completed_at?: string | null
          content?: string
          created_at?: string
          created_by?: string
          description?: string | null
          failed_count?: number | null
          id?: string
          name?: string
          scheduled_at?: string | null
          segment_id?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          subject?: string | null
          template_id?: string | null
          total_recipients?: number | null
          updated_at?: string
          variables_used?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_v2_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "campaign_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_v2_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      churn_predictions: {
        Row: {
          advisor_id: string
          calculated_at: string
          campaign_responses: number | null
          churn_risk_percentage: number
          client_id: string
          created_at: string
          days_since_interaction: number | null
          engagement_score: number | null
          id: string
          risk_factors: Json | null
          risk_level: string | null
          sip_stopped: boolean | null
          total_campaigns: number | null
          updated_at: string
        }
        Insert: {
          advisor_id: string
          calculated_at?: string
          campaign_responses?: number | null
          churn_risk_percentage?: number
          client_id: string
          created_at?: string
          days_since_interaction?: number | null
          engagement_score?: number | null
          id?: string
          risk_factors?: Json | null
          risk_level?: string | null
          sip_stopped?: boolean | null
          total_campaigns?: number | null
          updated_at?: string
        }
        Update: {
          advisor_id?: string
          calculated_at?: string
          campaign_responses?: number | null
          churn_risk_percentage?: number
          client_id?: string
          created_at?: string
          days_since_interaction?: number | null
          engagement_score?: number | null
          id?: string
          risk_factors?: Json | null
          risk_level?: string | null
          sip_stopped?: boolean | null
          total_campaigns?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "churn_predictions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
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
      client_aum: {
        Row: {
          client_id: string
          created_at: string
          current_aum: number | null
          debt_aum: number | null
          equity_aum: number | null
          id: string
          last_updated: string
          other_assets: number | null
        }
        Insert: {
          client_id: string
          created_at?: string
          current_aum?: number | null
          debt_aum?: number | null
          equity_aum?: number | null
          id?: string
          last_updated?: string
          other_assets?: number | null
        }
        Update: {
          client_id?: string
          created_at?: string
          current_aum?: number | null
          debt_aum?: number | null
          equity_aum?: number | null
          id?: string
          last_updated?: string
          other_assets?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_aum_client_id_fkey"
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
      client_corporate_actions: {
        Row: {
          advisor_id: string
          ai_personalized_summary: string | null
          client_id: string
          corporate_action_id: string
          created_at: string | null
          estimated_impact: number | null
          holdings_quantity: number
          id: string
          is_notified: boolean | null
          notified_at: string | null
          task_created: boolean | null
          task_id: string | null
          updated_at: string | null
        }
        Insert: {
          advisor_id: string
          ai_personalized_summary?: string | null
          client_id: string
          corporate_action_id: string
          created_at?: string | null
          estimated_impact?: number | null
          holdings_quantity?: number
          id?: string
          is_notified?: boolean | null
          notified_at?: string | null
          task_created?: boolean | null
          task_id?: string | null
          updated_at?: string | null
        }
        Update: {
          advisor_id?: string
          ai_personalized_summary?: string | null
          client_id?: string
          corporate_action_id?: string
          created_at?: string | null
          estimated_impact?: number | null
          holdings_quantity?: number
          id?: string
          is_notified?: boolean | null
          notified_at?: string | null
          task_created?: boolean | null
          task_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_corporate_actions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_corporate_actions_corporate_action_id_fkey"
            columns: ["corporate_action_id"]
            isOneToOne: false
            referencedRelation: "corporate_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_corporate_actions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
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
      client_engagement_scores: {
        Row: {
          advisor_id: string
          calculated_at: string
          campaign_response_rate: number | null
          client_id: string
          created_at: string
          days_since_last_interaction: number | null
          engagement_level: string | null
          engagement_score: number
          id: string
          meetings_last_90_days: number | null
          portfolio_activity_frequency: number | null
          revenue_contribution: number | null
          task_completion_rate: number | null
          updated_at: string
        }
        Insert: {
          advisor_id: string
          calculated_at?: string
          campaign_response_rate?: number | null
          client_id: string
          created_at?: string
          days_since_last_interaction?: number | null
          engagement_level?: string | null
          engagement_score?: number
          id?: string
          meetings_last_90_days?: number | null
          portfolio_activity_frequency?: number | null
          revenue_contribution?: number | null
          task_completion_rate?: number | null
          updated_at?: string
        }
        Update: {
          advisor_id?: string
          calculated_at?: string
          campaign_response_rate?: number | null
          client_id?: string
          created_at?: string
          days_since_last_interaction?: number | null
          engagement_level?: string | null
          engagement_score?: number
          id?: string
          meetings_last_90_days?: number | null
          portfolio_activity_frequency?: number | null
          revenue_contribution?: number | null
          task_completion_rate?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_engagement_scores_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
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
          authorized_person_email: string | null
          authorized_person_name: string | null
          authorized_person_phone: string | null
          business_nature: string | null
          cin_number: string | null
          client_code: string | null
          client_name: string
          client_type: Database["public"]["Enums"]["client_type"] | null
          converted_from_lead_id: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          gst_number: string | null
          id: string
          kyc_expiry_date: string | null
          legal_name: string | null
          pan_number: string | null
          phone: string | null
          registration_date: string | null
          risk_profile: string | null
          source: string | null
          status: string | null
          total_assets: number | null
          updated_at: string
        }
        Insert: {
          aadhar_number?: string | null
          address?: string | null
          advisor_id: string
          anniversary_date?: string | null
          authorized_person_email?: string | null
          authorized_person_name?: string | null
          authorized_person_phone?: string | null
          business_nature?: string | null
          cin_number?: string | null
          client_code?: string | null
          client_name: string
          client_type?: Database["public"]["Enums"]["client_type"] | null
          converted_from_lead_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          gst_number?: string | null
          id?: string
          kyc_expiry_date?: string | null
          legal_name?: string | null
          pan_number?: string | null
          phone?: string | null
          registration_date?: string | null
          risk_profile?: string | null
          source?: string | null
          status?: string | null
          total_assets?: number | null
          updated_at?: string
        }
        Update: {
          aadhar_number?: string | null
          address?: string | null
          advisor_id?: string
          anniversary_date?: string | null
          authorized_person_email?: string | null
          authorized_person_name?: string | null
          authorized_person_phone?: string | null
          business_nature?: string | null
          cin_number?: string | null
          client_code?: string | null
          client_name?: string
          client_type?: Database["public"]["Enums"]["client_type"] | null
          converted_from_lead_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          gst_number?: string | null
          id?: string
          kyc_expiry_date?: string | null
          legal_name?: string | null
          pan_number?: string | null
          phone?: string | null
          registration_date?: string | null
          risk_profile?: string | null
          source?: string | null
          status?: string | null
          total_assets?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_converted_from_lead_id_fkey"
            columns: ["converted_from_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_records: {
        Row: {
          client_id: string
          created_at: string
          id: string
          payout_date: string | null
          product_name: string
          trail_commission: number | null
          updated_at: string
          upfront_commission: number | null
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          payout_date?: string | null
          product_name: string
          trail_commission?: number | null
          updated_at?: string
          upfront_commission?: number | null
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          payout_date?: string | null
          product_name?: string
          trail_commission?: number | null
          updated_at?: string
          upfront_commission?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_campaigns: {
        Row: {
          channel: string
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          failed_count: number | null
          id: string
          name: string
          scheduled_at: string | null
          sent_count: number | null
          started_at: string | null
          status: string
          target_filter: Json | null
          template_id: string | null
          total_recipients: number | null
          updated_at: string
        }
        Insert: {
          channel?: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          failed_count?: number | null
          id?: string
          name: string
          scheduled_at?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: string
          target_filter?: Json | null
          template_id?: string | null
          total_recipients?: number | null
          updated_at?: string
        }
        Update: {
          channel?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          failed_count?: number | null
          id?: string
          name?: string
          scheduled_at?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: string
          target_filter?: Json | null
          template_id?: string | null
          total_recipients?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_logs: {
        Row: {
          attachments: Json | null
          campaign_id: string | null
          client_id: string
          communication_type: string
          content: string | null
          created_at: string
          delivered_at: string | null
          direction: string
          id: string
          metadata: Json | null
          opened_at: string | null
          sent_at: string
          sent_by: string
          status: string | null
          subject: string | null
          template_id: string | null
        }
        Insert: {
          attachments?: Json | null
          campaign_id?: string | null
          client_id: string
          communication_type: string
          content?: string | null
          created_at?: string
          delivered_at?: string | null
          direction?: string
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          sent_at?: string
          sent_by: string
          status?: string | null
          subject?: string | null
          template_id?: string | null
        }
        Update: {
          attachments?: Json | null
          campaign_id?: string | null
          client_id?: string
          communication_type?: string
          content?: string | null
          created_at?: string
          delivered_at?: string | null
          direction?: string
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          sent_at?: string
          sent_by?: string
          status?: string | null
          subject?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "communication_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
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
      corporate_action_alerts: {
        Row: {
          advisor_id: string
          corporate_action_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          read_at: string | null
          severity: string | null
          title: string
        }
        Insert: {
          advisor_id: string
          corporate_action_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          read_at?: string | null
          severity?: string | null
          title: string
        }
        Update: {
          advisor_id?: string
          corporate_action_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          read_at?: string | null
          severity?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "corporate_action_alerts_corporate_action_id_fkey"
            columns: ["corporate_action_id"]
            isOneToOne: false
            referencedRelation: "corporate_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      corporate_actions: {
        Row: {
          action_type: Database["public"]["Enums"]["corporate_action_type"]
          ai_suggestion: string | null
          ai_summary: string | null
          announcement_date: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          dividend_amount: number | null
          ex_date: string | null
          id: string
          payment_date: string | null
          ratio: string | null
          raw_data: Json | null
          record_date: string | null
          security_name: string
          source: string | null
          status: Database["public"]["Enums"]["corporate_action_status"] | null
          symbol: string
          updated_at: string | null
        }
        Insert: {
          action_type: Database["public"]["Enums"]["corporate_action_type"]
          ai_suggestion?: string | null
          ai_summary?: string | null
          announcement_date?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          dividend_amount?: number | null
          ex_date?: string | null
          id?: string
          payment_date?: string | null
          ratio?: string | null
          raw_data?: Json | null
          record_date?: string | null
          security_name: string
          source?: string | null
          status?: Database["public"]["Enums"]["corporate_action_status"] | null
          symbol: string
          updated_at?: string | null
        }
        Update: {
          action_type?: Database["public"]["Enums"]["corporate_action_type"]
          ai_suggestion?: string | null
          ai_summary?: string | null
          announcement_date?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          dividend_amount?: number | null
          ex_date?: string | null
          id?: string
          payment_date?: string | null
          ratio?: string | null
          raw_data?: Json | null
          record_date?: string | null
          security_name?: string
          source?: string | null
          status?: Database["public"]["Enums"]["corporate_action_status"] | null
          symbol?: string
          updated_at?: string | null
        }
        Relationships: []
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
      invoices: {
        Row: {
          advisor_id: string
          amount: number
          client_id: string
          created_at: string
          due_date: string | null
          fee_type: string | null
          gst: number | null
          id: string
          invoice_number: string | null
          notes: string | null
          recurring_frequency: string | null
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          advisor_id: string
          amount?: number
          client_id: string
          created_at?: string
          due_date?: string | null
          fee_type?: string | null
          gst?: number | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          recurring_frequency?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          advisor_id?: string
          amount?: number
          client_id?: string
          created_at?: string
          due_date?: string | null
          fee_type?: string | null
          gst?: number | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          recurring_frequency?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
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
      lead_stage_history: {
        Row: {
          changed_at: string
          changed_by: string
          created_at: string
          duration_in_stage: unknown
          id: string
          lead_id: string
          new_stage: string
          notes: string | null
          previous_stage: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          created_at?: string
          duration_in_stage?: unknown
          id?: string
          lead_id: string
          new_stage: string
          notes?: string | null
          previous_stage: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          created_at?: string
          duration_in_stage?: unknown
          id?: string
          lead_id?: string
          new_stage?: string
          notes?: string | null
          previous_stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_stage_history_lead_id_fkey"
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
          expected_close_date: string | null
          expected_value: number | null
          id: string
          last_activity_at: string | null
          lead_score: number | null
          loss_reason: string | null
          name: string
          next_follow_up: string | null
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
          expected_close_date?: string | null
          expected_value?: number | null
          id?: string
          last_activity_at?: string | null
          lead_score?: number | null
          loss_reason?: string | null
          name: string
          next_follow_up?: string | null
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
          expected_close_date?: string | null
          expected_value?: number | null
          id?: string
          last_activity_at?: string | null
          lead_score?: number | null
          loss_reason?: string | null
          name?: string
          next_follow_up?: string | null
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
      message_templates: {
        Row: {
          category: string
          channel: string
          content: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean | null
          name: string
          subject: string | null
          updated_at: string
          variables: string[] | null
        }
        Insert: {
          category: string
          channel?: string
          content: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean | null
          name: string
          subject?: string | null
          updated_at?: string
          variables?: string[] | null
        }
        Update: {
          category?: string
          channel?: string
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string | null
          updated_at?: string
          variables?: string[] | null
        }
        Relationships: []
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
      payments: {
        Row: {
          amount_received: number
          created_at: string
          id: string
          invoice_id: string
          payment_date: string
          payment_mode: string
        }
        Insert: {
          amount_received?: number
          created_at?: string
          id?: string
          invoice_id: string
          payment_date?: string
          payment_mode?: string
        }
        Update: {
          amount_received?: number
          created_at?: string
          id?: string
          invoice_id?: string
          payment_date?: string
          payment_mode?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
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
      revenue_records: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          date: string
          id: string
          product_type: string
          recurring: boolean | null
          revenue_type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          client_id: string
          created_at?: string
          date?: string
          id?: string
          product_type: string
          recurring?: boolean | null
          revenue_type?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          date?: string
          id?: string
          product_type?: string
          recurring?: boolean | null
          revenue_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_answers: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          question_category: string
          question_id: string
          question_text: string
          selected_option: string
          selected_score: number
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          question_category: string
          question_id: string
          question_text: string
          selected_option: string
          selected_score: number
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          question_category?: string
          question_id?: string
          question_text?: string
          selected_option?: string
          selected_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "risk_answers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "risk_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_profiles: {
        Row: {
          advisor_id: string
          alternatives_pct: number
          cash_pct: number
          category: Database["public"]["Enums"]["risk_category"]
          client_id: string
          created_at: string
          debt_pct: number
          equity_pct: number
          gold_pct: number
          id: string
          ip_address: string | null
          is_active: boolean
          notes: string | null
          signature_data: string | null
          signed_at: string | null
          total_score: number
          updated_at: string
          user_agent: string | null
          version: number
        }
        Insert: {
          advisor_id: string
          alternatives_pct?: number
          cash_pct?: number
          category?: Database["public"]["Enums"]["risk_category"]
          client_id: string
          created_at?: string
          debt_pct?: number
          equity_pct?: number
          gold_pct?: number
          id?: string
          ip_address?: string | null
          is_active?: boolean
          notes?: string | null
          signature_data?: string | null
          signed_at?: string | null
          total_score?: number
          updated_at?: string
          user_agent?: string | null
          version?: number
        }
        Update: {
          advisor_id?: string
          alternatives_pct?: number
          cash_pct?: number
          category?: Database["public"]["Enums"]["risk_category"]
          client_id?: string
          created_at?: string
          debt_pct?: number
          equity_pct?: number
          gold_pct?: number
          id?: string
          ip_address?: string | null
          is_active?: boolean
          notes?: string | null
          signature_data?: string | null
          signed_at?: string | null
          total_score?: number
          updated_at?: string
          user_agent?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "risk_profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
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
      check_client_duplicates: {
        Args: {
          p_advisor_id: string
          p_cin_number?: string
          p_client_name?: string
          p_email?: string
          p_exclude_client_id?: string
          p_gst_number?: string
          p_pan_number?: string
          p_phone?: string
        }
        Returns: {
          client_id: string
          client_name: string
          confidence_score: number
          email: string
          is_hard_block: boolean
          match_type: string
          phone: string
        }[]
      }
      generate_client_code: { Args: never; Returns: string }
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
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      activity_type:
        | "call"
        | "email"
        | "meeting"
        | "note"
        | "document"
        | "reminder"
        | "silent_alert"
      app_role: "wealth_advisor" | "compliance_officer" | "client"
      client_tag:
        | "hni"
        | "uhni"
        | "prospect"
        | "active"
        | "dormant"
        | "vip"
        | "nri"
      client_type: "individual" | "entity"
      consent_status: "pending" | "signed" | "expired" | "revoked"
      consent_type:
        | "risk_disclosure"
        | "investment_policy"
        | "data_privacy"
        | "fee_agreement"
        | "kyc_authorization"
        | "portfolio_discretion"
        | "electronic_delivery"
      corporate_action_status: "upcoming" | "active" | "completed" | "cancelled"
      corporate_action_type:
        | "dividend"
        | "bonus"
        | "split"
        | "rights_issue"
        | "merger"
        | "demerger"
        | "buyback"
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
      risk_category:
        | "very_conservative"
        | "conservative"
        | "moderate"
        | "aggressive"
        | "very_aggressive"
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
        | "silent_client_followup"
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
        "silent_alert",
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
      client_type: ["individual", "entity"],
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
      corporate_action_status: ["upcoming", "active", "completed", "cancelled"],
      corporate_action_type: [
        "dividend",
        "bonus",
        "split",
        "rights_issue",
        "merger",
        "demerger",
        "buyback",
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
      risk_category: [
        "very_conservative",
        "conservative",
        "moderate",
        "aggressive",
        "very_aggressive",
      ],
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
        "silent_client_followup",
      ],
    },
  },
} as const
