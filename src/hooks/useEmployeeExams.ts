// Хук для работы с экзаменами сотрудников
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { EmployeeExamWithDetails } from '../types/database'

export const useEmployeeExams = (employeeId?: string) => {
  const [exams, setExams] = useState<EmployeeExamWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEmployeeExams = async () => {
    if (!employeeId) {
      setExams([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('employee_exams')
        .select(`
          *,
          exams!inner(name, periodicity)
        `)
        .eq('employee_id', employeeId)

      if (fetchError) {
        throw fetchError
      }

      // Определяем статус каждого экзамена
      const examsWithStatus: EmployeeExamWithDetails[] = (data || []).map(exam => {
        const examDate = new Date(exam.exam_date)
        const now = new Date()
        const daysDiff = Math.ceil((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        
        let status: 'overdue' | 'upcoming' | 'pending' | 'normal'
        let color_indicator: 'red' | 'yellow' | 'blue' | 'green'

        if (exam.pending_date) {
          status = 'pending'
          color_indicator = 'blue'
        } else if (daysDiff < 0) {
          status = 'overdue'
          color_indicator = 'red'
        } else if (daysDiff <= 30) {
          status = 'upcoming'
          color_indicator = 'yellow'
        } else {
          status = 'normal'
          color_indicator = 'green'
        }

        return {
          ...exam,
          exam_name: exam.exams?.name || '',
          status,
          color_indicator
        }
      })

      setExams(examsWithStatus)
    } catch (err) {
      console.error('Ошибка при загрузке экзаменов сотрудника:', err)
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
    } finally {
      setLoading(false)
    }
  }

  const updateExamDate = async (examId: string, newDate: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('employee_exams')
        .update({ 
          exam_date: newDate,
          updated_by: userId,
          updated_at: new Date().toISOString(),
          pending_date: null,
          pending_until: null
        })
        .eq('id', examId)

      if (error) {
        throw error
      }

      await fetchEmployeeExams()
      return { success: true }
    } catch (error) {
      console.error('Ошибка при обновлении даты экзамена:', error)
      throw error
    }
  }

  const requestExamDateChange = async (examId: string, newDate: string, userId: string) => {
    try {
      // Устанавливаем pending дату для согласования
      const pendingUntil = new Date()
      pendingUntil.setDate(pendingUntil.getDate() + 7) // 7 дней на согласование

      const { error } = await supabase
        .from('employee_exams')
        .update({ 
          pending_date: newDate,
          pending_until: pendingUntil.toISOString(),
          updated_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', examId)

      if (error) {
        throw error
      }

      await fetchEmployeeExams()
      return { success: true }
    } catch (error) {
      console.error('Ошибка при запросе изменения даты экзамена:', error)
      throw error
    }
  }

  useEffect(() => {
    fetchEmployeeExams()
  }, [employeeId])

  return {
    exams,
    loading,
    error,
    fetchEmployeeExams,
    updateExamDate,
    requestExamDateChange
  }
}