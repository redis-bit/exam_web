import React from 'react'
import { ProfessionTemplateWithExams, useProfessionTemplates } from '../../hooks/useProfessionTemplates'

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
        <p style={{ marginTop: '15px', color: 'var(--text-secondary)' }}>Загрузка профессий...</p>
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
        <h2 style={{ color: 'var(--text-primary)' }}>Управление профессиями</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={onRefresh}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            🔄 Обновить
          </button>
          <button 
            onClick={onManageExams}
            style={{
              padding: '10px 20px',
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            📋 Управление экзаменами
          </button>
          <button 
            onClick={onCreate}
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
            ➕ Добавить профессию
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
                  Название профессии
                </th>
                <th style={{ 
                  padding: '15px', 
                  textAlign: 'left', 
                  borderBottom: '2px solid var(--border-color)',
                  fontWeight: '600',
                  color: 'var(--text-primary)'
                }}>
                  Участок
                </th>
                <th style={{ 
                  padding: '15px', 
                  textAlign: 'left', 
                  borderBottom: '2px solid var(--border-color)',
                  fontWeight: '600',
                  color: 'var(--text-primary)'
                }}>
                  Экзамены
                </th>
                <th style={{ 
                  padding: '15px', 
                  textAlign: 'left', 
                  borderBottom: '2px solid var(--border-color)',
                  fontWeight: '600',
                  color: 'var(--text-primary)'
                }}>
                  Дата создания
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
              {professions.map((profession) => (
                <tr key={profession.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '15px', fontWeight: '500', color: 'var(--text-primary)' }}>
                    {profession.name}
                  </td>
                  <td style={{ padding: '15px', color: 'var(--text-secondary)' }}>
                    {profession.section_name || '—'}
                  </td>
                  <td style={{ padding: '15px' }}>
                    {profession.exams && profession.exams.length > 0 ? (
                      <div style={{ fontSize: '12px' }}>
                        {profession.exams.map((exam, index) => (
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
                  <td style={{ padding: '15px', color: 'var(--text-secondary)' }}>
                    {new Date(profession.created_at).toLocaleDateString('ru-RU')}
                  </td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>
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
      )}

      <div style={{ 
        marginTop: '20px', 
        padding: '15px',
        backgroundColor: 'var(--bg-tertiary)',
        borderRadius: '4px',
        fontSize: '14px',
        color: 'var(--text-secondary)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span><strong>Всего профессий:</strong> {professions.length}</span>
          <span><strong>Активных:</strong> {professions.filter(p => p.is_active).length}</span>
        </div>
      </div>
    </div>
  )
}

export default ProfessionList