import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Типы для базы данных
export interface Database {
  public: {
    Tables: {
      sections: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string | null
          is_active: boolean
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          updated_at?: string | null
          is_active?: boolean
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          updated_at?: string | null
          is_active?: boolean
        }
      }
      users: {
        Row: {
          id: string
          full_name: string
          email: string
          section_id: string
          role: 'admin' | 'admin_assistant' | 'section_chief'
          created_at: string
          last_action_at: string | null
          last_visit_at: string | null
          is_active: boolean
          activity_rating: number
        }
        Insert: {
          id?: string
          full_name: string
          email: string
          section_id: string
          role: 'admin' | 'admin_assistant' | 'section_chief'
          created_at?: string
          last_action_at?: string | null
          last_visit_at?: string | null
          is_active?: boolean
          activity_rating?: number
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          section_id?: string
          role?: 'admin' | 'admin_assistant' | 'section_chief'
          created_at?: string
          last_action_at?: string | null
          last_visit_at?: string | null
          is_active?: boolean
          activity_rating?: number
        }
      }
      // Добавим остальные типы по мере создания таблиц
    }
  }
}