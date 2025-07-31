import { useState, useEffect, useCallback } from 'react'
import { useNotifications, UserNotification } from './useNotifications'
import { useAuth } from './useAuth'

export const useAutoNotifications = () => {
  const { user } = useAuth()
  const { notifications, markAsRead, markAllAsRead, loading, fetchNotifications, fetchPendingCount } = useNotifications()
  const [showAutoModal, setShowAutoModal] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState<UserNotification[]>([])
  const [initialUnreadNotifications, setInitialUnreadNotifications] = useState<UserNotification[]>([])
  const [hasCheckedOnLogin, setHasCheckedOnLogin] = useState(false)

  // Фильтруем непрочитанные уведомления
  useEffect(() => {
    const unread = notifications.filter(n => !n.is_read)
    console.log('🔔 Автоуведомления - пользователь:', user?.id, 'роль:', user?.role)
    console.log('🔔 Автоуведомления - всего уведомлений:', notifications.length)
    console.log('🔔 Автоуведомления - непрочитанных:', unread.length)
    console.log('🔔 Автоуведомления - список непрочитанных:', unread)
    
    // Проверяем изменения в количестве непрочитанных
    const prevUnreadCount = unreadNotifications.length
    if (unread.length !== prevUnreadCount) {
      console.log('🔔 Изменение количества непрочитанных:', prevUnreadCount, '->', unread.length)
    }
    
    setUnreadNotifications(unread)
  }, [notifications, user, unreadNotifications.length])

  // POLLING РЕШЕНИЕ - проверяем уведомления каждую минуту
  useEffect(() => {
    if (!user) return

    console.log('🔄 Запуск polling для пользователя:', user.id)
    
    const interval = setInterval(() => {
      console.log('⏰ Polling - проверка новых уведомлений')
      fetchNotifications()
      fetchPendingCount()
    }, 60000) // Каждую минуту

    return () => {
      console.log('⏹️ Остановка polling для пользователя:', user.id)
      clearInterval(interval)
    }
  }, [user?.id, fetchNotifications, fetchPendingCount])

  // Проверяем наличие новых уведомлений при входе пользователя и при поступлении новых
  useEffect(() => {
    console.log('Автоуведомления - проверка показа модала:', {
      user: !!user,
      hasCheckedOnLogin,
      unreadCount: unreadNotifications.length,
      loading,
      shouldShow: user && unreadNotifications.length > 0 && !loading
    })
    
    // Показываем модал если пользователь есть, есть непрочитанные и не идет загрузка
    if (user && unreadNotifications.length > 0 && !loading && !showAutoModal) {
      console.log('🔔 Автоуведомления - показываем модал!')
      // Сохраняем изначальный список непрочитанных уведомлений
      setInitialUnreadNotifications([...unreadNotifications])
      setShowAutoModal(true)
      if (!hasCheckedOnLogin) {
        setHasCheckedOnLogin(true)
      }
    }
  }, [user, unreadNotifications, hasCheckedOnLogin, loading, showAutoModal])

  // Сброс состояния при смене пользователя
  useEffect(() => {
    if (user?.id) {
      console.log('Автоуведомления - сброс состояния для нового пользователя:', user.id)
      setHasCheckedOnLogin(false)
      setShowAutoModal(false)
      setInitialUnreadNotifications([]) // Очищаем сохраненный список при смене пользователя
    }
  }, [user?.id])

  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    await markAsRead(notificationId)
    // Принудительно обновляем данные для обновления счетчика
    await fetchNotifications()
    await fetchPendingCount()
  }, [markAsRead, fetchNotifications, fetchPendingCount])

  const handleMarkAllAsRead = useCallback(async () => {
    await markAllAsRead()
    // Принудительно обновляем данные для обновления счетчика
    await fetchNotifications()
    await fetchPendingCount()
  }, [markAllAsRead, fetchNotifications, fetchPendingCount])

  const handleCloseModal = useCallback(async () => {
    setShowAutoModal(false)
    setInitialUnreadNotifications([]) // Очищаем сохраненный список при закрытии
    // Принудительно обновляем данные для обновления счетчика
    await fetchNotifications()
    await fetchPendingCount()
  }, [fetchNotifications, fetchPendingCount])

  // Функция для принудительного показа модала (если нужно)
  const showNotificationsModal = useCallback(() => {
    if (unreadNotifications.length > 0) {
      setShowAutoModal(true)
    }
  }, [unreadNotifications])

  return {
    showAutoModal,
    unreadNotifications: showAutoModal ? initialUnreadNotifications : unreadNotifications,
    handleMarkAsRead,
    handleMarkAllAsRead,
    handleCloseModal,
    showNotificationsModal,
    hasUnreadNotifications: unreadNotifications.length > 0
  }
}

export default useAutoNotifications