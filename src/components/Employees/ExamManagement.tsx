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
          
          // ВАЖНО: Проверяем pending_date в первую очередь
          if (exam.pending_date && exam.pending_date !== null) {
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

  const updateExamDate = async (examIdOrEmployeeExamId: string, newDate: string) => {
    try {
      setSaving(true)
      setError(null)

      // Проверяем, не ожидает ли экзамен подтверждения
      const examRecord = exams.find(e => e.exam_id === examIdOrEmployeeExamId)
      if (examRecord && (examRecord.status === 'pending' || examRecord.pending_date)) {
        alert('Редактирование заблокировано. Экзамен ожидает подтверждения администратора.')
        setSaving(false)
        return
      }

      // Проверяем роль пользователя
      const isAdmin = user && ['admin', 'admin_assistant'].includes(user.role)

      if (isAdmin) {
        // Для администратора нужно найти правильную запись employee_exam
        // examIdOrEmployeeExamId может быть exam_id, нужно найти соответствующую запись
        if (!examRecord) {
          throw new Error('Запись экзамена не найдена')
        }

        // Администратор может изменять даты напрямую
        const { error: updateError } = await supabase
          .from('employee_exams')
          .update({
            exam_date: newDate,
            updated_by: user.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', examRecord.id) // Используем ID записи employee_exam

        if (updateError) throw updateError

        alert('Дата экзамена успешно обновлена')
        
        // Обновляем локальное состояние для администратора
        setExams(prev => prev.map(e => 
          e.id === examRecord.id 
            ? { ...e, exam_date: newDate, status: 'normal', color_indicator: 'green', pending_date: null }
            : e
        ))
      } else {
        // Обычный пользователь отправляет запрос на подтверждение
        // examIdOrEmployeeExamId здесь должен быть exam_id
        const result = await requestExamDateChange(employee.id, examIdOrEmployeeExamId, newDate)
        
        if (result?.success) {
          alert('Запрос на изменение даты отправлен администратору на рассмотрение')
          // Сразу обновляем статус экзамена на "ожидает подтверждения"
          setExams(prev => prev.map(e => 
            e.exam_id === examIdOrEmployeeExamId 
              ? { ...e, status: 'pending', color_indicator: 'blue', pending_date: newDate }
              : e
          ))
          // НЕ перезагружаем данные сразу, чтобы не перезаписать локальные изменения
          onUpdate() // Обновляем только родительский компонент
          return // Выходим, не перезагружая данные
        } else {
          // Если система подтверждений не настроена, показываем информативное сообщение
          if (result?.error?.includes('не настроена')) {
            alert('Система подтверждений не настроена. Обратитесь к администратору.\n\nДля настройки выполните SQL скрипт database/05_notifications_and_approvals.sql в Supabase.')
          } else {
            console.error('Детали ошибки:', result?.error)
            throw new Error(result?.error || 'Ошибка при отправке запроса')
          }
        }
      }

      // Перезагружаем экзамены
      await loadEmployeeExams()
      onUpdate() // Обновляем родительский компонент

    } catch (err) {
      console.error('Ошибка обновления даты экзамена:', err)
      
      // Более детальная обработка ошибок
      let errorMessage = 'Ошибка при обновлении даты экзамена'
      
      if (err instanceof Error) {
        if (err.message.includes('23503') || err.message.includes('not present in table')) {
          errorMessage = 'Ошибка: данные экзамена повреждены. Обратитесь к администратору для исправления базы данных.'
        } else if (err.message.includes('не настроена')) {
          errorMessage = err.message
        } else if (err.message.includes('409') || err.message.includes('Conflict')) {
          errorMessage = 'Конфликт данных. Возможно, система подтверждений не настроена или данные повреждены.'
        } else {
          errorMessage = err.message
        }
      }
      
      setError(errorMessage)
      alert(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const getStatusBadge = (status: string, colorIndicator: string) => {
    const statusText = {
      'overdue': 'Просрочен',
      'upcoming': 'Предстоящий',
      'pending': 'Не подтвержден',
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
                      onChange={(e) => updateExamDate(exam.exam_id, e.target.value)}
                      disabled={saving || exam.status === 'pending' || !!exam.pending_date}
                      className={`date-input ${(exam.status === 'pending' || exam.pending_date) ? 'disabled-pending' : ''}`}
                      title={(exam.status === 'pending' || exam.pending_date) ? 'Редактирование заблокировано - ожидает подтверждения' : ''}
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