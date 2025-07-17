import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import './StatisticsOverview.css'

interface SectionStatistics {
  section_id: string
  section_name: string
  total_employees: number
  overdue_exams: number
  upcoming_exams: number
  pending_changes: number
}

interface OverallStatistics {
  total_sections: number
  total_employees: number
  total_overdue: number
  total_upcoming: number
  total_pending: number
}

const StatisticsOverview: React.FC = () => {
  const { user } = useAuth()
  const [sectionStats, setSectionStats] = useState<SectionStatistics[]>([])
  const [overallStats, setOverallStats] = useState<OverallStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadStatistics()
  }, [user])

  const loadStatistics = async () => {
    try {
      setLoading(true)
      setError(null)

      // Получаем статистику по участкам
      const { data: sections, error: sectionsError } = await supabase
        .from('sections')
        .select('id, name')
        .eq('is_active', true)

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

  const getStatusColor = (type: 'overdue' | 'upcoming' | 'pending' | 'normal') => {
    switch (type) {
      case 'overdue': return 'red'
      case 'upcoming': return 'yellow'
      case 'pending': return 'blue'
      default: return 'green'
    }
  }

  if (loading) {
    return <div className="statistics-loading">Загрузка статистики...</div>
  }

  if (error) {
    return <div className="statistics-error">{error}</div>
  }

  return (
    <div className="statistics-overview">
      <h2>📊 Статистика и аналитика</h2>
      
      {/* Общая статистика */}
      {overallStats && (
        <div className="overall-stats">
          <h3>Общая статистика</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{overallStats.total_sections}</div>
              <div className="stat-label">Участков</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{overallStats.total_employees}</div>
              <div className="stat-label">Работников</div>
            </div>
            <div className="stat-card critical">
              <div className="stat-number">{overallStats.total_overdue}</div>
              <div className="stat-label">Просроченных экзаменов</div>
            </div>
            <div className="stat-card warning">
              <div className="stat-number">{overallStats.total_upcoming}</div>
              <div className="stat-label">Предстоящих экзаменов</div>
            </div>
            <div className="stat-card info">
              <div className="stat-number">{overallStats.total_pending}</div>
              <div className="stat-label">Ожидающих подтверждения</div>
            </div>
          </div>
        </div>
      )}

      {/* Статистика по участкам */}
      <div className="section-stats">
        <h3>Статистика по участкам</h3>
        <div className="section-stats-table">
          <div className="table-header">
            <div>Участок</div>
            <div>Работников</div>
            <div>Просрочено</div>
            <div>Предстоящие</div>
            <div>Ожидают</div>
            <div>Статус</div>
          </div>
          {sectionStats.map((stat) => {
            const criticalIssues = stat.overdue_exams > 0
            const hasWarnings = stat.upcoming_exams > 0
            const hasPending = stat.pending_changes > 0
            
            let statusClass = 'status-good'
            let statusText = 'Хорошо'
            
            if (criticalIssues) {
              statusClass = 'status-critical'
              statusText = 'Критично'
            } else if (hasWarnings) {
              statusClass = 'status-warning'
              statusText = 'Внимание'
            } else if (hasPending) {
              statusClass = 'status-info'
              statusText = 'Ожидание'
            }

            return (
              <div key={stat.section_id} className="table-row">
                <div className="section-name">{stat.section_name}</div>
                <div>{stat.total_employees}</div>
                <div className={stat.overdue_exams > 0 ? 'critical' : ''}>
                  {stat.overdue_exams}
                </div>
                <div className={stat.upcoming_exams > 0 ? 'warning' : ''}>
                  {stat.upcoming_exams}
                </div>
                <div className={stat.pending_changes > 0 ? 'info' : ''}>
                  {stat.pending_changes}
                </div>
                <div className={`status ${statusClass}`}>
                  {statusText}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Кнопка обновления */}
      <div className="statistics-actions">
        <button onClick={loadStatistics} className="refresh-btn">
          🔄 Обновить статистику
        </button>
      </div>
    </div>
  )
}

export default StatisticsOverview