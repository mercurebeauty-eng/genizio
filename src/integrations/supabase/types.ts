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
      challenges: {
        Row: {
          academic_domain: string | null
          academic_level_age: number | null
          ai_observations: string | null
          child_id: string
          completed_at: string | null
          created_at: string
          declarative_award: Json | null
          description: string
          difficulty: string | null
          domain: string
          duration: string
          estimated_duration_minutes: number | null
          id: string
          material_tags: string[]
          materials: Json
          notes: string | null
          pedagogical_context: string | null
          progress: number
          proof_image_url: string | null
          proof_mode: string
          proof_target: Json | null
          requires_supervision: boolean | null
          started_at: string | null
          status: Database["public"]["Enums"]["challenge_status"]
          steps: Json
          supervision_warning: string | null
          target_intelligences: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          academic_domain?: string | null
          academic_level_age?: number | null
          ai_observations?: string | null
          child_id: string
          completed_at?: string | null
          created_at?: string
          declarative_award?: Json | null
          description: string
          difficulty?: string | null
          domain: string
          duration: string
          estimated_duration_minutes?: number | null
          id?: string
          material_tags?: string[]
          materials?: Json
          notes?: string | null
          pedagogical_context?: string | null
          progress?: number
          proof_image_url?: string | null
          proof_mode?: string
          proof_target?: Json | null
          requires_supervision?: boolean | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["challenge_status"]
          steps?: Json
          supervision_warning?: string | null
          target_intelligences?: Json
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          academic_domain?: string | null
          academic_level_age?: number | null
          ai_observations?: string | null
          child_id?: string
          completed_at?: string | null
          created_at?: string
          declarative_award?: Json | null
          description?: string
          difficulty?: string | null
          domain?: string
          duration?: string
          estimated_duration_minutes?: number | null
          id?: string
          material_tags?: string[]
          materials?: Json
          notes?: string | null
          pedagogical_context?: string | null
          progress?: number
          proof_image_url?: string | null
          proof_mode?: string
          proof_target?: Json | null
          requires_supervision?: boolean | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["challenge_status"]
          steps?: Json
          supervision_warning?: string | null
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
          ai_synthesis: string | null
          ai_synthesis_generated_at: string | null
          avatar_color: string
          city: string | null
          completed_challenges: string[]
          country: string | null
          created_at: string
          favorite_challenges: string[]
          id: string
          interests: string[]
          name: string
          pdf_unlocked: boolean
          talents: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          age: number
          ai_synthesis?: string | null
          ai_synthesis_generated_at?: string | null
          avatar_color?: string
          city?: string | null
          completed_challenges?: string[]
          country?: string | null
          created_at?: string
          favorite_challenges?: string[]
          id?: string
          interests?: string[]
          name: string
          pdf_unlocked?: boolean
          talents?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number
          ai_synthesis?: string | null
          ai_synthesis_generated_at?: string | null
          avatar_color?: string
          city?: string | null
          completed_challenges?: string[]
          country?: string | null
          created_at?: string
          favorite_challenges?: string[]
          id?: string
          interests?: string[]
          name?: string
          pdf_unlocked?: boolean
          talents?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          body: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
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
      hypothesis_cycles: {
        Row: {
          child_id: string
          created_at: string
          final_diagnosis: string | null
          hypotheses: Json
          id: string
          model: string | null
          parent_narrative: string | null
          resolved_at: string | null
          status: string
          trigger_domain: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          child_id: string
          created_at?: string
          final_diagnosis?: string | null
          hypotheses: Json
          id?: string
          model?: string | null
          parent_narrative?: string | null
          resolved_at?: string | null
          status?: string
          trigger_domain?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          child_id?: string
          created_at?: string
          final_diagnosis?: string | null
          hypotheses?: Json
          id?: string
          model?: string | null
          parent_narrative?: string | null
          resolved_at?: string | null
          status?: string
          trigger_domain?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hypothesis_cycles_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      material_suggestions: {
        Row: {
          first_seen_at: string
          id: string
          last_seen_at: string
          product_id: string | null
          sample_challenge_title: string | null
          seen_count: number
          status: string
          tag: string
        }
        Insert: {
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          product_id?: string | null
          sample_challenge_title?: string | null
          seen_count?: number
          status?: string
          tag: string
        }
        Update: {
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          product_id?: string | null
          sample_challenge_title?: string | null
          seen_count?: number
          status?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_suggestions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      observation_events: {
        Row: {
          child_id: string
          id: string
          occurred_at: string
          payload: Json
          processed: boolean
          recorded_at: string
          source: string
          type: string
          user_id: string
        }
        Insert: {
          child_id: string
          id?: string
          occurred_at?: string
          payload?: Json
          processed?: boolean
          recorded_at?: string
          source?: string
          type: string
          user_id: string
        }
        Update: {
          child_id?: string
          id?: string
          occurred_at?: string
          payload?: Json
          processed?: boolean
          recorded_at?: string
          source?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "observation_events_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          challenge_id: string | null
          child_id: string | null
          created_at: string
          delivery_notes: string | null
          id: string
          items: Json
          status: string
          total_price_xof: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          challenge_id?: string | null
          child_id?: string | null
          created_at?: string
          delivery_notes?: string | null
          id?: string
          items?: Json
          status?: string
          total_price_xof: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          challenge_id?: string | null
          child_id?: string | null
          created_at?: string
          delivery_notes?: string | null
          id?: string
          items?: Json
          status?: string
          total_price_xof?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pedagogical_twins: {
        Row: {
          child_id: string
          competencies: Json
          created_at: string
          drivers: Json
          id: string
          interests: Json
          last_computed_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          child_id: string
          competencies?: Json
          created_at?: string
          drivers?: Json
          id?: string
          interests?: Json
          last_computed_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          child_id?: string
          competencies?: Json
          created_at?: string
          drivers?: Json
          id?: string
          interests?: Json
          last_computed_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedagogical_twins_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: true
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          ai_talent_tag: string | null
          caption: string | null
          child_profile_id: string | null
          created_at: string
          id: string
          image_url: string
          likes_count: number | null
          parent_id: string
        }
        Insert: {
          ai_talent_tag?: string | null
          caption?: string | null
          child_profile_id?: string | null
          created_at?: string
          id?: string
          image_url: string
          likes_count?: number | null
          parent_id: string
        }
        Update: {
          ai_talent_tag?: string | null
          caption?: string | null
          child_profile_id?: string | null
          created_at?: string
          id?: string
          image_url?: string
          likes_count?: number | null
          parent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          material_tags: string[]
          name: string
          price_xof: number
          stock_quantity: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          material_tags?: string[]
          name: string
          price_xof: number
          stock_quantity?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          material_tags?: string[]
          name?: string
          price_xof?: number
          stock_quantity?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      supervisors: {
        Row: {
          assigned_by: string | null
          child_profile_id: string
          created_at: string
          id: string
          supervisor_user_id: string
        }
        Insert: {
          assigned_by?: string | null
          child_profile_id: string
          created_at?: string
          id?: string
          supervisor_user_id: string
        }
        Update: {
          assigned_by?: string | null
          child_profile_id?: string
          created_at?: string
          id?: string
          supervisor_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supervisors_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trait_series: {
        Row: {
          child_id: string
          id: string
          level: number
          recorded_at: string
          source_event_id: string | null
          trait_key: string
          user_id: string
          value: number
        }
        Insert: {
          child_id: string
          id?: string
          level: number
          recorded_at?: string
          source_event_id?: string | null
          trait_key: string
          user_id: string
          value: number
        }
        Update: {
          child_id?: string
          id?: string
          level?: number
          recorded_at?: string
          source_event_id?: string | null
          trait_key?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "trait_series_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trait_series_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "observation_events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_observation_to_twin: {
        Args: {
          p_event: Database["public"]["Tables"]["observation_events"]["Row"]
        }
        Returns: undefined
      }
      classify_trait: {
        Args: { p_trend: number; p_value: number; p_variance: number }
        Returns: string
      }
      increment_child_talents: {
        Args: { p_child_id: string; p_deltas: Json }
        Returns: Json
      }
      record_trait_point: {
        Args: {
          p_alpha: number
          p_child_id: string
          p_field: string
          p_level: number
          p_occurred_at: string
          p_signal: number
          p_source_event_id: string
          p_trait_key: string
          p_user_id: string
        }
        Returns: undefined
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      challenge_status: ["todo", "in_progress", "completed"],
    },
  },
} as const
