import React, { useState } from 'react'
import { ProfessionTemplateWithExams, useProfessionTemplates } from '../../hooks/useProfessionTemplates'
import './ProfessionList.css'
import './ProfessionList.mobile.css'

interface ProfessionListProps {
  professions: ProfessionTemplateWithExams[]
  loading: boolean
  onEdit: (profession: ProfessionTemplateWithExams) => void
  onCreate: () => void
  onManageExams: () => void
  onRefresh: () => void
}

const ProfessionList: React.FC<ProfessionListProps> = ({
  professions,
  loading,
  onEdit,
  onCreate,
  onManageExams,
  onRefresh
}) => {
  const { deactivateProfessionTemplate } = useProfessionTemplates()
  const [swipedCard, setSwipedCard] = useState<string | null>(null)
  const [flippedCard, setFlippedCard] = useState<string | null>(null)

  const handleDeactivate = async (profession: ProfessionTemplateWithExams) => {
    if (!window.confirm(`Вы уверены, что хотите деактивировать профессию "${profession.name}"?`)) {
      return
    }

    try {
      await deactivateProfessionTemplate(profession.id)
      alert('Профессия успешно деактивирована')
      onRefresh()
    } catch (error) {
      console.error('Ошибка при деактивации профессии:', error)
      alert('Ошибка при деактивации профессии')
    }
  }

  // Обработка свайпов для мобильных устройств
  const handleTouchStart = (e: React.TouchEvent, professionId: string) => {
    const touch = e.touches[0]
    const startX = touch.clientX
    const startY = touch.clientY
    let moved = false

    const handleTouchMove = (e: TouchEvent) => {
      if (moved) return
      const touch = e.touches[0]
      const deltaX = touch.clientX - startX
      const deltaY = touch.clientY - startY

      // Проверяем, что это горизонтальный свайп
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        moved = true
        e.preventDefault()

        if (deltaX < -50) {
          // Свайп влево - показать кнопки действий
          setSwipedCard(swipedCard === professionId ? null : professionId)
          setFlippedCard(null)
        } else if (deltaX > 50) {
          // Свайп вправо - перевернуть карточку
          setFlippedCard(flippedCard === professionId ? null : professionId)
          setSwipedCard(null)
        }
      }
    }

    const handleTouchEnd = () => {
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }

    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)
  }

  const handleCardClick = (professionId: string) => {
    // Закрываем все открытые состояния при клике на карточку
    setSwipedCard(null)
    setFlippedCard(null)
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div className="loading-spinner"></div>
        <p style={{ marginTop: '15px', color: 'var(--text-secondary)' }}>Загрузка профессий...</p>
      </div>
    )
  }

  return (
    <div className="profession-list-container">
      <div className="profession-list-header">
        <div className="header-actions">
          <button 
            onClick={onCreate}
            className="btn-create-full"
          >
            ➕ Добавить профессию
          </button>
          <button 
            onClick={onManageExams}
            className="btn-manage-exams"
          >
            📋 Управление экзаменами
          </button>
          <button 
            onClick={onRefresh}
            className="btn-refresh"
          >
            🔄 Обновить
          </button>
        </div>
      </div>

      {professions.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px',
          backgroundColor: 'var(--bg-tertiary)',
          borderRadius: '4px',
          border: '1px solid var(--border-color)'
        }}>
          <h3 style={{ color: 'var(--text-primary)' }}>Профессии не найдены</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Создайте первую профессию для начала работы</p>
          <button 
            onClick={onCreate}
            style={{
              padding: '12px 24px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500',
              marginTop: '15px'
            }}
          >
            Создать профессию
          </button>
        </div>
      ) : (
        <>
          {/* Десктопная таблица */}
          <div style={{ overflowX: 'auto' }}>
            <table className="professions-table">
              <thead>
                <tr>
                  <th>Название профессии</th>
                  <th>Участок</th>
                  <th>Экзамены</th>
                  <th>Дата создания</th>
                  <th style={{ textAlign: 'center' }}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {professions.map((profession) => (
                  <tr key={profession.id}>
                    <td style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                      {profession.name}
                    </td>
                    <td>{profession.section_name || '—'}</td>
                    <td>
                      {profession.exams && profession.exams.length > 0 ? (
                        <div style={{ fontSize: '12px' }}>
                          {profession.exams.map((exam) => (
                            <div key={exam.id} style={{ 
                              marginBottom: '4px',
                              color: 'var(--text-secondary)'
                            }}>
                              {exam.name} ({Math.round((exam.periodicity_override || exam.periodicity) / 30.44)} мес.)
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Нет экзаменов</span>
                      )}
                    </td>
                    <td>{new Date(profession.created_at).toLocaleDateString('ru-RU')}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={() => onEdit(profession)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}
                          title="Редактировать"
                        >
                          ✏️ Редактировать
                        </button>
                        {profession.is_active && (
                          <button
                            onClick={() => handleDeactivate(profession)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '500'
                            }}
                            title="Деактивировать"
                          >
                            🗑️ Удалить
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Мобильные карточки */}
          <div className="mobile-profession-cards">
            {professions.map((profession) => (
              <div 
                key={profession.id} 
                className={`profession-card-wrapper ${swipedCard === profession.id ? 'swiped-left' : ''} ${flippedCard === profession.id ? 'flipped' : ''}`}
              >
                <div 
                  className={`profession-card ${profession.is_active ? 'card-active' : 'card-inactive'}`}
                  onTouchStart={(e) => handleTouchStart(e, profession.id)}
                  onClick={() => handleCardClick(profession.id)}
                >
                  {/* Лицевая сторона карточки */}
                  <div className="card-header">
                    <div className="profession-name">{profession.name}</div>
                    <div className="profession-section">{profession.section_name || 'Участок не указан'}</div>
                  </div>
                  <div className="card-body">
                    <div className="detail-item">
                      <span className="detail-label">Дата создания:</span>
                      <span className="detail-value">{new Date(profession.created_at).toLocaleDateString('ru-RU')}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Экзаменов:</span>
                      <span className="detail-value">{profession.exams?.length || 0}</span>
                    </div>
                  </div>

                  {/* Обратная сторона карточки */}
                  <div className="card-back">
                    <div className="exams-list">
                      {profession.exams && profession.exams.length > 0 ? (
                        profession.exams.map((exam) => (
                          <div key={exam.id} className="exam-item">
                            {exam.name} ({Math.round((exam.periodicity_override || exam.periodicity) / 30.44)})
                          </div>
                        ))
                      ) : (
                        <div className="no-exams">Экзамены не назначены</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Кнопки действий при свайпе влево */}
                <div className="card-actions-swipe">
                  <button
                    className="btn btn-primary"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit(profession)
                    }}
                  >
                    ✏️ Редактировать
                  </button>
                  {profession.is_active && (
                    <button
                      className="btn btn-danger"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeactivate(profession)
                      }}
                    >
                      🗑️ Удалить
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="profession-stats">
        <div className="stats-row">
          <span><strong>Всего профессий:</strong> {professions.length}</span>
          <span><strong>Активных:</strong> {professions.filter(p => p.is_active).length}</span>
        </div>
      </div>
    </div>
  )
}

export default ProfessionList