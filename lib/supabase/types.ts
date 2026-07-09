export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  is_admin: boolean;
  is_active: boolean;
  dismissed_announcements: string[];
  created_at: string;
};

export type Match = {
  id: number;
  stage: "group" | "r32" | "r16" | "qf" | "sf" | "final";
  home_team: string;
  away_team: string;
  kickoff_at: string;
  home_score: number | null;
  away_score: number | null;
  result_confirmed: boolean;
  result_confirmed_at: string | null;
  external_id: string | null;
};

export type Prediction = {
  id: number;
  user_id: string;
  match_id: number;
  predicted_home: number;
  predicted_away: number;
  points: number | null;
  is_default: boolean;
  submitted_at: string;
};

export type Props = {
  id: number;
  user_id: string;
  champion: string | null;
  top_scorer: string | null;
  submitted_at: string;
};

export type UserPowerUp = {
  id: number;
  user_id: string;
  power_up_type: "double_points" | "sneak_peek";
  match_id: number;
  assigned_at: string;
};

export type TournamentResults = {
  id: number;
  champion: string | null;
  top_scorer: string | null;
  updated_at: string;
};

export type LeaderboardEntry = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  score: number;
  matches_scored: number;
  matches_predicted: number;
  correct_predictions?: number;
  correct_prediction_rate?: number | null;
};

export type DailySummary = {
  summary_date: string;
  summary: string;
  content_hash: string;
  generated_at: string;
  matches_count: number;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          display_name: string;
          avatar_url?: string | null;
          is_admin?: boolean;
          is_active?: boolean;
          dismissed_announcements?: string[];
          created_at?: string;
        };
        Update: {
          display_name?: string;
          avatar_url?: string | null;
          is_admin?: boolean;
          is_active?: boolean;
          dismissed_announcements?: string[];
        };
        Relationships: [];
      };
      matches: {
        Row: Match;
        Insert: {
          id?: number;
          stage: Match["stage"];
          home_team: string;
          away_team: string;
          kickoff_at: string;
          home_score?: number | null;
          away_score?: number | null;
          result_confirmed?: boolean;
          result_confirmed_at?: string | null;
          external_id?: string | null;
        };
        Update: {
          stage?: Match["stage"];
          home_team?: string;
          away_team?: string;
          kickoff_at?: string;
          home_score?: number | null;
          away_score?: number | null;
          result_confirmed?: boolean;
          result_confirmed_at?: string | null;
          external_id?: string | null;
        };
        Relationships: [];
      };
      predictions: {
        Row: Prediction;
        Insert: {
          id?: number;
          user_id: string;
          match_id: number;
          predicted_home: number;
          predicted_away: number;
          is_default?: boolean;
          submitted_at?: string;
        };
        Update: {
          predicted_home?: number;
          predicted_away?: number;
          points?: number | null;
          is_default?: boolean;
        };
        Relationships: [];
      };
      props: {
        Row: Props;
        Insert: {
          id?: number;
          user_id: string;
          champion?: string | null;
          top_scorer?: string | null;
          submitted_at?: string;
        };
        Update: {
          champion?: string | null;
          top_scorer?: string | null;
        };
        Relationships: [];
      };
      user_power_ups: {
        Row: UserPowerUp;
        Insert: {
          id?: number;
          user_id: string;
          power_up_type: UserPowerUp["power_up_type"];
          match_id: number;
          assigned_at?: string;
        };
        Update: {
          match_id?: number;
        };
        Relationships: [];
      };
      tournament_results: {
        Row: TournamentResults;
        Insert: {
          id?: number;
          champion?: string | null;
          top_scorer?: string | null;
          updated_at?: string;
        };
        Update: {
          champion?: string | null;
          top_scorer?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      daily_summaries: {
        Row: DailySummary;
        Insert: {
          summary_date: string;
          summary: string;
          content_hash: string;
          generated_at?: string;
          matches_count?: number;
        };
        Update: {
          summary?: string;
          content_hash?: string;
          generated_at?: string;
          matches_count?: number;
        };
        Relationships: [];
      };
    };
    Views: {
      leaderboard: {
        Row: LeaderboardEntry;
        Relationships: [];
      };
    };
    Functions: {
      apply_default_predictions: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      score_predictions: {
        Args: Record<string, never>;
        Returns: number;
      };
      calculate_match_points: {
        Args: {
          predicted_home: number;
          predicted_away: number;
          home_score: number;
          away_score: number;
          result_confirmed: boolean;
        };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
