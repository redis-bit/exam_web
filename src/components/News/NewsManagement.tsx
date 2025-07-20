import React, { useState } from 'react'
import { useNews, News, CreateNewsData, UpdateNewsData } from '../../hooks/useNews'
import { useAuth } from '../../hooks/useAuth'
import NewsCard from './NewsCard'
import NewsForm from './NewsForm'
import './NewsManagement.css'

const NewsManagement: React.FC = () => {
  const { user } = useAuth()
  const { news, loading, createNews, updateNews, deleteNews, fetchNews } = useNews()
  const [showForm, setShowForm] = useState(false)
  const [editingNews, setEditingNews] = useState<News | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  // Согласно ТЗ, создавать новости могут только администраторы
  const isAdmin = user?.role === 'admin'

  const handleCreateNews = async (data: { title: string; content: string }) => {
    try {
      setFormLoading(true)
      await createNews(data)
      setShowForm(false)
    } catch (error) {
      throw error
    } finally {
      setFormLoading(false)
    }
  }

  const handleUpdateNews = async (data: { title: string; content: string }) => {
    if (!editingNews) return

    try {
      setFormLoading(true)
      await updateNews(editingNews.id, data)
      setEditingNews(null)
    } catch (error) {
      throw error
    } finally {
      setFormLoading(false)
    }
  }

  const handleFormSubmit = async (data: { title: string; content: string }) => {
    if (editingNews) {
      await handleUpdateNews(data)
    } else {
      await handleCreateNews(data)
    }
  }

  const handleDeleteNews = async (id: string) => {
    try {
      await deleteNews(id)
    } catch (error) {
      console.error('Ошибка при удалении новости:', error)
    }
  }

  const handleEditNews = (news: News) => {
    setEditingNews(news)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingNews(null)
  }

  if (loading) {
    return (
      <div className="news-management">
        <div className="loading">Загрузка новостей...</div>
      </div>
    )
  }

  return (
    <div className="news-management">
      <div className="news-header">
        <h2>📰 Новости</h2>
        {isAdmin && (
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
          >
            ➕ Создать новость
          </button>
        )}
      </div>

      <div className="news-stats">
        <div className="stat-item">
          <span className="stat-number">{news.length}</span>
          <span className="stat-label">Всего новостей</span>
        </div>
        {news.length > 0 && (
          <div className="stat-item">
            <span className="stat-number">
              {new Date(news[0].published_at).toLocaleDateString('ru-RU')}
            </span>
            <span className="stat-label">Последняя новость</span>
          </div>
        )}
      </div>

      <div className="news-list">
        {news.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📰</div>
            <h3>Новостей пока нет</h3>
            <p>
              {isAdmin 
                ? 'Создайте первую новость, чтобы информировать пользователей о важных событиях.'
                : 'Новости появятся здесь, когда администратор их опубликует.'
              }
            </p>
            {isAdmin && (
              <button
                className="btn btn-primary"
                onClick={() => setShowForm(true)}
              >
                Создать первую новость
              </button>
            )}
          </div>
        ) : (
          news.map(newsItem => (
            <NewsCard
              key={newsItem.id}
              news={newsItem}
              onEdit={handleEditNews}
              onDelete={handleDeleteNews}
              showActions={isAdmin}
            />
          ))
        )}
      </div>

      {/* Форма создания/редактирования новости */}
      {(showForm || editingNews) && (
        <NewsForm
          news={editingNews}
          onSubmit={handleFormSubmit}
          onCancel={handleCloseForm}
          loading={formLoading}
        />
      )}
    </div>
  )
}

export default NewsManagement