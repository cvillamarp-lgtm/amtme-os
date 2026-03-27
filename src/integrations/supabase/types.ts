Initialising login role...
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
      app_incidents: {
        Row: {
          automation_logs: Json
          build_id: string | null
          created_at: string
          entity_id: string | null
          entity_title: string | null
          entity_type: string | null
          error_name: string | null
          executed_actions: Json
          extra_context: Json
          fingerprint: string
          id: string
          incident_id: string
          kind: string
          message: string
          query_keys: Json
          route_pathname: string
          route_search: string | null
          severity: string
          stack: string | null
          status: string
          title: string
          user_id: string | null
        }
        Insert: {
          automation_logs?: Json
          build_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_title?: string | null
          entity_type?: string | null
          error_name?: string | null
          executed_actions?: Json
          extra_context?: Json
          fingerprint: string
          id?: string
          incident_id: string
          kind: string
          message: string
          query_keys?: Json
          route_pathname: string
          route_search?: string | null
          severity: string
          stack?: string | null
          status: string
          title: string
          user_id?: string | null
        }
        Update: {
          automation_logs?: Json
          build_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_title?: string | null
          entity_type?: string | null
          error_name?: string | null
          executed_actions?: Json
          extra_context?: Json
          fingerprint?: string
          id?: string
          incident_id?: string
          kind?: string
          message?: string
          query_keys?: Json
          route_pathname?: string
          route_search?: string | null
          severity?: string
          stack?: string | null
          status?: string
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      approval_checks: {
        Row: {
          check_id: string
          check_name: string
          check_result: boolean
          created_at: string
          details: string | null
          id: string
          piece_version_id: string
          rule_ref: string | null
          severity: string
        }
        Insert: {
          check_id: string
          check_name: string
          check_result?: boolean
          created_at?: string
          details?: string | null
          id?: string
          piece_version_id: string
          rule_ref?: string | null
          severity?: string
        }
        Update: {
          check_id?: string
          check_name?: string
          check_result?: boolean
          created_at?: string
          details?: string | null
          id?: string
          piece_version_id?: string
          rule_ref?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_checks_piece_version_id_fkey"
            columns: ["piece_version_id"]
            isOneToOne: false
            referencedRelation: "piece_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_candidates: {
        Row: {
          asset_template_id: string | null
          asset_type: string
          audio_take_id: string | null
          body_text: string | null
          created_at: string
          episode_id: string | null
          id: string
          platform: string | null
          quote_candidate_id: string | null
          score: number | null
          score_breakdown: Json | null
          status: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_template_id?: string | null
          asset_type: string
          audio_take_id?: string | null
          body_text?: string | null
          created_at?: string
          episode_id?: string | null
          id?: string
          platform?: string | null
          quote_candidate_id?: string | null
          score?: number | null
          score_breakdown?: Json | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_template_id?: string | null
          asset_type?: string
          audio_take_id?: string | null
          body_text?: string | null
          created_at?: string
          episode_id?: string | null
          id?: string
          platform?: string | null
          quote_candidate_id?: string | null
          score?: number | null
          score_breakdown?: Json | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_candidates_asset_template_id_fkey"
            columns: ["asset_template_id"]
            isOneToOne: false
            referencedRelation: "asset_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_candidates_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episode_metrics_summary"
            referencedColumns: ["episode_id"]
          },
          {
            foreignKeyName: "asset_candidates_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_render_jobs: {
        Row: {
          asset_candidate_id: string | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          job_type: string
          render_params: Json | null
          started_at: string | null
          status: string
          user_id: string
          visual_prompt: string | null
        }
        Insert: {
          asset_candidate_id?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_type?: string
          render_params?: Json | null
          started_at?: string | null
          status?: string
          user_id: string
          visual_prompt?: string | null
        }
        Update: {
          asset_candidate_id?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_type?: string
          render_params?: Json | null
          started_at?: string | null
          status?: string
          user_id?: string
          visual_prompt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_render_jobs_asset_candidate_id_fkey"
            columns: ["asset_candidate_id"]
            isOneToOne: false
            referencedRelation: "asset_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_templates: {
        Row: {
          asset_type: string
          created_at: string
          format: string
          height: number
          id: string
          is_active: boolean
          name: string
          platform: string | null
          template_data: Json | null
          updated_at: string
          user_id: string
          width: number
        }
        Insert: {
          asset_type: string
          created_at?: string
          format?: string
          height?: number
          id?: string
          is_active?: boolean
          name: string
          platform?: string | null
          template_data?: Json | null
          updated_at?: string
          user_id: string
          width?: number
        }
        Update: {
          asset_type?: string
          created_at?: string
          format?: string
          height?: number
          id?: string
          is_active?: boolean
          name?: string
          platform?: string | null
          template_data?: Json | null
          updated_at?: string
          user_id?: string
          width?: number
        }
        Relationships: []
      }
      asset_versions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          content_json: Json
          created_at: string | null
          created_by: string | null
          episode_id: string | null
          host_image: string | null
          id: string
          palette_assignment_id: string | null
          status: string | null
          updated_at: string | null
          version: number | null
          visual_spec_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          content_json: Json
          created_at?: string | null
          created_by?: string | null
          episode_id?: string | null
          host_image?: string | null
          id?: string
          palette_assignment_id?: string | null
          status?: string | null
          updated_at?: string | null
          version?: number | null
          visual_spec_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          content_json?: Json
          created_at?: string | null
          created_by?: string | null
          episode_id?: string | null
          host_image?: string | null
          id?: string
          palette_assignment_id?: string | null
          status?: string | null
          updated_at?: string | null
          version?: number | null
          visual_spec_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_versions_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episode_metrics_summary"
            referencedColumns: ["episode_id"]
          },
          {
            foreignKeyName: "asset_versions_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_versions_palette_assignment_id_fkey"
            columns: ["palette_assignment_id"]
            isOneToOne: false
            referencedRelation: "palette_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_versions_visual_spec_id_fkey"
            columns: ["visual_spec_id"]
            isOneToOne: false
            referencedRelation: "visual_specs"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_action_runs: {
        Row: {
          after_snapshot: Json | null
          applied_at: string | null
          before_snapshot: Json
          conflicts: Json
          created_at: string
          episode_id: string
          executed_actions: Json | null
          id: string
          instruction: string
          intent: string
          plan_summary: string | null
          proposed_changes: Json
          rolled_back_at: string | null
          status: string
          updated_at: string
          user_id: string
          warnings: Json
        }
        Insert: {
          after_snapshot?: Json | null
          applied_at?: string | null
          before_snapshot?: Json
          conflicts?: Json
          created_at?: string
          episode_id: string
          executed_actions?: Json | null
          id?: string
          instruction: string
          intent?: string
          plan_summary?: string | null
          proposed_changes?: Json
          rolled_back_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
          warnings?: Json
        }
        Update: {
          after_snapshot?: Json | null
          applied_at?: string | null
          before_snapshot?: Json
          conflicts?: Json
          created_at?: string
          episode_id?: string
          executed_actions?: Json | null
          id?: string
          instruction?: string
          intent?: string
          plan_summary?: string | null
          proposed_changes?: Json
          rolled_back_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          warnings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "assistant_action_runs_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episode_metrics_summary"
            referencedColumns: ["episode_id"]
          },
          {
            foreignKeyName: "assistant_action_runs_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      audience_members: {
        Row: {
          age_range: string | null
          beliefs: string[] | null
          created_at: string
          description: string | null
          desires: string[] | null
          emotional_state: string | null
          gender: string | null
          id: string
          name: string
          needs: string[] | null
          occupation: string | null
          pain_points: string[] | null
          quote: string | null
          triggers: string[] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          age_range?: string | null
          beliefs?: string[] | null
          created_at?: string
          description?: string | null
          desires?: string[] | null
          emotional_state?: string | null
          gender?: string | null
          id?: string
          name: string
          needs?: string[] | null
          occupation?: string | null
          pain_points?: string[] | null
          quote?: string | null
          triggers?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          age_range?: string | null
          beliefs?: string[] | null
          created_at?: string
          description?: string | null
          desires?: string[] | null
          emotional_state?: string | null
          gender?: string | null
          id?: string
          name?: string
          needs?: string[] | null
          occupation?: string | null
          pain_points?: string[] | null
          quote?: string | null
          triggers?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      audio_processing_jobs: {
        Row: {
          audio_take_id: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          input_file_path: string
          job_type: string
          output_file_path: string | null
          output_file_url: string | null
          preset: string
          request_payload: Json | null
          result_payload: Json | null
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          audio_take_id: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_file_path: string
          job_type?: string
          output_file_path?: string | null
          output_file_url?: string | null
          preset?: string
          request_payload?: Json | null
          result_payload?: Json | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          audio_take_id?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_file_path?: string
          job_type?: string
          output_file_path?: string | null
          output_file_url?: string | null
          preset?: string
          request_payload?: Json | null
          result_payload?: Json | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_processing_jobs_audio_take_id_fkey"
            columns: ["audio_take_id"]
            isOneToOne: false
            referencedRelation: "audio_takes"
            referencedColumns: ["id"]
          },
        ]
      }
      audio_segment_selections: {
        Row: {
          action_type: string
          audio_take_id: string
          created_at: string
          id: string
          label: string | null
          notes: string | null
          transcript_segment_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_type: string
          audio_take_id: string
          created_at?: string
          id?: string
          label?: string | null
          notes?: string | null
          transcript_segment_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_type?: string
          audio_take_id?: string
          created_at?: string
          id?: string
          label?: string | null
          notes?: string | null
          transcript_segment_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_segment_selections_audio_take_id_fkey"
            columns: ["audio_take_id"]
            isOneToOne: false
            referencedRelation: "audio_takes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audio_segment_selections_transcript_segment_id_fkey"
            columns: ["transcript_segment_id"]
            isOneToOne: false
            referencedRelation: "audio_transcript_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      audio_takes: {
        Row: {
          channels: number | null
          clipping_count: number
          created_at: string
          duration_seconds: number | null
          episode_id: string | null
          id: string
          master_clipping_count: number | null
          master_duration_seconds: number | null
          master_file_path: string | null
          master_file_url: string | null
          master_mime_type: string | null
          master_peak_db: number | null
          master_rms_db: number | null
          mastering_last_error: string | null
          mastering_profile: string | null
          mastering_status: string
          original_file_path: string
          original_file_url: string | null
          original_mime_type: string
          peak_db: number | null
          processing_notes: string | null
          rms_db: number | null
          sample_rate: number | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channels?: number | null
          clipping_count?: number
          created_at?: string
          duration_seconds?: number | null
          episode_id?: string | null
          id?: string
          master_clipping_count?: number | null
          master_duration_seconds?: number | null
          master_file_path?: string | null
          master_file_url?: string | null
          master_mime_type?: string | null
          master_peak_db?: number | null
          master_rms_db?: number | null
          mastering_last_error?: string | null
          mastering_profile?: string | null
          mastering_status?: string
          original_file_path: string
          original_file_url?: string | null
          original_mime_type: string
          peak_db?: number | null
          processing_notes?: string | null
          rms_db?: number | null
          sample_rate?: number | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channels?: number | null
          clipping_count?: number
          created_at?: string
          duration_seconds?: number | null
          episode_id?: string | null
          id?: string
          master_clipping_count?: number | null
          master_duration_seconds?: number | null
          master_file_path?: string | null
          master_file_url?: string | null
          master_mime_type?: string | null
          master_peak_db?: number | null
          master_rms_db?: number | null
          mastering_last_error?: string | null
          mastering_profile?: string | null
          mastering_status?: string
          original_file_path?: string
          original_file_url?: string | null
          original_mime_type?: string
          peak_db?: number | null
          processing_notes?: string | null
          rms_db?: number | null
          sample_rate?: number | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_takes_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episode_metrics_summary"
            referencedColumns: ["episode_id"]
          },
          {
            foreignKeyName: "audio_takes_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      audio_transcript_segments: {
        Row: {
          audio_take_id: string
          clarity_score: number | null
          confidence: number | null
          created_at: string
          emotional_score: number | null
          end_seconds: number
          id: string
          is_clip_candidate: boolean
          is_hook: boolean
          is_quote: boolean
          reuse_score: number | null
          segment_index: number
          start_seconds: number
          text: string
          transcript_id: string
          user_id: string
        }
        Insert: {
          audio_take_id: string
          clarity_score?: number | null
          confidence?: number | null
          created_at?: string
          emotional_score?: number | null
          end_seconds: number
          id?: string
          is_clip_candidate?: boolean
          is_hook?: boolean
          is_quote?: boolean
          reuse_score?: number | null
          segment_index: number
          start_seconds: number
          text: string
          transcript_id: string
          user_id: string
        }
        Update: {
          audio_take_id?: string
          clarity_score?: number | null
          confidence?: number | null
          created_at?: string
          emotional_score?: number | null
          end_seconds?: number
          id?: string
          is_clip_candidate?: boolean
          is_hook?: boolean
          is_quote?: boolean
          reuse_score?: number | null
          segment_index?: number
          start_seconds?: number
          text?: string
          transcript_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_transcript_segments_audio_take_id_fkey"
            columns: ["audio_take_id"]
            isOneToOne: false
            referencedRelation: "audio_takes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audio_transcript_segments_transcript_id_fkey"
            columns: ["transcript_id"]
            isOneToOne: false
            referencedRelation: "audio_transcripts"
            referencedColumns: ["id"]
          },
        ]
      }
      audio_transcripts: {
        Row: {
          audio_take_id: string
          confidence: number | null
          created_at: string
          error_message: string | null
          full_text: string | null
          id: string
          language: string
          provider: string | null
          source: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          audio_take_id: string
          confidence?: number | null
          created_at?: string
          error_message?: string | null
          full_text?: string | null
          id?: string
          language?: string
          provider?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          audio_take_id?: string
          confidence?: number | null
          created_at?: string
          error_message?: string | null
          full_text?: string | null
          id?: string
          language?: string
          provider?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_transcripts_audio_take_id_fkey"
            columns: ["audio_take_id"]
            isOneToOne: true
            referencedRelation: "audio_takes"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          created_at: string | null
          episode_id: string | null
          error: string | null
          id: string
          patch: Json | null
          result: Json | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          episode_id?: string | null
          error?: string | null
          id?: string
          patch?: Json | null
          result?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          episode_id?: string | null
          error?: string | null
          id?: string
          patch?: Json | null
          result?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episode_metrics_summary"
            referencedColumns: ["episode_id"]
          },
          {
            foreignKeyName: "audit_events_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          new_value: Json | null
          old_value: Json | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      automation_logs: {
        Row: {
          created_at: string
          duration_ms: number | null
          entity_id: string | null
          entity_type: string
          episode_id: string | null
          error_message: string | null
          event_type: string
          id: string
          metadata: Json
          result_summary: string | null
          run_id: string | null
          skip_reason: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          entity_id?: string | null
          entity_type: string
          episode_id?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          metadata?: Json
          result_summary?: string | null
          run_id?: string | null
          skip_reason?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          entity_id?: string | null
          entity_type?: string
          episode_id?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          metadata?: Json
          result_summary?: string | null
          run_id?: string | null
          skip_reason?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episode_metrics_summary"
            referencedColumns: ["episode_id"]
          },
          {
            foreignKeyName: "automation_logs_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_assets: {
        Row: {
          created_at: string
          id: string
          label: string
          type: string
          updated_at: string
          user_id: string | null
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          type: string
          updated_at?: string
          user_id?: string | null
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          type?: string
          updated_at?: string
          user_id?: string | null
          value?: string
        }
        Relationships: []
      }
      brand_tokens: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string | null
          token_name: string
          token_type: string
          token_value: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          token_name: string
          token_type: string
          token_value: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          token_name?: string
          token_type?: string
          token_value?: string
        }
        Relationships: []
      }
      briefs: {
        Row: {
          angle: string | null
          audience: string | null
          created_at: string
          cta: string | null
          emotional_transformation: string | null
          episode_id: string | null
          id: string
          idea_id: string | null
          keywords: string[] | null
          notes: string | null
          pain_point: string | null
          promise: string | null
          risks: string | null
          status: string | null
          thesis: string | null
          title: string
          tone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          angle?: string | null
          audience?: string | null
          created_at?: string
          cta?: string | null
          emotional_transformation?: string | null
          episode_id?: string | null
          id?: string
          idea_id?: string | null
          keywords?: string[] | null
          notes?: string | null
          pain_point?: string | null
          promise?: string | null
          risks?: string | null
          status?: string | null
          thesis?: string | null
          title: string
          tone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          angle?: string | null
          audience?: string | null
          created_at?: string
          cta?: string | null
          emotional_transformation?: string | null
          episode_id?: string | null
          id?: string
          idea_id?: string | null
          keywords?: string[] | null
          notes?: string | null
          pain_point?: string | null
          promise?: string | null
          risks?: string | null
          status?: string | null
          thesis?: string | null
          title?: string
          tone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "briefs_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episode_metrics_summary"
            referencedColumns: ["episode_id"]
          },
          {
            foreignKeyName: "briefs_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "briefs_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      change_history: {
        Row: {
          change_origin: string
          changed_at: string
          field_name: string
          id: string
          new_value: string | null
          old_value: string | null
          record_id: string
          table_name: string
          user_id: string
        }
        Insert: {
          change_origin?: string
          changed_at?: string
          field_name: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          record_id: string
          table_name: string
          user_id: string
        }
        Update: {
          change_origin?: string
          changed_at?: string
          field_name?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          record_id?: string
          table_name?: string
          user_id?: string
        }
        Relationships: []
      }
      change_log: {
        Row: {
          action_type: string
          change_summary: string | null
          changed_by: string | null
          created_at: string
          diff_json: Json | null
          entity_id: string
          entity_type: string
          id: string
        }
        Insert: {
          action_type: string
          change_summary?: string | null
          changed_by?: string | null
          created_at?: string
          diff_json?: Json | null
          entity_id: string
          entity_type: string
          id?: string
        }
        Update: {
          action_type?: string
          change_summary?: string | null
          changed_by?: string | null
          created_at?: string
          diff_json?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      cleaned_texts: {
        Row: {
          approved: boolean | null
          approved_at: string | null
          approved_by: string | null
          cleaned_text: string
          cleaned_word_count: number
          created_at: string | null
          id: string
          raw_input_id: string | null
          reduction_percentage: number | null
        }
        Insert: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          cleaned_text: string
          cleaned_word_count?: number
          created_at?: string | null
          id?: string
          raw_input_id?: string | null
          reduction_percentage?: number | null
        }
        Update: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          cleaned_text?: string
          cleaned_word_count?: number
          created_at?: string | null
          id?: string
          raw_input_id?: string | null
          reduction_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cleaned_texts_raw_input_id_fkey"
            columns: ["raw_input_id"]
            isOneToOne: false
            referencedRelation: "raw_inputs"
            referencedColumns: ["id"]
          },
        ]
      }
      content_assets: {
        Row: {
          approved_at: string | null
          caption: string | null
          copy_json: Json | null
          created_at: string | null
          episode_id: string | null
          hashtags: string | null
          id: string
          image_url: string | null
          piece_id: number
          piece_name: string
          prompt_used: string | null
          published_at: string | null
          status: string | null
          template_id: string | null
          updated_at: string | null
          user_id: string
          variant_name: string | null
        }
        Insert: {
          approved_at?: string | null
          caption?: string | null
          copy_json?: Json | null
          created_at?: string | null
          episode_id?: string | null
          hashtags?: string | null
          id?: string
          image_url?: string | null
          piece_id: number
          piece_name: string
          prompt_used?: string | null
          published_at?: string | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
          user_id: string
          variant_name?: string | null
        }
        Update: {
          approved_at?: string | null
          caption?: string | null
          copy_json?: Json | null
          created_at?: string | null
          episode_id?: string | null
          hashtags?: string | null
          id?: string
          image_url?: string | null
          piece_id?: number
          piece_name?: string
          prompt_used?: string | null
          published_at?: string | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
          user_id?: string
          variant_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_assets_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episode_metrics_summary"
            referencedColumns: ["episode_id"]
          },
          {
            foreignKeyName: "content_assets_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      editing_sessions: {
        Row: {
          created_at: string
          display_name: string | null
          entity_id: string
          entity_type: string
          id: string
          last_heartbeat: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          entity_id: string
          entity_type: string
          id?: string
          last_heartbeat?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          last_heartbeat?: string
          user_id?: string
        }
        Relationships: []
      }
      episode_block_versions: {
        Row: {
          applied_at: string | null
          created_at: string | null
          episode_id: string
          field_name: string
          id: string
          source: string
          value: string
        }
        Insert: {
          applied_at?: string | null
          created_at?: string | null
          episode_id: string
          field_name: string
          id?: string
          source?: string
          value: string
        }
        Update: {
          applied_at?: string | null
          created_at?: string | null
          episode_id?: string
          field_name?: string
          id?: string
          source?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "episode_block_versions_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episode_metrics_summary"
            referencedColumns: ["episode_id"]
          },
          {
            foreignKeyName: "episode_block_versions_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      episode_drafts: {
        Row: {
          conflict_options_json: Json | null
          converted_to_episode_id: string | null
          created_at: string
          id: string
          idea_principal: string | null
          release_date: string | null
          restricciones: string | null
          selected_conflicto: Json | null
          selected_intencion: Json | null
          step: number | null
          tono: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          conflict_options_json?: Json | null
          converted_to_episode_id?: string | null
          created_at?: string
          id?: string
          idea_principal?: string | null
          release_date?: string | null
          restricciones?: string | null
          selected_conflicto?: Json | null
          selected_intencion?: Json | null
          step?: number | null
          tono?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          conflict_options_json?: Json | null
          converted_to_episode_id?: string | null
          created_at?: string
          id?: string
          idea_principal?: string | null
          release_date?: string | null
          restricciones?: string | null
          selected_conflicto?: Json | null
          selected_intencion?: Json | null
          step?: number | null
          tono?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "episode_drafts_converted_to_episode_id_fkey"
            columns: ["converted_to_episode_id"]
            isOneToOne: false
            referencedRelation: "episode_metrics_summary"
            referencedColumns: ["episode_id"]
          },
          {
            foreignKeyName: "episode_drafts_converted_to_episode_id_fkey"
            columns: ["converted_to_episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      episode_key_phrases: {
        Row: {
          created_at: string
          episode_id: string
          id: string
          order_index: number
          phrase: string
        }
        Insert: {
          created_at?: string
          episode_id: string
          id?: string
          order_index?: number
          phrase: string
        }
        Update: {
          created_at?: string
          episode_id?: string
          id?: string
          order_index?: number
          phrase?: string
        }
        Relationships: [
          {
            foreignKeyName: "episode_key_phrases_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episode_metrics_summary"
            referencedColumns: ["episode_id"]
          },
          {
            foreignKeyName: "episode_key_phrases_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      episode_templates: {
        Row: {
          body: string | null
          closing: string | null
          created_at: string
          cta: string | null
          hook: string | null
          id: string
          structure: string | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          closing?: string | null
          created_at?: string
          cta?: string | null
          hook?: string | null
          id?: string
          structure?: string | null
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          closing?: string | null
          created_at?: string
          cta?: string | null
          hook?: string | null
          id?: string
          structure?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      episodes: {
        Row: {
          block_states: Json | null
          checklist_assets_json: Json | null
          checklist_qa_json: Json | null
          conflicto_central: string | null
          conflicto_central_old: string | null
          conflicto_detectado: boolean | null
          conflicto_nota: string | null
          copilot_candidates: Json | null
          core_thesis: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          cta: string | null
          derived_copies_json: Json | null
          descripcion_spotify: string | null
          distribution_status: string | null
          duration: string | null
          editing_status: string | null
          episode_number: number | null
          episode_state: string | null
          estado_produccion: string | null
          estado_publicacion: string | null
          estado_validacion: string | null
          fecha_es_estimada: boolean | null
          final_title: string | null
          generation_metadata: Json | null
          health_score: number | null
          hook: string | null
          id: string
          idea_principal: string | null
          intencion_del_episodio: string | null
          link_spotify: string | null
          nivel_completitud: string | null
          nota_trazabilidad: string | null
          number: string | null
          performance_score: number | null
          prompt_set_json: Json | null
          publication_blockers_json: Json | null
          quote: string | null
          ready_for_production: boolean | null
          ready_for_publish: boolean | null
          recording_status: string | null
          release_date: string | null
          restricciones: string | null
          retencion_q1: number | null
          retencion_q2: number | null
          retencion_q3: number | null
          retencion_q4: number | null
          script_base: string | null
          script_clean: string | null
          script_engine_status: string | null
          script_generated: string | null
          script_status: string | null
          season: number | null
          season_id: string | null
          selected_conflicto_tipo: string | null
          selected_intencion_tipo: string | null
          status: string | null
          streams_total: number | null
          summary: string | null
          tags: string[] | null
          template_id: string | null
          theme: string | null
          thesis_central: string | null
          title: string
          titulo_original: string | null
          tono: string | null
          updated_at: string
          user_id: string | null
          version_history: Json | null
          visual_notes: string | null
          visual_preset_id: string | null
          visual_status: string | null
          working_title: string | null
        }
        Insert: {
          block_states?: Json | null
          checklist_assets_json?: Json | null
          checklist_qa_json?: Json | null
          conflicto_central?: string | null
          conflicto_central_old?: string | null
          conflicto_detectado?: boolean | null
          conflicto_nota?: string | null
          copilot_candidates?: Json | null
          core_thesis?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          cta?: string | null
          derived_copies_json?: Json | null
          descripcion_spotify?: string | null
          distribution_status?: string | null
          duration?: string | null
          editing_status?: string | null
          episode_number?: number | null
          episode_state?: string | null
          estado_produccion?: string | null
          estado_publicacion?: string | null
          estado_validacion?: string | null
          fecha_es_estimada?: boolean | null
          final_title?: string | null
          generation_metadata?: Json | null
          health_score?: number | null
          hook?: string | null
          id?: string
          idea_principal?: string | null
          intencion_del_episodio?: string | null
          link_spotify?: string | null
          nivel_completitud?: string | null
          nota_trazabilidad?: string | null
          number?: string | null
          performance_score?: number | null
          prompt_set_json?: Json | null
          publication_blockers_json?: Json | null
          quote?: string | null
          ready_for_production?: boolean | null
          ready_for_publish?: boolean | null
          recording_status?: string | null
          release_date?: string | null
          restricciones?: string | null
          retencion_q1?: number | null
          retencion_q2?: number | null
          retencion_q3?: number | null
          retencion_q4?: number | null
          script_base?: string | null
          script_clean?: string | null
          script_engine_status?: string | null
          script_generated?: string | null
          script_status?: string | null
          season?: number | null
          season_id?: string | null
          selected_conflicto_tipo?: string | null
          selected_intencion_tipo?: string | null
          status?: string | null
          streams_total?: number | null
          summary?: string | null
          tags?: string[] | null
          template_id?: string | null
          theme?: string | null
          thesis_central?: string | null
          title: string
          titulo_original?: string | null
          tono?: string | null
          updated_at?: string
          user_id?: string | null
          version_history?: Json | null
          visual_notes?: string | null
          visual_preset_id?: string | null
          visual_status?: string | null
          working_title?: string | null
        }
        Update: {
          block_states?: Json | null
          checklist_assets_json?: Json | null
          checklist_qa_json?: Json | null
          conflicto_central?: string | null
          conflicto_central_old?: string | null
          conflicto_detectado?: boolean | null
          conflicto_nota?: string | null
          copilot_candidates?: Json | null
          core_thesis?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          cta?: string | null
          derived_copies_json?: Json | null
          descripcion_spotify?: string | null
          distribution_status?: string | null
          duration?: string | null
          editing_status?: string | null
          episode_number?: number | null
          episode_state?: string | null
          estado_produccion?: string | null
          estado_publicacion?: string | null
          estado_validacion?: string | null
          fecha_es_estimada?: boolean | null
          final_title?: string | null
          generation_metadata?: Json | null
          health_score?: number | null
          hook?: string | null
          id?: string
          idea_principal?: string | null
          intencion_del_episodio?: string | null
          link_spotify?: string | null
          nivel_completitud?: string | null
          nota_trazabilidad?: string | null
          number?: string | null
          performance_score?: number | null
          prompt_set_json?: Json | null
          publication_blockers_json?: Json | null
          quote?: string | null
          ready_for_production?: boolean | null
          ready_for_publish?: boolean | null
          recording_status?: string | null
          release_date?: string | null
          restricciones?: string | null
          retencion_q1?: number | null
          retencion_q2?: number | null
          retencion_q3?: number | null
          retencion_q4?: number | null
          script_base?: string | null
          script_clean?: string | null
          script_engine_status?: string | null
          script_generated?: string | null
          script_status?: string | null
          season?: number | null
          season_id?: string | null
          selected_conflicto_tipo?: string | null
          selected_intencion_tipo?: string | null
          status?: string | null
          streams_total?: number | null
          summary?: string | null
          tags?: string[] | null
          template_id?: string | null
          theme?: string | null
          thesis_central?: string | null
          title?: string
          titulo_original?: string | null
          tono?: string | null
          updated_at?: string
          user_id?: string | null
          version_history?: Json | null
          visual_notes?: string | null
          visual_preset_id?: string | null
          visual_status?: string | null
          working_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "episodes_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_episodes_template"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "episode_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      export_package_items: {
        Row: {
          asset_type: string
          created_at: string
          export_package_id: string
          file_format: string | null
          file_url: string | null
          id: string
          label: string | null
          platform: string | null
          rendered_asset_id: string | null
          sort_order: number
        }
        Insert: {
          asset_type: string
          created_at?: string
          export_package_id: string
          file_format?: string | null
          file_url?: string | null
          id?: string
          label?: string | null
          platform?: string | null
          rendered_asset_id?: string | null
          sort_order?: number
        }
        Update: {
          asset_type?: string
          created_at?: string
          export_package_id?: string
          file_format?: string | null
          file_url?: string | null
          id?: string
          label?: string | null
          platform?: string | null
          rendered_asset_id?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "export_package_items_export_package_id_fkey"
            columns: ["export_package_id"]
            isOneToOne: false
            referencedRelation: "export_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "export_package_items_rendered_asset_id_fkey"
            columns: ["rendered_asset_id"]
            isOneToOne: false
            referencedRelation: "rendered_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      export_packages: {
        Row: {
          created_at: string
          episode_id: string | null
          id: string
          notes: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          episode_id?: string | null
          id?: string
          notes?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          episode_id?: string | null
          id?: string
          notes?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "export_packages_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episode_metrics_summary"
            referencedColumns: ["episode_id"]
          },
          {
            foreignKeyName: "export_packages_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      exports: {
        Row: {
          export_type: string
          exported_at: string
          exported_by: string | null
          file_name: string
          file_url: string | null
          id: string
          is_final: boolean
          piece_version_id: string
        }
        Insert: {
          export_type?: string
          exported_at?: string
          exported_by?: string | null
          file_name: string
          file_url?: string | null
          id?: string
          is_final?: boolean
          piece_version_id: string
        }
        Update: {
          export_type?: string
          exported_at?: string
          exported_by?: string | null
          file_name?: string
          file_url?: string | null
          id?: string
          is_final?: boolean
          piece_version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exports_piece_version_id_fkey"
            columns: ["piece_version_id"]
            isOneToOne: false
            referencedRelation: "piece_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_assets: {
        Row: {
          asset_key: string | null
          asset_type: string | null
          content_json: Json | null
          created_at: string
          episode_id: string | null
          episodio_num: string | null
          id: string
          image_url: string
          piece_id: string | null
          piece_name: string | null
          prompt: string | null
          semantic_map_id: string | null
          source: string | null
          status: string | null
          updated_at: string | null
          user_id: string
          version: number | null
          word_counts_json: Json | null
        }
        Insert: {
          asset_key?: string | null
          asset_type?: string | null
          content_json?: Json | null
          created_at?: string
          episode_id?: string | null
          episodio_num?: string | null
          id?: string
          image_url: string
          piece_id?: string | null
          piece_name?: string | null
          prompt?: string | null
          semantic_map_id?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          version?: number | null
          word_counts_json?: Json | null
        }
        Update: {
          asset_key?: string | null
          asset_type?: string | null
          content_json?: Json | null
          created_at?: string
          episode_id?: string | null
          episodio_num?: string | null
          id?: string
          image_url?: string
          piece_id?: string | null
          piece_name?: string | null
          prompt?: string | null
          semantic_map_id?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          version?: number | null
          word_counts_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_assets_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episode_metrics_summary"
            referencedColumns: ["episode_id"]
          },
          {
            foreignKeyName: "generated_assets_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_assets_semantic_map_id_fkey"
            columns: ["semantic_map_id"]
            isOneToOne: false
            referencedRelation: "semantic_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_history: {
        Row: {
          created_at: string
          id: string
          prompt: string | null
          result: string | null
          status: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          prompt?: string | null
          result?: string | null
          status?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          prompt?: string | null
          result?: string | null
          status?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      guests: {
        Row: {
          bio: string | null
          contact: string | null
          created_at: string
          id: string
          name: string
          role: string | null
          status: string | null
          topics: string[] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          bio?: string | null
          contact?: string | null
          created_at?: string
          id?: string
          name: string
          role?: string | null
          status?: string | null
          topics?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          bio?: string | null
          contact?: string | null
          created_at?: string
          id?: string
          name?: string
          role?: string | null
          status?: string | null
          topics?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      host_assets: {
        Row: {
          asset_type: string
          asset_url: string
          created_at: string
          id: string
          is_primary: boolean
          label: string
        }
        Insert: {
          asset_type?: string
          asset_url: string
          created_at?: string
          id?: string
          is_primary?: boolean
          label: string
        }
        Update: {
          asset_type?: string
          asset_url?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          label?: string
        }
        Relationships: []
      }
      ideas: {
        Row: {
          audience_fit: string | null
          content_potential_score: number | null
          created_at: string
          derivative_potential_score: number | null
          description: string | null
          emotional_theme: string | null
          format_suggested: string | null
          id: string
          notes: string | null
          origin: string | null
          reference_links: string | null
          status: string | null
          tags: string[] | null
          theme: string | null
          title: string
          updated_at: string
          urgency_level: string | null
          user_id: string
        }
        Insert: {
          audience_fit?: string | null
          content_potential_score?: number | null
          created_at?: string
          derivative_potential_score?: number | null
          description?: string | null
          emotional_theme?: string | null
          format_suggested?: string | null
          id?: string
          notes?: string | null
          origin?: string | null
          reference_links?: string | null
          status?: string | null
          tags?: string[] | null
          theme?: string | null
          title: string
          updated_at?: string
          urgency_level?: string | null
          user_id: string
        }
        Update: {
          audience_fit?: string | null
          content_potential_score?: number | null
          created_at?: string
          derivative_potential_score?: number | null
          description?: string | null
          emotional_theme?: string | null
          format_suggested?: string | null
          id?: string
          notes?: string | null
          origin?: string | null
          reference_links?: string | null
          status?: string | null
          tags?: string[] | null
          theme?: string | null
          title?: string
          updated_at?: string
          urgency_level?: string | null
          user_id?: string
        }
        Relationships: []
      }
      insights: {
        Row: {
          confidence_level: string | null
          created_at: string
          episode_id: string | null
          evidence: string | null
          finding: string
          hypothesis: string | null
          id: string
          recommendation: string | null
          source: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence_level?: string | null
          created_at?: string
          episode_id?: string | null
          evidence?: string | null
          finding: string
          hypothesis?: string | null
          id?: string
          recommendation?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence_level?: string | null
          created_at?: string
          episode_id?: string | null
          evidence?: string | null
          finding?: string
          hypothesis?: string | null
          id?: string
          recommendation?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "insights_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episode_metrics_summary"
            referencedColumns: ["episode_id"]
          },
          {
            foreignKeyName: "insights_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_account_stats: {
        Row: {
          created_at: string | null
          fecha: string
          followers: number | null
          id: string
          impressions: number | null
          profile_views: number | null
          reach: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          fecha: string
          followers?: number | null
          id?: string
          impressions?: number | null
          profile_views?: number | null
          reach?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          fecha?: string
          followers?: number | null
          id?: string
          impressions?: number | null
          profile_views?: number | null
          reach?: number | null
          user_id?: string
        }
        Relationships: []
      }
      instagram_media_stats: {
        Row: {
          caption: string | null
          comments: number | null
          episode_id: string | null
          fetched_at: string | null
          id: string
          ig_media_id: string
          ig_permalink: string | null
          impressions: number | null
          likes: number | null
          media_type: string | null
          posted_at: string | null
          reach: number | null
          saves: number | null
          shares: number | null
          thumbnail_url: string | null
          user_id: string
        }
        Insert: {
          caption?: string | null
          comments?: number | null
          episode_id?: string | null
          fetched_at?: string | null
          id?: string
          ig_media_id: string
          ig_permalink?: string | null
          impressions?: number | null
          likes?: number | null
          media_type?: string | null
          posted_at?: string | null
          reach?: number | null
          saves?: number | null
          shares?: number | null
          thumbnail_url?: string | null
          user_id: string
        }
        Update: {
          caption?: string | null
          comments?: number | null
          episode_id?: string | null
          fetched_at?: string | null
          id?: string
          ig_media_id?: string
          ig_permalink?: string | null
          impressions?: number | null
          likes?: number | null
          media_type?: string | null
          posted_at?: string | null
          reach?: number | null
          saves?: number | null
          shares?: number | null
          thumbnail_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_media_stats_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episode_metrics_summary"
            referencedColumns: ["episode_id"]
          },
          {
            foreignKeyName: "instagram_media_stats_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_blocks: {
        Row: {
          content: string | null
          content_type: string
          created_at: string
          destination_module: string
          id: string
          import_status: string
          imported_at: string | null
          last_synced_at: string | null
          source_document: string
          source_hash: string | null
          source_section: string | null
          source_subsection: string | null
          structured_data: Json | null
          target_record_id: string | null
          target_table: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          content_type: string
          created_at?: string
          destination_module: string
          id?: string
          import_status?: string
          imported_at?: string | null
          last_synced_at?: string | null
          source_document?: string
          source_hash?: string | null
          source_section?: string | null
          source_subsection?: string | null
          structured_data?: Json | null
          target_record_id?: string | null
          target_table?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          content_type?: string
          created_at?: string
          destination_module?: string
          id?: string
          import_status?: string
          imported_at?: string | null
          last_synced_at?: string | null
          source_document?: string
          source_hash?: string | null
          source_section?: string | null
          source_subsection?: string | null
          structured_data?: Json | null
          target_record_id?: string | null
          target_table?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      knowledge_docs: {
        Row: {
          body: string | null
          created_at: string
          doc_type: string
          id: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          doc_type?: string
          id?: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          doc_type?: string
          id?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      learning_insights: {
        Row: {
          body: string | null
          created_at: string
          data: Json | null
          episode_id: string | null
          id: string
          insight_type: string
          source: string | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json | null
          episode_id?: string | null
          id?: string
          insight_type: string
          source?: string | null
          status?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json | null
          episode_id?: string | null
          id?: string
          insight_type?: string
          source?: string | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_insights_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episode_metrics_summary"
            referencedColumns: ["episode_id"]
          },
          {
            foreignKeyName: "learning_insights_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      mentions: {
        Row: {
          context: string | null
          created_at: string
          date: string | null
          id: string
          link: string | null
          name: string | null
          platform: string | null
          user_id: string | null
        }
        Insert: {
          context?: string | null
          created_at?: string
          date?: string | null
          id?: string
          link?: string | null
          name?: string | null
          platform?: string | null
          user_id?: string | null
        }
        Update: {
          context?: string | null
          created_at?: string
          date?: string | null
          id?: string
          link?: string | null
          name?: string | null
          platform?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      metric_snapshots: {
        Row: {
          created_at: string
          episode_id: string | null
          id: string
          metric_type: string
          platform: string
          raw_data: Json | null
          snapshot_date: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          episode_id?: string | null
          id?: string
          metric_type: string
          platform: string
          raw_data?: Json | null
          snapshot_date: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          episode_id?: string | null
          id?: string
          metric_type?: string
          platform?: string
          raw_data?: Json | null
          snapshot_date?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "metric_snapshots_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episode_metrics_summary"
            referencedColumns: ["episode_id"]
          },
          {
            foreignKeyName: "metric_snapshots_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      metrics: {
        Row: {
          created_at: string
          date: string | null
          episode_id: string | null
          id: string
          metric_group: string | null
          name: string | null
          notes: string | null
          source: string | null
          source_file_name: string | null
          source_import_batch: string | null
          unit: string | null
          user_id: string | null
          value: number | null
        }
        Insert: {
          created_at?: string
          date?: string | null
          episode_id?: string | null
          id?: string
          metric_group?: string | null
          name?: string | null
          notes?: string | null
          source?: string | null
          source_file_name?: string | null
          source_import_batch?: string | null
          unit?: string | null
          user_id?: string | null
          value?: number | null
        }
        Update: {
          created_at?: string
          date?: string | null
          episode_id?: string | null
          id?: string
          metric_group?: string | null
          name?: string | null
          notes?: string | null
          source?: string | null
          source_file_name?: string | null
          source_import_batch?: string | null
          unit?: string | null
          user_id?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "metrics_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episode_metrics_summary"
            referencedColumns: ["episode_id"]
          },
          {
            foreignKeyName: "metrics_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      narrative_skeletons: {
        Row: {
          blocks: Json | null
          created_at: string
          episode_type: string | null
          id: string
          is_default: boolean | null
          name: string
          objective: string | null
          suggested_duration: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          blocks?: Json | null
          created_at?: string
          episode_type?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          objective?: string | null
          suggested_duration?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          blocks?: Json | null
          created_at?: string
          episode_type?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          objective?: string | null
          suggested_duration?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      net_http_logs: {
        Row: {
          content: Json | null
          created_at: string | null
          function_name: string | null
          headers: Json | null
          id: number
          message: string | null
          request_id: number | null
          status: string | null
          status_code: number | null
        }
        Insert: {
          content?: Json | null
          created_at?: string | null
          function_name?: string | null
          headers?: Json | null
          id?: number
          message?: string | null
          request_id?: number | null
          status?: string | null
          status_code?: number | null
        }
        Update: {
          content?: Json | null
          created_at?: string | null
          function_name?: string | null
          headers?: Json | null
          id?: number
          message?: string | null
          request_id?: number | null
          status?: string | null
          status_code?: number | null
        }
        Relationships: []
      }
      notes: {
        Row: {
          archived_at: string | null
          body: string
          created_at: string
          id: string
          pinned: boolean
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          body?: string
          created_at?: string
          id?: string
          pinned?: boolean
          tags?: string[]
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          body?: string
          created_at?: string
          id?: string
          pinned?: boolean
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      palette_assignments: {
        Row: {
          asset_version_id: string | null
          created_at: string | null
          created_by: string | null
          custom_accent: string | null
          custom_bg: string | null
          custom_text: string | null
          episode_id: string | null
          id: string
          palette_id: number | null
          scope: string | null
        }
        Insert: {
          asset_version_id?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_accent?: string | null
          custom_bg?: string | null
          custom_text?: string | null
          episode_id?: string | null
          id?: string
          palette_id?: number | null
          scope?: string | null
        }
        Update: {
          asset_version_id?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_accent?: string | null
          custom_bg?: string | null
          custom_text?: string | null
          episode_id?: string | null
          id?: string
          palette_id?: number | null
          scope?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "palette_assignments_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episode_metrics_summary"
            referencedColumns: ["episode_id"]
          },
          {
            foreignKeyName: "palette_assignments_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "palette_assignments_palette_id_fkey"
            columns: ["palette_id"]
            isOneToOne: false
            referencedRelation: "palette_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      palette_definitions: {
        Row: {
          accent: string
          accent_deep: string | null
          bg: string
          created_at: string | null
          id: number
          is_system: boolean | null
          name: string
          surface: string | null
          surface2: string | null
          text_color: string
        }
        Insert: {
          accent: string
          accent_deep?: string | null
          bg: string
          created_at?: string | null
          id?: number
          is_system?: boolean | null
          name: string
          surface?: string | null
          surface2?: string | null
          text_color: string
        }
        Update: {
          accent?: string
          accent_deep?: string | null
          bg?: string
          created_at?: string | null
          id?: number
          is_system?: boolean | null
          name?: string
          surface?: string | null
          surface2?: string | null
          text_color?: string
        }
        Relationships: []
      }
      piece_copy_blocks: {
        Row: {
          block_name: string
          block_value: string
          id: string
          is_fixed: boolean
          order_index: number
          piece_id: string
          updated_at: string
        }
        Insert: {
          block_name: string
          block_value?: string
          id?: string
          is_fixed?: boolean
          order_index?: number
          piece_id: string
          updated_at?: string
        }
        Update: {
          block_name?: string
          block_value?: string
          id?: string
          is_fixed?: boolean
          order_index?: number
          piece_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "piece_copy_blocks_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "visual_pieces"
            referencedColumns: ["id"]
          },
        ]
      }
      piece_versions: {
        Row: {
          change_reason: string | null
          created_at: string
          created_by: string | null
          export_url: string | null
          id: string
          payload_json: Json
          piece_id: string
          preview_url: string | null
          validation_score: number | null
          version_number: number
        }
        Insert: {
          change_reason?: string | null
          created_at?: string
          created_by?: string | null
          export_url?: string | null
          id?: string
          payload_json?: Json
          piece_id: string
          preview_url?: string | null
          validation_score?: number | null
          version_number: number
        }
        Update: {
          change_reason?: string | null
          created_at?: string
          created_by?: string | null
          export_url?: string | null
          id?: string
          payload_json?: Json
          piece_id?: string
          preview_url?: string | null
          validation_score?: number | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "piece_versions_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "visual_pieces"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_accounts: {
        Row: {
          access_token: string | null
          account_id: string | null
          account_name: string
          connected_at: string | null
          created_at: string
          id: string
          is_active: boolean | null
          metadata: Json | null
          oauth_connected: boolean | null
          platform: string
          refresh_token: string | null
          sync_error: string | null
          sync_status: string | null
          synced_at: string | null
          token_expiry: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          account_id?: string | null
          account_name: string
          connected_at?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          oauth_connected?: boolean | null
          platform: string
          refresh_token?: string | null
          sync_error?: string | null
          sync_status?: string | null
          synced_at?: string | null
          token_expiry?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          account_id?: string | null
          account_name?: string
          connected_at?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          oauth_connected?: boolean | null
          platform?: string
          refresh_token?: string | null
          sync_error?: string | null
          sync_status?: string | null
          synced_at?: string | null
          token_expiry?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      podcast_app_stats: {
        Row: {
          aplicacion: string
          created_at: string | null
          id: string
          porcentaje: number | null
          snapshot_date: string
          user_id: string | null
        }
        Insert: {
          aplicacion: string
          created_at?: string | null
          id?: string
          porcentaje?: number | null
          snapshot_date?: string
          user_id?: string | null
        }
        Update: {
          aplicacion?: string
          created_at?: string | null
          id?: string
          porcentaje?: number | null
          snapshot_date?: string
          user_id?: string | null
        }
        Relationships: []
      }
      podcast_daily_stats: {
        Row: {
          created_at: string | null
          escuchas: number | null
          fecha: string
          horas_reproduccion: number | null
          id: string
          seguidores: number | null
          streams: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          escuchas?: number | null
          fecha: string
          horas_reproduccion?: number | null
          id?: string
          seguidores?: number | null
          streams?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          escuchas?: number | null
          fecha?: string
          horas_reproduccion?: number | null
          id?: string
          seguidores?: number | null
          streams?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      podcast_geo_stats: {
        Row: {
          created_at: string | null
          id: string
          pais: string
          porcentaje: number | null
          snapshot_date: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          pais: string
          porcentaje?: number | null
          snapshot_date?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          pais?: string
          porcentaje?: number | null
          snapshot_date?: string
          user_id?: string | null
        }
        Relationships: []
      }
      private_documents: {
        Row: {
          content: string
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      processing_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          episode_id: string | null
          error: string | null
          id: string
          job_type: string
          payload: Json | null
          raw_input_id: string | null
          result: Json | null
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          episode_id?: string | null
          error?: string | null
          id?: string
          job_type: string
          payload?: Json | null
          raw_input_id?: string | null
          result?: Json | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          episode_id?: string | null
          error?: string | null
          id?: string
          job_type?: string
          payload?: Json | null
          raw_input_id?: string | null
          result?: Json | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "processing_jobs_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episode_metrics_summary"
            referencedColumns: ["episode_id"]
          },
          {
            foreignKeyName: "processing_jobs_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processing_jobs_raw_input_id_fkey"
            columns: ["raw_input_id"]
            isOneToOne: false
            referencedRelation: "raw_inputs"
            referencedColumns: ["id"]
          },
        ]
      }
      publication_queue: {
        Row: {
          asset_candidate_id: string | null
          checklist: Json | null
          created_at: string
          episode_id: string | null
          export_package_id: string | null
          id: string
          notes: string | null
          platform: string
          published_at: string | null
          scheduled_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_candidate_id?: string | null
          checklist?: Json | null
          created_at?: string
          episode_id?: string | null
          export_package_id?: string | null
          id?: string
          notes?: string | null
          platform: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_candidate_id?: string | null
          checklist?: Json | null
          created_at?: string
          episode_id?: string | null
          export_package_id?: string | null
          id?: string
          notes?: string | null
          platform?: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "publication_queue_asset_candidate_id_fkey"
            columns: ["asset_candidate_id"]
            isOneToOne: false
            referencedRelation: "asset_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publication_queue_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episode_metrics_summary"
            referencedColumns: ["episode_id"]
          },
          {
            foreignKeyName: "publication_queue_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publication_queue_export_package_id_fkey"
            columns: ["export_package_id"]
            isOneToOne: false
            referencedRelation: "export_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      publications: {
        Row: {
          asset_id: string | null
          checklist_json: Json | null
          copy_final: string | null
          created_at: string
          cta_text: string | null
          cta_type: string | null
          episode_id: string
          error_log: string | null
          hashtags: string[] | null
          id: string
          link_published: string | null
          objective: string | null
          platform: string
          published_at: string | null
          scheduled_at: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_id?: string | null
          checklist_json?: Json | null
          copy_final?: string | null
          created_at?: string
          cta_text?: string | null
          cta_type?: string | null
          episode_id: string
          error_log?: string | null
          hashtags?: string[] | null
          id?: string
          link_published?: string | null
          objective?: string | null
          platform: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_id?: string | null
          checklist_json?: Json | null
          copy_final?: string | null
          created_at?: string
          cta_text?: string | null
          cta_type?: string | null
          episode_id?: string
          error_log?: string | null
          hashtags?: string[] | null
          id?: string
          link_published?: string | null
          objective?: string | null
          platform?: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "publications_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episode_metrics_summary"
            referencedColumns: ["episode_id"]
          },
          {
            foreignKeyName: "publications_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_candidates: {
        Row: {
          approval_required: boolean | null
          asset_id: string | null
          assigned_format: string | null
          audio_take_id: string | null
          clarity: number | null
          clarity_score: number | null
          created_at: string
          emotional_intensity: number | null
          emotional_score: number | null
          end_seconds: number | null
          episode_id: string | null
          id: string
          memorability: number | null
          notes: string | null
          quote_type: string | null
          reuse_score: number | null
          saveability: number | null
          score_total: number | null
          shareability: number | null
          source_type: string
          start_seconds: number | null
          status: string | null
          text: string
          timestamp_ref: string | null
          transcript_segment_id: string | null
          updated_at: string
          user_id: string
          visual_fit: number | null
        }
        Insert: {
          approval_required?: boolean | null
          asset_id?: string | null
          assigned_format?: string | null
          audio_take_id?: string | null
          clarity?: number | null
          clarity_score?: number | null
          created_at?: string
          emotional_intensity?: number | null
          emotional_score?: number | null
          end_seconds?: number | null
          episode_id?: string | null
          id?: string
          memorability?: number | null
          notes?: string | null
          quote_type?: string | null
          reuse_score?: number | null
          saveability?: number | null
          score_total?: number | null
          shareability?: number | null
          source_type?: string
          start_seconds?: number | null
          status?: string | null
          text: string
          timestamp_ref?: string | null
          transcript_segment_id?: string | null
          updated_at?: string
          user_id: string
          visual_fit?: number | null
        }
        Update: {
          approval_required?: boolean | null
          asset_id?: string | null
          assigned_format?: string | null
          audio_take_id?: string | null
          clarity?: number | null
          clarity_score?: number | null
          created_at?: string
          emotional_intensity?: number | null
          emotional_score?: number | null
          end_seconds?: number | null
          episode_id?: string | null
          id?: string
          memorability?: number | null
          notes?: string | null
          quote_type?: string | null
          reuse_score?: number | null
          saveability?: number | null
          score_total?: number | null
          shareability?: number | null
          source_type?: string
          start_seconds?: number | null
          status?: string | null
          text?: string
          timestamp_ref?: string | null
          transcript_segment_id?: string | null
          updated_at?: string
          user_id?: string
          visual_fit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_candidates_audio_take_id_fkey"
            columns: ["audio_take_id"]
            isOneToOne: false
            referencedRelation: "audio_takes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_candidates_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episode_metrics_summary"
            referencedColumns: ["episode_id"]
          },
          {
            foreignKeyName: "quote_candidates_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_candidates_transcript_segment_id_fkey"
            columns: ["transcript_segment_id"]
            isOneToOne: false
            referencedRelation: "audio_transcript_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_inputs: {
        Row: {
          created_at: string | null
          created_by: string | null
          episode_id: string | null
          estimated_duration_secs: number | null
          id: string
          is_outdated: boolean
          raw_character_count: number
          raw_text: string
          raw_word_count: number
          source_hash: string | null
          source_type: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          episode_id?: string | null
          estimated_duration_secs?: number | null
          id?: string
          is_outdated?: boolean
          raw_character_count?: number
          raw_text: string
          raw_word_count?: number
          source_hash?: string | null
          source_type: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          episode_id?: string | null
          estimated_duration_secs?: number | null
          id?: string
          is_outdated?: boolean
          raw_character_count?: number
          raw_text?: string
          raw_word_count?: number
          source_hash?: string | null
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "raw_inputs_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episode_metrics_summary"
            referencedColumns: ["episode_id"]
          },
          {
            foreignKeyName: "raw_inputs_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      rendered_assets: {
        Row: {
          asset_candidate_id: string | null
          asset_render_job_id: string | null
          created_at: string
          file_format: string
          file_path: string | null
          file_size_bytes: number | null
          file_url: string | null
          height: number | null
          id: string
          status: string
          user_id: string
          width: number | null
        }
        Insert: {
          asset_candidate_id?: string | null
          asset_render_job_id?: string | null
          created_at?: string
          file_format?: string
          file_path?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          height?: number | null
          id?: string
          status?: string
          user_id: string
          width?: number | null
        }
        Update: {
          asset_candidate_id?: string | null
          asset_render_job_id?: string | null
          created_at?: string
          file_format?: string
          file_path?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          height?: number | null
          id?: string
          status?: string
          user_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rendered_assets_asset_candidate_id_fkey"
            columns: ["asset_candidate_id"]
            isOneToOne: false
            referencedRelation: "asset_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rendered_assets_asset_render_job_id_fkey"
            columns: ["asset_render_job_id"]
            isOneToOne: false
            referencedRelation: "asset_render_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          created_at: string
          description: string | null
          episode_id: string | null
          id: string
          link: string | null
          status: string | null
          title: string | null
          type: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          episode_id?: string | null
          id?: string
          link?: string | null
          status?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          episode_id?: string | null
          id?: string
          link?: string | null
          status?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episode_metrics_summary"
            referencedColumns: ["episode_id"]
          },
          {
            foreignKeyName: "resources_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          number: number
          status: string
          updated_at: string
          user_id: string
          year: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          number?: number
          status?: string
          updated_at?: string
          user_id: string
          year?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          number?: number
          status?: string
          updated_at?: string
          user_id?: string
          year?: number | null
        }
        Relationships: []
      }
      semantic_maps: {
        Row: {
          approved: boolean | null
          approved_at: string | null
          approved_by: string | null
          cleaned_text_id: string | null
          created_at: string | null
          dominant_emotional_tone: string | null
          emotional_intensity_level: string | null
          episode_id: string | null
          id: string
          raw_input_id: string | null
          semantic_json: Json
          suggested_host_image: string | null
          suggested_palette_id: number | null
          updated_at: string | null
          word_counts_json: Json | null
        }
        Insert: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          cleaned_text_id?: string | null
          created_at?: string | null
          dominant_emotional_tone?: string | null
          emotional_intensity_level?: string | null
          episode_id?: string | null
          id?: string
          raw_input_id?: string | null
          semantic_json: Json
          suggested_host_image?: string | null
          suggested_palette_id?: number | null
          updated_at?: string | null
          word_counts_json?: Json | null
        }
        Update: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          cleaned_text_id?: string | null
          created_at?: string | null
          dominant_emotional_tone?: string | null
          emotional_intensity_level?: string | null
          episode_id?: string | null
          id?: string
          raw_input_id?: string | null
          semantic_json?: Json
          suggested_host_image?: string | null
          suggested_palette_id?: number | null
          updated_at?: string | null
          word_counts_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "semantic_maps_cleaned_text_id_fkey"
            columns: ["cleaned_text_id"]
            isOneToOne: false
            referencedRelation: "cleaned_texts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "semantic_maps_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episode_metrics_summary"
            referencedColumns: ["episode_id"]
          },
          {
            foreignKeyName: "semantic_maps_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "semantic_maps_raw_input_id_fkey"
            columns: ["raw_input_id"]
            isOneToOne: false
            referencedRelation: "raw_inputs"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsors: {
        Row: {
          contact: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          status: string
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          contact?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          contact?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      sponsorships: {
        Row: {
          created_at: string
          currency: string
          episode_id: string | null
          id: string
          notes: string | null
          rate: number | null
          sponsor_id: string
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          episode_id?: string | null
          id?: string
          notes?: string | null
          rate?: number | null
          sponsor_id: string
          status?: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          episode_id?: string | null
          id?: string
          notes?: string | null
          rate?: number | null
          sponsor_id?: string
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsorships_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episode_metrics_summary"
            referencedColumns: ["episode_id"]
          },
          {
            foreignKeyName: "sponsorships_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsorships_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsors"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          blocking: boolean | null
          category: string | null
          created_at: string
          description: string | null
          due_date: string | null
          episode_id: string | null
          id: string
          priority: string | null
          sort_order: number | null
          status: string | null
          task_type: string | null
          title: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          blocking?: boolean | null
          category?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          episode_id?: string | null
          id?: string
          priority?: string | null
          sort_order?: number | null
          status?: string | null
          task_type?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          blocking?: boolean | null
          category?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          episode_id?: string | null
          id?: string
          priority?: string | null
          sort_order?: number | null
          status?: string | null
          task_type?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episode_metrics_summary"
            referencedColumns: ["episode_id"]
          },
          {
            foreignKeyName: "tasks_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          brand_palette: Json | null
          content_pillars: string[] | null
          created_at: string
          episodes_per_month: number
          host_name: string
          id: string
          lead_time_days: number
          one_liner: string | null
          podcast_name: string
          publish_day: string
          publish_hour: number
          script_blocks: Json | null
          tagline: string | null
          target_audience: string | null
          tone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_palette?: Json | null
          content_pillars?: string[] | null
          created_at?: string
          episodes_per_month?: number
          host_name?: string
          id?: string
          lead_time_days?: number
          one_liner?: string | null
          podcast_name?: string
          publish_day?: string
          publish_hour?: number
          script_blocks?: Json | null
          tagline?: string | null
          target_audience?: string | null
          tone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_palette?: Json | null
          content_pillars?: string[] | null
          created_at?: string
          episodes_per_month?: number
          host_name?: string
          id?: string
          lead_time_days?: number
          one_liner?: string | null
          podcast_name?: string
          publish_day?: string
          publish_hour?: number
          script_blocks?: Json | null
          tagline?: string | null
          target_audience?: string | null
          tone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      visual_os: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      visual_pieces: {
        Row: {
          approved_by: string | null
          assigned_to: string | null
          created_at: string
          current_version_id: string | null
          episode_id: string
          id: string
          piece_status: string
          preview_data_url: string | null
          template_id: string
          updated_at: string
          validation_score: number | null
        }
        Insert: {
          approved_by?: string | null
          assigned_to?: string | null
          created_at?: string
          current_version_id?: string | null
          episode_id: string
          id?: string
          piece_status?: string
          preview_data_url?: string | null
          template_id: string
          updated_at?: string
          validation_score?: number | null
        }
        Update: {
          approved_by?: string | null
          assigned_to?: string | null
          created_at?: string
          current_version_id?: string | null
          episode_id?: string
          id?: string
          piece_status?: string
          preview_data_url?: string | null
          template_id?: string
          updated_at?: string
          validation_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "visual_pieces_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episode_metrics_summary"
            referencedColumns: ["episode_id"]
          },
          {
            foreignKeyName: "visual_pieces_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visual_pieces_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "visual_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vos_pieces_current_version_fk"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "piece_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      visual_specs: {
        Row: {
          approval_checklist: Json | null
          aspect_ratio: string | null
          block_coordinates: Json | null
          columns: number | null
          created_at: string | null
          gutter: number | null
          height: number
          id: string
          name: string
          naming_convention: string | null
          safe_zone_px: number | null
          typography_levels: Json | null
          width: number
        }
        Insert: {
          approval_checklist?: Json | null
          aspect_ratio?: string | null
          block_coordinates?: Json | null
          columns?: number | null
          created_at?: string | null
          gutter?: number | null
          height: number
          id?: string
          name: string
          naming_convention?: string | null
          safe_zone_px?: number | null
          typography_levels?: Json | null
          width: number
        }
        Update: {
          approval_checklist?: Json | null
          aspect_ratio?: string | null
          block_coordinates?: Json | null
          columns?: number | null
          created_at?: string | null
          gutter?: number | null
          height?: number
          id?: string
          name?: string
          naming_convention?: string | null
          safe_zone_px?: number | null
          typography_levels?: Json | null
          width?: number
        }
        Relationships: []
      }
      visual_system_settings: {
        Row: {
          id: string
          key: string
          label: string | null
          updated_at: string
          updated_by: string | null
          value_json: Json
        }
        Insert: {
          id?: string
          key: string
          label?: string | null
          updated_at?: string
          updated_by?: string | null
          value_json?: Json
        }
        Update: {
          id?: string
          key?: string
          label?: string | null
          updated_at?: string
          updated_by?: string | null
          value_json?: Json
        }
        Relationships: []
      }
      visual_template_rules: {
        Row: {
          created_at: string
          id: string
          is_required: boolean
          order_index: number
          rule_key: string
          rule_type: string
          rule_value_json: Json
          template_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean
          order_index?: number
          rule_key: string
          rule_type: string
          rule_value_json?: Json
          template_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean
          order_index?: number
          rule_key?: string
          rule_type?: string
          rule_value_json?: Json
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visual_template_rules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "visual_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      visual_templates: {
        Row: {
          background_color: string
          composition_notes: string | null
          created_at: string
          format: string
          height_px: number
          id: string
          is_active: boolean
          piece_code: string
          piece_name: string
          production_order: number
          safe_zone_bottom: number
          safe_zone_left: number
          safe_zone_right: number
          safe_zone_top: number
          width_px: number
        }
        Insert: {
          background_color?: string
          composition_notes?: string | null
          created_at?: string
          format: string
          height_px: number
          id?: string
          is_active?: boolean
          piece_code: string
          piece_name: string
          production_order: number
          safe_zone_bottom?: number
          safe_zone_left?: number
          safe_zone_right?: number
          safe_zone_top?: number
          width_px: number
        }
        Update: {
          background_color?: string
          composition_notes?: string | null
          created_at?: string
          format?: string
          height_px?: number
          id?: string
          is_active?: boolean
          piece_code?: string
          piece_name?: string
          production_order?: number
          safe_zone_bottom?: number
          safe_zone_left?: number
          safe_zone_right?: number
          safe_zone_top?: number
          width_px?: number
        }
        Relationships: []
      }
    }
    Views: {
      automation_logs_view: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          entity_id: string | null
          entity_type: string | null
          episode_id: string | null
          episode_number: string | null
          episode_title: string | null
          error_message: string | null
          event_type: string | null
          id: string | null
          metadata: Json | null
          result_summary: string | null
          run_id: string | null
          skip_reason: string | null
          status: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episode_metrics_summary"
            referencedColumns: ["episode_id"]
          },
          {
            foreignKeyName: "automation_logs_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      episode_metrics_summary: {
        Row: {
          approved_assets: number | null
          approved_quotes: number | null
          created_at: string | null
          draft_publications: number | null
          episode_id: string | null
          episode_number: string | null
          episode_title: string | null
          estado_produccion: string | null
          estado_publicacion: string | null
          export_packages: number | null
          performance_score: number | null
          publication_events: number | null
          published_publications: number | null
          real_metric_rows: number | null
          scheduled_publications: number | null
          total_engagement: number | null
          total_plays: number | null
          total_publications: number | null
          total_quotes: number | null
          total_reach: number | null
          total_saves: number | null
          total_shares: number | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      call_automation_ef: {
        Args: { event_type: string; payload: Json }
        Returns: undefined
      }
      dashboard_counts: { Args: never; Returns: Json }
      get_net_http_response: {
        Args: { request_id: number; timeout_ms?: number }
        Returns: {
          content: Json
          headers: Json
          result_message: string
          result_status: string
          status_code: number
        }[]
      }
      infer_platform_from_piece: {
        Args: { piece_name: string }
        Returns: string
      }
      next_episode_number: { Args: { p_user_id: string }; Returns: string }
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
    Enums: {},
  },
} as const
A new version of Supabase CLI is available: v2.84.2 (currently installed v2.78.1)
We recommend updating regularly for new features and bug fixes: https://supabase.com/docs/guides/cli/getting-started#updating-the-supabase-cli
