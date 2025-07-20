import React, { useState, useEffect } from 'react'
import { EmployeeWithDetails, EmployeeExamWithDetails } from '../../types/database'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useNotifications } from '../../hooks/useNotifications'
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
  const { user } = useAuth()
  const { requestExamDateChange } = useNotifications()
  const [exams, setExams] = useState<EmployeeExamWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dateInputFocused, setDateInputFocused] = useState<string | null>(null)

  useEffect(() => {
    loadEmployeeExams()
  }, [employee.id])

  const loadEmployeeExams = async () => {
    try {
      setLoading(true)
      setError(null)

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
            section_name,
            profession_name,
            status,
            color_indicator
          `)
          .eq('employee_id', employee.id)

        data = result.data
        fetchError = result.error
      } catch (viewError) {
        console.log('View not available, using fallback query')
        
        const result = await supabase
          .from('employee_exams')
          .select(`
            id,
            employee_id,
            exam_id,
            exam_date,
            next_exam_date,
            pending_date,
            exams!inner(name)
          `)
          .eq('employee_id', employee.id)
          .order('exam_date')

        if (result.data) {
          data = result.data.map(exam => {
            const examDate = new Date(exam.exam_date)
            const nextExamDate = exam.next_exam_date ? new Date(exam.next_exam_date) : null
            
            let status = 'normal'
            let color_indicator = 'green'
            
            if (exam.pending_date) {
              status = 'pending'
              color_indicator = 'blue'
            } else if (nextExamDate && nextExamDate < new Date()) {
              status = 'overdue'
              color_indicator = 'red'
            } else if (nextExamDate && nextExamDate <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
              status = 'upcoming'
              color_indicator = 'yellow'
            }

            return {
              id: exam.id,
              employee_id: exam.employee_id,
              exam_id: exam.exam_id,
              exam_name: (exam.exams as any).name,
              exam_date: exam.exam_date,
              next_exam_date: exam.next_exam_date,
              pending_date: exam.pending_date,
              updated_by: null,
              updated_at: new Date().toISOString(),
              pending_until: null,
              status: status as 'pending' | 'normal' | 'overdue' | 'upcoming',
              color_indicator: color_indicator as 'red' | 'yellow' | 'blue' | 'green'
            }
          })
        }

        fetchError = result.error
      }

      if (fetchError) {
        throw fetchError
      }

      const processedExams = (data || []).map(exam => ({
        ...exam,
        exam_date: exam.exam_date,
        next_exam_date: exam.next_exam_date,
        pending_date: exam.pending_date,
        updated_by: (exam as any).updated_by || null,
        updated_at: (exam as any).updated_at || new Date().toISOString(),
        pending_until: (exam as any).pending_until || null,
        status: exam.status as 'pending' | 'normal' | 'overdue' | 'upcoming',
        color_indicator: exam.color_indicator as 'red' | 'yellow' | 'blue' | 'green'
      })) as EmployeeExamWithDetails[]

      setExams(processedExams)
    } catch (err) {
      console.error('Ошибка при загрузке экзаменов:', err)
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
    } finally {
      setLoading(false)
    }
  }

  const updateExamDate = async (examId: string, newDate: string) => {
    try {
      setSaving(true)
      setError(null)

      const examRecord = exams.find(exam => exam.exam_id === examId)
      if (!examRecord) {
        throw new Error('Экзамен не найден')
      }

      const isAdmin = user && ['admin', 'admin_assistant'].includes(user.role)

      if (isAdmin) {
        console.log('Admin updating exam date directly')
        
        const { error: updateError } = await supabase
          .from('employee_exams')
          .update({ 
            exam_date: newDate,
            pending_date: null,
            pending_until: null,
            updated_by: user.id
          })
          .eq('employee_id', employee.id)
          .eq('exam_id', examId)

        if (updateError) {
          throw updateError
        }

        alert('Дата экзамена успешно обновлена')
      } else {
        console.log('Regular user requesting exam date change')
        console.log('Debug - examRecord:', examRecord)
        console.log('Debug - employee.id:', employee.id)
        console.log('Debug - examRecord.exam_id:', examRecord.exam_id)
        console.log('Debug - newDate:', newDate)
        
        const result = await requestExamDateChange(
          employee.id,
          examRecord.exam_id,
          newDate
        )

        if (result?.success) {
          alert('Запрос на изменение даты экзамена отправлен администратору')
        } else {
          throw new Error(result?.error || 'Ошибка при отправке запроса')
        }
      }

      await loadEmployeeExams()
      onUpdate()
    } catch (err) {
      console.error('Ошибка при обновлении даты экзамена:', err)
      alert('Ошибка при обновлении даты экзамена: ' + (err instanceof Error ? err.message : 'Неизвестная ошибка'))
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '—'
    const date = new Date(dateString)
    return date.toLocaleDateString('ru-RU')
  }

  const getStatusBadge = (status: string, colorIndicator: string) => {
    const statusMap = {
      'pending': { text: 'Ожидает', color: '#007bff' },
      'overdue': { text: 'Просрочен', color: '#dc3545' },
      'upcoming': { text: 'Скоро', color: '#ffc107' },
      'normal': { text: 'Норма', color: '#28a745' }
    }

    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.normal

    return (
      <span style={{
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 'bold',
        color: 'white',
        backgroundColor: statusInfo.color
      }}>
        {statusInfo.text}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="exam-management-overlay">
        <div className="exam-management-modal">
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div>Загрузка экзаменов...</div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="exam-management-overlay">
        <div className="exam-management-modal">
          <div className="exam-management-header">
            <h2>Ошибка</h2>
            <button onClick={onClose} className="close-button">×</button>
          </div>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ color: '#dc3545', marginBottom: '20px' }}>
              {error}
            </div>
            <button onClick={loadEmployeeExams} className="btn btn-primary">
              Попробовать снова
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="exam-management-overlay">
      <div className="exam-management-modal">
        <div className="exam-management-header">
          <h2>Управление экзаменами: {employee.full_name}</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        <div className="exam-management-content">
          {exams.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              У работника нет назначенных экзаменов
            </div>
          ) : (
            <div className="exams-list">
              {exams.map((exam) => (
                <div key={exam.id} className="exam-item">
                  <div className="exam-name">
                    <strong>{exam.exam_name}</strong>
                  </div>
                  
                  <div className="exam-date">
                    <div style={{fontSize: '10px', color: 'gray', marginBottom: '2px'}}>
                      ID: {exam.id} | Date: {exam.exam_date} | Status: {exam.status}
                    </div>
                    <input
                      type="date"
                      defaultValue={exam.exam_date || ''}
                      key={`${exam.id}-${exam.exam_date}`}
                      data-exam-id={exam.exam_id}
                      onFocus={() => {
                        console.log('Date input focused for exam:', exam.exam_name)
                        setDateInputFocused(exam.exam_id)
                      }}
                      onChange={(e) => {
                        const newDate = e.target.value
                        const currentDate = exam.exam_date
                        
                        console.log('Date input changed:', {
                          newDate,
                          currentDate,
                          examName: exam.exam_name,
                          isRealChange: newDate !== currentDate && newDate !== ''
                        })
                        
                        // НЕ отправляем запрос автоматически при изменении
                        // Пользователь должен сам подтвердить выбор
                      }}
                      onBlur={(e) => {
                        const newDate = e.target.value
                        const currentDate = exam.exam_date
                        
                        // Отправляем запрос только при потере фокуса (когда пользователь закончил выбор)
                        if (newDate && newDate !== currentDate) {
                          console.log('Date confirmed on blur:', {
                            examId: exam.exam_id,
                            newDate,
                            oldDate: currentDate
                          })
                          updateExamDate(exam.exam_id, newDate)
                        }
                        setDateInputFocused(null)
                      }}
                      disabled={saving || exam.status === 'pending' || !!exam.pending_date}
                      title={exam.status === 'pending' || exam.pending_date ? 'Редактирование заблокировано - ожидает подтверждения' : 'Выберите дату сдачи экзамена - запрос отправится автоматически'}
                      style={{
                        opacity: (exam.status === 'pending' || exam.pending_date) ? 0.6 : 1,
                        cursor: (exam.status === 'pending' || exam.pending_date) ? 'not-allowed' : 'pointer'
                      }}
                    />
                  </div>
                  
                  <div className="exam-next-date">
                    <small>Следующий экзамен:</small><br />
                    {exam.next_exam_date ? formatDate(exam.next_exam_date) : '—'}
                  </div>
                  
                  <div className="exam-status">
                    {getStatusBadge(exam.status, exam.color_indicator)}
                  </div>
                  
                  <div className="exam-actions">
                    <button
                      onClick={() => updateExamDate(exam.exam_id, new Date().toISOString().split('T')[0])}
                      disabled={saving || exam.status === 'pending' || !!exam.pending_date}
                      className="btn btn-sm btn-success"
                      title={(exam.status === 'pending' || exam.pending_date) ? 'Редактирование заблокировано - ожидает подтверждения' : 'Установить сегодняшнюю дату'}
                    >
                      Сегодня
                    </button>
                    {user && ['admin', 'admin_assistant'].includes(user.role) && (
                      <button
                        onClick={() => {
                          console.log('Force refresh exam data for:', exam.exam_name)
                          loadEmployeeExams()
                        }}
                        className="btn btn-sm btn-secondary"
                        style={{marginLeft: '5px'}}
                        title="Принудительно обновить данные экзамена"
                      >
                        🔄
                      </button>
                    )}
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