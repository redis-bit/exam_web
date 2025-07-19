import React from 'react'
import { useNotifications } from '../../hooks/useNotifications'
import { useAuth } from '../../hooks/useAuth'
import './NotificationBadge.css'

interface NotificationBadgeProps {
  onClick?: () => void
  className?: string
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({ onClick, className = '' }) => {
  const { user } = useAuth()
  const { pendingCount, notifications } = useNotifications()

  if (!user) return null

  // Для администраторов показываем количество запросов на подтверждение
  // Для обычных пользователей показываем количество непрочитанных уведомлений
  const isAdmin = ['admin', 'admin_assistant'].includes(user.role)
  const count = isAdmin ? pendingCount : notifications.filter(n => !n.is_read).length
  const title = isAdmin 
    ? `${count} запросов на подтверждение`
    : `${count} непрочитанных уведомлений`

  if (count === 0) {
    return (
      <div 
        className={`notification-badge no-notifications ${className}`}
        onClick={onClick}
        title="Нет уведомлений"
      >
        🔔
      </div>
    )
  }

  return (
    <div 
      className={`notification-badge has-notifications ${className}`}
      onClick={onClick}
      title={title}
    >
      🔔
      <span className="notification-count">{count > 99 ? '99+' : count}</span>
    </div>
  )
}

export default NotificationBadge