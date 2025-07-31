// Хук для отслеживания активности пользователя
import { useEffect, useRef } from 'react'
import { useAuth } from './useAuth'

export const useActivityTracker = () => {
  const { user, updateLastVisit } = useAuth()
  const lastActivityRef = useRef<number>(Date.now())
  const activityTimeoutRef = useRef<NodeJS.Timeout>()

  // Функция для обновления активности
  const trackActivity = () => {
    const now = Date.now()
    const timeSinceLastActivity = now - lastActivityRef.current

    // Обновляем время визита если прошло больше 5 минут с последней активности
    if (timeSinceLastActivity > 5 * 60 * 1000) { // 5 минут
      updateLastVisit()
    }

    lastActivityRef.current = now

    // Сбрасываем таймер
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current)
    }

    // Устанавливаем новый таймер на 10 минут бездействия
    activityTimeoutRef.current = setTimeout(() => {
      console.log('Пользователь неактивен более 10 минут')
    }, 10 * 60 * 1000)
  }

  useEffect(() => {
    if (!user) return

    // Определяем тип устройства для оптимизации
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768

    // Оптимизированные события для разных устройств
    const events = isMobile 
      ? ['touchstart', 'touchend', 'scroll'] // Меньше событий для мобильных
      : ['mousedown', 'mousemove', 'keypress', 'scroll', 'click']

    // Throttled версия для производительности
    let lastCall = 0
    const throttledTrackActivity = () => {
      const now = Date.now()
      if (now - lastCall < 1000) return // Throttle до 1 раза в секунду
      lastCall = now
      trackActivity()
    }

    // Добавляем слушатели событий с passive опцией
    events.forEach(event => {
      document.addEventListener(event, throttledTrackActivity, { 
        passive: true,
        capture: true 
      })
    })

    // Отслеживаем изменения в URL (переходы между страницами)
    const handleLocationChange = () => {
      console.log('Переход на новую страницу - обновляем время визита')
      updateLastVisit()
    }

    // Слушаем изменения истории браузера
    window.addEventListener('popstate', handleLocationChange, { passive: true })

    // Отслеживаем видимость страницы
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        trackActivity()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true })

    // Очистка при размонтировании
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, throttledTrackActivity, true)
      })
      window.removeEventListener('popstate', handleLocationChange)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current)
      }
    }
  }, [user, updateLastVisit])

  return { trackActivity }
}