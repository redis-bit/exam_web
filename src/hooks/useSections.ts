// Хук для работы с участками
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Section } from '../types/database'

export const useSections = () => {
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSections = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('sections')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (fetchError) {
        throw fetchError
      }

      setSections(data || [])
    } catch (err) {
      console.error('Ошибка при загрузке участков:', err)
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSections()
  }, [])

  return {
    sections,
    loading,
    error,
    fetchSections
  }
}