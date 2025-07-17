// Хук для работы с пользователями
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { User } from '../types/database'

export interface UserWithSection extends User {
  section_name?: string
}

// Функция для генерации UUID (совместимая со старыми браузерами)
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
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
        .eq('is_active', true)
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
      
      // Сначала пробуем создать через нашу RPC функцию
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('create_confirmed_user', {
          user_email: userData.email,
          user_password: userData.password,
          user_full_name: userData.full_name,
          user_role: userData.role,
          user_section_id: userData.section_id || null
        })

      if (!rpcError && rpcData) {
        console.log('Пользователь создан через RPC функцию')
        return { 
          success: true, 
          userId: rpcData,
          note: 'Пользователь создан с подтвержденным email через RPC функцию'
        }
      }

      console.log('RPC функция не сработала, пробуем стандартный способ:', rpcError)

      // Если RPC не сработала, пробуем стандартный способ
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          emailRedirectTo: undefined, // Отключаем редирект
          data: {
            full_name: userData.full_name,
            role: userData.role,
            section_id: userData.section_id
          }
        }
      })

      if (authError) {
        console.error('Ошибка стандартного создания:', authError)
        
        // Если стандартное создание не работает, создаем только в локальной таблице
        console.log('Создаем пользователя только в локальной таблице')
        let userId = generateUUID()
        
        // Пробуем создать через упрощенную RPC функцию
        const { data: localRpcData, error: localRpcError } = await supabase
          .rpc('create_simple_user', {
            user_email: userData.email,
            user_full_name: userData.full_name,
            user_role: userData.role,
            user_section_id: userData.section_id || null
          })

        if (!localRpcError && localRpcData) {
          console.log('Пользователь создан через create_simple_user')
          userId = localRpcData
        } else {
          console.error('Ошибка create_simple_user:', localRpcError)
          
          // Пробуем альтернативную функцию
          const { data: directData, error: directError } = await supabase
            .rpc('add_user_direct', {
              p_email: userData.email,
              p_full_name: userData.full_name,
              p_role: userData.role
            })

          if (!directError && directData) {
            console.log('Пользователь создан через add_user_direct:', directData)
            // Извлекаем ID из сообщения
            const idMatch = directData.match(/ID: ([a-f0-9-]+)/)
            userId = idMatch ? idMatch[1] : generateUUID()
          } else {
            console.error('Ошибка add_user_direct:', directError)
            
            // Крайний случай - прямой INSERT
            const { error: insertError } = await supabase
              .from('users')
              .insert([{
                id: userId,
                full_name: userData.full_name,
                email: userData.email,
                role: userData.role,
                section_id: userData.section_id || null,
                is_active: true
              }])

            if (insertError) {
              console.error('Ошибка прямого INSERT:', insertError)
              throw new Error(`Не удалось создать пользователя: ${insertError.message}`)
            }
          }
        }

        return { 
          success: true, 
          userId: userId,
          note: 'Пользователь создан только в локальной таблице. Для входа в систему потребуется создать учетную запись в Supabase Auth вручную или через Dashboard.'
        }
      }

      if (!authData.user) {
        throw new Error('Не удалось создать пользователя в Auth')
      }

      // Теперь добавляем пользователя в таблицу users с тем же ID
      const { error: insertError } = await supabase
        .from('users')
        .insert([{
          id: authData.user.id,
          full_name: userData.full_name,
          email: userData.email,
          role: userData.role,
          section_id: userData.section_id || null,
          is_active: true
        }])

      if (insertError) {
        // Если не удалось добавить в таблицу users, пытаемся удалить из Auth
        console.error('Ошибка при добавлении в таблицу users:', insertError)
        throw insertError
      }

      return { success: true, userId: authData.user.id }
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
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
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
          is_active: false,
          updated_at: new Date().toISOString()
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

  useEffect(() => {
    fetchUsers()
  }, [])

  return {
    users,
    loading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deactivateUser,
    deleteUser,
    syncAuthUsers
  }
}