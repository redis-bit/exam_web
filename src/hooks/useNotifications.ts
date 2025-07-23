import { useState, useEffect, useCallback } from 'react'
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

  const fetchNotifications = useCallback(async (markAsRead: boolean = false): Promise<void> => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          setNotifications([])
          setError('Система уведомлений не настроена.')
          return
        }
        throw error
      }
      
      if (markAsRead) {
        try {
          await supabase.rpc('mark_notifications_as_read', { p_user_id: user.id })
          setNotifications((data || []).map(notification => ({
            ...notification,
            is_read: true
          })))
        } catch (markErr) {
          setNotifications(data || [])
        }
      } else {
        setNotifications(data || [])
      }
      
      setError(null)
    } catch (err) {
      console.error('Ошибка загрузки уведомлений:', err)
      setError('Ошибка загрузки уведомлений')
    }
  }, [user])

  const fetchApprovalRequests = useCallback(async () => {
    if (!user || !['admin', 'admin_assistant'].includes(user.role)) return

    try {
      const { data, error } = await supabase
        .from('admin_approval_queue')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          setApprovalRequests([])
          return
        }
        throw error
      }
      setApprovalRequests(data || [])
    } catch (err) {
      console.error('Ошибка загрузки запросов:', err)
    }
  }, [user])

  const fetchPendingCount = useCallback(async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .rpc('get_pending_approvals_count', { 
          p_user_id: ['admin', 'admin_assistant'].includes(user.role) ? null : user.id 
        })

      if (error) {
        if (error.code === 'PGRST202' || error.message.includes('does not exist')) {
          setPendingCount(0)
          return
        }
        throw error
      }
      setPendingCount(data || 0)
    } catch (err) {
      setPendingCount(0)
    }
  }, [user])

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('user_notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      )
      await fetchPendingCount()
    } catch (err) {
      console.error('Ошибка отметки уведомления:', err)
    }
  }

  const markAllAsRead = async () => {
    if (!user) return

    try {
      await supabase
        .from('user_notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      await fetchPendingCount()
    } catch (err) {
      console.error('Ошибка отметки всех уведомлений:', err)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      await supabase
        .from('user_notifications')
        .delete()
        .eq('id', notificationId)

      setNotifications(prev => prev.filter(n => n.id !== notificationId))
    } catch (err) {
      console.error('Ошибка удаления уведомления:', err)
    }
  }

  const approveRequest = async (requestId: string, comment?: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .rpc('process_approval_request', {
          p_request_id: requestId,
          p_reviewed_by: user.id,
          p_status: 'approved',
          p_comment: comment || null
        })

      if (error) {
        if (error.code === 'PGRST202' || error.message.includes('does not exist')) {
          return { success: false, error: 'Система подтверждений не настроена.' }
        }
        throw error
      }

      await Promise.all([fetchApprovalRequests(), fetchPendingCount(), fetchNotifications()])
      return { success: true }
    } catch (err) {
      return { success: false, error: 'Ошибка подтверждения запроса' }
    }
  }

  const rejectRequest = async (requestId: string, comment?: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .rpc('process_approval_request', {
          p_request_id: requestId,
          p_reviewed_by: user.id,
          p_status: 'rejected',
          p_comment: comment || null
        })

      if (error) {
        if (error.code === 'PGRST202' || error.message.includes('does not exist')) {
          return { success: false, error: 'Система подтверждений не настроена.' }
        }
        throw error
      }

      await Promise.all([fetchApprovalRequests(), fetchPendingCount(), fetchNotifications()])
      return { success: true }
    } catch (err) {
      return { success: false, error: 'Ошибка отклонения запроса' }
    }
  }

  const requestExamDateChange = async (employeeId: string, examId: string, newDate: string) => {
    if (!user) return

    try {
      console.log('Calling request_exam_date_change with params:', {
        p_employee_id: employeeId,
        p_exam_id: examId,
        p_new_date: newDate,
        p_requested_by: user.id
      })

      const { data, error } = await supabase
        .rpc('request_exam_date_change', {
          p_employee_id: employeeId,
          p_exam_id: examId,
          p_new_date: newDate,
          p_requested_by: user.id
        })

      if (error) {
        console.error('request_exam_date_change error:', error)
        console.error('Error code:', error.code)
        console.error('Error message:', error.message)
        
        if (error.code === 'PGRST202' || error.message.includes('does not exist')) {
          return { success: false, error: 'Система подтверждений не настроена.' }
        }
        return { success: false, error: `Ошибка базы данных: ${error.message}` }
      }

      console.log('request_exam_date_change success, requestId:', data)
      await Promise.all([fetchNotifications(), fetchPendingCount()])
      return { success: true, requestId: data }
    } catch (err) {
      console.error('request_exam_date_change catch error:', err)
      return { success: false, error: `Ошибка запроса изменения даты: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}` }
    }
  }

  const requestEmployeeCreation = async (fullName: string, professionTemplateId: string, sectionId: string) => {
    if (!user) return

    try {
      console.log('Calling request_employee_creation_hook with params:', {
        p_full_name: fullName,
        p_profession_template_id: professionTemplateId,
        p_section_id: sectionId,
        p_requested_by: user.id
      })
      
      const { data, error } = await supabase
        .rpc('request_employee_creation_hook', {
          p_full_name: fullName,
          p_profession_template_id: professionTemplateId,
          p_section_id: sectionId,
          p_requested_by: user.id
        })

      if (error) {
        console.error('Detailed error:', error)
        console.error('Error code:', error.code)
        console.error('Error message:', error.message)
        console.error('Error details:', error.details)
        console.error('Error hint:', error.hint)
        
        if (error.code === 'PGRST202' || error.message.includes('does not exist')) {
          return { success: false, error: 'Система подтверждений не настроена.' }
        }
        return { success: false, error: `Ошибка базы данных: ${error.message}` }
      }

      await Promise.all([fetchNotifications(), fetchPendingCount()])
      return { success: true, requestId: data }
    } catch (err) {
      console.error('Catch block error:', err)
      return { success: false, error: `Ошибка запроса создания работника: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}` }
    }
  }

  useEffect(() => {
    if (user) {
      setLoading(true)
      Promise.all([
        fetchNotifications(),
        fetchApprovalRequests(),
        fetchPendingCount()
      ]).finally(() => setLoading(false))
    }
  }, [user, fetchNotifications, fetchApprovalRequests, fetchPendingCount])

  useEffect(() => {
    if (!user) return

    const notificationsSubscription = supabase
      .channel('user_notifications')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${user.id}` }, 
        () => fetchNotifications()
      )
      .subscribe()

    const approvalsSubscription = supabase
      .channel('approval_requests')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'approval_requests' }, 
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
  }, [user, fetchNotifications, fetchApprovalRequests, fetchPendingCount])

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

export default useNotifications