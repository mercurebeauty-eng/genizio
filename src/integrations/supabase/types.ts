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
  public: {
    Tables: {
      challenges: {
        Row: {
          ai_observations: string | null
          child_id: string
          completed_at: string | null
          created_at: string
          description: string
          domain: string
          duration: string
          id: string
          materials: Json
          notes: string | null
          pedagogical_context: string | null
          progress: number
          proof_image_url: string | null
          status: Database["public"]["Enums"]["challenge_status"]
          steps: Json
          target_intelligences: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_observations?: string | null
          child_id: string
          completed_at?: string | null
          created_at?: string
          description: string
          domain: string
          duration: string
          id?: string
          materials?: Json
          notes?: string | null
          pedagogical_context?: string | null
          progress?: number
          proof_image_url?: string | null
          status?: Database["public"]["Enums"]["challenge_status"]
          steps?: Json
          target_intelligences?: Json
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_observations?: string | null
          child_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string
          domain?: string
          duration?: string
          id?: string
          materials?: Json
          notes?: string | null
          pedagogical_context?: string | null
          progress?: number
          proof_image_url?: string | null
          status?: Database["public"]["Enums"]["challenge_status"]
          steps?: Json
          target_intelligences?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenges_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      child_mentors: {
        Row: {
          access_token: string
          can_view_raw_observations: boolean
          can_view_talent_map: boolean
          can_view_timeline: boolean
          child_id: string
          created_at: string
          expires_at: string | null
          id: string
          mentor_email: string | null
          mentor_name: string | null
          owner_user_id: string
          revoked_at: string | null
          scope_domains: string[]
          status: string
        }
        Insert: {
          access_token: string
          can_view_raw_observations?: boolean
          can_view_talent_map?: boolean
          can_view_timeline?: boolean
          child_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          mentor_email?: string | null
          mentor_name?: string | null
          owner_user_id: string
          revoked_at?: string | null
          scope_domains?: string[]
          status?: string
        }
        Update: {
          access_token?: string
          can_view_raw_observations?: boolean
          can_view_talent_map?: boolean
          can_view_timeline?: boolean
          child_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          mentor_email?: string | null
          mentor_name?: string | null
          owner_user_id?: string
          revoked_at?: string | null
          scope_domains?: string[]
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_mentors_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      child_profiles: {
        Row: {
          age: number
          avatar_color: string
          city: string | null
          completed_challenges: string[]
          country: string | null
          created_at: string
          favorite_challenges: string[]
          id: string
          interests: string[]
          name: string
          talents: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          age: number
          avatar_color?: string
          city?: string | null
          completed_challenges?: string[]
          country?: string | null
          created_at?: string
          favorite_challenges?: string[]
          id?: string
          interests?: string[]
          name: string
          talents?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number
          avatar_color?: string
          city?: string | null
          completed_challenges?: string[]
          country?: string | null
          created_at?: string
          favorite_challenges?: string[]
          id?: string
          interests?: string[]
          name?: string
          talents?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      consent_events: {
        Row: {
          child_id: string | null
          created_at: string
          description: string
          event_type: string
          id: string
          metadata: Json
          user_id: string
        }
        Insert: {
          child_id?: string | null
          created_at?: string
          description: string
          event_type: string
          id?: string
          metadata?: Json
          user_id: string
        }
        Update: {
          child_id?: string | null
          created_at?: string
          description?: string
          event_type?: string
          id?: string
          metadata?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consent_events_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      challenge_status: "todo" | "in_progress" | "completed"
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
      challenge_status: ["todo", "in_progress", "completed"],
    },
  },
} as const
