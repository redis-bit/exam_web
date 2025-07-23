import React, { useState, useRef, useEffect } from 'react'
import { useNotifications } from '../../hooks/useNotifications';
import { useAuth } from '../../hooks/useAuth'
import './ApprovalPanel.css'

const ApprovalPanel: React.FC = () => {
  const { user } = useAuth()
  const { 
    approvalRequests, 
    loading, 
    error, 
    approveRequest, 
    rejectRequest,
    fetchApprovalRequests 
  } = useNotifications()
  
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [showCommentModal, setShowCommentModal] = useState<{
    requestId: string
    action: 'approve' | 'reject'
  } | null>(null)
  const [comment, setComment] = useState('')
  const [swipedCard, setSwipedCard] = useState<string | null>(null)
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null)

  const handleApprove = async (requestId: string, withComment: boolean = false) => {
    if (withComment) {
      setShowCommentModal({ requestId, action: 'approve' })
      return
    }

    setProcessingId(requestId)
    try {
      const result = await approveRequest(requestId)
      if (result?.success) {
        alert('Запрос успешно подтвержден')
      } else {
        alert(`Ошибка: ${result?.error || 'Неизвестная ошибка'}`)
      }
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (requestId: string, withComment: boolean = true) => {
    if (withComment) {
      setShowCommentModal({ requestId, action: 'reject' })
      return
    }

    setProcessingId(requestId)
    try {
      const result = await rejectRequest(requestId)
      if (result?.success) {
        alert('Запрос отклонен')
      } else {
        alert(`Ошибка: ${result?.error || 'Неизвестная ошибка'}`)
      }
    } finally {
      setProcessingId(null)
    }
  }

  const handleCommentSubmit = async () => {
    if (!showCommentModal) return

    setProcessingId(showCommentModal.requestId)
    try {
      const result = showCommentModal.action === 'approve' 
        ? await approveRequest(showCommentModal.requestId, comment)
        : await rejectRequest(showCommentModal.requestId, comment)

      if (result?.success) {
        alert(showCommentModal.action === 'approve' ? 'Запрос подтвержден' : 'Запрос отклонен')
        setShowCommentModal(null)
        setComment('')
      } else {
        alert(`Ошибка: ${result?.error || 'Неизвестная ошибка'}`)
      }
    } finally {
      setProcessingId(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU')
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU')
  }

  const getUrgencyClass = (hoursUntilExpiry: number) => {
    if (hoursUntilExpiry < 24) return 'urgent'
    if (hoursUntilExpiry < 72) return 'warning'
    return 'normal'
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'exam_date_change': return 'Изменение даты экзамена'
      case 'employee_create': return 'Создание работника'
      case 'employee_delete': return 'Удаление работника'
      default: return type
    }
  }

  // Обработка свайпа
  const handleTouchStart = (e: React.TouchEvent, requestId: string) => {
    setTouchEnd(null)
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    })
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    })
  }

  const handleTouchEnd = (requestId: string) => {
    if (!touchStart || !touchEnd) return
    
    const distanceX = touchStart.x - touchEnd.x
    const distanceY = touchStart.y - touchEnd.y
    const isLeftSwipe = distanceX > 50
    const isRightSwipe = distanceX < -50
    const isVerticalSwipe = Math.abs(distanceY) > Math.abs(distanceX)

    if (!isVerticalSwipe) {
      if (isLeftSwipe) {
        setSwipedCard(requestId)
      } else if (isRightSwipe) {
        setSwipedCard(null)
      }
    }
  }

  // Закрытие свайпа при клике вне карточки
  useEffect(() => {
    const handleClickOutside = () => {
      setSwipedCard(null)
    }

    if (swipedCard) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [swipedCard])

  // Проверяем права доступа
  if (!user || !['admin', 'admin_assistant'].includes(user.role)) {
    return (
      <div className="approval-panel">
        <div className="access-denied">
          У вас нет прав для просмотра этой страницы
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="approval-panel">
        <div className="loading">Загрузка запросов на подтверждение...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="approval-panel">
        <div className="approval-header">
          <h2>Запросы на подтверждение</h2>
        </div>
        <div className="error">
          <h3>Система подтверждений не настроена</h3>
          <p>{error}</p>
          <div style={{ marginTop: '15px' }}>
            <p><strong>Для настройки системы подтверждений:</strong></p>
            <ol style={{ textAlign: 'left', marginTop: '10px' }}>
              <li>Выполните SQL скрипт database/05_notifications_and_approvals.sql в Supabase</li>
              <li>Перезагрузите страницу</li>
            </ol>
          </div>
          <button onClick={fetchApprovalRequests} className="btn btn-primary" style={{ marginTop: '15px' }}>
            Попробовать снова
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="approval-panel">
      <div className="approval-header">
        <h2>Запросы на подтверждение</h2>
        <div className="approval-stats">
          <span className="pending-count">
            Ожидает рассмотрения: {approvalRequests.length}
          </span>
          <button onClick={fetchApprovalRequests} className="refresh-btn">
            Обновить
          </button>
        </div>
      </div>

      {approvalRequests.length === 0 ? (
        <div className="no-requests">
          <div className="no-requests-icon">Нет запросов</div>
          <h3>Нет запросов на рассмотрение</h3>
          <p>Все запросы обработаны</p>
        </div>
      ) : (
        <div className="approval-list">
          {approvalRequests.map((request) => (
            <div 
              key={request.id} 
              className={`approval-card ${getUrgencyClass(request.hours_until_expiry)} ${swipedCard === request.id ? 'swiped' : ''}`}
              onTouchStart={(e) => handleTouchStart(e, request.id)}
              onTouchMove={handleTouchMove}
              onTouchEnd={() => handleTouchEnd(request.id)}
            >
              <div className="card-content">
                <div className="card-header">
                  <div className="card-type">
                    <span className="type-icon">📋</span>
                    <span className="type-label">{getTypeLabel(request.type)}</span>
                  </div>
                  <div className="card-urgency">
                    {request.hours_until_expiry < 24 ? (
                      <span className="urgent-badge">
                        ⏰ {Math.round(request.hours_until_expiry)}ч
                      </span>
                    ) : (
                      <span className="time-left">
                        {Math.round(request.hours_until_expiry / 24)}д
                      </span>
                    )}
                  </div>
                </div>

                <div className="card-body">
                  <div className="requester-info">
                    <div className="requester-avatar">👤</div>
                    <div className="requester-details">
                      <div className="requester-name">{request.requester_name}</div>
                      <div className="requester-email">{request.requester_email}</div>
                      {request.section_name && (
                        <div className="section-name">📍 {request.section_name}</div>
                      )}
                    </div>
                  </div>

                  {request.employee_name && (
                    <div className="employee-info">
                      <span className="info-icon">👷</span>
                      <span className="info-text">{request.employee_name}</span>
                    </div>
                  )}

                  {request.exam_name && (
                    <div className="exam-info">
                      <span className="info-icon">📝</span>
                      <span className="info-text">{request.exam_name}</span>
                    </div>
                  )}

                  {request.type === 'exam_date_change' && (
                    <div className="date-change-card">
                      <div className="date-from">
                        <span className="date-label">Текущая:</span>
                        <span className="date-value">{formatDate(request.old_value?.exam_date)}</span>
                      </div>
                      <div className="date-arrow">→</div>
                      <div className="date-to">
                        <span className="date-label">Новая:</span>
                        <span className="date-value">{formatDate(request.new_value?.exam_date)}</span>
                      </div>
                    </div>
                  )}

                  {request.type === 'employee_create' && (
                    <div className="employee-create-info">
                      <span className="create-icon">➕</span>
                      <span className="create-text">Создание: {request.new_value?.full_name}</span>
                    </div>
                  )}

                  <div className="request-time">
                    <span className="time-icon">🕒</span>
                    <span className="time-text">{formatDateTime(request.created_at)}</span>
                  </div>
                </div>

              </div>

              {/* Свайп-действия */}
              <div className="swipe-actions">
                <button
                  onClick={() => handleApprove(request.id)}
                  disabled={processingId === request.id}
                  className="swipe-btn swipe-approve"
                >
                  <span className="swipe-icon">✅</span>
                  <span className="swipe-text">
                    {processingId === request.id ? 'Обработка...' : 'Подтвердить'}
                  </span>
                </button>
                
                <button
                  onClick={() => handleReject(request.id)}
                  disabled={processingId === request.id}
                  className="swipe-btn swipe-reject"
                >
                  <span className="swipe-icon">❌</span>
                  <span className="swipe-text">
                    {processingId === request.id ? 'Обработка...' : 'Отклонить'}
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Модальное окно для комментария */}
      {showCommentModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>
                {showCommentModal.action === 'approve' ? 'Подтверждение' : 'Отклонение'} запроса
              </h3>
              <button 
                className="modal-close"
                onClick={() => setShowCommentModal(null)}
              >
                x
              </button>
            </div>
            
            <div className="modal-body">
              <label htmlFor="comment">
                {showCommentModal.action === 'approve' ? 'Комментарий:' : 'Причина отклонения:'}
              </label>
              <textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Введите комментарий..."
                rows={4}
                className="comment-textarea"
              />
            </div>
            
            <div className="modal-footer">
              <button
                onClick={() => setShowCommentModal(null)}
                className="btn btn-secondary"
              >
                Отмена
              </button>
              <button
                onClick={handleCommentSubmit}
                disabled={processingId === showCommentModal.requestId}
                className={`btn ${showCommentModal.action === 'approve' ? 'btn-success' : 'btn-danger'}`}
              >
                {processingId === showCommentModal.requestId ? 'Обработка...' : 
                 showCommentModal.action === 'approve' ? 'Подтвердить' : 'Отклонить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ApprovalPanel