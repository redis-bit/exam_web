import React, { useState, useEffect } from 'react'
import { useNotifications, UserNotification } from '../../hooks/useNotifications'
import './UserNotifications.css'

const UserNotifications: React.FC = () => {
  const { 
    notifications, 
    loading, 
    error, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    fetchNotifications 
  } = useNotifications()
  
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [isFirstView, setIsFirstView] = useState(true)
  
  // При первом рендере загружаем уведомления
  useEffect(() => {
    fetchNotifications(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  
  // При размонтировании компонента отмечаем все как прочитанные
  useEffect(() => {
    return () => {
      if (!isFirstView) {
        fetchNotifications(true)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFirstView])

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.is_read
    if (filter === 'read') return notification.is_read
    return true
  })

  const unreadCount = notifications.filter(n => !n.is_read).length

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'exam_date_pending': return '⏳'
      case 'exam_date_approved': return '✅'
      case 'exam_date_rejected': return '❌'
      case 'employee_created_pending': return '👤⏳'
      case 'employee_approved': return '👤✅'
      case 'employee_rejected': return '👤❌'
      default: return '📢'
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'exam_date_pending':
      case 'employee_created_pending':
        return 'blue'
      case 'exam_date_approved':
      case 'employee_approved':
        return 'green'
      case 'exam_date_rejected':
      case 'employee_rejected':
        return 'red'
      default:
        return 'gray'
    }
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      return diffMinutes < 1 ? 'только что' : `${diffMinutes} мин. назад`
    } else if (diffHours < 24) {
      return `${diffHours} ч. назад`
    } else if (diffDays < 7) {
      return `${diffDays} дн. назад`
    } else {
      return date.toLocaleDateString('ru-RU')
    }
  }

  const handleMarkAsRead = async (notification: UserNotification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id)
    }
  }
  
  // Функция для обновления и отметки уведомлений как прочитанных
  const loadNotifications = async (markAsRead: boolean = false): Promise<void> => {
    if (markAsRead) {
      await fetchNotifications(true)
      setIsFirstView(false)
    } else {
      await fetchNotifications(false)
    }
  }

  const handleDelete = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (window.confirm('Удалить это уведомление?')) {
      await deleteNotification(notificationId)
    }
  }

  if (loading) {
    return (
      <div className="user-notifications">
        <div className="loading">Загрузка уведомлений...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="user-notifications">
        <div className="notifications-header">
          <h2>Мои уведомления</h2>
        </div>
        <div className="error">
          <h3>Система уведомлений не настроена</h3>
          <p>{error}</p>
          <div style={{ marginTop: '15px' }}>
            <p><strong>Для настройки системы уведомлений:</strong></p>
            <ol style={{ textAlign: 'left', marginTop: '10px' }}>
              <li>Выполните SQL скрипт <code>database/05_notifications_and_approvals.sql</code> в Supabase</li>
              <li>Перезагрузите страницу</li>
            </ol>
          </div>
          <button onClick={() => fetchNotifications(false)} className="btn btn-primary" style={{ marginTop: '15px' }}>
            Попробовать снова
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="user-notifications">
      <div className="notifications-header">
        <h2>Мои уведомления</h2>
        <div className="notifications-actions">
          {unreadCount > 0 && (
            <button 
            onClick={(e) => {
              e.preventDefault();
              loadNotifications(true);
            }} 
            className="btn btn-secondary"
          >
              Отметить все как прочитанные
            </button>
          )}
          <button 
            onClick={(e) => {
              e.preventDefault();
              loadNotifications(isFirstView ? false : true);
            }} 
            className="refresh-btn"
          >
            🔄 Обновить
          </button>
        </div>
      </div>

      <div className="notifications-filters">
        <button
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          Все ({notifications.length})
        </button>
        <button
          className={filter === 'unread' ? 'active' : ''}
          onClick={() => setFilter('unread')}
        >
          Непрочитанные ({unreadCount})
        </button>
        <button
          className={filter === 'read' ? 'active' : ''}
          onClick={() => setFilter('read')}
        >
          Прочитанные ({notifications.length - unreadCount})
        </button>
      </div>

      {filteredNotifications.length === 0 ? (
        <div className="no-notifications">
          <div className="no-notifications-icon">📭</div>
          <h3>
            {filter === 'all' ? 'Нет уведомлений' : 
             filter === 'unread' ? 'Нет непрочитанных уведомлений' : 
             'Нет прочитанных уведомлений'}
          </h3>
          <p>
            {filter === 'all' ? 'У вас пока нет уведомлений' : 
             filter === 'unread' ? 'Все уведомления прочитаны' : 
             'Нет прочитанных уведомлений'}
          </p>
        </div>
      ) : (
        <div className="notifications-list">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification-item ${getNotificationColor(notification.type)} ${
                notification.is_read ? 'read' : 'unread'
              }`}
              onClick={() => handleMarkAsRead(notification)}
            >
              <div className="notification-icon">
                {getNotificationIcon(notification.type)}
              </div>
              
              <div className="notification-content">
                <div className="notification-title">
                  {notification.title}
                  {!notification.is_read && <span className="unread-badge">●</span>}
                </div>
                <div className="notification-message">
                  {notification.message}
                </div>
                <div className="notification-time">
                  {formatDateTime(notification.created_at)}
                </div>
              </div>
              
              <div className="notification-actions">
                <button
                  onClick={(e) => {
                    handleDelete(notification.id, e)
                  }}
                  className="delete-btn"
                  title="Удалить уведомление"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default UserNotifications