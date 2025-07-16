// Хук для работы с профессиями
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ProfessionTemplate } from '../types/database'

export const useProfessions = (sectionId?: string) => {
  const [professions, setProfessions] = useState<ProfessionTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfessions = async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('profession_templates')
        .select('*')
        .eq('is_active', true)

      // Если указан section_id, фильтруем по участку
      if (sectionId) {
        query = query.eq('section_id', sectionId)
      }

      const { data, error: fetchError } = await query.order('name')

      if (fetchError) {
        throw fetchError
      }

      setProfessions(data || [])
    } catch (err) {
      console.error('Ошибка при загрузке профессий:', err)
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfessions()
  }, [sectionId])

  return {
    professions,
    loading,
    error,
    fetchProfessions
  }
}