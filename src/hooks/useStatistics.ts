import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export interface SectionStatistics {
  section_id: string
  section_name: string
  total_employees: number
  overdue_exams: number
  upcoming_exams: number
  pending_changes: number
}

export interface OverallStatistics {
  total_sections: number
  total_employees: number
  total_overdue: number
  total_upcoming: number
  total_pending: number
}

export interface ExamNotification {
  id: string
  employee_name: string
  exam_name: string
  section_name: string
  profession_name: string
  exam_date: string
  next_exam_date: string
  status: 'overdue' | 'upcoming' | 'pending'
  color_indicator: 'red' | 'yellow' | 'blue' | 'green'
  days_overdue?: number
  days_until?: number
}

export const useStatistics = () => {
  const { user } = useAuth()
  const [sectionStats, setSectionStats] = useState<SectionStatistics[]>([])
  const [overallStats, setOverallStats] = useState<OverallStatistics | null>(null)
  const [notifications, setNotifications] = useState<ExamNotification[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadStatistics = async () => {
    try {
      setLoading(true)
      setError(null)

      // Получаем список участков
      let sectionsQuery = supabase
        .from('sections')
        .select('id, name')
        .eq('is_active', true)

      // Если пользователь - начальник участка, показываем только его участок
      if (user?.role === 'section_chief' && user?.section_id) {
        sectionsQuery = sectionsQuery.eq('id', user.section_id)
      }

      const { data: sections, error: sectionsError } = await sectionsQuery

      if (sectionsError) throw sectionsError

      const sectionStatistics: SectionStatistics[] = []
      let totalEmployees = 0
      let totalOverdue = 0
      let totalUpcoming = 0
      let totalPending = 0

      // Для каждого участка получаем статистику
      for (const section of sections) {
        const { data: stats, error: statsError } = await supabase
          .rpc('get_section_statistics', { section_uuid: section.id })

        if (statsError) {
          console.error('Error getting section statistics:', statsError)
          continue
        }

        if (stats && stats.length > 0) {
          const stat = stats[0]
          sectionStatistics.push({
            section_id: section.id,
            section_name: section.name,
            total_employees: stat.total_employees || 0,
            overdue_exams: stat.overdue_exams || 0,
            upcoming_exams: stat.upcoming_exams || 0,
            pending_changes: stat.pending_changes || 0
          })

          totalEmployees += stat.total_employees || 0
          totalOverdue += stat.overdue_exams || 0
          totalUpcoming += stat.upcoming_exams || 0
          totalPending += stat.pending_changes || 0
        }
      }

      setSectionStats(sectionStatistics)
      setOverallStats({
        total_sections: sections.length,
        total_employees: totalEmployees,
        total_overdue: totalOverdue,
        total_upcoming: totalUpcoming,
        total_pending: totalPending
      })

    } catch (error) {
      console.error('Error loading statistics:', error)
      setError('Ошибка загрузки статистики')
    } finally {
      setLoading(false)
    }
  }

  const loadNotifications = async () => {
    try {
      setLoading(true)
      setError(null)

      // Получаем данные из представления exam_status_view
      let query = supabase
        .from('exam_status_view')
        .select('*')
        .in('status', ['overdue', 'upcoming', 'pending'])
        .order('next_exam_date', { ascending: true })

      const { data, error: queryError } = await query

      if (queryError) throw queryError

      // Обрабатываем данные и добавляем расчеты дней
      const processedNotifications = data?.map(notification => {
        const nextExamDate = new Date(notification.next_exam_date)
        const today = new Date()
        const diffTime = nextExamDate.getTime() - today.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        return {
          ...notification,
          days_overdue: diffDays < 0 ? Math.abs(diffDays) : undefined,
          days_until: diffDays > 0 ? diffDays : undefined
        }
      }) || []

      setNotifications(processedNotifications)

    } catch (error) {
      console.error('Error loading notifications:', error)
      setError('Ошибка загрузки уведомлений')
    } finally {
      setLoading(false)
    }
  }

  const refreshData = async () => {
    await Promise.all([loadStatistics(), loadNotifications()])
  }

  useEffect(() => {
    if (user) {
      refreshData()
    }
  }, [user])

  return {
    sectionStats,
    overallStats,
    notifications,
    loading,
    error,
    refreshData,
    loadStatistics,
    loadNotifications
  }
}