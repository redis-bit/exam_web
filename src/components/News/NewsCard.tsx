import React from 'react'
import { News } from '../../hooks/useNews'
import { useAuth } from '../../hooks/useAuth'
import './NewsCard.css'

interface NewsCardProps {
  news: News
  onEdit?: (news: News) => void
  onDelete?: (id: string) => void
  showActions?: boolean
}

const NewsCard: React.FC<NewsCardProps> = ({
  news,
  onEdit,
  onDelete,
  showActions = true
}) => {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatContent = (content: string) => {
    // Простая обработка переносов строк
    return content.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < content.split('\n').length - 1 && <br />}
      </React.Fragment>
    ))
  }

  return (
    <div className="news-card">
      <div className="news-header">
        <h3 className="news-title">{news.title}</h3>
        {showActions && isAdmin && (
          <div className="news-actions">
            <button
              className="btn btn-sm btn-primary"
              onClick={() => onEdit?.(news)}
              title="Редактировать"
            >
              ✏️
            </button>
            <button
              className="btn btn-sm btn-danger"
              onClick={() => {
                if (window.confirm('Вы уверены, что хотите удалить эту новость?')) {
                  onDelete?.(news.id)
                }
              }}
              title="Удалить"
            >
              🗑️
            </button>
          </div>
        )}
      </div>

      <div className="news-meta">
        <span className="news-author">👤 {news.author_name}</span>
        <span className="news-date">📅 {formatDate(news.published_at)}</span>
      </div>

      <div className="news-content">
        {formatContent(news.content)}
      </div>
    </div>
  )
}

export default NewsCard