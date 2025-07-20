import React from 'react'
import { useNews } from '../../hooks/useNews'
import NewsCard from './NewsCard'
import './NewsWidget.css'

interface NewsWidgetProps {
  limit?: number
  showTitle?: boolean
  showViewAll?: boolean
  onViewAll?: () => void
}

const NewsWidget: React.FC<NewsWidgetProps> = ({
  limit = 5,
  showTitle = true,
  showViewAll = true,
  onViewAll
}) => {
  const { news, loading } = useNews()

  // Ограничиваем количество новостей согласно ТЗ (последние 5)
  const limitedNews = news.slice(0, limit)

  if (loading) {
    return (
      <div className="news-widget">
        {showTitle && <h3 className="widget-title">📰 Последние новости</h3>}
        <div className="widget-loading">Загрузка новостей...</div>
      </div>
    )
  }

  if (limitedNews.length === 0) {
    return (
      <div className="news-widget">
        {showTitle && <h3 className="widget-title">📰 Последние новости</h3>}
        <div className="widget-empty">
          <p>Новостей пока нет</p>
        </div>
      </div>
    )
  }

  return (
    <div className="news-widget">
      {showTitle && (
        <div className="widget-header">
          <h3 className="widget-title">📰 Последние новости</h3>
          {showViewAll && news.length > limit && (
            <button 
              className="view-all-btn"
              onClick={onViewAll}
            >
              Все новости →
            </button>
          )}
        </div>
      )}

      <div className="news-widget-list">
        {limitedNews.map(newsItem => (
          <NewsCard
            key={newsItem.id}
            news={newsItem}
            showActions={false}
          />
        ))}
      </div>

      {showViewAll && news.length > limit && !showTitle && (
        <div className="widget-footer">
          <button 
            className="view-all-btn"
            onClick={onViewAll}
          >
            Показать все новости ({news.length})
          </button>
        </div>
      )}
    </div>
  )
}

export default NewsWidget