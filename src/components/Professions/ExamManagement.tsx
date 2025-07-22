import React, { useState } from 'react'
import { Exam } from '../../types/database'
import { useExams } from '../../hooks/useExams'
import { supabase } from '../../lib/supabase'
import './ExamManagement.css'
import './ExamManagement.mobile.css'

interface ExamManagementProps {
  onBack: () => void
}

const ExamManagement: React.FC<ExamManagementProps> = ({ onBack }) => {
  const { exams, loading, error, fetchExams, createExam, updateExam, deleteExam } = useExams()
  const [currentView, setCurrentView] = useState<'list' | 'create' | 'edit'>('list')
  const [editingExam, setEditingExam] = useState<Exam | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    periodicity: 12
  })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [swipedCard, setSwipedCard] = useState<string | null>(null)

  const handleCreate = () => {
    setEditingExam(null)
    setFormData({ name: '', periodicity: 12 })
    setCurrentView('create')
  }

  const handleEdit = (exam: Exam) => {
    setEditingExam(exam)
    setFormData({ 
      name: exam.name, 
      periodicity: Math.round(exam.periodicity / 30.44) // Конвертируем дни в месяцы для отображения (365.25/12)
    })
    setCurrentView('edit')
  }

  const handleDelete = async (exam: Exam) => {
    // Проверяем все связанные таблицы
    try {
      // Проверяем сотрудников, которые сдавали этот экзамен
      const { data: employeeExams, error: employeeExamsError } = await supabase
        .from('employee_exams')
        .select(`
          id,
          employees (
            id,
            full_name,
            is_active
          )
        `)
        .eq('exam_id', exam.id)

      if (employeeExamsError) {
        throw employeeExamsError
      }

      // Проверяем профессии, которые используют этот экзамен
      const { data: professionExams, error: professionExamsError } = await supabase
        .from('profession_exams')
        .select(`
          id,
          profession_templates (
            id,
            name,
            is_active
          )
        `)
        .eq('exam_id', exam.id)

      if (professionExamsError) {
        throw professionExamsError
      }

      // Проверяем заявки на одобрение, связанные с этим экзаменом
      const { data: approvalRequests, error: approvalRequestsError } = await supabase
        .from('approval_requests')
        .select('id, status')
        .eq('exam_id', exam.id)

      if (approvalRequestsError) {
        throw approvalRequestsError
      }

      // Собираем список связанных объектов
      const blockers = []
      
      if (employeeExams && employeeExams.length > 0) {
        const activeEmployees = employeeExams.filter(ee => (ee as any).employees?.is_active)
        const inactiveEmployees = employeeExams.filter(ee => !(ee as any).employees?.is_active)
        
        if (activeEmployees.length > 0) {
          const employeeNames = activeEmployees.map(ee => (ee as any).employees?.full_name).join(', ')
          blockers.push(`Активные сотрудники: ${employeeNames}`)
        }
        
        if (inactiveEmployees.length > 0) {
          const inactiveNames = inactiveEmployees.map(ee => (ee as any).employees?.full_name).join(', ')
          console.log(`Найдены записи экзаменов неактивных сотрудников:`, inactiveNames)
          
          if (activeEmployees.length === 0) {
            const shouldDeleteInactive = window.confirm(
              `Экзамен "${exam.name}" связан с неактивными сотрудниками: ${inactiveNames}\n\nХотите удалить эти записи экзаменов и затем удалить сам экзамен?`
            )
            
            if (shouldDeleteInactive) {
              // Удаляем записи экзаменов неактивных сотрудников
              for (const ee of inactiveEmployees) {
                await supabase
                  .from('employee_exams')
                  .delete()
                  .eq('id', ee.id)
              }
              alert(`Удалены записи экзаменов неактивных сотрудников`)
            } else {
              return
            }
          } else {
            blockers.push(`Неактивные сотрудники: ${inactiveNames}`)
          }
        }
      }

      if (professionExams && professionExams.length > 0) {
        const activeProfessions = professionExams.filter(pe => (pe as any).profession_templates?.is_active)
        const inactiveProfessions = professionExams.filter(pe => !(pe as any).profession_templates?.is_active)
        
        if (activeProfessions.length > 0) {
          const professionNames = activeProfessions.map(pe => (pe as any).profession_templates?.name).join(', ')
          blockers.push(`Активные профессии: ${professionNames}`)
        }
        
        if (inactiveProfessions.length > 0) {
          const inactiveNames = inactiveProfessions.map(pe => (pe as any).profession_templates?.name).join(', ')
          console.log(`Найдены связи с неактивными профессиями:`, inactiveNames)
          
          if (activeProfessions.length === 0 && blockers.length === 0) {
            const shouldDeleteInactive = window.confirm(
              `Экзамен "${exam.name}" связан с неактивными профессиями: ${inactiveNames}\n\nХотите удалить эти связи и затем удалить экзамен?`
            )
            
            if (shouldDeleteInactive) {
              // Удаляем связи с неактивными профессиями
              for (const pe of inactiveProfessions) {
                await supabase
                  .from('profession_exams')
                  .delete()
                  .eq('id', pe.id)
              }
              alert(`Удалены связи с неактивными профессиями`)
            } else {
              return
            }
          } else if (activeProfessions.length > 0) {
            blockers.push(`Неактивные профессии: ${inactiveNames}`)
          }
        }
      }

      // Проверяем заявки на одобрение
      if (approvalRequests && approvalRequests.length > 0) {
        const pendingRequests = approvalRequests.filter(ar => ar.status === 'pending')
        const completedRequests = approvalRequests.filter(ar => ar.status !== 'pending')
        
        if (pendingRequests.length > 0) {
          blockers.push(`Активные заявки на одобрение: ${pendingRequests.length} шт.`)
        }
        
        if (completedRequests.length > 0) {
          console.log(`Найдены завершенные заявки на одобрение для экзамена "${exam.name}":`, completedRequests.length)
          
          if (pendingRequests.length === 0 && blockers.length === 0) {
            const shouldDeleteRequests = window.confirm(
              `Экзамен "${exam.name}" связан с ${completedRequests.length} завершенными заявками на одобрение.\n\nХотите удалить эти заявки и затем удалить экзамен?\n\nВНИМАНИЕ: Это удалит историю заявок!`
            )
            
            if (shouldDeleteRequests) {
              // Удаляем завершенные заявки
              for (const request of completedRequests) {
                await supabase
                  .from('approval_requests')
                  .delete()
                  .eq('id', request.id)
              }
              alert(`Удалены завершенные заявки на одобрение: ${completedRequests.length} шт.`)
            } else {
              return
            }
          } else if (pendingRequests.length > 0) {
            blockers.push(`Завершенные заявки: ${completedRequests.length} шт.`)
          }
        }
      }

      if (blockers.length > 0) {
        alert(`Нельзя удалить экзамен "${exam.name}"!\n\nЭтот экзамен используется:\n${blockers.join('\n')}\n\nСначала удалите связи или деактивируйте связанные записи.`)
        return
      }

      // Если ничего не связано, можно удалять
      if (!window.confirm(`ВНИМАНИЕ! Вы уверены, что хотите ПОЛНОСТЬЮ УДАЛИТЬ экзамен "${exam.name}"?\n\nЭто действие нельзя отменить!`)) {
        return
      }

      await deleteExam(exam.id)
      alert('Экзамен успешно удален')
      fetchExams()
    } catch (error) {
      console.error('Ошибка при удалении экзамена:', error)
      
      // Проверяем тип ошибки
      if (error && typeof error === 'object' && 'code' in error && error.code === '23503') {
        alert('Нельзя удалить экзамен!\n\nНа этот экзамен ссылаются другие записи в системе (сотрудники, профессии и т.д.).\n\nСначала удалите связи или деактивируйте связанные записи.')
      } else {
        alert('Ошибка при удалении экзамена')
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      setFormError('Название экзамена обязательно для заполнения')
      return
    }

    if (formData.periodicity < 1) {
      setFormError('Периодичность должна быть больше 0')
      return
    }

    setFormLoading(true)
    setFormError(null)

    try {
      if (editingExam) {
        await updateExam(editingExam.id, {
          name: formData.name.trim(),
          periodicity: Math.round(formData.periodicity * 30.44) // Конвертируем месяцы в дни (365.25/12)
        })
        alert('Экзамен успешно обновлен')
      } else {
        await createExam({
          name: formData.name.trim(),
          periodicity: Math.round(formData.periodicity * 30.44) // Конвертируем месяцы в дни (365.25/12)
        })
        alert('Экзамен успешно создан')
      }

      setCurrentView('list')
      setEditingExam(null)
      fetchExams()
    } catch (error: any) {
      console.error('Ошибка при сохранении экзамена:', error)
      setFormError(error.message || 'Произошла ошибка при сохранении')
    } finally {
      setFormLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }))
    
    if (formError) {
      setFormError(null)
    }
  }

  // Обработка свайпов для мобильных устройств
  const handleTouchStart = (e: React.TouchEvent, examId: string) => {
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
          setSwipedCard(swipedCard === examId ? null : examId)
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

  const handleCardClick = (examId: string) => {
    // Закрываем все открытые состояния при клике на карточку
    setSwipedCard(null)
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div className="loading-spinner"></div>
        <p style={{ marginTop: '15px', color: 'var(--text-secondary)' }}>Загрузка экзаменов...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        backgroundColor: '#f8d7da',
        border: '1px solid #f5c6cb',
        borderRadius: '4px',
        color: '#721c24'
      }}>
        <h3>Ошибка загрузки</h3>
        <p>{error}</p>
        <button 
          onClick={fetchExams}
          style={{
            padding: '8px 16px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Попробовать снова
        </button>
      </div>
    )
  }

  return (
    <div className="exam-management-container">
      <div className="exam-management-header">
        <div className="header-actions">
          <button 
            onClick={onBack}
            className="btn-back"
          >
            ← Назад к профессиям
          </button>
          <button 
            onClick={handleCreate}
            className="btn-add-exam"
          >
            ➕ Добавить экзамен
          </button>
        </div>
      </div>

      {currentView === 'list' ? (
        <div>

          {exams.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px',
              backgroundColor: 'var(--bg-tertiary)',
              borderRadius: '4px',
              border: '1px solid var(--border-color)'
            }}>
              <h3 style={{ color: 'var(--text-primary)' }}>Экзамены не найдены</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Создайте первый экзамен для начала работы</p>
              <button 
                onClick={handleCreate}
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
                Создать экзамен
              </button>
            </div>
          ) : (
            <>
              {/* Десктопная таблица */}
              <div style={{ overflowX: 'auto' }}>
                <table className="exams-table">
                  <thead>
                    <tr>
                      <th>Название экзамена</th>
                      <th>Периодичность (мес.)</th>
                      <th style={{ textAlign: 'center' }}>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exams.map((exam) => (
                      <tr key={exam.id}>
                        <td style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                          {exam.name}
                        </td>
                        <td>{Math.round(exam.periodicity / 30.44)} мес.</td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                              onClick={() => handleEdit(exam)}
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
                            >
                              ✏️ Редактировать
                            </button>
                            <button
                              onClick={() => handleDelete(exam)}
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
              <div className="mobile-exam-cards">
                {exams.map((exam) => (
                  <div 
                    key={exam.id} 
                    className={`exam-card-wrapper ${swipedCard === exam.id ? 'swiped-left' : ''}`}
                  >
                    <div 
                      className="exam-card"
                      onTouchStart={(e) => handleTouchStart(e, exam.id)}
                      onClick={() => handleCardClick(exam.id)}
                    >
                      <div className="card-header">
                        <div className="exam-name">{exam.name}</div>
                      </div>
                      <div className="card-body">
                        <div className="detail-item">
                          <span className="detail-label">Периодичность:</span>
                          <span className="detail-value">{Math.round(exam.periodicity / 30.44)} мес.</span>
                        </div>
                      </div>
                    </div>

                    {/* Кнопки действий при свайпе влево */}
                    <div className="card-actions-swipe">
                      <button
                        className="btn btn-primary"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEdit(exam)
                          setSwipedCard(null)
                        }}
                      >
                        ✏️ Редактировать
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(exam)
                          setSwipedCard(null)
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
        </div>
      ) : (
        <div>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '20px' }}>
            {editingExam ? 'Редактирование экзамена' : 'Создание нового экзамена'}
          </h3>

          {formError && (
            <div style={{
              padding: '15px',
              backgroundColor: '#f8d7da',
              color: '#721c24',
              border: '1px solid #f5c6cb',
              borderRadius: '4px',
              marginBottom: '20px'
            }}>
              <strong>Ошибка:</strong> {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ maxWidth: '400px' }}>
            <div style={{ marginBottom: '20px' }}>
              <label 
                htmlFor="name"
                style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500',
                  color: 'var(--text-primary)'
                }}
              >
                Название экзамена *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Введите название экзамена"
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid var(--input-border)',
                  borderRadius: '4px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            <div style={{ marginBottom: '30px' }}>
              <label 
                htmlFor="periodicity"
                style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500',
                  color: 'var(--text-primary)'
                }}
              >
                Периодичность (месяцы) *
              </label>
              <input
                type="number"
                id="periodicity"
                name="periodicity"
                value={formData.periodicity}
                onChange={handleInputChange}
                min="1"
                max="120"
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid var(--input-border)',
                  borderRadius: '4px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-primary)'
                }}
              />
              <small style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                Через сколько месяцев нужно пересдавать экзамен
              </small>
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
              <button
                type="submit"
                disabled={formLoading}
                style={{
                  padding: '12px 24px',
                  backgroundColor: formLoading ? '#6c757d' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: formLoading ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                  fontSize: '16px'
                }}
              >
                {formLoading ? 'Сохранение...' : (editingExam ? 'Обновить экзамен' : 'Создать экзамен')}
              </button>
              
              <button
                type="button"
                onClick={() => setCurrentView('list')}
                disabled={formLoading}
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'transparent',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  cursor: formLoading ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                  fontSize: '16px'
                }}
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default ExamManagement