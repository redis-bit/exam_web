import React, { useState } from 'react'
import { Section } from '../../types/database'
import { supabase } from '../../lib/supabase'
import './SectionList.css'
import './SectionList.mobile.css'

interface SectionListProps {
  sections: Section[]
  loading: boolean
  onEdit: (section: Section) => void
  onCreate: () => void
  onRefresh: () => void
}

const SectionList: React.FC<SectionListProps> = ({
  sections,
  loading,
  onEdit,
  onCreate,
  onRefresh
}) => {
  const [swipedCard, setSwipedCard] = useState<string | null>(null)
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)

  const handleDelete = async (section: Section) => {
    if (!window.confirm(`Вы уверены, что хотите удалить участок "${section.name}"?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('sections')
        .update({ is_active: false })
        .eq('id', section.id)

      if (error) {
        throw error
      }

      alert('Участок успешно деактивирован')
      onRefresh()
    } catch (error) {
      console.error('Ошибка при удалении участка:', error)
      alert('Ошибка при удалении участка')
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Загрузка участков...</div>
      </div>
    )
  }

  return (
    <div className="section-list-container">
      <div className="section-list-header">
        <div className="header-actions">
          <button onClick={onRefresh} className="btn-refresh">
            Обновить
          </button>
          <button onClick={onCreate} className="btn-create-full">
            Добавить участок
          </button>
        </div>
      </div>

      {sections.length === 0 ? (
        <div className="no-data">
          <h3>Участки не найдены</h3>
          <p>Создайте первый участок для начала работы</p>
          <button onClick={onCreate} className="btn-create-full">
            Создать участок
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="table-container">
            <table className="sections-table">
              <thead>
                <tr>
                  <th>Название участка</th>
                  <th>Дата создания</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {sections.map((section) => (
                  <tr key={section.id} className={section.is_active ? 'row-active' : 'row-inactive'}>
                    <td>{section.name}</td>
                    <td>{new Date(section.created_at).toLocaleDateString('ru-RU')}</td>
                    <td className="actions-cell">
                      <div className="actions-wrapper">
                        <button onClick={() => onEdit(section)} className="btn btn-sm btn-primary">
                          Редактировать
                        </button>
                        {section.is_active && (
                          <button onClick={() => handleDelete(section)} className="btn btn-sm btn-danger">
                            Удалить
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="mobile-section-cards">
            {sections.map(section => {
              const isSwipedOpen = swipedCard === section.id
              
              const handleTouchStart = (e: React.TouchEvent) => {
                const touch = e.touches[0]
                setTouchStart({ x: touch.clientX, y: touch.clientY })
              }

              const handleTouchEnd = (e: React.TouchEvent) => {
                if (!touchStart) return
                
                const touch = e.changedTouches[0]
                const deltaX = touchStart.x - touch.clientX
                const deltaY = Math.abs(touchStart.y - touch.clientY)
                
                if (deltaY < 50 && Math.abs(deltaX) > 50) {
                  if (deltaX > 0) {
                    setSwipedCard(section.id)
                  } else {
                    setSwipedCard(null)
                  }
                }
                
                setTouchStart(null)
              }

              const handleCardClick = () => {
                if (isSwipedOpen) {
                  setSwipedCard(null)
                }
              }

              return (
                <div 
                  key={section.id} 
                  className={`section-card-wrapper ${isSwipedOpen ? 'swiped-open' : ''}`}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                  onClick={handleCardClick}
                >
                  <div className={`section-card ${section.is_active ? 'card-active' : 'card-inactive'}`}>
                    <div className="card-header">
                      <div className="section-name">{section.name}</div>
                    </div>
                    <div className="card-body">
                      <div className="detail-item">
                        <span className="detail-label">Дата создания:</span>
                        <span className="detail-value">{new Date(section.created_at).toLocaleDateString('ru-RU')}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="card-actions-swipe">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit(section)
                        setSwipedCard(null)
                      }} 
                      className="btn btn-primary"
                      title="Редактировать"
                    >
                      Изменить
                    </button>
                    {section.is_active && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(section)
                          setSwipedCard(null)
                        }} 
                        className="btn btn-danger"
                        title="Удалить"
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      <div className="section-stats">
        <strong>Всего участков:</strong> {sections.length} | 
        <strong> Активных:</strong> {sections.filter(s => s.is_active).length} | 
        <strong> Неактивных:</strong> {sections.filter(s => !s.is_active).length}
      </div>
    </div>
  )
}

export default SectionList