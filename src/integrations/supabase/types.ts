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
      campaign_educators: {
        Row: {
          added_at: string
          added_by: string | null
          campaign_id: string
          educator_user_id: string
          id: string
          removed_at: string | null
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          campaign_id: string
          educator_user_id: string
          id?: string
          removed_at?: string | null
        }
        Update: {
          added_at?: string
          added_by?: string | null
          campaign_id?: string
          educator_user_id?: string
          id?: string
          removed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_educators_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string
          extra_supervisors_quota: number
          id: string
          manager_user_id: string | null
          max_educators: number
          name: string
          start_date: string
          target_count: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date?: string
          extra_supervisors_quota?: number
          id?: string
          manager_user_id?: string | null
          max_educators?: number
          name: string
          start_date?: string
          target_count?: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string
          extra_supervisors_quota?: number
          id?: string
          manager_user_id?: string | null
          max_educators?: number
          name?: string
          start_date?: string
          target_count?: number
        }
        Relationships: []
      }
      challenges: {
        Row: {
          academic_domain: string | null
          academic_grade_level: string | null
          academic_level_age: number | null
          academic_reference_note: string | null
          academic_secret: string | null
          academic_subject: string | null
          ai_observations: string | null
          behavioral_driver: string | null
          child_id: string
          completed_at: string | null
          created_at: string
          declarative_award: Json | null
          deleted_at: string | null
          description: string
          difficulty: string | null
          domain: string
          duration: string
          estimated_duration_minutes: number | null
          homework_instruction: string | null
          id: string
          material_tags: string[]
          materials: Json
          not_completed_at: string | null
          not_completed_cause: string | null
          not_completed_reason: string | null
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
          trait_subform: string | null
          updated_at: string
          user_id: string
          zpa_level: number | null
        }
        Insert: {
          academic_domain?: string | null
          academic_grade_level?: string | null
          academic_level_age?: number | null
          academic_reference_note?: string | null
          academic_secret?: string | null
          academic_subject?: string | null
          ai_observations?: string | null
          behavioral_driver?: string | null
          child_id: string
          completed_at?: string | null
          created_at?: string
          declarative_award?: Json | null
          deleted_at?: string | null
          description: string
          difficulty?: string | null
          domain: string
          duration: string
          estimated_duration_minutes?: number | null
          homework_instruction?: string | null
          id?: string
          material_tags?: string[]
          materials?: Json
          not_completed_at?: string | null
          not_completed_cause?: string | null
          not_completed_reason?: string | null
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
          trait_subform?: string | null
          updated_at?: string
          user_id: string
          zpa_level?: number | null
        }
        Update: {
          academic_domain?: string | null
          academic_grade_level?: string | null
          academic_level_age?: number | null
          academic_reference_note?: string | null
          academic_secret?: string | null
          academic_subject?: string | null
          ai_observations?: string | null
          behavioral_driver?: string | null
          child_id?: string
          completed_at?: string | null
          created_at?: string
          declarative_award?: Json | null
          deleted_at?: string | null
          description?: string
          difficulty?: string | null
          domain?: string
          duration?: string
          estimated_duration_minutes?: number | null
          homework_instruction?: string | null
          id?: string
          material_tags?: string[]
          materials?: Json
          not_completed_at?: string | null
          not_completed_cause?: string | null
          not_completed_reason?: string | null
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
          trait_subform?: string | null
          updated_at?: string
          user_id?: string
          zpa_level?: number | null
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
      challenge_outcomes: {
        Row: {
          challenge_id: string
          child_id: string
          created_at: string
          domain: string
          id: string
          kind: string
          pending_duration_days: number
          reason_chip: string | null
          reason_note: string | null
          status_when_deleted: string
        }
        Insert: {
          challenge_id: string
          child_id: string
          created_at?: string
          domain: string
          id?: string
          kind: string
          pending_duration_days?: number
          reason_chip?: string | null
          reason_note?: string | null
          status_when_deleted: string
        }
        Update: {
          challenge_id?: string
          child_id?: string
          created_at?: string
          domain?: string
          id?: string
          kind?: string
          pending_duration_days?: number
          reason_chip?: string | null
          reason_note?: string | null
          status_when_deleted?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_outcomes_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_outcomes_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      child_access_periods: {
        Row: {
          amount_xof: number
          child_id: string
          created_at: string
          currency: string
          ends_at: string
          id: string
          note: string | null
          source: string
          starts_at: string
          token_id: string | null
        }
        Insert: {
          amount_xof?: number
          child_id: string
          created_at?: string
          currency?: string
          ends_at: string
          id?: string
          note?: string | null
          source?: string
          starts_at: string
          token_id?: string | null
        }
        Update: {
          amount_xof?: number
          child_id?: string
          created_at?: string
          currency?: string
          ends_at?: string
          id?: string
          note?: string | null
          source?: string
          starts_at?: string
          token_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "child_access_periods_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_access_periods_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "sponsorship_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      child_badges: {
        Row: {
          badge_slug: string
          child_id: string
          earned_at: string
          id: string
        }
        Insert: {
          badge_slug: string
          child_id: string
          earned_at?: string
          id?: string
        }
        Update: {
          badge_slug?: string
          child_id?: string
          earned_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_badges_child_id_fkey"
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
          access_locked_at: string | null
          age: number
          ai_synthesis: string | null
          ai_synthesis_generated_at: string | null
          avatar_color: string
          birthdate: string | null
          city: string | null
          completed_challenges: string[]
          country: string | null
          created_at: string
          favorite_challenges: string[]
          guild_participation_opt_in: boolean
          id: string
          interests: string[]
          last_activity_date: string | null
          name: string
          passport_letter: string | null
          passport_letter_generated_at: string | null
          pdf_unlocked: boolean
          streak: number
          talents: Json
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          access_locked_at?: string | null
          age: number
          ai_synthesis?: string | null
          ai_synthesis_generated_at?: string | null
          avatar_color?: string
          birthdate?: string | null
          city?: string | null
          completed_challenges?: string[]
          country?: string | null
          created_at?: string
          favorite_challenges?: string[]
          guild_participation_opt_in?: boolean
          id?: string
          interests?: string[]
          last_activity_date?: string | null
          name: string
          passport_letter?: string | null
          passport_letter_generated_at?: string | null
          pdf_unlocked?: boolean
          streak?: number
          talents?: Json
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          access_locked_at?: string | null
          age?: number
          ai_synthesis?: string | null
          ai_synthesis_generated_at?: string | null
          avatar_color?: string
          birthdate?: string | null
          city?: string | null
          completed_challenges?: string[]
          country?: string | null
          created_at?: string
          favorite_challenges?: string[]
          guild_participation_opt_in?: boolean
          id?: string
          interests?: string[]
          last_activity_date?: string | null
          name?: string
          passport_letter?: string | null
          passport_letter_generated_at?: string | null
          pdf_unlocked?: boolean
          streak?: number
          talents?: Json
          updated_at?: string
          user_id?: string
          xp?: number
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
      generation_audits: {
        Row: {
          child_id: string | null
          context: Json
          created_at: string
          decision: string
          decision_at: string | null
          decision_by: string | null
          decision_note: string | null
          estimated_cost: number | null
          id: string
          kind: string
          model: string | null
          processed: boolean
          regenerated: boolean
          semantic_checked: boolean
          source_function: string
          verdict: string
          violations: Json
        }
        Insert: {
          child_id?: string | null
          context?: Json
          created_at?: string
          decision?: string
          decision_at?: string | null
          decision_by?: string | null
          decision_note?: string | null
          estimated_cost?: number | null
          id?: string
          kind: string
          model?: string | null
          processed?: boolean
          regenerated?: boolean
          semantic_checked?: boolean
          source_function: string
          verdict: string
          violations?: Json
        }
        Update: {
          child_id?: string | null
          context?: Json
          created_at?: string
          decision?: string
          decision_at?: string | null
          decision_by?: string | null
          decision_note?: string | null
          estimated_cost?: number | null
          id?: string
          kind?: string
          model?: string | null
          processed?: boolean
          regenerated?: boolean
          semantic_checked?: boolean
          source_function?: string
          verdict?: string
          violations?: Json
        }
        Relationships: [
          {
            foreignKeyName: "generation_audits_child_id_fkey"
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
          support_active: boolean | null
          support_checkpoint_at: string | null
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
          support_active?: boolean | null
          support_checkpoint_at?: string | null
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
          support_active?: boolean | null
          support_checkpoint_at?: string | null
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
          payment_reference: string | null
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
          payment_reference?: string | null
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
          payment_reference?: string | null
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
      payments: {
        Row: {
          amount_xof: number
          created_at: string
          currency: string
          id: string
          metadata: Json
          paid_at: string | null
          provider: string
          reference: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_xof: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          paid_at?: string | null
          provider?: string
          reference: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_xof?: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          paid_at?: string | null
          provider?: string
          reference?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
      season_enrollments: {
        Row: {
          artifact_url: string | null
          campaign_id: string | null
          child_id: string
          enrolled_at: string
          id: string
          payment_status: string
          season_id: string
          sponsor_email: string | null
          sponsor_message: string | null
          sponsor_name: string | null
          user_id: string
        }
        Insert: {
          artifact_url?: string | null
          campaign_id?: string | null
          child_id: string
          enrolled_at?: string
          id?: string
          payment_status?: string
          season_id: string
          sponsor_email?: string | null
          sponsor_message?: string | null
          sponsor_name?: string | null
          user_id: string
        }
        Update: {
          artifact_url?: string | null
          campaign_id?: string | null
          child_id?: string
          enrolled_at?: string
          id?: string
          payment_status?: string
          season_id?: string
          sponsor_email?: string | null
          sponsor_message?: string | null
          sponsor_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_enrollments_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_enrollments_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_enrollments_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string
          description: string | null
          duration_months: number
          end_date: string
          id: string
          price_eur: number
          price_xof: number
          start_date: string
          status: string
          subtitle: string | null
          theme: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_months?: number
          end_date: string
          id?: string
          price_eur?: number
          price_xof?: number
          start_date: string
          status?: string
          subtitle?: string | null
          theme: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_months?: number
          end_date?: string
          id?: string
          price_eur?: number
          price_xof?: number
          start_date?: string
          status?: string
          subtitle?: string | null
          theme?: string
          title?: string
        }
        Relationships: []
      }
      sponsorship_tokens: {
        Row: {
          amount_paid: number
          campaign_id: string | null
          code: string
          created_at: string
          currency: string
          id: string
          is_redeemed: boolean
          months_count: number
          payment_confirmed: boolean
          paystack_reference: string | null
          redeemed_at: string | null
          redeemed_by_child_id: string | null
          season_id: string | null
          sponsor_email: string
          sponsor_message: string | null
          sponsor_name: string
          target_child_name: string | null
        }
        Insert: {
          amount_paid?: number
          campaign_id?: string | null
          code: string
          created_at?: string
          currency?: string
          id?: string
          is_redeemed?: boolean
          months_count?: number
          payment_confirmed?: boolean
          paystack_reference?: string | null
          redeemed_at?: string | null
          redeemed_by_child_id?: string | null
          season_id?: string | null
          sponsor_email: string
          sponsor_message?: string | null
          sponsor_name: string
          target_child_name?: string | null
        }
        Update: {
          amount_paid?: number
          campaign_id?: string | null
          code?: string
          created_at?: string
          currency?: string
          id?: string
          is_redeemed?: boolean
          months_count?: number
          payment_confirmed?: boolean
          paystack_reference?: string | null
          redeemed_at?: string | null
          redeemed_by_child_id?: string | null
          season_id?: string | null
          sponsor_email?: string
          sponsor_message?: string | null
          sponsor_name?: string
          target_child_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsorship_tokens_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsorship_tokens_redeemed_by_child_id_fkey"
            columns: ["redeemed_by_child_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsorship_tokens_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancelled_at: string | null
          created_at: string
          currency: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          paystack_customer_code: string | null
          paystack_reference: string | null
          paystack_subscription_code: string | null
          plan_code: string | null
          price_xof: number | null
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          paystack_customer_code?: string | null
          paystack_reference?: string | null
          paystack_subscription_code?: string | null
          plan_code?: string | null
          price_xof?: number | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          paystack_customer_code?: string | null
          paystack_reference?: string | null
          paystack_subscription_code?: string | null
          plan_code?: string | null
          price_xof?: number | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsorship_credits: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          months_count: number
          token_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          months_count: number
          token_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          months_count?: number
          token_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsorship_credits_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "sponsorship_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsorship_credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      paystack_plans: {
        Row: {
          amount_xof: number
          created_at: string
          currency: string
          id: string
          interval: string
          name: string
          plan_code: string
          plan_key: string
        }
        Insert: {
          amount_xof: number
          created_at?: string
          currency?: string
          id?: string
          interval?: string
          name: string
          plan_code: string
          plan_key: string
        }
        Update: {
          amount_xof?: number
          created_at?: string
          currency?: string
          id?: string
          interval?: string
          name?: string
          plan_code?: string
          plan_key?: string
        }
        Relationships: []
      }
      supervisors: {
        Row: {
          assigned_by: string | null
          campaign_id: string | null
          child_profile_id: string
          created_at: string
          id: string
          supervisor_user_id: string
        }
        Insert: {
          assigned_by?: string | null
          campaign_id?: string | null
          child_profile_id: string
          created_at?: string
          id?: string
          supervisor_user_id: string
        }
        Update: {
          assigned_by?: string | null
          campaign_id?: string | null
          child_profile_id?: string
          created_at?: string
          id?: string
          supervisor_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supervisors_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supervisors_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: true
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
      activate_season: { Args: { target_id: string }; Returns: undefined }
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
      list_opted_in_guild_members: {
        Args: { p_requesting_child_id: string }
        Returns: {
          age: number
          id: string
          name: string
          talents: Json
        }[]
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
      challenge_status: "todo" | "in_progress" | "completed" | "not_completed"
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
      challenge_status: ["todo", "in_progress", "completed", "not_completed"],
    },
  },
} as const
