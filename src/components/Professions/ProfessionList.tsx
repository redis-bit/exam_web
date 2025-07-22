import React, { useState } from 'react'
import { ProfessionTemplateWithExams, useProfessionTemplates } from '../../hooks/useProfessionTemplates'
import { supabase } from '../../lib/supabase'
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
  const { deactivateProfessionTemplate, activateProfessionTemplate, deleteProfessionTemplate } = useProfessionTemplates()
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

  const handleActivate = async (profession: ProfessionTemplateWithExams) => {
    if (!window.confirm(`Вы уверены, что хотите активировать профессию "${profession.name}"?`)) {
      return
    }

    try {
      await activateProfessionTemplate(profession.id)
      alert('Профессия успешно активирована')
      onRefresh()
    } catch (error) {
      console.error('Ошибка при активации профессии:', error)
      alert('Ошибка при активации профессии')
    }
  }

  const handleDelete = async (profession: ProfessionTemplateWithExams) => {
    // Проверяем все связанные таблицы
    try {
      // Проверяем активных сотрудников с этой профессией
      const { data: activeEmployees, error: activeEmployeesError } = await supabase
        .from('employees')
        .select('id, full_name, is_active')
        .eq('profession_template_id', profession.id)
        .eq('is_active', true)

      if (activeEmployeesError) {
        throw activeEmployeesError
      }

      // Проверяем всех сотрудников (включая неактивных) для диагностики
      const { data: allEmployees, error: allEmployeesError } = await supabase
        .from('employees')
        .select('id, full_name, is_active')
        .eq('profession_template_id', profession.id)

      if (allEmployeesError) {
        throw allEmployeesError
      }

      // Собираем список связанных объектов
      const blockers = []
      
      if (activeEmployees && activeEmployees.length > 0) {
        const employeeNames = activeEmployees.map(e => e.full_name).join(', ')
        blockers.push(`Активные сотрудники: ${employeeNames}`)
      }

      // Показываем информацию о неактивных сотрудниках для диагностики
      const inactiveEmployees = allEmployees?.filter(e => !e.is_active) || []
      if (inactiveEmployees.length > 0) {
        const inactiveNames = inactiveEmployees.map(e => e.full_name).join(', ')
        console.log(`Найдены неактивные сотрудники с профессией "${profession.name}":`, inactiveNames)
        
        // Если есть только неактивные сотрудники, предлагаем их полностью удалить
        if (activeEmployees.length === 0) {
          const shouldDeleteInactive = window.confirm(
            `Профессия "${profession.name}" назначена неактивным сотрудникам: ${inactiveNames}\n\nХотите полностью удалить этих сотрудников из базы данных и затем удалить профессию?`
          )
          
          if (shouldDeleteInactive) {
            // Удаляем неактивных сотрудников
            for (const employee of inactiveEmployees) {
              await supabase
                .from('employees')
                .delete()
                .eq('id', employee.id)
            }
            alert(`Удалены неактивные сотрудники: ${inactiveNames}`)
          } else {
            return
          }
        } else {
          blockers.push(`Неактивные сотрудники: ${inactiveNames}`)
        }
      }

      if (blockers.length > 0) {
        alert(`Нельзя удалить профессию "${profession.name}"!\n\nЭта профессия назначена:\n${blockers.join('\n')}\n\nСначала измените профессию у сотрудников или деактивируйте профессию.`)
        return
      }

      // Если ничего не связано, можно удалять
      if (!window.confirm(`ВНИМАНИЕ! Вы уверены, что хотите ПОЛНОСТЬЮ УДАЛИТЬ профессию "${profession.name}"?\n\nЭто действие нельзя отменить!`)) {
        return
      }

      await deleteProfessionTemplate(profession.id)
      alert('Профессия успешно удалена')
      onRefresh()
    } catch (error) {
      console.error('Ошибка при удалении профессии:', error)
      
      // Проверяем тип ошибки
      if (error && typeof error === 'object' && 'code' in error && error.code === '23503') {
        alert('Нельзя удалить профессию!\n\nНа эту профессию ссылаются другие записи в системе (сотрудники и т.д.).\n\nСначала измените профессию у сотрудников или деактивируйте профессию.')
      } else {
        alert('Ошибка при удалении профессии')
      }
    }
  }

  // Обработка свайпов для мобильных устройств
  const handleTouchStart = (e: React.TouchEvent, professionId: string) => {
    const touch = e.touches[0]
    const startX = touch.clientX
    const startY = touch.clientY
    let moved = false
    let canPreventDefault = true

    const handleTouchMove = (e: TouchEvent) => {
      if (moved) return
      
      const touch = e.touches[0]
      const deltaX = touch.clientX - startX
      const deltaY = touch.clientY - startY

      // Проверяем, что это горизонтальный свайп
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 30) {
        moved = true
        
        // Пытаемся предотвратить прокрутку только если это возможно
        if (canPreventDefault && e.cancelable) {
          e.preventDefault()
        }

        if (deltaX < -30) {
          // Свайп влево - показать кнопки действий
          setSwipedCard(swipedCard === professionId ? null : professionId)
          setFlippedCard(null)
        } else if (deltaX > 30) {
          // Свайп вправо - перевернуть карточку
          setFlippedCard(flippedCard === professionId ? null : professionId)
          setSwipedCard(null)
        }
      } else if (Math.abs(deltaY) > 10) {
        // Если это вертикальный свайп, не мешаем прокрутке
        canPreventDefault = false
      }
    }

    const handleTouchEnd = () => {
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }

    document.addEventListener('touchmove', handleTouchMove, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })
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
                        {profession.is_active ? (
                          <button
                            onClick={() => handleDeactivate(profession)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#ffc107',
                              color: '#212529',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '500'
                            }}
                            title="Деактивировать"
                          >
                            ⚠️ Деактивировать
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivate(profession)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '500'
                            }}
                            title="Активировать"
                          >
                            ✅ Активировать
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(profession)}
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
                          title="Удалить"
                        >
                          🗑️ Удалить
                        </button>
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
                  {profession.is_active ? (
                    <button
                      className="btn btn-warning"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeactivate(profession)
                      }}
                    >
                      ⚠️ Деактивировать
                    </button>
                  ) : (
                    <button
                      className="btn btn-success"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleActivate(profession)
                      }}
                    >
                      ✅ Активировать
                    </button>
                  )}
                  <button
                    className="btn btn-danger"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(profession)
                    }}
                  >
                    🗑️ Удалить
                  </button>
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