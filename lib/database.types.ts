export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      startups: {
        Row: {
          id: string;
          name: string;
          sector: string;
          stage: string;
          location: string | null;
          description: string | null;
          funding: number | null;
          revenue: string | null;
          growth_rate: number | null;
          team_score: number | null;
          market_score: number | null;
          traction_score: number | null;
          capital_score: number | null;
          radar_score: number | null;
          founders: string | null;
          website: string | null;
          tags: string[];
          source: string | null;
          source_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['startups']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['startups']['Insert']>;
        Relationships: [];
      };
      pipeline_status: {
        Row: {
          id: string;
          startup_id: string;
          phase: 'discovery' | 'screening' | 'deepdive' | 'outreach' | 'duediligence' | 'ic' | 'portfolio';
          notes: string | null;
          entered_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          startup_id: string;
          phase: 'discovery' | 'screening' | 'deepdive' | 'outreach' | 'duediligence' | 'ic' | 'portfolio';
          notes?: string | null;
          entered_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          startup_id?: string;
          phase?: 'discovery' | 'screening' | 'deepdive' | 'outreach' | 'duediligence' | 'ic' | 'portfolio';
          notes?: string | null;
          entered_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'pipeline_status_startup_id_fkey';
            columns: ['startup_id'];
            isOneToOne: false;
            referencedRelation: 'startups';
            referencedColumns: ['id'];
          }
        ];
      };
      scraper_runs: {
        Row: {
          id: string;
          source: string;
          started_at: string;
          finished_at: string | null;
          status: string;
          processed: number | null;
          startups_found: number | null;
          new_startups: number | null;
          errors: string[] | null;
          elapsed_seconds: number | null;
        };
        Insert: {
          id?: string;
          source: string;
          started_at?: string;
          finished_at?: string | null;
          status?: string;
          processed?: number | null;
          startups_found?: number | null;
          new_startups?: number | null;
          errors?: string[] | null;
          elapsed_seconds?: number | null;
        };
        Update: Partial<Database['public']['Tables']['scraper_runs']['Insert']>;
        Relationships: [];
      };
      ai_analyses: {
        Row: {
          id: string;
          startup_id: string;
          analysis_text: string;
          model_used: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          startup_id: string;
          analysis_text: string;
          model_used?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          startup_id?: string;
          analysis_text?: string;
          model_used?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ai_analyses_startup_id_fkey';
            columns: ['startup_id'];
            isOneToOne: true;
            referencedRelation: 'startups';
            referencedColumns: ['id'];
          }
        ];
      };
      scores_history: {
        Row: {
          id: string;
          startup_id: string;
          radar_score: number | null;
          growth_score: number | null;
          team_score: number | null;
          market_score: number | null;
          traction_score: number | null;
          capital_score: number | null;
          calculated_at: string;
        };
        Insert: {
          id?: string;
          startup_id: string;
          radar_score?: number | null;
          growth_score?: number | null;
          team_score?: number | null;
          market_score?: number | null;
          traction_score?: number | null;
          capital_score?: number | null;
          calculated_at?: string;
        };
        Update: {
          id?: string;
          startup_id?: string;
          radar_score?: number | null;
          growth_score?: number | null;
          team_score?: number | null;
          market_score?: number | null;
          traction_score?: number | null;
          capital_score?: number | null;
          calculated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'scores_history_startup_id_fkey';
            columns: ['startup_id'];
            isOneToOne: false;
            referencedRelation: 'startups';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
