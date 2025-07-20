import React, { useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { testSupabaseConnection, testDatabaseTables } from '../../utils/testConnection'
import { useAuth } from '../../hooks/useAuth'
import EmployeeManagement from '../Employees/EmployeeManagement'
import SectionManagement from '../Sections/SectionManagement'
import UserManagement from '../Users/UserManagement'
import ThemeToggle from '../ThemeToggle/ThemeToggle'
import ProfessionManagement from '../Professions/ProfessionManagement'
import AnalyticsDashboard from '../Analytics/AnalyticsDashboard'
import UserNotifications from '../Notifications/UserNotifications'
import ApprovalPanel from '../Approvals/ApprovalPanel'
import NotificationBadge from '../Notifications/NotificationBadge'
import AutoNotificationModal from '../Notifications/AutoNotificationModal'
import NewsManagement from '../News/NewsManagement'
import NewsWidget from '../News/NewsWidget'
import { useAutoNotifications } from '../../hooks/useAutoNotifications'

interface DashboardProps {
  session: Session
}

const Dashboard: React.FC<DashboardProps> = ({ session }) => {
  const { user, loading: authLoading } = useAuth()
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking')
  const [currentView, setCurrentView] = useState<'dashboard' | 'employees' | 'sections' | 'users' | 'professions' | 'analytics' | 'notifications' | 'approvals' | 'news'>('dashboard')
  
  
  // Автоматические уведомления
  const {
    showAutoModal,
    unreadNotifications,
    handleMarkAsRead,
    handleMarkAllAsRead,
    handleCloseModal
  } = useAutoNotifications()

  // Отладка автоуведомлений
  useEffect(() => {
    console.log('📊 Dashboard - состояние автоуведомлений:', {
      showAutoModal,
      unreadCount: unreadNotifications.length,
      user: !!user
    })
  }, [showAutoModal, unreadNotifications, user])

  useEffect(() => {
    checkConnection()
  }, [])

  const checkConnection = async () => {
    setConnectionStatus('checking')
    const isConnected = await testSupabaseConnection()
    setConnectionStatus(isConnected ? 'connected' : 'error')
    
    if (isConnected) {
      // Проверяем таблицы и сохраняем результат в консоли
      await testDatabaseTables()
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  if (authLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Загрузка данных пользователя...</div>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px' }}>
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '30px',
        padding: '20px',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: '8px',
        boxShadow: 'var(--shadow)',
        color: 'var(--text-primary)'
      }}>
        <h1>Система учёта экзаменов работников</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span>
            Добро пожаловать, {user?.full_name || session.user.email}
            {user?.role && (
              <span style={{ 
                marginLeft: '8px', 
                padding: '2px 8px', 
                backgroundColor: '#e3f2fd', 
                color: '#1976d2',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '500'
              }}>
                {user.role === 'admin' ? 'Администратор' : 
                 user.role === 'admin_assistant' ? 'Помощник администратора' : 
                 'Начальник участка'}
              </span>
            )}
          </span>
          <NotificationBadge 
            onClick={() => {
              // Для администраторов переходим сразу в подтверждения
              const isAdmin = user?.role && ['admin', 'admin_assistant'].includes(user.role)
              setCurrentView(isAdmin ? 'approvals' : 'notifications')
            }}
            className="notification-badge-header"
          />
          <ThemeToggle />
          <button 
            onClick={handleLogout}
            className="btn"
            style={{ 
              backgroundColor: '#dc3545', 
              color: 'white',
              padding: '8px 16px'
            }}
          >
            Выйти
          </button>
        </div>
      </header>

      {/* Навигация */}
      <nav style={{
        backgroundColor: 'var(--bg-secondary)',
        padding: '15px 20px',
        borderRadius: '8px',
        boxShadow: 'var(--shadow)',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', gap: '20px' }}>
          <button
            onClick={() => setCurrentView('dashboard')}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: currentView === 'dashboard' ? '#007bff' : 'var(--bg-tertiary)',
              color: currentView === 'dashboard' ? 'white' : 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            📊 Главная
          </button>
          <button
            onClick={() => setCurrentView('employees')}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: currentView === 'employees' ? '#007bff' : 'var(--bg-tertiary)',
              color: currentView === 'employees' ? 'white' : 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            👥 Работники
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => setCurrentView('sections')}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: currentView === 'sections' ? '#007bff' : 'var(--bg-tertiary)',
                color: currentView === 'sections' ? 'white' : 'var(--text-primary)',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
            >
              🏢 Участки
            </button>
          )}
          {user?.role === 'admin' && (
            <button
              onClick={() => setCurrentView('users')}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: currentView === 'users' ? '#007bff' : 'var(--bg-tertiary)',
                color: currentView === 'users' ? 'white' : 'var(--text-primary)',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
            >
              👤 Пользователи
            </button>
          )}
          {user?.role === 'admin' && (
            <button
              onClick={() => setCurrentView('professions')}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: currentView === 'professions' ? '#007bff' : 'var(--bg-tertiary)',
                color: currentView === 'professions' ? 'white' : 'var(--text-primary)',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
            >
              🔧 Профессии
            </button>
          )}
          <button
            onClick={() => setCurrentView('analytics')}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: currentView === 'analytics' ? '#007bff' : 'var(--bg-tertiary)',
              color: currentView === 'analytics' ? 'white' : 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            📊 Аналитика
          </button>
          <button
            onClick={() => setCurrentView('notifications')}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: currentView === 'notifications' ? '#007bff' : 'var(--bg-tertiary)',
              color: currentView === 'notifications' ? 'white' : 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            🔔 Уведомления
          </button>
          <button
            onClick={() => setCurrentView('news')}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: currentView === 'news' ? '#007bff' : 'var(--bg-tertiary)',
              color: currentView === 'news' ? 'white' : 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            📰 Новости
          </button>
          {user?.role && ['admin', 'admin_assistant'].includes(user.role) && (
            <button
              onClick={() => setCurrentView('approvals')}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: currentView === 'approvals' ? '#007bff' : 'var(--bg-tertiary)',
                color: currentView === 'approvals' ? 'white' : 'var(--text-primary)',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
            >
              ✅ Подтверждения
            </button>
          )}
        </div>
      </nav>

      {/* Основной контент */}
      {currentView === 'dashboard' ? (
        <main style={{
          backgroundColor: 'var(--bg-secondary)',
          padding: '30px',
          borderRadius: '8px',
          boxShadow: 'var(--shadow)',
          color: 'var(--text-primary)'
        }}>
          <h2>Панель управления</h2>
          <p>Добро пожаловать в систему учёта экзаменов работников!</p>
        
        <div style={{ marginTop: '30px' }}>
          <h3>Статус системы:</h3>
          <ul style={{ textAlign: 'left', marginTop: '15px' }}>
            <li>✅ Аутентификация настроена</li>
            <li>
              {connectionStatus === 'checking' && '⏳ Проверка подключения к базе данных...'}
              {connectionStatus === 'connected' && '✅ База данных подключена'}
              {connectionStatus === 'error' && '❌ Ошибка подключения к базе данных'}
            </li>
            <li>✅ Управление работниками</li>
            <li>✅ Управление участками</li>
            <li>✅ Управление пользователями</li>
            <li>✅ Управление профессиями</li>
            <li>✅ Управление экзаменами</li>
            <li>✅ Новости и уведомления</li>
            <li>✅ Интерактивная таблица экзаменов</li>
          </ul>
          
          {/* Виджет новостей на главной странице */}
          <div style={{ marginTop: '40px' }}>
            <NewsWidget 
              limit={5}
              onViewAll={() => setCurrentView('news')}
            />
          </div>
          
          {connectionStatus === 'error' && (
            <div style={{ 
              marginTop: '15px', 
              padding: '15px', 
              backgroundColor: '#f8d7da', 
              color: '#721c24',
              borderRadius: '4px',
              border: '1px solid #f5c6cb'
            }}>
              <strong>Проблема с подключением!</strong>
              <p>Проверьте:</p>
              <ul>
                <li>Правильность URL и API ключей в файле .env</li>
                <li>Создание таблиц в Supabase (выполните SQL скрипты)</li>
                <li>Настройки проекта в Supabase Dashboard</li>
              </ul>
            </div>
          )}
          
          <button 
            onClick={checkConnection}
            style={{
              marginTop: '15px',
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Проверить подключение заново
          </button>
        </div>

        <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          <h4>Реализованные модули:</h4>
          <ul style={{ textAlign: 'left', marginTop: '10px' }}>
            <li>✅ <strong>Управление работниками</strong> - добавление, редактирование, фильтрация</li>
            <li>✅ <strong>Управление участками</strong> - создание и редактирование участков</li>
            <li>✅ <strong>Управление пользователями</strong> - создание учетных записей и ролей</li>
            <li>✅ <strong>Управление профессиями</strong> - шаблоны профессий с экзаменами</li>
            <li>✅ <strong>Управление экзаменами</strong> - создание и редактирование экзаменов</li>
          </ul>
          
          <h4 style={{ marginTop: '20px' }}>Следующие этапы:</h4>
          <ol style={{ textAlign: 'left', marginTop: '10px' }}>
            <li>Управление профессиями и экзаменами</li>
            <li>✅ Система уведомлений и статистика</li>
            <li>Импорт данных из Excel</li>
            <li>Форум и новостная лента</li>
          </ol>
        </div>
        </main>
      ) : null}

      {currentView === 'employees' ? (
        <EmployeeManagement />
      ) : currentView === 'sections' ? (
        <SectionManagement />
      ) : currentView === 'users' ? (
        <UserManagement />
      ) : currentView === 'professions' ? (
        <ProfessionManagement />
      ) : currentView === 'analytics' ? (
        <AnalyticsDashboard />
      ) : currentView === 'notifications' ? (
        <UserNotifications />
      ) : currentView === 'approvals' ? (
        <ApprovalPanel />
      ) : currentView === 'news' ? (
        <NewsManagement />
      ) : null}

      {/* Автоматическое модальное окно для новых уведомлений */}
      {showAutoModal && unreadNotifications.length > 0 && (
        <AutoNotificationModal
          notifications={unreadNotifications}
          onMarkAsRead={handleMarkAsRead}
          onMarkAllAsRead={handleMarkAllAsRead}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}

export default Dashboard