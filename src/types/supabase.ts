export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'teacher' | 'student'
          display_name: string | null
          avatar_url: string | null
          typing_history: Json
          login_id: string | null
          updated_at: string
          created_at: string
        }
        Insert: {
          id: string
          role?: 'teacher' | 'student'
          display_name?: string | null
          avatar_url?: string | null
          typing_history?: Json
          login_id?: string | null
          updated_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          role?: 'teacher' | 'student'
          display_name?: string | null
          avatar_url?: string | null
          typing_history?: Json
          login_id?: string | null
          updated_at?: string
          created_at?: string
        }
        Relationships: []
      }
      cards: {
        Row: {
          id: string
          student_id: string
          title: string
          description: string | null
          image_path: string
          rarity: string
          is_opened: boolean
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          title: string
          description?: string | null
          image_path: string
          rarity: string
          is_opened?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          title?: string
          description?: string | null
          image_path?: string
          rarity?: string
          is_opened?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'cards_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      minecraft_works: {
        Row: {
          id: string
          student_id: string
          title: string
          description: string | null
          model_path: string | null
          screenshot_path: string | null
          make_code_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          title: string
          description?: string | null
          model_path?: string | null
          screenshot_path?: string | null
          make_code_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          title?: string
          description?: string | null
          model_path?: string | null
          screenshot_path?: string | null
          make_code_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'minecraft_works_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
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
