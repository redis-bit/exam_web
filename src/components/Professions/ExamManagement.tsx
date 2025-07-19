import React, { useState } from 'react'
import { Exam } from '../../types/database'
import { useExams } from '../../hooks/useExams'

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
    if (!window.confirm(`Вы уверены, что хотите удалить экзамен "${exam.name}"?`)) {
      return
    }

    try {
      await deleteExam(exam.id)
      alert('Экзамен успешно удален')
      fetchExams()
    } catch (error) {
      console.error('Ошибка при удалении экзамена:', error)
      alert('Ошибка при удалении экзамена')
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

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ 
          display: 'inline-block',
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #007bff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
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
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <h2 style={{ color: 'var(--text-primary)' }}>Управление экзаменами</h2>
        <button 
          onClick={onBack}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          ← Назад к профессиям
        </button>
      </div>

      {currentView === 'list' ? (
        <div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h3 style={{ color: 'var(--text-primary)' }}>Список экзаменов</h3>
            <button 
              onClick={handleCreate}
              style={{
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              ➕ Добавить экзамен
            </button>
          </div>

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
            <div style={{ overflowX: 'auto' }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                backgroundColor: 'var(--bg-secondary)',
                boxShadow: 'var(--shadow)',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <th style={{ 
                      padding: '15px', 
                      textAlign: 'left', 
                      borderBottom: '2px solid var(--border-color)',
                      fontWeight: '600',
                      color: 'var(--text-primary)'
                    }}>
                      Название экзамена
                    </th>
                    <th style={{ 
                      padding: '15px', 
                      textAlign: 'left', 
                      borderBottom: '2px solid var(--border-color)',
                      fontWeight: '600',
                      color: 'var(--text-primary)'
                    }}>
                      Периодичность (мес.)
                    </th>
                    <th style={{ 
                      padding: '15px', 
                      textAlign: 'center', 
                      borderBottom: '2px solid var(--border-color)',
                      fontWeight: '600',
                      color: 'var(--text-primary)'
                    }}>
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {exams.map((exam) => (
                    <tr key={exam.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '15px', fontWeight: '500', color: 'var(--text-primary)' }}>
                        {exam.name}
                      </td>
                      <td style={{ padding: '15px', color: 'var(--text-secondary)' }}>
                        {Math.round(exam.periodicity / 30.44)} мес.
                      </td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
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