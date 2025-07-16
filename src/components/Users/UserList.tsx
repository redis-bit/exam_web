import React from 'react'
import { UserWithSection, useUsers } from '../../hooks/useUsers'

interface UserListProps {
  users: UserWithSection[]
  loading: boolean
  onEdit: (user: UserWithSection) => void
  onCreate: () => void
  onRefresh: () => void
}

const UserList: React.FC<UserListProps> = ({
  users,
  loading,
  onEdit,
  onCreate,
  onRefresh
}) => {
  const { deactivateUser } = useUsers()

  const handleDeactivate = async (user: UserWithSection) => {
    if (!window.confirm(`Вы уверены, что хотите деактивировать пользователя "${user.full_name}"?`)) {
      return
    }

    try {
      await deactivateUser(user.id)
      alert('Пользователь успешно деактивирован')
      onRefresh()
    } catch (error) {
      console.error('Ошибка при деактивации пользователя:', error)
      alert('Ошибка при деактивации пользователя')
    }
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Администратор'
      case 'admin_assistant':
        return 'Помощник администратора'
      case 'section_chief':
        return 'Начальник участка'
      default:
        return role
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return { backgroundColor: '#dc3545', color: 'white' }
      case 'admin_assistant':
        return { backgroundColor: '#fd7e14', color: 'white' }
      case 'section_chief':
        return { backgroundColor: '#007bff', color: 'white' }
      default:
        return { backgroundColor: '#6c757d', color: 'white' }
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
        <p style={{ marginTop: '15px' }}>Загрузка пользователей...</p>
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
        <h2>Управление пользователями</h2>
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
            ➕ Добавить пользователя
          </button>
        </div>
      </div>

      {users.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px',
          backgroundColor: 'var(--bg-tertiary)',
          borderRadius: '4px',
          border: '1px solid var(--border-color)'
        }}>
          <h3 style={{ color: 'var(--text-primary)' }}>Пользователи не найдены</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Создайте первого пользователя для начала работы</p>
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
            Создать пользователя
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
                  ФИО
                </th>
                <th style={{ 
                  padding: '15px', 
                  textAlign: 'left', 
                  borderBottom: '2px solid var(--border-color)',
                  fontWeight: '600',
                  color: 'var(--text-primary)'
                }}>
                  Email
                </th>
                <th style={{ 
                  padding: '15px', 
                  textAlign: 'left', 
                  borderBottom: '2px solid var(--border-color)',
                  fontWeight: '600',
                  color: 'var(--text-primary)'
                }}>
                  Роль
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
                  Активность
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
              {users.map((user) => (
                <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '15px', fontWeight: '500', color: 'var(--text-primary)' }}>
                    {user.full_name}
                  </td>
                  <td style={{ padding: '15px', color: 'var(--text-secondary)' }}>
                    {user.email}
                  </td>
                  <td style={{ padding: '15px' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500',
                      ...getRoleBadgeColor(user.role)
                    }}>
                      {getRoleDisplayName(user.role)}
                    </span>
                  </td>
                  <td style={{ padding: '15px', color: 'var(--text-secondary)' }}>
                    {user.section_name || '—'}
                  </td>
                  <td style={{ padding: '15px' }}>
                    <div style={{ fontSize: '12px' }}>
                      {user.last_visit_at ? (
                        <div>
                          <div style={{ color: '#28a745', fontWeight: '500' }}>
                            Последний визит:
                          </div>
                          <div style={{ color: '#6c757d' }}>
                            {new Date(user.last_visit_at).toLocaleDateString('ru-RU')}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: '#6c757d' }}>Не заходил</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button
                        onClick={() => onEdit(user)}
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
                      {user.is_active && (
                        <button
                          onClick={() => handleDeactivate(user)}
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
                          🚫 Деактивировать
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
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span><strong>Всего пользователей:</strong> {users.length}</span>
          <span><strong>Активных:</strong> {users.filter(u => u.is_active).length}</span>
        </div>
      </div>
    </div>
  )
}

export default UserList