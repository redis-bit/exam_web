import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
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

const LatestNewsHeader: React.FC<LatestNewsHeaderProps> = React.memo(({ onNewsClick }) => {
  const { user } = useAuth()
  const [latestNews, setLatestNews] = useState<LatestNews | null>(null)
  const [loading, setLoading] = useState(true)
  const lastFetchRef = useRef<number>(0)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Функция для глубокого сравнения объектов новостей
  const areNewsEqual = useCallback((news1: LatestNews | null, news2: LatestNews | null): boolean => {
    if (!news1 && !news2) return true
    if (!news1 || !news2) return false
    
    return (
      news1.id === news2.id &&
      news1.title === news2.title &&
      news1.content === news2.content &&
      news1.published_at === news2.published_at &&
      news1.author_name === news2.author_name &&
      news1.is_read === news2.is_read
    )
  }, [])

  const fetchLatestNews = useCallback(async (force = false) => {
    if (!user) return

    // Debouncing - предотвращаем слишком частые запросы
    const now = Date.now()
    if (!force && now - lastFetchRef.current < 5000) {
      return // Не делаем запрос чаще чем раз в 5 секунд
    }
    lastFetchRef.current = now

    try {
      const { data, error } = await supabase
        .rpc('get_latest_news_for_user', { p_user_id: user.id })

      if (error) {
        console.error('Ошибка получения последней новости:', error)
        return
      }

      if (data && data.length > 0) {
        const newNews = data[0]
        
        // Обновляем состояние только если данные действительно изменились
        setLatestNews(prev => {
          if (!areNewsEqual(prev, newNews)) {
            setLoading(false)
            return newNews
          }
          // Если данные не изменились, убираем loading без изменения новости
          if (loading) {
            setLoading(false)
          }
          return prev
        })
      } else {
        setLatestNews(prev => {
          if (prev !== null) {
            setLoading(false)
            return null
          }
          if (loading) {
            setLoading(false)
          }
          return prev
        })
      }
    } catch (err) {
      console.error('Ошибка при загрузке последней новости:', err)
      if (loading) {
        setLoading(false)
      }
    }
  }, [user, loading, areNewsEqual])

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

  // Polling с debouncing и оптимизацией
  useEffect(() => {
    if (!user) return

    // Первоначальная загрузка
    fetchLatestNews(true)

    // Добавляем polling каждые 15 секунд (увеличили интервал)
    const interval = setInterval(() => {
      // Очищаем предыдущий debounce timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      
      // Добавляем небольшую задержку для debouncing
      debounceTimeoutRef.current = setTimeout(() => {
        fetchLatestNews()
      }, 100)
    }, 15000)

    return () => {
      clearInterval(interval)
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [user?.id, fetchLatestNews])

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

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }, [])

  const truncateText = useCallback((text: string, maxLength: number = 60) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }, [])

  // Мемоизируем отформатированные данные для предотвращения ненужных перерендеров
  const formattedNewsData = useMemo(() => {
    if (!latestNews) return null
    
    return {
      formattedDate: formatDate(latestNews.published_at),
      truncatedTitle: truncateText(latestNews.title),
      isUnread: !latestNews.is_read
    }
  }, [latestNews, formatDate, truncateText])

  if (loading || !latestNews || !formattedNewsData) {
    return null
  }

  return (
    <div 
      className={`latest-news-header ${formattedNewsData.isUnread ? 'unread' : ''}`}
      onClick={handleNewsClick}
      title="Нажмите для перехода к новостям"
    >
      <div className="news-icon">
        📰
        {formattedNewsData.isUnread && <span className="unread-indicator">●</span>}
      </div>
      <div className="news-content">
        <div className="news-title">
          {formattedNewsData.truncatedTitle}
        </div>
        <div className="news-meta">
          {formattedNewsData.formattedDate} • {latestNews.author_name}
        </div>
      </div>
    </div>
  )
})

// Добавляем displayName для лучшей отладки
LatestNewsHeader.displayName = 'LatestNewsHeader'

export default LatestNewsHeader