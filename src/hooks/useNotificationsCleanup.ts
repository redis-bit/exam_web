// Хук для автоматической очистки уведомлений
import { useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export const useNotificationsCleanup = () => {
  const { user } = useAuth()

  // Функция для выполнения очистки уведомлений
  const performCleanup = useCallback(async () => {
    if (!user) return

    try {
      console.log('🧹 Выполняем очистку старых уведомлений...')
      
      const { data, error } = await supabase
        .rpc('maintenance_cleanup_notifications')

      if (error) {
        console.error('Ошибка при очистке уведомлений:', error)
        return
      }

      if (data?.deleted_count > 0) {
        console.log(`✅ Очистка завершена: удалено ${data.deleted_count} уведомлений`)
      } else {
        console.log('ℹ️ Нет уведомлений для очистки')
      }

      return data
    } catch (error) {
      console.error('Ошибка при выполнении очистки уведомлений:', error)
    }
  }, [user])

  // Функция для принудительной очистки всех старых уведомлений
  const forceCleanup = useCallback(async () => {
    if (!user) return

    try {
      console.log('🧹 Выполняем принудительную очистку всех старых уведомлений...')
      
      const { data, error } = await supabase
        .rpc('force_cleanup_old_notifications')

      if (error) {
        console.error('Ошибка при принудительной очистке:', error)
        return
      }

      console.log(`✅ Принудительная очистка завершена: удалено ${data[0]?.deleted_count || 0} уведомлений`)
      return data
    } catch (error) {
      console.error('Ошибка при принудительной очистке:', error)
    }
  }, [user])

  // Автоматическая очистка при входе пользователя
  useEffect(() => {
    if (user) {
      // Выполняем очистку через 5 секунд после входа
      const timer = setTimeout(() => {
        performCleanup()
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [user, performCleanup])

  // Периодическая очистка каждые 30 минут
  useEffect(() => {
    if (!user) return

    const interval = setInterval(() => {
      performCleanup()
    }, 30 * 60 * 1000) // 30 минут

    return () => clearInterval(interval)
  }, [user, performCleanup])

  return {
    performCleanup,
    forceCleanup
  }
}