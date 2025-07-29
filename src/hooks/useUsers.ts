// Хук для работы с пользователями
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { User } from '../types/database'

export interface UserWithSection extends User {
  section_name?: string
}

// Функция для генерации UUID (совместимая со старыми браузерами)
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : ((r & 0x3) | 0x8)
    return v.toString(16)
  })
}

export const useUsers = () => {
  const [users, setUsers] = useState<UserWithSection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)

      // Получаем пользователей с информацией об участках
      const { data, error: fetchError } = await supabase
        .from('users')
        .select(`
          *,
          sections!users_section_id_fkey (
            name
          )
        `)
        .order('full_name')

      if (fetchError) {
        throw fetchError
      }

      // Преобразуем данные для удобного использования
      const usersWithSections = data?.map(user => ({
        ...user,
        section_name: user.sections?.name || null
      })) || []

      setUsers(usersWithSections)
    } catch (err) {
      console.error('Ошибка при загрузке пользователей:', err)
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
    } finally {
      setLoading(false)
    }
  }

  const createUser = async (userData: {
    email: string
    password: string
    full_name: string
    role: 'admin' | 'admin_assistant' | 'section_chief'
    section_id?: string
  }) => {
    try {
      console.log('Создание пользователя:', userData.email)
      
      // Используем функцию create_local_user для создания пользователя
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('create_local_user', {
          user_email: userData.email,
          user_full_name: userData.full_name,
          user_role: userData.role,
          user_section_id: userData.section_id || null
        })

      if (rpcError) {
        console.error('Ошибка создания пользователя через create_local_user:', rpcError)
        throw new Error(`Ошибка создания пользователя: ${rpcError.message || 'Неизвестная ошибка'}`)
      }

      if (!rpcData) {
        throw new Error('Пользователь не был создан - функция вернула пустой результат')
      }

      console.log('Пользователь успешно создан через RPC функцию create_local_user')
      await fetchUsers() // Обновляем список пользователей
      
      return { 
        success: true, 
        userId: rpcData,
        note: 'Пользователь создан в локальной таблице'
      }
    } catch (error) {
      console.error('Ошибка при создании пользователя:', error)
      throw error
    }
  }

  const updateUser = async (userId: string, updates: {
    full_name?: string
    role?: 'admin' | 'admin_assistant' | 'section_chief'
    section_id?: string | null
    is_active?: boolean
  }) => {
    try {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)

      if (error) {
        throw error
      }

      return { success: true }
    } catch (error) {
      console.error('Ошибка при обновлении пользователя:', error)
      throw error
    }
  }

  const deactivateUser = async (userId: string) => {
    try {
      // Деактивируем пользователя в таблице users
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          is_active: false
        })
        .eq('id', userId)

      if (updateError) {
        throw updateError
      }

      return { success: true }
    } catch (error) {
      console.error('Ошибка при деактивации пользователя:', error)
      throw error
    }
  }

  const activateUser = async (userId: string) => {
    try {
      // Активируем пользователя в таблице users
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          is_active: true
        })
        .eq('id', userId)

      if (updateError) {
        throw updateError
      }

      return { success: true }
    } catch (error) {
      console.error('Ошибка при активации пользователя:', error)
      throw error
    }
  }

  const deleteUser = async (userId: string) => {
    try {
      // Сначала удаляем из таблицы users
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      if (deleteError) {
        throw deleteError
      }

      // Пытаемся удалить из auth.users через RPC функцию
      try {
        await supabase.rpc('delete_auth_user', { user_id: userId })
      } catch (authError) {
        console.warn('Не удалось удалить из auth.users:', authError)
        // Продолжаем, так как основная запись удалена
      }

      return { success: true }
    } catch (error) {
      console.error('Ошибка при удалении пользователя:', error)
      throw error
    }
  }

  const syncAuthUsers = async () => {
    try {
      // Используем нашу SQL функцию для синхронизации
      const { data, error } = await supabase
        .rpc('sync_auth_users_to_users_table')

      if (error) {
        throw error
      }

      const result = data?.[0] || { synced_count: 0, user_emails: [] }
      
      return { 
        success: true, 
        syncedCount: result.synced_count,
        syncedEmails: result.user_emails
      }
    } catch (error) {
      console.error('Ошибка при синхронизации пользователей:', error)
      throw error
    }
  }

  const syncLastSignInTimes = async () => {
    try {
      const { error } = await supabase.rpc('sync_last_sign_in_times')
      if (error) {
        throw error
      }
      return { success: true }
    } catch (error) {
      console.error('Ошибка при синхронизации времени последнего входа:', error)
      throw error
    }
  }

  // Функция для обновления конкретного пользователя в списке
  const updateUserInList = useCallback((updatedUser: UserWithSection) => {
    setUsers(prevUsers => 
      prevUsers.map(user => 
        user.id === updatedUser.id ? { ...user, ...updatedUser } : user
      )
    );
  }, []);

  useEffect(() => {
    fetchUsers()
    
    // Слушаем обновления данных пользователя
    const handleUserDataUpdate = (event: CustomEvent) => {
      const updatedUser = event.detail;
      updateUserInList(updatedUser);
    };
    
    window.addEventListener('userDataUpdated', handleUserDataUpdate as EventListener);
    
    return () => {
      window.removeEventListener('userDataUpdated', handleUserDataUpdate as EventListener);
    };
  }, [updateUserInList])

  return {
    users,
    loading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    updateUserInList,
    deactivateUser,
    activateUser,
    deleteUser,
    syncAuthUsers,
    syncLastSignInTimes
  }
}