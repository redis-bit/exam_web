// Хук для работы с аутентификацией и ролями
import { useState, useEffect } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { User } from '../types/database'

export const useAuth = () => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUserData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Ошибка при загрузке данных пользователя:', error)
        return null
      }

      return data
    } catch (err) {
      console.error('Ошибка при загрузке пользователя:', err)
      return null
    }
  }

  useEffect(() => {
    // Получаем текущую сессию
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        fetchUserData(session.user.id).then(setUser)
      }
      setLoading(false)
    })

    // Слушаем изменения аутентификации
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      if (session?.user) {
        const userData = await fetchUserData(session.user.id)
        setUser(userData)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const isAdmin = () => user?.role === 'admin'
  const isAdminAssistant = () => user?.role === 'admin_assistant'
  const isSectionChief = () => user?.role === 'section_chief'
  const canViewAllSections = () => isAdmin() || isAdminAssistant()
  const canEditEmployee = (employeeSectionId: string) => {
    return isAdmin() || (isSectionChief() && user?.section_id === employeeSectionId)
  }

  return {
    session,
    user,
    loading,
    isAdmin,
    isAdminAssistant,
    isSectionChief,
    canViewAllSections,
    canEditEmployee
  }
}