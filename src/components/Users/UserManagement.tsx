import React, { useState, useEffect } from 'react'
import { UserWithSection } from '../../hooks/useUsers'
import { useAuth } from '../../hooks/useAuth'
import { useUsers } from '../../hooks/useUsers'
import UserList from './UserList'
import UserForm from './UserForm'

const UserManagement: React.FC = () => {
  const { user, refreshUserData } = useAuth()
  const { users, loading, error, fetchUsers, syncAuthUsers, syncLastSignInTimes, updateUserInList } = useUsers()
  const [currentView, setCurrentView] = useState<'list' | 'create' | 'edit'>('list')
  const [editingUser, setEditingUser] = useState<UserWithSection | null>(null)
  const [syncing, setSyncing] = useState(false)

  // Автоматическая синхронизация времени входа при загрузке компонента
  useEffect(() => {
    const syncVisitTimesOnLoad = async () => {
      if (user?.role === 'admin') {
        try {
          await syncLastSignInTimes()
          console.log('Время последнего входа синхронизировано автоматически')
        } catch (error) {
          console.warn('Не удалось синхронизировать время входа:', error)
        }
      }
    }

    syncVisitTimesOnLoad()
  }, [user?.role, syncLastSignInTimes])

  // Проверяем права доступа - только администраторы могут управлять пользователями
  if (user?.role !== 'admin') {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        backgroundColor: '#fff3cd',
        border: '1px solid #ffeaa7',
        borderRadius: '4px',
        color: '#856404'
      }}>
        <h3>Доступ запрещен</h3>
        <p>Только администраторы могут управлять пользователями.</p>
      </div>
    )
  }

  const handleCreate = () => {
    setEditingUser(null)
    setCurrentView('create')
  }

  const handleEdit = (user: UserWithSection) => {
    setEditingUser(user)
    setCurrentView('edit')
  }

  const handleFormSuccess = async () => {
    setCurrentView('list')
    setEditingUser(null)
    
    // Если редактировали текущего пользователя, обновляем его данные в useAuth
    if (editingUser?.id === user?.id) {
      const updatedUserData = await refreshUserData()
      if (updatedUserData) {
        updateUserInList(updatedUserData)
      }
    }
    
    fetchUsers() // Обновляем список
  }

  const handleCancel = () => {
    setCurrentView('list')
    setEditingUser(null)
  }

  const handleSyncUsers = async () => {
    try {
      setSyncing(true)
      const result = await syncAuthUsers()
      if (result.success) {
        if (result.syncedCount > 0) {
          const emailsList = result.syncedEmails?.join('\n- ') || ''
          alert(`Синхронизация завершена!\n\nДобавлено пользователей: ${result.syncedCount}\n\nПользователи:\n- ${emailsList}`)
        } else {
          alert('Синхронизация завершена!\n\nВсе пользователи уже синхронизированы.')
        }
        fetchUsers() // Обновляем список
      }
    } catch (error) {
      console.error('Ошибка синхронизации:', error)
      alert(`Ошибка при синхронизации пользователей:\n${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
    } finally {
      setSyncing(false)
    }
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
          onClick={fetchUsers}
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
    <div style={{
      backgroundColor: 'var(--bg-secondary)',
      padding: '30px',
      borderRadius: '8px',
      boxShadow: 'var(--shadow)',
      color: 'var(--text-primary)'
    }}>
      {currentView === 'list' ? (
        <UserList
          users={users}
          loading={loading}
          onEdit={handleEdit}
          onCreate={handleCreate}
          onRefresh={fetchUsers}
          onSync={handleSyncUsers}
          syncing={syncing}
        />
      ) : (
        <UserForm
          user={editingUser}
          onSuccess={handleFormSuccess}
          onCancel={handleCancel}
        />
      )}
    </div>
  )
}

export default UserManagement