import React, { useState } from 'react'
import { UserNotification } from '../../hooks/useNotifications'
import './AutoNotificationModal.css'

interface AutoNotificationModalProps {
  notifications: UserNotification[]
  onMarkAsRead: (notificationId: string) => Promise<void>
  onMarkAllAsRead: () => Promise<void>
  onClose: () => void
}

const AutoNotificationModal: React.FC<AutoNotificationModalProps> = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClose
}) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)

  const currentNotification = notifications[currentIndex]
  const hasMore = currentIndex < notifications.length - 1

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'exam_date_pending':
        return '⏰'
      case 'exam_date_approved':
        return '✅'
      case 'exam_date_rejected':
        return '❌'
      case 'employee_created_pending':
        return '👤'
      case 'employee_approved':
        return '✅'
      case 'employee_rejected':
        return '❌'
      default:
        return '📢'
    }
  }

  const handleNext = async () => {
    if (!currentNotification) return

    setIsProcessing(true)
    try {
      await onMarkAsRead(currentNotification.id)
      
      if (hasMore) {
        setCurrentIndex(prev => prev + 1)
      } else {
        onClose()
      }
    } catch (error) {
      console.error('Ошибка при отметке уведомления:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleMarkAllAndClose = async () => {
    setIsProcessing(true)
    try {
      await onMarkAllAsRead()
      onClose()
    } catch (error) {
      console.error('Ошибка при отметке всех уведомлений:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSkipAll = () => {
    onClose()
  }

  if (!currentNotification) {
    return null
  }

  return (
    <div className="auto-notification-modal-overlay">
      <div className="auto-notification-modal">
        <div className="auto-notification-header">
          <div className="notification-icon">
            {getNotificationIcon(currentNotification.type)}
          </div>
          <div className="notification-counter">
            {currentIndex + 1} из {notifications.length}
          </div>
        </div>

        <div className="auto-notification-content">
          <h3 className="notification-title">
            {currentNotification.title}
          </h3>
          
          <div className="notification-message">
            {currentNotification.message}
          </div>
          
          <div className="notification-meta">
            <span className="notification-date">
              {formatDate(currentNotification.created_at)}
            </span>
          </div>
        </div>

        <div className="auto-notification-actions">
          <button
            onClick={handleNext}
            disabled={isProcessing}
            className="btn btn-primary"
          >
            {isProcessing ? 'Обработка...' : hasMore ? 'Далее' : 'Понятно'}
          </button>
          
          {notifications.length > 1 && (
            <button
              onClick={handleMarkAllAndClose}
              disabled={isProcessing}
              className="btn btn-secondary"
            >
              Отметить все как прочитанные
            </button>
          )}
          
          <button
            onClick={handleSkipAll}
            disabled={isProcessing}
            className="btn btn-outline"
          >
            Пропустить все
          </button>
        </div>
      </div>
    </div>
  )
}

export default AutoNotificationModal