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
      // Сначала создаем пользователя в Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
      })

      if (authError) {
        throw authError
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

      // В реальном проекте здесь также нужно деактивировать пользователя в Auth

      return { success: true }
    } catch (error) {
      console.error('Ошибка при деактивации пользователя:', error)
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
    deactivateUser
  }
}