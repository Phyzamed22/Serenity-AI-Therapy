export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      therapy_sessions: {
        Row: {
          id: string
          user_id: string
          title: string
          started_at: string
          ended_at: string | null
          summary: string | null
          overall_mood: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string
          started_at?: string
          ended_at?: string | null
          summary?: string | null
          overall_mood?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          started_at?: string
          ended_at?: string | null
          summary?: string | null
          overall_mood?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          session_id: string
          role: "user" | "assistant"
          content: string
          detected_emotion: string | null
          emotion_confidence: number | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          role: "user" | "assistant"
          content: string
          detected_emotion?: string | null
          emotion_confidence?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          role?: "user" | "assistant"
          content?: string
          detected_emotion?: string | null
          emotion_confidence?: number | null
          created_at?: string
        }
      }
      emotion_data: {
        Row: {
          id: string
          session_id: string
          timestamp: string
          primary_emotion: string
          happy: number
          sad: number
          angry: number
          anxious: number
          neutral: number
          source: "facial" | "voice" | "text" | "combined"
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          timestamp?: string
          primary_emotion: string
          happy?: number
          sad?: number
          angry?: number
          anxious?: number
          neutral?: number
          source: "facial" | "voice" | "text" | "combined"
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          timestamp?: string
          primary_emotion?: string
          happy?: number
          sad?: number
          angry?: number
          anxious?: number
          neutral?: number
          source?: "facial" | "voice" | "text" | "combined"
          created_at?: string
        }
      }
      user_settings: {
        Row: {
          user_id: string
          theme: string
          voice_enabled: boolean
          webcam_enabled: boolean
          data_retention_days: number
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          theme?: string
          voice_enabled?: boolean
          webcam_enabled?: boolean
          data_retention_days?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          theme?: string
          voice_enabled?: boolean
          webcam_enabled?: boolean
          data_retention_days?: number
          created_at?: string
          updated_at?: string
        }
      }
      therapist_settings: {
        Row: {
          user_id: string
          humor_level: number
          seriousness_level: number
          emotional_expressiveness: number
          empathy_level: number
          directiveness: number
          preferred_model: string
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          humor_level?: number
          seriousness_level?: number
          emotional_expressiveness?: number
          empathy_level?: number
          directiveness?: number
          preferred_model?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          humor_level?: number
          seriousness_level?: number
          emotional_expressiveness?: number
          empathy_level?: number
          directiveness?: number
          preferred_model?: string
          created_at?: string
          updated_at?: string
        }
      }
      session_memory: {
        Row: {
          session_id: string
          user_id: string
          summary: string | null
          key_insights: Json | null
          emotional_journey: Json | null
          therapy_insights: Json | null
          identified_patterns: Json | null
          coping_strategies: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          session_id: string
          user_id: string
          summary?: string | null
          key_insights?: Json | null
          emotional_journey?: Json | null
          therapy_insights?: Json | null
          identified_patterns?: Json | null
          coping_strategies?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          session_id?: string
          user_id?: string
          summary?: string | null
          key_insights?: Json | null
          emotional_journey?: Json | null
          therapy_insights?: Json | null
          identified_patterns?: Json | null
          coping_strategies?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      therapy_preferences: {
        Row: {
          user_id: string
          preferred_style: string
          communication_preference: string
          topics_to_avoid: string[]
          helpful_approaches: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          preferred_style?: string
          communication_preference?: string
          topics_to_avoid?: string[]
          helpful_approaches?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          preferred_style?: string
          communication_preference?: string
          topics_to_avoid?: string[]
          helpful_approaches?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      emotional_trends: {
        Row: {
          id: string
          user_id: string
          date: string
          dominant_emotion: string
          emotion_intensity: number
          triggers: string[]
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          dominant_emotion: string
          emotion_intensity: number
          triggers?: string[]
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          dominant_emotion?: string
          emotion_intensity?: number
          triggers?: string[]
          notes?: string | null
          created_at?: string
        }
      }
    }
  }
}
