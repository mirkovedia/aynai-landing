export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      commission_payments: {
        Row: {
          amount_bs: number
          created_at: string
          exchange_request_id: string
          id: string
          paid_at: string | null
          payer_id: string
          provider: string
          provider_ref: string | null
          qr_payload: string | null
          status: string
        }
        Insert: {
          amount_bs: number
          created_at?: string
          exchange_request_id: string
          id?: string
          paid_at?: string | null
          payer_id: string
          provider?: string
          provider_ref?: string | null
          qr_payload?: string | null
          status?: string
        }
        Update: {
          amount_bs?: number
          created_at?: string
          exchange_request_id?: string
          id?: string
          paid_at?: string | null
          payer_id?: string
          provider?: string
          provider_ref?: string | null
          qr_payload?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_payments_exchange_request_id_fkey"
            columns: ["exchange_request_id"]
            isOneToOne: false
            referencedRelation: "exchange_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_payments_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          message: string | null
          offer_skill: string
          recipient_confirmed: boolean
          recipient_id: string
          requester_confirmed: boolean
          requester_id: string
          status: string
          updated_at: string
          want_skill: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          message?: string | null
          offer_skill: string
          recipient_confirmed?: boolean
          recipient_id: string
          requester_confirmed?: boolean
          requester_id: string
          status?: string
          updated_at?: string
          want_skill: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          message?: string | null
          offer_skill?: string
          recipient_confirmed?: boolean
          recipient_id?: string
          requester_confirmed?: boolean
          requester_id?: string
          status?: string
          updated_at?: string
          want_skill?: string
        }
        Relationships: [
          {
            foreignKeyName: "exchange_requests_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exchange_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          availability: string
          avatar_url: string | null
          ayni_score: number
          bio: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          links: Json
          location: string | null
          modality: string | null
          skills: string[]
          username: string | null
        }
        Insert: {
          availability?: string
          avatar_url?: string | null
          ayni_score?: number
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          links?: Json
          location?: string | null
          modality?: string | null
          skills?: string[]
          username?: string | null
        }
        Update: {
          availability?: string
          avatar_url?: string | null
          ayni_score?: number
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          links?: Json
          location?: string | null
          modality?: string | null
          skills?: string[]
          username?: string | null
        }
        Relationships: []
      }
      ratings: {
        Row: {
          comment: string | null
          created_at: string
          exchange_request_id: string
          id: string
          ratee_id: string
          rater_id: string
          stars: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          exchange_request_id: string
          id?: string
          ratee_id: string
          rater_id: string
          stars: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          exchange_request_id?: string
          id?: string
          ratee_id?: string
          rater_id?: string
          stars?: number
        }
        Relationships: [
          {
            foreignKeyName: "ratings_exchange_request_id_fkey"
            columns: ["exchange_request_id"]
            isOneToOne: false
            referencedRelation: "exchange_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_ratee_id_fkey"
            columns: ["ratee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_skills: {
        Row: {
          category: string | null
          created_at: string
          id: string
          kind: string
          level: string | null
          name: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          kind: string
          level?: string | null
          name: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          kind?: string
          level?: string | null
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_skills_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_notification: {
        Args: {
          p_body: string | null
          p_link: string | null
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      recalc_ayni_score: { Args: { p_user_id: string }; Returns: number }
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

export const Constants = {
  public: {
    Enums: {},
  },
} as const
