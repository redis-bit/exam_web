import React, { useState, useEffect } from 'react'
import { EmployeeWithDetails, EmployeeExamWithDetails } from '../../types/database'
import { supabase } from '../../lib/supabase'
import './ExamManagement.css'

interface ExamManagementProps {
  employee: EmployeeWithDetails
  onClose: () => void
  onUpdate: () => void
}

const ExamManagement: React.FC<ExamManagementProps> = ({
  employee,
  onClose,
  onUpdate
}) => {
  const [exams, setExams] = useState<EmployeeExamWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadEmployeeExams()
  }, [employee.id])

  const loadEmployeeExams = async () => {
    try {
      setLoading(true)
      setError(null)

      // Сначала пробуем загрузить через представление
      let data, fetchError

      try {
        const result = await supabase
          .from('exam_status_view')
          .select(`
            id,
            employee_id,
            exam_id,
            employee_name,
            exam_name,
            exam_date,
            next_exam_date,
            pending_date,
            pending_until,
            updated_by,
            updated_at,
            section_name,
            profession_name,
            status,
            color_indicator
          `)
          .eq('employee_id', employee.id)
          .order('exam_name')

        data = result.data
        fetchError = result.error
      } catch (viewError) {
        console.log('Представление недоступно, используем прямой запрос:', viewError)
        
        // Альтернативный способ - упрощенный запрос
        const result = await supabase
          .from('employee_exams')
          .select(`
            id,
            employee_id,
            exam_id,
            exam_date,
            next_exam_date,
            pending_date,
            pending_until,
            updated_by,
            updated_at,
            exams(name)
          `)
          .eq('employee_id', employee.id)

        if (result.error) throw result.error

        // Преобразуем данные из прямого запроса
        data = result.data?.map((exam: any) => {
          const today = new Date()
          const nextExamDate = exam.next_exam_date ? new Date(exam.next_exam_date) : null
          
          let status = 'normal'
          let color_indicator = 'green'
          
          if (exam.pending_date) {
            status = 'pending'
            color_indicator = 'blue'
          } else if (nextExamDate && nextExamDate < today) {
            status = 'overdue'
            color_indicator = 'red'
          } else if (nextExamDate && nextExamDate <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)) {
            status = 'upcoming'
            color_indicator = 'yellow'
          }

          return {
            id: exam.id,
            employee_id: exam.employee_id,
            exam_id: exam.exam_id,
            employee_name: employee.full_name, // Используем данные из props
            exam_name: exam.exams?.name || 'Неизвестный экзамен',
            exam_date: exam.exam_date,
            next_exam_date: exam.next_exam_date,
            pending_date: exam.pending_date,
            pending_until: exam.pending_until,
            updated_by: exam.updated_by,
            updated_at: exam.updated_at,
            section_name: employee.section_name, // Используем данные из props
            profession_name: employee.profession_name, // Используем данные из props
            status,
            color_indicator
          }
        }) || []
      }

      if (fetchError) throw fetchError

      // Преобразуем данные в нужный формат (для представления)
      const examDetails: EmployeeExamWithDetails[] = data?.map(exam => ({
        id: exam.id,
        employee_id: exam.employee_id,
        exam_id: exam.exam_id,
        exam_date: exam.exam_date,
        next_exam_date: exam.next_exam_date,
        updated_by: exam.updated_by,
        updated_at: exam.updated_at,
        pending_date: exam.pending_date,
        pending_until: exam.pending_until,
        exam_name: exam.exam_name,
        status: exam.status,
        color_indicator: exam.color_indicator
      })) || []

      setExams(examDetails)
    } catch (err) {
      console.error('Ошибка загрузки экзаменов:', err)
      setError('Ошибка загрузки экзаменов работника')
    } finally {
      setLoading(false)
    }
  }

  const updateExamDate = async (examId: string, newDate: string) => {
    try {
      setSaving(true)
      setError(null)

      const { error: updateError } = await supabase
        .from('employee_exams')
        .update({
          exam_date: newDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', examId)

      if (updateError) throw updateError

      // Перезагружаем экзамены
      await loadEmployeeExams()
      onUpdate() // Обновляем родительский компонент

    } catch (err) {
      console.error('Ошибка обновления даты экзамена:', err)
      setError('Ошибка при обновлении даты экзамена')
    } finally {
      setSaving(false)
    }
  }

  const getStatusBadge = (status: string, colorIndicator: string) => {
    const statusText = {
      'overdue': 'Просрочен',
      'upcoming': 'Предстоящий',
      'pending': 'Ожидает',
      'normal': 'Нормально'
    }

    const colorClass = {
      'red': 'status-overdue',
      'yellow': 'status-upcoming',
      'blue': 'status-pending',
      'green': 'status-normal'
    }

    return (
      <span className={`status-badge ${colorClass[colorIndicator as keyof typeof colorClass]}`}>
        {statusText[status as keyof typeof statusText] || status}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU')
  }

  if (loading) {
    return (
      <div className="exam-management-modal">
        <div className="exam-management-content">
          <div className="loading">Загрузка экзаменов...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="exam-management-modal">
      <div className="exam-management-content">
        <div className="exam-management-header">
          <h3>Управление экзаменами</h3>
          <div className="employee-info">
            <strong>{employee.full_name}</strong>
            <span className="employee-details">
              {employee.profession_name} • {employee.section_name}
            </span>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="exams-list">
          {exams.length === 0 ? (
            <div className="no-exams">
              У работника нет назначенных экзаменов
            </div>
          ) : (
            <div className="exams-table">
              <div className="table-header">
                <div>Экзамен</div>
                <div>Последняя дата</div>
                <div>Следующая дата</div>
                <div>Статус</div>
                <div>Действия</div>
              </div>
              
              {exams.map((exam) => (
                <div key={exam.id} className="table-row">
                  <div className="exam-name">{exam.exam_name}</div>
                  
                  <div className="exam-date">
                    <input
                      type="date"
                      value={exam.exam_date}
                      onChange={(e) => updateExamDate(exam.id, e.target.value)}
                      disabled={saving}
                      className="date-input"
                    />
                  </div>
                  
                  <div className="next-date">
                    {exam.next_exam_date ? formatDate(exam.next_exam_date) : '—'}
                  </div>
                  
                  <div className="exam-status">
                    {getStatusBadge(exam.status, exam.color_indicator)}
                  </div>
                  
                  <div className="exam-actions">
                    <button
                      onClick={() => updateExamDate(exam.id, new Date().toISOString().split('T')[0])}
                      disabled={saving}
                      className="btn btn-sm btn-success"
                      title="Установить сегодняшнюю дату"
                    >
                      Сегодня
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="exam-management-footer">
          <button onClick={onClose} className="btn btn-secondary">
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExamManagement