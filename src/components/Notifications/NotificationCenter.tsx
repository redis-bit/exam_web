import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import './NotificationCenter.css'

interface ExamNotification {
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

const NotificationCenter: React.FC = () => {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<ExamNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'overdue' | 'upcoming' | 'pending'>('all')

  useEffect(() => {
    loadNotifications()
  }, [user])

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

      // Если пользователь - начальник участка, показываем только его участок
      if (user?.role === 'section_chief' && user?.section_id) {
        // Нужно добавить фильтр по участку через JOIN, но пока используем RLS
        query = query.eq('section_name', user.section_id)
      }

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

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true
    return notification.status === filter
  })

  const getNotificationIcon = (status: string) => {
    switch (status) {
      case 'overdue': return '🚨'
      case 'upcoming': return '⚠️'
      case 'pending': return '⏳'
      default: return '📋'
    }
  }

  const getNotificationTitle = (status: string) => {
    switch (status) {
      case 'overdue': return 'Просроченный экзамен'
      case 'upcoming': return 'Предстоящий экзамен'
      case 'pending': return 'Ожидает подтверждения'
      default: return 'Уведомление'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU')
  }

  if (loading) {
    return <div className="notifications-loading">Загрузка уведомлений...</div>
  }

  if (error) {
    return <div className="notifications-error">{error}</div>
  }

  return (
    <div className="notification-center">
      <div className="notification-header">
        <h2>🔔 Центр уведомлений</h2>
        <div className="notification-filters">
          <button 
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            Все ({notifications.length})
          </button>
          <button 
            className={filter === 'overdue' ? 'active' : ''}
            onClick={() => setFilter('overdue')}
          >
            Просроченные ({notifications.filter(n => n.status === 'overdue').length})
          </button>
          <button 
            className={filter === 'upcoming' ? 'active' : ''}
            onClick={() => setFilter('upcoming')}
          >
            Предстоящие ({notifications.filter(n => n.status === 'upcoming').length})
          </button>
          <button 
            className={filter === 'pending' ? 'active' : ''}
            onClick={() => setFilter('pending')}
          >
            Ожидающие ({notifications.filter(n => n.status === 'pending').length})
          </button>
        </div>
      </div>

      <div className="notifications-list">
        {filteredNotifications.length === 0 ? (
          <div className="no-notifications">
            {filter === 'all' ? 
              '✅ Нет активных уведомлений' : 
              `Нет уведомлений типа "${filter}"`
            }
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div 
              key={notification.id} 
              className={`notification-item ${notification.status} ${notification.color_indicator}`}
            >
              <div className="notification-icon">
                {getNotificationIcon(notification.status)}
              </div>
              
              <div className="notification-content">
                <div className="notification-title">
                  {getNotificationTitle(notification.status)}
                </div>
                
                <div className="notification-details">
                  <div className="employee-info">
                    <strong>{notification.employee_name}</strong>
                    <span className="section-badge">{notification.section_name}</span>
                  </div>
                  
                  <div className="exam-info">
                    <span className="exam-name">{notification.exam_name}</span>
                    <span className="profession-name">({notification.profession_name})</span>
                  </div>
                  
                  <div className="date-info">
                    {notification.status === 'overdue' && (
                      <span className="overdue-text">
                        Просрочен на {notification.days_overdue} дн. 
                        (последний экзамен: {formatDate(notification.exam_date)})
                      </span>
                    )}
                    
                    {notification.status === 'upcoming' && (
                      <span className="upcoming-text">
                        Через {notification.days_until} дн. 
                        (до {formatDate(notification.next_exam_date)})
                      </span>
                    )}
                    
                    {notification.status === 'pending' && (
                      <span className="pending-text">
                        Ожидает подтверждения изменения даты
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="notification-actions">
                {notification.status === 'overdue' && (
                  <button className="action-btn critical">
                    Срочно!
                  </button>
                )}
                {notification.status === 'upcoming' && (
                  <button className="action-btn warning">
                    Запланировать
                  </button>
                )}
                {notification.status === 'pending' && (
                  <button className="action-btn info">
                    Рассмотреть
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="notification-actions">
        <button onClick={loadNotifications} className="refresh-btn">
          🔄 Обновить уведомления
        </button>
      </div>
    </div>
  )
}

export default NotificationCenter