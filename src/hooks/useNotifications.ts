import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export interface UserNotification {
  id: string
  type: 'exam_date_pending' | 'exam_date_approved' | 'exam_date_rejected' | 'employee_created_pending' | 'employee_approved' | 'employee_rejected'
  title: string
  message: string
  is_read: boolean
  created_at: string
  expires_at: string | null
  related_id: string | null
  action_data: any
}

export interface ApprovalRequest {
  id: string
  type: 'exam_date_change' | 'employee_create' | 'employee_delete'
  requester_name: string
  requester_email: string
  section_name: string | null
  employee_name: string | null
  exam_name: string | null
  old_value: any
  new_value: any
  created_at: string
  expires_at: string
  hours_until_expiry: number
}

export const useNotifications = () => {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<UserNotification[]>([])
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Загрузка уведомлений пользователя
  const fetchNotifications = async (markAsRead: boolean = false): Promise<void> => {
    if (!user) return

    try {
      console.log('useNotifications - загружаем данные для пользователя:', user.id)
      
      // Сначала получаем уведомления
      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        // Если таблица не существует, создаем пустой массив
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          console.warn('Таблица user_notifications не найдена. Создайте таблицы из database/05_notifications_and_approvals.sql')
          setNotifications([])
          setError('Система уведомлений не настроена. Обратитесь к администратору.')
          return
        }
        throw error
      }
      
      // Если это второй просмотр, отмечаем все как прочитанные
      if (markAsRead) {
        try {
          const { data: updatedCount, error: markError } = await supabase
            .rpc('mark_notifications_as_read', { p_user_id: user.id })
          
          if (markError) throw markError
          
          // Обновляем локальное состояние, чтобы все уведомления были отмечены как прочитанные
          setNotifications((data || []).map(notification => ({
            ...notification,
            is_read: true
          })))
        } catch (markErr) {
          console.error('Ошибка отметки уведомлений как прочитанных:', markErr)
          // Даже если произошла ошибка, мы все равно показываем уведомления
          setNotifications(data || [])
        }
      } else {
        // Просто устанавливаем уведомления без изменений
        console.log('fetchNotifications - загружено уведомлений:', (data || []).length)
        console.log('fetchNotifications - данные:', data)
        setNotifications(data || [])
      }
      
      setError(null)
    } catch (err) {
      console.error('Ошибка загрузки уведомлений:', err)
      setError(`Ошибка загрузки уведомлений: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`)
    }
  }

  // Загрузка запросов на подтверждение (только для админов)
  const fetchApprovalRequests = async () => {
    if (!user || !['admin', 'admin_assistant'].includes(user.role)) return

    try {
      const { data, error } = await supabase
        .from('admin_approval_queue')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) {
        // Если представление не существует, создаем пустой массив
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          console.warn('Представление admin_approval_queue не найдено. Создайте таблицы из database/05_notifications_and_approvals.sql')
          setApprovalRequests([])
          setError('Система подтверждений не настроена. Обратитесь к администратору.')
          return
        }
        throw error
      }
      setApprovalRequests(data || [])
      setError(null)
    } catch (err) {
      console.error('Ошибка загрузки запросов на подтверждение:', err)
      setError(`Ошибка загрузки запросов: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`)
    }
  }

  // Получение количества ожидающих подтверждения
  const fetchPendingCount = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .rpc('get_pending_approvals_count', { 
          p_user_id: ['admin', 'admin_assistant'].includes(user.role) ? null : user.id 
        })

      if (error) {
        // Если функция не существует, устанавливаем 0
        if (error.code === 'PGRST202' || error.message.includes('does not exist')) {
          console.warn('Функция get_pending_approvals_count не найдена. Создайте функции из database/05_notifications_and_approvals.sql')
          setPendingCount(0)
          return
        }
        throw error
      }
      setPendingCount(data || 0)
    } catch (err) {
      console.error('Ошибка получения количества ожидающих:', err)
      setPendingCount(0)
    }
  }

  // Отметить уведомление как прочитанное
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('user_notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      if (error) throw error

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      )
    } catch (err) {
      console.error('Ошибка отметки уведомления:', err)
    }
  }

  // Отметить все уведомления как прочитанные
  const markAllAsRead = async () => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('user_notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (error) throw error

      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      )
    } catch (err) {
      console.error('Ошибка отметки всех уведомлений:', err)
    }
  }

  // Удалить уведомление
  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('user_notifications')
        .delete()
        .eq('id', notificationId)

      if (error) throw error

      setNotifications(prev => prev.filter(n => n.id !== notificationId))
    } catch (err) {
      console.error('Ошибка удаления уведомления:', err)
    }
  }

  // Подтвердить запрос
  const approveRequest = async (requestId: string, comment?: string) => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .rpc('process_approval_request', {
          p_request_id: requestId,
          p_reviewed_by: user.id,
          p_status: 'approved',
          p_comment: comment || null
        })

      if (error) {
        if (error.code === 'PGRST202' || error.message.includes('does not exist')) {
          return { 
            success: false, 
            error: 'Система подтверждений не настроена. Обратитесь к администратору для настройки базы данных.' 
          }
        }
        throw error
      }

      // Обновляем списки
      await Promise.all([
        fetchApprovalRequests(),
        fetchPendingCount(),
        fetchNotifications()
      ])

      return { success: true }
    } catch (err) {
      console.error('Ошибка подтверждения запроса:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Неизвестная ошибка' }
    }
  }

  // Отклонить запрос
  const rejectRequest = async (requestId: string, comment?: string) => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .rpc('process_approval_request', {
          p_request_id: requestId,
          p_reviewed_by: user.id,
          p_status: 'rejected',
          p_comment: comment || null
        })

      if (error) {
        if (error.code === 'PGRST202' || error.message.includes('does not exist')) {
          return { 
            success: false, 
            error: 'Система подтверждений не настроена. Обратитесь к администратору для настройки базы данных.' 
          }
        }
        throw error
      }

      // Обновляем списки
      await Promise.all([
        fetchApprovalRequests(),
        fetchPendingCount(),
        fetchNotifications()
      ])

      return { success: true }
    } catch (err) {
      console.error('Ошибка отклонения запроса:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Неизвестная ошибка' }
    }
  }

  // Запрос изменения даты экзамена
  const requestExamDateChange = async (
    employeeId: string,
    examId: string,
    newDate: string
  ) => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .rpc('request_exam_date_change', {
          p_employee_id: employeeId,
          p_exam_id: examId,
          p_new_date: newDate,
          p_requested_by: user.id
        })

      if (error) {
        // Если функция не существует, показываем понятное сообщение
        if (error.code === 'PGRST202' || error.message.includes('does not exist')) {
          return { 
            success: false, 
            error: 'Система подтверждений не настроена. Обратитесь к администратору для настройки базы данных.' 
          }
        }
        throw error
      }

      // Обновляем данные
      await Promise.all([
        fetchNotifications(),
        fetchPendingCount()
      ])

      return { success: true, requestId: data }
    } catch (err) {
      console.error('Ошибка запроса изменения даты:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Неизвестная ошибка' }
    }
  }

  // Запрос создания работника
  const requestEmployeeCreation = async (
    fullName: string,
    professionTemplateId: string,
    sectionId: string
  ) => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .rpc('request_employee_creation_hook', {
          p_full_name: fullName,
          p_profession_template_id: professionTemplateId,
          p_section_id: sectionId,
          p_requested_by: user.id
        })

      if (error) {
        // Если функция не существует, показываем понятное сообщение
        if (error.code === 'PGRST202' || error.message.includes('does not exist')) {
          return { 
            success: false, 
            error: 'Система подтверждений не настроена. Обратитесь к администратору для настройки базы данных.' 
          }
        }
        throw error
      }

      // Обновляем данные
      await Promise.all([
        fetchNotifications(),
        fetchPendingCount()
      ])

      return { success: true, requestId: data }
    } catch (err) {
      console.error('Ошибка запроса создания работника:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Неизвестная ошибка' }
    }
  }

  // Загрузка данных при монтировании и изменении пользователя
  useEffect(() => {
    if (user) {
      console.log('useNotifications - загружаем данные для пользователя:', user.id)
      setLoading(true)
      Promise.all([
        fetchNotifications(),
        fetchApprovalRequests(),
        fetchPendingCount()
      ]).finally(() => {
        setLoading(false)
        console.log('useNotifications - загрузка завершена')
      })
    }
  }, [user])

  // Подписка на изменения в реальном времени
  useEffect(() => {
    if (!user) return

    const notificationsSubscription = supabase
      .channel('user_notifications')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'user_notifications',
          filter: `user_id=eq.${user.id}`
        }, 
        () => {
          fetchNotifications()
        }
      )
      .subscribe()

    const approvalsSubscription = supabase
      .channel('approval_requests')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'approval_requests'
        }, 
        () => {
          if (['admin', 'admin_assistant'].includes(user.role)) {
            fetchApprovalRequests()
          }
          fetchPendingCount()
        }
      )
      .subscribe()

    return () => {
      notificationsSubscription.unsubscribe()
      approvalsSubscription.unsubscribe()
    }
  }, [user])

  return {
    notifications,
    approvalRequests,
    pendingCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    approveRequest,
    rejectRequest,
    requestExamDateChange,
    requestEmployeeCreation,
    fetchNotifications,
    fetchApprovalRequests,
    fetchPendingCount
  }
}