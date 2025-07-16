import React from 'react'
import { Section } from '../../types/database'
import { supabase } from '../../lib/supabase'

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
        <p style={{ marginTop: '15px' }}>Загрузка участков...</p>
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
        <h2>Управление участками</h2>
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
            ➕ Добавить участок
          </button>
        </div>
      </div>

      {sections.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px',
          backgroundColor: 'var(--bg-tertiary)',
          borderRadius: '4px',
          border: '1px solid var(--border-color)'
        }}>
          <h3 style={{ color: 'var(--text-primary)' }}>Участки не найдены</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Создайте первый участок для начала работы</p>
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
            Создать участок
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
                  Название участка
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
                  textAlign: 'left', 
                  borderBottom: '2px solid var(--border-color)',
                  fontWeight: '600',
                  color: 'var(--text-primary)'
                }}>
                  Статус
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
              {sections.map((section) => (
                <tr key={section.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '15px', fontWeight: '500', color: 'var(--text-primary)' }}>
                    {section.name}
                  </td>
                  <td style={{ padding: '15px', color: 'var(--text-secondary)' }}>
                    {new Date(section.created_at).toLocaleDateString('ru-RU')}
                  </td>
                  <td style={{ padding: '15px' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500',
                      backgroundColor: section.is_active ? '#d4edda' : '#f8d7da',
                      color: section.is_active ? '#155724' : '#721c24'
                    }}>
                      {section.is_active ? 'Активен' : 'Неактивен'}
                    </span>
                  </td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button
                        onClick={() => onEdit(section)}
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
                      {section.is_active && (
                        <button
                          onClick={() => handleDelete(section)}
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
        backgroundColor: '#e9ecef',
        borderRadius: '4px',
        fontSize: '14px',
        color: '#495057'
      }}>
        <strong>Всего участков:</strong> {sections.length}
      </div>
    </div>
  )
}

export default SectionList