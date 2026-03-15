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
      generated_assets: {
        Row: {
          id: string
          user_id: string
          episode_id: string | null
          piece_id: string | null
          piece_name: string | null
          image_url: string
          prompt: string | null
          episodio_num: string | null
          source: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          episode_id?: string | null
          piece_id?: string | null
          piece_name?: string | null
          image_url: string
          prompt?: string | null
          episodio_num?: string | null
          source?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          episode_id?: string | null
          piece_id?: string | null
          piece_name?: string | null
          image_url?: string
          prompt?: string | null
          episodio_num?: string | null
          source?: string | null
          created_at?: string
        }
        Relationships: []
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
      content_assets: {
        Row: {
          approved_at: string | null
          caption: string | null
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
          conflicto: boolean | null
          conflicto_central: string | null
          conflicto_detectado: boolean | null
          conflicto_nota: string | null
          core_thesis: string | null
          cover_image_url: string | null
          created_at: string
          cta: string | null
          derived_copies_json: Json | null
          descripcion_spotify: string | null
          distribution_status: string | null
          duration: string | null
          editing_status: string | null
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
          script_generated: string | null
          script_status: string | null
          status: string | null
          streams_total: number | null
          summary: string | null
          tags: string[] | null
          template_id: string | null
          theme: string | null
          title: string
          titulo_original: string | null
          tono: string | null
          updated_at: string
          user_id: string | null
          version_history: Json | null
          visual_preset_id: string | null
          selected_conflicto_tipo: string | null
          selected_intencion_tipo: string | null
          working_title: string | null
        }
        Insert: {
          block_states?: Json | null
          checklist_assets_json?: Json | null
          checklist_qa_json?: Json | null
          conflicto?: boolean | null
          conflicto_central?: string | null
          conflicto_detectado?: boolean | null
          conflicto_nota?: string | null
          core_thesis?: string | null
          cover_image_url?: string | null
          created_at?: string
          cta?: string | null
          derived_copies_json?: Json | null
          descripcion_spotify?: string | null
          distribution_status?: string | null
          duration?: string | null
          editing_status?: string | null
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
          script_generated?: string | null
          script_status?: string | null
          status?: string | null
          streams_total?: number | null
          summary?: string | null
          tags?: string[] | null
          template_id?: string | null
          theme?: string | null
          title: string
          titulo_original?: string | null
          tono?: string | null
          updated_at?: string
          user_id?: string | null
          version_history?: Json | null
          visual_preset_id?: string | null
          working_title?: string | null
        }
        Update: {
          block_states?: Json | null
          checklist_assets_json?: Json | null
          checklist_qa_json?: Json | null
          conflicto?: boolean | null
          conflicto_central?: string | null
          conflicto_detectado?: boolean | null
          conflicto_nota?: string | null
          core_thesis?: string | null
          cover_image_url?: string | null
          created_at?: string
          cta?: string | null
          derived_copies_json?: Json | null
          descripcion_spotify?: string | null
          distribution_status?: string | null
          duration?: string | null
          editing_status?: string | null
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
          script_generated?: string | null
          script_status?: string | null
          status?: string | null
          streams_total?: number | null
          summary?: string | null
          tags?: string[] | null
          template_id?: string | null
          theme?: string | null
          title?: string
          titulo_original?: string | null
          tono?: string | null
          updated_at?: string
          user_id?: string | null
          version_history?: Json | null
          visual_preset_id?: string | null
          selected_conflicto_tipo?: string | null
          selected_intencion_tipo?: string | null
          working_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_episodes_template"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "episode_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      change_history: {
        Row: {
          id: string
          user_id: string
          table_name: string
          record_id: string
          field_name: string
          old_value: string | null
          new_value: string | null
          change_origin: string
          changed_at: string
        }
        Insert: {
          id?: string
          user_id: string
          table_name: string
          record_id: string
          field_name: string
          old_value?: string | null
          new_value?: string | null
          change_origin?: string
          changed_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          table_name?: string
          record_id?: string
          field_name?: string
          old_value?: string | null
          new_value?: string | null
          change_origin?: string
          changed_at?: string
        }
        Relationships: []
      }
      episode_drafts: {
        Row: {
          id: string
          user_id: string
          idea_principal: string | null
          tono: string | null
          restricciones: string | null
          release_date: string | null
          conflict_options_json: Json | null
          selected_conflicto: Json | null
          selected_intencion: Json | null
          step: number | null
          converted_to_episode_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          idea_principal?: string | null
          tono?: string | null
          restricciones?: string | null
          release_date?: string | null
          conflict_options_json?: Json | null
          selected_conflicto?: Json | null
          selected_intencion?: Json | null
          step?: number | null
          converted_to_episode_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          idea_principal?: string | null
          tono?: string | null
          restricciones?: string | null
          release_date?: string | null
          conflict_options_json?: Json | null
          selected_conflicto?: Json | null
          selected_intencion?: Json | null
          step?: number | null
          converted_to_episode_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
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
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "episodes"
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
            foreignKeyName: "briefs_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "briefs_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
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
          token_expiry?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publications_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "content_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_candidates: {
        Row: {
          approval_required: boolean | null
          asset_id: string | null
          assigned_format: string | null
          clarity: number | null
          created_at: string
          emotional_intensity: number | null
          episode_id: string
          id: string
          memorability: number | null
          quote_type: string | null
          saveability: number | null
          score_total: number | null
          shareability: number | null
          status: string | null
          text: string
          timestamp_ref: string | null
          updated_at: string
          user_id: string
          visual_fit: number | null
        }
        Insert: {
          approval_required?: boolean | null
          asset_id?: string | null
          assigned_format?: string | null
          clarity?: number | null
          created_at?: string
          emotional_intensity?: number | null
          episode_id: string
          id?: string
          memorability?: number | null
          quote_type?: string | null
          saveability?: number | null
          shareability?: number | null
          status?: string | null
          text: string
          timestamp_ref?: string | null
          updated_at?: string
          user_id: string
          visual_fit?: number | null
        }
        Update: {
          approval_required?: boolean | null
          asset_id?: string | null
          assigned_format?: string | null
          clarity?: number | null
          created_at?: string
          emotional_intensity?: number | null
          episode_id?: string
          id?: string
          memorability?: number | null
          quote_type?: string | null
          saveability?: number | null
          shareability?: number | null
          status?: string | null
          text?: string
          timestamp_ref?: string | null
          updated_at?: string
          user_id?: string
          visual_fit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_candidates_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_candidates_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "content_assets"
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
  public: {
    Enums: {},
  },
} as const
