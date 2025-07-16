// Хук для работы с экзаменами
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Exam } from '../types/database'

export const useExams = () => {
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchExams = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('exams')
        .select('*')
        .order('name')

      if (fetchError) {
        throw fetchError
      }

      setExams(data || [])
    } catch (err) {
      console.error('Ошибка при загрузке экзаменов:', err)
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
    } finally {
      setLoading(false)
    }
  }

  const createExam = async (examData: {
    name: string
    periodicity: number
  }) => {
    try {
      const { data, error } = await supabase
        .from('exams')
        .insert([examData])
        .select()
        .single()

      if (error) {
        throw error
      }

      return { success: true, exam: data }
    } catch (error) {
      console.error('Ошибка при создании экзамена:', error)
      throw error
    }
  }

  const updateExam = async (examId: string, updates: {
    name?: string
    periodicity?: number
  }) => {
    try {
      const { error } = await supabase
        .from('exams')
        .update(updates)
        .eq('id', examId)

      if (error) {
        throw error
      }

      return { success: true }
    } catch (error) {
      console.error('Ошибка при обновлении экзамена:', error)
      throw error
    }
  }

  const deleteExam = async (examId: string) => {
    try {
      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', examId)

      if (error) {
        throw error
      }

      return { success: true }
    } catch (error) {
      console.error('Ошибка при удалении экзамена:', error)
      throw error
    }
  }

  useEffect(() => {
    fetchExams()
  }, [])

  return {
    exams,
    loading,
    error,
    fetchExams,
    createExam,
    updateExam,
    deleteExam
  }
}