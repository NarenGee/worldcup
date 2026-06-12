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
  created_at: string;
};

export type Match = {
  id: number;
  stage: "group" | "r16" | "qf" | "sf" | "final";
  home_team: string;
  away_team: string;
  kickoff_at: string;
  home_score: number | null;
  away_score: number | null;
  result_confirmed: boolean;
  external_id: string | null;
};

export type Prediction = {
  id: number;
  user_id: string;
  match_id: number;
  predicted_home: number;
  predicted_away: number;
  points: number | null;
  submitted_at: string;
};

export type Props = {
  id: number;
  user_id: string;
  champion: string | null;
  top_scorer: string | null;
  submitted_at: string;
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
          created_at?: string;
        };
        Update: {
          display_name?: string;
          avatar_url?: string | null;
          is_admin?: boolean;
          is_active?: boolean;
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
          submitted_at?: string;
        };
        Update: {
          predicted_home?: number;
          predicted_away?: number;
          points?: number | null;
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
