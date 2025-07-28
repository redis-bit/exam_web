import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import './LatestNewsHeader.css'

interface LatestNews {
  id: string
  title: string
  content: string
  published_at: string
  author_name: string
  is_read: boolean
}

interface LatestNewsHeaderProps {
  onNewsClick?: () => void
}

const LatestNewsHeader: React.FC<LatestNewsHeaderProps> = ({ onNewsClick }) => {
  const { user } = useAuth()
  const [latestNews, setLatestNews] = useState<LatestNews | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchLatestNews = useCallback(async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .rpc('get_latest_news_for_user', { p_user_id: user.id })

      if (error) {
        console.error('Ошибка получения последней новости:', error)
        return
      }

      if (data && data.length > 0) {
        const newNews = data[0]
        // Обновляем только если данные действительно изменились
        setLatestNews(prev => {
          if (!prev || 
              prev.id !== newNews.id || 
              prev.is_read !== newNews.is_read ||
              prev.title !== newNews.title) {
            setLoading(false) // Убираем loading только при реальных изменениях
            return newNews
          }
          return prev
        })
      } else {
        setLatestNews(null)
        setLoading(false)
      }
    } catch (err) {
      console.error('Ошибка при загрузке последней новости:', err)
      setLoading(false)
    }
  }, [user])

  const markNewsAsRead = async () => {
    if (!user || !latestNews) return

    try {
      await supabase.rpc('mark_news_as_read', {
        p_user_id: user.id,
        p_news_id: latestNews.id
      })

      // Обновляем состояние
      setLatestNews(prev => prev ? { ...prev, is_read: true } : null)
    } catch (err) {
      console.error('Ошибка при отметке новости как прочитанной:', err)
    }
  }

  const handleNewsClick = () => {
    markNewsAsRead()
    if (onNewsClick) {
      onNewsClick()
    }
  }

  // Polling как запасной вариант
  useEffect(() => {
    if (!user) return

    fetchLatestNews()

    // Добавляем polling каждые 10 секунд для надежности
    const interval = setInterval(() => {
      fetchLatestNews()
    }, 10000)

    return () => clearInterval(interval)
  }, [user?.id])

  // Real-time подписка на новости отключена из-за проблем с переподключениями
  // Используем только polling каждые 10 секунд для стабильной работы
  /*
  useEffect(() => {
    if (!user) return

    console.log('📰 Настройка подписки на новости для пользователя:', user.id)

    const newsSubscription = supabase
      .channel(`news_updates_${user.id}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'news' }, 
        (payload) => {
          console.log('📰 Получена новая новость:', payload)
          // Добавляем задержку для стабильности
          setTimeout(() => {
            fetchLatestNews()
          }, 500)
        }
      )
      .subscribe((status) => {
        console.log('📰 Статус подписки на новости:', status)
        if (status === 'CLOSED') {
          console.log('📰 Подписка закрыта, переподключаемся...')
          setTimeout(() => {
            fetchLatestNews()
          }, 1000)
        }
      })

    return () => {
      console.log('📰 Отключение подписки на новости')
      newsSubscription.unsubscribe()
    }
  }, [user?.id])
  */

  if (loading || !latestNews) {
    return null
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const truncateText = (text: string, maxLength: number = 60) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

  return (
    <div 
      className={`latest-news-header ${!latestNews.is_read ? 'unread' : ''}`}
      onClick={handleNewsClick}
      title="Нажмите для перехода к новостям"
    >
      <div className="news-icon">
        📰
        {!latestNews.is_read && <span className="unread-indicator">●</span>}
      </div>
      <div className="news-content">
        <div className="news-title">
          {truncateText(latestNews.title)}
        </div>
        <div className="news-meta">
          {formatDate(latestNews.published_at)} • {latestNews.author_name}
        </div>
      </div>
    </div>
  )
}

export default LatestNewsHeader