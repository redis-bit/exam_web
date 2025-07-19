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
            pending_until,
            updated_by,
            updated_at,
            status,
            color_indicator
          `)
          .eq('employee_id', employee.id)
          .order('exam_name')

        data = result.data
        fetchError = result.error
      } catch (viewError) {
        console.log('Представление недоступно, используем прямой запрос')
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
          .order('exam_date')

        data = result.data?.map((exam: any) => {
          const examDate = new Date(exam.exam_date)
          const nextExamDate = exam.next_exam_date ? new Date(exam.next_exam_date) : null
          const today = new Date()
          today.setHours(0, 0, 0, 0)

          if (exam.pending_date && exam.pending_date !== null) {
            return {
              id: exam.id,
              employee_id: exam.employee_id,
              exam_id: exam.exam_id,
              exam_name: exam.exams?.name || 'Неизвестный экзамен',
              exam_date: exam.exam_date,
              next_exam_date: exam.next_exam_date,
              pending_date: exam.pending_date,
              pending_until: exam.pending_until,
              updated_by: exam.updated_by,
              updated_at: exam.updated_at,
              status: 'pending' as const,
              color_indicator: 'blue' as const
            }
          }

          let status: 'overdue' | 'upcoming' | 'pending' | 'normal' = 'normal'
          let colorIndicator: 'red' | 'yellow' | 'blue' | 'green' = 'green'

          if (nextExamDate) {
            if (nextExamDate < today) {
              status = 'overdue'
              colorIndicator = 'red'
            } else if (nextExamDate <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)) {
              status = 'upcoming'
              colorIndicator = 'yellow'
            }
          }

          return {
            id: exam.id,
            employee_id: exam.employee_id,
            exam_id: exam.exam_id,
            exam_name: exam.exams?.name || 'Неизвестный экзамен',
            exam_date: exam.exam_date,
            next_exam_date: exam.next_exam_date,
            pending_date: exam.pending_date,
            pending_until: exam.pending_until,
            updated_by: exam.updated_by,
            updated_at: exam.updated_at,
            status,
            color_indicator: colorIndicator
          }
        })
        fetchError = result.error
      }

      if (fetchError) throw fetchError

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

  const updateExamDate = async (examIdOrEmployeeExamId: string, newDate: string) => {
    try {
      setSaving(true)
      setError(null)

      console.log('UPDATE EXAM DATE START')
      console.log('updateExamDate called:', {
        examIdOrEmployeeExamId,
        newDate,
        currentDate: new Date().toISOString().split('T')[0],
        userRole: user?.role
      })

      const examRecord = exams.find(e => e.exam_id === examIdOrEmployeeExamId)
      console.log('Found exam record:', examRecord)
      
      if (examRecord && (examRecord.status === 'pending' || examRecord.pending_date)) {
        alert('Редактирование заблокировано. Экзамен ожидает подтверждения администратора.')
        setSaving(false)
        return
      }

      const isAdmin = user && ['admin', 'admin_assistant'].includes(user.role)
      console.log('User is admin:', isAdmin)

      if (isAdmin) {
        if (!examRecord) {
          throw new Error('Запись экзамена не найдена')
        }

        console.log('ADMIN UPDATE PROCESS')
        console.log('Admin updating exam date:', { 
          examRecordId: examRecord.id, 
          oldDate: examRecord.exam_date,
          newDate: newDate 
        })
        
        const { data: updateResult, error: updateError } = await supabase
          .from('employee_exams')
          .update({
            exam_date: newDate,
            updated_by: user.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', examRecord.id)
          .select()

        if (updateError) {
          console.error('Database update error:', updateError)
          throw updateError
        }

        console.log('Database update result:', updateResult)
        console.log('Database update successful for date:', newDate)
        
        const { data: verifyData, error: verifyError } = await supabase
          .from('employee_exams')
          .select('exam_date')
          .eq('id', examRecord.id)
          .single()
        
        console.log('Verification query result:', { verifyData, verifyError })
        
        console.log('UPDATING LOCAL STATE')
        setExams(prev => {
          const updated = prev.map(e => 
            e.id === examRecord.id 
              ? { 
                  ...e, 
                  exam_date: newDate, 
                  status: 'normal' as const, 
                  color_indicator: 'green' as const, 
                  pending_date: null 
                }
              : e
          )
          console.log('Updated exams state:', updated.find(e => e.id === examRecord.id))
          return updated
        })
        
        alert('Дата экзамена успешно обновлена')
        
        setTimeout(() => {
          const dateInput = document.querySelector(`[data-exam-id="${examIdOrEmployeeExamId}"]`) as HTMLInputElement
          if (dateInput) {
            dateInput.value = newDate
            console.log('Force updated input field to:', newDate)
          }
        }, 100)
        
        console.log('SKIPPING onUpdate() TO PREVENT DATA RELOAD')
        console.log('UPDATE EXAM DATE END')
        return
        
      } else {
        const result = await requestExamDateChange(employee.id, examIdOrEmployeeExamId, newDate)
        
        if (result?.success) {
          alert('Запрос на изменение даты отправлен администратору на рассмотрение')
          setExams(prev => prev.map(e => 
            e.exam_id === examIdOrEmployeeExamId 
              ? { 
                  ...e, 
                  status: 'pending' as const, 
                  color_indicator: 'blue' as const, 
                  pending_date: newDate 
                }
              : e
          ))
          onUpdate()
          return
        } else {
          if (result?.error?.includes('не настроена')) {
            alert('Система подтверждений не настроена. Обратитесь к администратору.')
          } else {
            console.error('Детали ошибки:', result?.error)
            throw new Error(result?.error || 'Ошибка при отправке запроса')
          }
        }
      }

      await loadEmployeeExams()
      onUpdate()

    } catch (err: any) {
      console.error('UPDATE EXAM DATE ERROR', err)
      setSaving(false)
      
      let errorMessage = 'Ошибка при обновлении даты экзамена'
      if (err.message) {
        if (err.message.includes('foreign key')) {
          errorMessage = 'Ошибка: данные экзамена повреждены. Обратитесь к администратору для исправления базы данных.'
        } else {
          errorMessage = err.message
        }
      }
      setError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const getStatusBadge = (status: string, colorIndicator: string) => {
    const statusText = {
      'overdue': 'Просрочен',
      'upcoming': 'Скоро',
      'pending': 'Ожидает',
      'normal': 'Норма'
    }[status] || status

    return (
      <span className={`status-badge ${colorIndicator}`}>
        {statusText}
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
          <p>Работник: <strong>{employee.full_name}</strong></p>
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </div>

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
                          isRealChange: newDate !== currentDate && newDate !== '',
                          isFocused: dateInputFocused === exam.exam_id
                        })
                      }}
                      onBlur={(e) => {
                        const newDate = e.target.value
                        const currentDate = exam.exam_date
                        
                        console.log('Date input blur:', {
                          newDate,
                          currentDate,
                          examName: exam.exam_name,
                          willUpdate: newDate && newDate !== currentDate,
                          examRecord: exams.find(ex => ex.exam_id === exam.exam_id),
                          userRole: user?.role,
                          isAdmin: user && ['admin', 'admin_assistant'].includes(user.role)
                        })
                        
                        setDateInputFocused(null)
                        
                        const isAdmin = user && ['admin', 'admin_assistant'].includes(user.role)
                        if (isAdmin && newDate) {
                          console.log('ADMIN FORCE UPDATE - Starting for:', newDate)
                          updateExamDate(exam.exam_id, newDate)
                        } else if (newDate && newDate !== currentDate) {
                          console.log('NORMAL UPDATE - Starting for:', newDate)
                          updateExamDate(exam.exam_id, newDate)
                        } else {
                          console.log('NO UPDATE - Dates same or empty')
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const target = e.target as HTMLInputElement
                          const newDate = target.value
                          const currentDate = exam.exam_date
                          
                          console.log('Enter pressed on date input:', {
                            newDate,
                            currentDate,
                            examName: exam.exam_name
                          })
                          
                          if (newDate && newDate !== currentDate) {
                            console.log('Date confirmed with Enter, updating:', newDate)
                            updateExamDate(exam.exam_id, newDate)
                            target.blur()
                          }
                        }
                      }}
                      onClick={(e) => {
                        const target = e.target as HTMLInputElement
                        console.log('Date input clicked:', {
                          inputValue: target.value,
                          examDate: exam.exam_date,
                          examId: exam.exam_id,
                          examRecordId: exam.id,
                          examName: exam.exam_name
                        })
                      }}
                      disabled={saving || exam.status === 'pending' || !!exam.pending_date}
                      className={`date-input ${(exam.status === 'pending' || exam.pending_date) ? 'disabled-pending' : ''}`}
                      title={(exam.status === 'pending' || exam.pending_date) ? 'Редактирование заблокировано - ожидает подтверждения' : 'Выберите дату и нажмите Enter или кликните вне поля для сохранения. НЕ нажимайте на стрелки навигации календаря!'}
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