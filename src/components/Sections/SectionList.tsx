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

  const handleDeactivate = async (section: Section) => {
    if (!window.confirm(`Вы уверены, что хотите деактивировать участок "${section.name}"?`)) {
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
      console.error('Ошибка при деактивации участка:', error)
      alert('Ошибка при деактивации участка')
    }
  }

  const handleActivate = async (section: Section) => {
    if (!window.confirm(`Вы уверены, что хотите активировать участок "${section.name}"?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('sections')
        .update({ is_active: true })
        .eq('id', section.id)

      if (error) {
        throw error
      }

      alert('Участок успешно активирован')
      onRefresh()
    } catch (error) {
      console.error('Ошибка при активации участка:', error)
      alert('Ошибка при активации участка')
    }
  }

  const handleDelete = async (section: Section) => {
    // Проверяем все связанные таблицы
    try {
      // Проверяем пользователей
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('section_id', section.id)

      if (usersError) {
        throw usersError
      }

      // Проверяем профессии
      const { data: professions, error: professionsError } = await supabase
        .from('profession_templates')
        .select('id, name')
        .eq('section_id', section.id)

      if (professionsError) {
        throw professionsError
      }

      // Собираем список связанных объектов
      const blockers = []
      
      if (users && users.length > 0) {
        const userNames = users.map(u => u.full_name).join(', ')
        blockers.push(`Пользователи: ${userNames}`)
      }

      if (professions && professions.length > 0) {
        const professionNames = professions.map(p => p.name).join(', ')
        blockers.push(`Профессии: ${professionNames}`)
      }

      if (blockers.length > 0) {
        alert(`Нельзя удалить участок "${section.name}"!\n\nВ этом участке есть:\n${blockers.join('\n')}\n\nСначала переместите их в другие участки или деактивируйте участок.`)
        return
      }

      // Если ничего не связано, можно удалять
      if (!window.confirm(`ВНИМАНИЕ! Вы уверены, что хотите ПОЛНОСТЬЮ УДАЛИТЬ участок "${section.name}"?\n\nЭто действие нельзя отменить!`)) {
        return
      }

      const { error } = await supabase
        .from('sections')
        .delete()
        .eq('id', section.id)

      if (error) {
        throw error
      }

      alert('Участок успешно удален')
      onRefresh()
    } catch (error) {
      console.error('Ошибка при удалении участка:', error)
      
      // Проверяем тип ошибки
      if (error && typeof error === 'object' && 'code' in error && error.code === '23503') {
        alert('Нельзя удалить участок!\n\nНа этот участок ссылаются другие записи в системе (пользователи, профессии и т.д.).\n\nСначала удалите или переместите все связанные записи, или деактивируйте участок.')
      } else {
        alert('Ошибка при удалении участка')
      }
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
                        {section.is_active ? (
                          <button onClick={() => handleDeactivate(section)} className="btn btn-sm btn-warning">
                            Деактивировать
                          </button>
                        ) : (
                          <button onClick={() => handleActivate(section)} className="btn btn-sm btn-success">
                            Активировать
                          </button>
                        )}
                        <button onClick={() => handleDelete(section)} className="btn btn-sm btn-danger">
                          Удалить
                        </button>
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
                    {section.is_active ? (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeactivate(section)
                          setSwipedCard(null)
                        }} 
                        className="btn btn-warning"
                        title="Деактивировать"
                      >
                        Деактивировать
                      </button>
                    ) : (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          handleActivate(section)
                          setSwipedCard(null)
                        }} 
                        className="btn btn-success"
                        title="Активировать"
                      >
                        Активировать
                      </button>
                    )}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(section)
                        setSwipedCard(null)
                      }} 
                      className="btn btn-danger"
                      title="Удалить участок"
                    >
                      Удалить
                    </button>
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