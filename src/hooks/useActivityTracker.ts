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

    // События для отслеживания активности
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']

    // Добавляем слушатели событий
    events.forEach(event => {
      document.addEventListener(event, trackActivity, true)
    })

    // Отслеживаем изменения в URL (переходы между страницами)
    const handleLocationChange = () => {
      console.log('Переход на новую страницу - обновляем время визита')
      updateLastVisit()
    }

    // Слушаем изменения истории браузера
    window.addEventListener('popstate', handleLocationChange)

    // Очистка при размонтировании
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, trackActivity, true)
      })
      window.removeEventListener('popstate', handleLocationChange)
      
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current)
      }
    }
  }, [user, updateLastVisit])

  return { trackActivity }
}