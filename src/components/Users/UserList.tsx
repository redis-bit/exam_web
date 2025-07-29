import React, { useState } from 'react'
import { UserWithSection, useUsers } from '../../hooks/useUsers'
import './UserList.css'
import './UserList.mobile.css'

interface UserListProps {
  users: UserWithSection[]
  loading: boolean
  onEdit: (user: UserWithSection) => void
  onCreate: () => void
  onRefresh: () => void
  onSync?: () => void
  syncing?: boolean
}

const UserList: React.FC<UserListProps> = ({
  users,
  loading,
  onEdit,
  onCreate,
  onRefresh,
  onSync,
  syncing = false
}) => {
  const { deactivateUser, activateUser, deleteUser } = useUsers()
  const [swipedCard, setSwipedCard] = useState<string | null>(null)
  const [flippedCard, setFlippedCard] = useState<string | null>(null)
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': return 'Администратор'
      case 'admin_assistant': return 'Помощник админа'
      case 'section_chief': return 'Начальник участка'
      default: return role
    }
  }

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

  const handleActivate = async (user: UserWithSection) => {
    if (!window.confirm(`Вы уверены, что хотите активировать пользователя "${user.full_name}"?`)) {
      return
    }

    try {
      await activateUser(user.id)
      alert('Пользователь успешно активирован')
      onRefresh()
    } catch (error) {
      console.error('Ошибка при активации пользователя:', error)
      alert('Ошибка при активации пользователя')
    }
  }

  const handleDelete = async (user: UserWithSection) => {
    if (!window.confirm(`ВНИМАНИЕ! Вы уверены, что хотите ПОЛНОСТЬЮ УДАЛИТЬ пользователя "${user.full_name}"?\n\nЭто действие нельзя отменить!`)) {
      return
    }

    try {
      await deleteUser(user.id)
      alert('Пользователь успешно удален')
      onRefresh()
    } catch (error) {
      console.error('Ошибка при удалении пользователя:', error)
      alert('Ошибка при удалении пользователя')
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
      <div className="loading-container">
        <div className="loading-spinner">Загрузка пользователей...</div>
      </div>
    )
  }

  return (
    <div className="user-list-container">
      <div className="user-list-header">
        <div className="header-actions">
          <button onClick={onRefresh} className="btn-refresh">
            Обновить
          </button>
          {onSync && (
            <button 
              onClick={onSync}
              disabled={syncing}
              className="btn-sync"
            >
              {syncing ? 'Синхронизация...' : 'Синхронизировать'}
            </button>
          )}
          <button onClick={onCreate} className="btn-create-full">
            Добавить пользователя
          </button>
        </div>
      </div>

      {users.length === 0 ? (
        <div className="no-data">
          <h3>Пользователи не найдены</h3>
          <p>Создайте первого пользователя для начала работы</p>
          <button onClick={onCreate} className="btn-create-full">
            Создать пользователя
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>ФИО</th>
                  <th>Email</th>
                  <th>Роль</th>
                  <th>Участок</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className={user.is_active ? 'row-active' : 'row-inactive'}>
                    <td>{user.full_name}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`role-badge role-${user.role}`}>
                        {getRoleText(user.role)}
                      </span>
                    </td>
                    <td>{user.section_name || 'Не назначен'}</td>
                    <td className="actions-cell">
                      <div className="actions-wrapper">
                        <button onClick={() => onEdit(user)} className="btn btn-sm btn-primary">
                          Редактировать
                        </button>
                        {user.role !== 'admin' && (
                          <>
                            {user.is_active ? (
                              <button onClick={() => handleDeactivate(user)} className="btn btn-sm btn-warning">
                                Деактивировать
                              </button>
                            ) : (
                              <button onClick={() => handleActivate(user)} className="btn btn-sm btn-success">
                                Активировать
                              </button>
                            )}
                            <button onClick={() => handleDelete(user)} className="btn btn-sm btn-danger">
                              Удалить
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="mobile-user-cards">
            {users.map(user => {
              const isSwipedOpen = swipedCard === user.id
              const isFlipped = flippedCard === user.id
              
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
                    // Свайп влево - показать кнопки действий
                    setSwipedCard(user.id)
                    setFlippedCard(null)
                  } else {
                    // Свайп вправо - перевернуть карточку
                    setFlippedCard(isFlipped ? null : user.id)
                    setSwipedCard(null)
                  }
                }
                
                setTouchStart(null)
              }

              const handleCardClick = () => {
                if (isSwipedOpen) {
                  setSwipedCard(null)
                }
                if (isFlipped) {
                  setFlippedCard(null)
                }
              }

              const formatDate = (dateString: string | null) => {
                if (!dateString) return 'Никогда'
                return new Date(dateString).toLocaleString('ru-RU', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              }

              return (
                <div 
                  key={user.id} 
                  className={`user-card-wrapper ${isSwipedOpen ? 'swiped-open' : ''} ${isFlipped ? 'flipped' : ''}`}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                  onClick={handleCardClick}
                >
                  <div className={`user-card ${user.is_active ? 'card-active' : 'card-inactive'}`}>
                    <div className="card-front">
                      <div className="card-header">
                        <div className="user-name">{user.full_name}</div>
                        <div className="user-email">{user.email}</div>
                      </div>
                      <div className="card-body">
                        <div className="detail-item">
                          <span className="detail-label">Роль:</span>
                          <span className={`role-badge role-${user.role}`}>
                            {getRoleText(user.role)}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Участок:</span>
                          <span className="detail-value">{user.section_name || 'Не назначен'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="card-back">
                      <div className="card-header">
                        <div className="user-name">{user.full_name}</div>
                        <div className="additional-info-title">Дополнительная информация</div>
                      </div>
                      <div className="card-body">
                        <div className="detail-item">
                          <span className="detail-label">Последний визит:</span>
                          <span className="detail-value">{formatDate(user.last_visit_at)}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Последнее действие:</span>
                          <span className="detail-value">{formatDate(user.last_action_at)}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Статус:</span>
                          <span className={`status-badge ${user.is_active ? 'status-active' : 'status-inactive'}`}>
                            {user.is_active ? 'Активен' : 'Неактивен'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="card-actions-swipe">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit(user)
                        setSwipedCard(null)
                      }} 
                      className="btn btn-primary"
                      title="Редактировать"
                    >
                      Изменить
                    </button>
                    {user.role !== 'admin' && (
                      <>
                        {user.is_active ? (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeactivate(user)
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
                              handleActivate(user)
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
                            handleDelete(user)
                            setSwipedCard(null)
                          }} 
                          className="btn btn-danger"
                          title="Удалить пользователя"
                        >
                          Удалить
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
      <div className="user-stats">
        <strong>Всего пользователей:</strong> {users.length} | 
        <strong> Активных:</strong> {users.filter(u => u.is_active).length} | 
        <strong> Неактивных:</strong> {users.filter(u => !u.is_active).length} |
        <strong> Администраторов:</strong> {users.filter(u => u.role === 'admin').length}
      </div>
    </div>
  )
}

export default UserList