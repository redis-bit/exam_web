// Хук для работы с новостями
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export interface News {
  id: string
  title: string
  content: string
  published_at: string
  author_id: string
  author_name?: string
}

export interface CreateNewsData {
  title: string
  content: string
}

export interface UpdateNewsData {
  title?: string
  content?: string
}

export const useNews = () => {
  const { user } = useAuth()
  const [news, setNews] = useState<News[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNews = async (limit?: number) => {
    try {
      setLoading(true)
      setError(null)

      console.log('Загружаем новости для пользователя...')
      
      let query = supabase
        .from('news')
        .select(`
          *,
          users(full_name)
        `)
        .order('published_at', { ascending: false })

      if (limit) {
        query = query.limit(limit)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        throw fetchError
      }

      // Преобразуем данные в нужный формат
      const newsWithAuthors: News[] = (data || []).map(item => ({
        id: item.id,
        title: item.title,
        content: item.content,
        published_at: item.published_at,
        author_id: item.author_id,
        author_name: item.users?.full_name || 'Неизвестный автор'
      }))

      setNews(newsWithAuthors)
    } catch (err) {
      console.error('Ошибка при загрузке новостей:', err)
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
    } finally {
      setLoading(false)
    }
  }

  const createNews = async (newsData: CreateNewsData) => {
    try {
      if (!user) {
        throw new Error('Пользователь не авторизован')
      }

      const { data, error } = await supabase
        .from('news')
        .insert([{
          ...newsData,
          author_id: user.id
        }])
        .select()
        .single()

      if (error) {
        throw error
      }

      // Обновляем список новостей
      await fetchNews()
      return data
    } catch (err) {
      console.error('Ошибка при создании новости:', err)
      throw err
    }
  }

  const updateNews = async (id: string, newsData: UpdateNewsData) => {
    try {
      const { data, error } = await supabase
        .from('news')
        .update(newsData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw error
      }

      // Обновляем список новостей
      await fetchNews()
      return data
    } catch (err) {
      console.error('Ошибка при обновлении новости:', err)
      throw err
    }
  }

  const deleteNews = async (id: string) => {
    try {
      const { error } = await supabase
        .from('news')
        .delete()
        .eq('id', id)

      if (error) {
        throw error
      }

      // Обновляем список новостей
      await fetchNews()
    } catch (err) {
      console.error('Ошибка при удалении новости:', err)
      throw err
    }
  }

  const getNewsById = async (id: string): Promise<News | null> => {
    try {
      const { data, error } = await supabase
        .from('news')
        .select(`
          *,
          users!inner(full_name)
        `)
        .eq('id', id)
        .single()

      if (error) {
        throw error
      }

      return {
        id: data.id,
        title: data.title,
        content: data.content,
        published_at: data.published_at,
        author_id: data.author_id,
        author_name: data.users?.full_name || 'Неизвестный автор'
      }
    } catch (err) {
      console.error('Ошибка при загрузке новости:', err)
      return null
    }
  }

  useEffect(() => {
    fetchNews()
  }, [])

  return {
    news,
    loading,
    error,
    fetchNews,
    createNews,
    updateNews,
    deleteNews,
    getNewsById
  }
}