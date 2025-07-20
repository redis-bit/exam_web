import React, { useState, useEffect } from 'react'
import { News, CreateNewsData, UpdateNewsData } from '../../hooks/useNews'
import './NewsForm.css'

interface NewsFormProps {
  news?: News | null
  onSubmit: (data: { title: string; content: string }) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

const NewsForm: React.FC<NewsFormProps> = ({
  news,
  onSubmit,
  onCancel,
  loading = false
}) => {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (news) {
      setTitle(news.title)
      setContent(news.content)
    } else {
      setTitle('')
      setContent('')
    }
  }, [news])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('Заголовок обязателен')
      return
    }

    if (!content.trim()) {
      setError('Содержание обязательно')
      return
    }

    try {
      await onSubmit({
        title: title.trim(),
        content: content.trim()
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при сохранении')
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content news-form-modal">
        <div className="modal-header">
          <h3>{news ? 'Редактировать новость' : 'Создать новость'}</h3>
          <button className="close-btn" onClick={onCancel} disabled={loading}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="news-form">
          <div className="form-group">
            <label htmlFor="title">Заголовок:</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Введите заголовок новости"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="content">Содержание:</label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Введите содержание новости"
              rows={10}
              disabled={loading}
              required
            />
            <small>Используйте Enter для переноса строк</small>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="btn btn-secondary"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Сохранение...' : (news ? 'Обновить' : 'Создать')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default NewsForm