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
      bunker_sessions: {
        Row: {
          avg_feet: number
          created_at: string
          id: string
          played_at: string
          shots: Json
          total_feet: number
          user_id: string
        }
        Insert: {
          avg_feet: number
          created_at?: string
          id?: string
          played_at?: string
          shots?: Json
          total_feet: number
          user_id: string
        }
        Update: {
          avg_feet?: number
          created_at?: string
          id?: string
          played_at?: string
          shots?: Json
          total_feet?: number
          user_id?: string
        }
        Relationships: []
      }
      drill_sessions: {
        Row: {
          created_at: string
          id: string
          laps: number
          played_at: string
          score: number
          shots: Json
          stages_cleared: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          laps?: number
          played_at?: string
          score: number
          shots?: Json
          stages_cleared?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          laps?: number
          played_at?: string
          score?: number
          shots?: Json
          stages_cleared?: number
          user_id?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          responded_at: string | null
          status: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: []
      }
      group_session_members: {
        Row: {
          display_name: string
          seat: number
          session_id: string
          user_id: string
        }
        Insert: {
          display_name: string
          seat: number
          session_id: string
          user_id: string
        }
        Update: {
          display_name?: string
          seat?: number
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_session_members_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "group_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      group_session_scores: {
        Row: {
          created_at: string
          points: number
          result: Json
          session_id: string
          shot_index: number
          user_id: string
        }
        Insert: {
          created_at?: string
          points: number
          result?: Json
          session_id: string
          shot_index: number
          user_id: string
        }
        Update: {
          created_at?: string
          points?: number
          result?: Json
          session_id?: string
          shot_index?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_session_scores_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "group_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_session_scores_session_id_user_id_fkey"
            columns: ["session_id", "user_id"]
            isOneToOne: false
            referencedRelation: "group_session_members"
            referencedColumns: ["session_id", "user_id"]
          },
        ]
      }
      group_sessions: {
        Row: {
          completed_at: string | null
          config: Json
          created_at: string
          current_player_index: number
          current_shot: number
          host_user_id: string
          id: string
          mode: string
          status: string
          test_id: string
          total_steps: number
        }
        Insert: {
          completed_at?: string | null
          config?: Json
          created_at?: string
          current_player_index?: number
          current_shot?: number
          host_user_id: string
          id?: string
          mode?: string
          status?: string
          test_id?: string
          total_steps?: number
        }
        Update: {
          completed_at?: string | null
          config?: Json
          created_at?: string
          current_player_index?: number
          current_shot?: number
          host_user_id?: string
          id?: string
          mode?: string
          status?: string
          test_id?: string
          total_steps?: number
        }
        Relationships: []
      }
      player_snapshots: {
        Row: {
          approach_hcp: number | null
          around_green_hcp: number | null
          comparison_profile: Json
          created_at: string
          driving_hcp: number | null
          est_hcp: number | null
          is_public: boolean
          putting_hcp: number | null
          radar_profile: Json
          rating: number
          real_hcp: number | null
          speed_hcp: number | null
          test_count: number
          tier_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approach_hcp?: number | null
          around_green_hcp?: number | null
          comparison_profile?: Json
          created_at?: string
          driving_hcp?: number | null
          est_hcp?: number | null
          is_public?: boolean
          putting_hcp?: number | null
          radar_profile?: Json
          rating?: number
          real_hcp?: number | null
          speed_hcp?: number | null
          test_count?: number
          tier_key?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approach_hcp?: number | null
          around_green_hcp?: number | null
          comparison_profile?: Json
          created_at?: string
          driving_hcp?: number | null
          est_hcp?: number | null
          is_public?: boolean
          putting_hcp?: number | null
          radar_profile?: Json
          rating?: number
          real_hcp?: number | null
          speed_hcp?: number | null
          test_count?: number
          tier_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
        }
        Relationships: []
      }
      test_sessions: {
        Row: {
          category: string
          created_at: string
          id: string
          metrics: Json
          played_at: string
          score: number | null
          scoring_version: number
          shots: Json | null
          test_handicap: number | null
          test_id: string
          test_type: string
          test_version: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id: string
          metrics?: Json
          played_at: string
          score?: number | null
          scoring_version?: number
          shots?: Json | null
          test_handicap?: number | null
          test_id: string
          test_type: string
          test_version?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          metrics?: Json
          played_at?: string
          score?: number | null
          scoring_version?: number
          shots?: Json | null
          test_handicap?: number | null
          test_id?: string
          test_type?: string
          test_version?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bunker_leaderboard: {
        Args: never
        Returns: {
          avg_feet: number
          best_avg_feet: number
          display_name: string
          last_played: string
          sessions: number
          user_id: string
        }[]
      }
      correct_eight_ball_group_score: {
        Args: {
          p_points: number
          p_session_id: string
          p_shot_index: number
          p_user_id: string
        }
        Returns: undefined
      }
      create_eight_ball_group_session: {
        Args: { p_member_ids: string[] }
        Returns: string
      }
      create_multiplayer_session: {
        Args: {
          p_config?: Json
          p_member_ids: string[]
          p_mode?: string
          p_test_id: string
          p_total_steps: number
        }
        Returns: string
      }
      drill_leaderboard: {
        Args: never
        Returns: {
          avg_score: number
          best_score: number
          display_name: string
          last_played: string
          sessions: number
          user_id: string
        }[]
      }
      get_eight_ball_group_session: {
        Args: { p_session_id: string }
        Returns: Json
      }
      get_multiplayer_session: { Args: { p_session_id: string }; Returns: Json }
      is_group_session_host: {
        Args: { p_session_id: string; p_user_id?: string }
        Returns: boolean
      }
      is_group_session_member: {
        Args: { p_session_id: string; p_user_id?: string }
        Returns: boolean
      }
      record_eight_ball_group_score: {
        Args: {
          p_points: number
          p_session_id: string
          p_shot_index: number
          p_user_id: string
        }
        Returns: Json
      }
      record_multiplayer_result: {
        Args: {
          p_result: Json
          p_session_id: string
          p_step_index: number
          p_user_id: string
        }
        Returns: Json
      }
      undo_eight_ball_group_score: {
        Args: { p_session_id: string }
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
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
