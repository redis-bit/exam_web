import React, { useEffect, useState, Suspense, lazy } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { testSupabaseConnection, testDatabaseTables } from '../../utils/testConnection'
import { useAuth } from '../../hooks/useAuth'
import ThemeToggle from '../ThemeToggle/ThemeToggle'
import NotificationBadge from '../Notifications/NotificationBadge'
import LatestNewsHeader from '../News/LatestNewsHeader'
import NewsWidget from '../News/NewsWidget'
import { useAutoNotifications } from '../../hooks/useAutoNotifications'
import ChunkErrorBoundary from '../ErrorBoundary/ChunkErrorBoundary'
import './Dashboard.css'

// Lazy loading для тяжелых компонентов с обработкой ошибок
const EmployeeManagement = lazy(() => 
  import('../Employees/EmployeeManagement').catch(() => {
    console.error('Failed to load EmployeeManagement, reloading...')
    window.location.reload()
    return { default: () => <div>Перезагрузка...</div> }
  })
)

const SectionManagement = lazy(() => 
  import('../Sections/SectionManagement').catch(() => {
    console.error('Failed to load SectionManagement, reloading...')
    window.location.reload()
    return { default: () => <div>Перезагрузка...</div> }
  })
)

const UserManagement = lazy(() => 
  import('../Users/UserManagement').catch(() => {
    console.error('Failed to load UserManagement, reloading...')
    window.location.reload()
    return { default: () => <div>Перезагрузка...</div> }
  })
)

const ProfessionManagement = lazy(() => 
  import('../Professions/ProfessionManagement').catch(() => {
    console.error('Failed to load ProfessionManagement, reloading...')
    window.location.reload()
    return { default: () => <div>Перезагрузка...</div> }
  })
)

const AnalyticsDashboard = lazy(() => 
  import('../Analytics/AnalyticsDashboard').catch(() => {
    console.error('Failed to load AnalyticsDashboard, reloading...')
    window.location.reload()
    return { default: () => <div>Перезагрузка...</div> }
  })
)

const UserNotifications = lazy(() => 
  import('../Notifications/UserNotifications').catch(() => {
    console.error('Failed to load UserNotifications, reloading...')
    window.location.reload()
    return { default: () => <div>Перезагрузка...</div> }
  })
)

const ApprovalPanel = lazy(() => 
  import('../Approvals/ApprovalPanel').catch(() => {
    console.error('Failed to load ApprovalPanel, reloading...')
    window.location.reload()
    return { default: () => <div>Перезагрузка...</div> }
  })
)

const NewsManagement = lazy(() => 
  import('../News/NewsManagement').catch(() => {
    console.error('Failed to load NewsManagement, reloading...')
    window.location.reload()
    return { default: () => <div>Перезагрузка...</div> }
  })
)

const AutoNotificationModal = lazy(() => 
  import('../Notifications/AutoNotificationModal').catch(() => {
    console.error('Failed to load AutoNotificationModal, reloading...')
    window.location.reload()
    return { default: () => <div>Перезагрузка...</div> }
  })
)

const BackupManagement = lazy(() => 
  import('../Backups/BackupManagementSimple').catch((error) => {
    console.error('Failed to load BackupManagement:', error)
    // Возвращаем простой компонент вместо перезагрузки
    return { 
      default: () => (
        <div style={{ padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
          <h3>❌ Ошибка загрузки компонента резервного копирования</h3>
          <p>Проверьте консоль браузера для получения подробной информации об ошибке.</p>
          <details>
            <summary>Техническая информация</summary>
            <pre>{error?.toString()}</pre>
          </details>
        </div>
      )
    }
  })
)

// Компонент загрузки
const LoadingSpinner = () => (
  <div className="loading-container">
    <div className="loading-spinner">Загрузка компонента...</div>
  </div>
)

interface DashboardProps {
  session: Session
}

const Dashboard: React.FC<DashboardProps> = ({ session }) => {
  const { user, loading: authLoading } = useAuth()
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking')
  const [currentView, setCurrentView] = useState<'dashboard' | 'employees' | 'sections' | 'users' | 'professions' | 'analytics' | 'notifications' | 'approvals' | 'news' | 'backups'>('dashboard')
  const [isMenuOpen, setMenuOpen] = useState(false);
  
  
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
    try {
      // Проверяем, есть ли активная сессия
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        // Если сессия есть, пытаемся выйти через API
        const { error } = await supabase.auth.signOut({ scope: 'local' })
        
        if (error && error.message !== 'Auth session missing!') {
          console.error('Ошибка при выходе:', error)
        }
      }
      
      // В любом случае очищаем локальные данные
      localStorage.removeItem('sb-dvdribnzlrbmqzeurino-auth-token')
      localStorage.removeItem('supabase.auth.token')
      sessionStorage.clear()
      
      // Перезагружаем страницу для полной очистки состояния
      window.location.href = '/'
      
    } catch (error: any) {
      console.log('Сессия уже отсутствует или повреждена, выполняем принудительную очистку')
      
      // Принудительная очистка всех данных Supabase
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.includes('supabase') || key.includes('sb-')) {
          localStorage.removeItem(key)
        }
      })
      
      sessionStorage.clear()
      window.location.href = '/'
    }
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
      <header className="dashboard-header">
        <div className="header-controls">
          <NotificationBadge 
            onClick={() => {
              const isAdmin = user?.role && ['admin', 'admin_assistant'].includes(user.role)
              setCurrentView(isAdmin ? 'approvals' : 'notifications')
            }}
            className="notification-badge-header"
          />
          <LatestNewsHeader onNewsClick={() => setCurrentView('news')} />
          <div className="user-menu">
            <button 
              onClick={() => setMenuOpen(!isMenuOpen)}
              className={`user-menu-button ${isMenuOpen ? 'open' : ''}`}
            >
              {user?.role === 'admin' ? 'Админ' : user?.full_name || session.user.email}
              <span className="arrow">▼</span>
            </button>
            {isMenuOpen && (
              <div className="dropdown-menu">
                <div className="user-info">
                  <strong>{user?.full_name}</strong>
                  <div className="email">{session.user.email}</div>
                </div>
                <ThemeToggle />
                <button 
                  onClick={handleLogout}
                  className="logout-button"
                >
                  Выйти
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Навигация */}
      <nav className="dashboard-nav">
        <div className="nav-container">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`nav-button ${currentView === 'dashboard' ? 'active' : ''}`}
          >
            📊 Главная
          </button>
          <button
            onClick={() => setCurrentView('employees')}
            className={`nav-button ${currentView === 'employees' ? 'active' : ''}`}
          >
            👥 Работники
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => setCurrentView('sections')}
              className={`nav-button ${currentView === 'sections' ? 'active' : ''}`}
            >
              🏢 Участки
            </button>
          )}
          {user?.role === 'admin' && (
            <button
              onClick={() => setCurrentView('users')}
              className={`nav-button ${currentView === 'users' ? 'active' : ''}`}
            >
              👤 Пользователи
            </button>
          )}
          {user?.role === 'admin' && (
            <button
              onClick={() => setCurrentView('professions')}
              className={`nav-button ${currentView === 'professions' ? 'active' : ''}`}
            >
              🔧 Профессии
            </button>
          )}
          <button
            onClick={() => setCurrentView('analytics')}
            className={`nav-button ${currentView === 'analytics' ? 'active' : ''}`}
          >
            📈 Аналитика
          </button>
          <button
            onClick={() => setCurrentView('notifications')}
            className={`nav-button ${currentView === 'notifications' ? 'active' : ''}`}
          >
            🔔 Уведомления
          </button>
          <button
            onClick={() => setCurrentView('news')}
            className={`nav-button ${currentView === 'news' ? 'active' : ''}`}
          >
            📰 Новости
          </button>
          {user?.role && ['admin', 'admin_assistant'].includes(user.role) && (
            <button
              onClick={() => setCurrentView('approvals')}
              className={`nav-button ${currentView === 'approvals' ? 'active' : ''}`}
            >
              ✅ Подтверждения
            </button>
          )}
          {user?.role === 'admin' && (
            <button
              onClick={() => setCurrentView('backups')}
              className={`nav-button ${currentView === 'backups' ? 'active' : ''}`}
            >
              💾 Резервные копии
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
            {user?.role === 'admin' && <li>✅ Резервное копирование и восстановление</li>}
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

                <div style={{ 
          marginTop: '30px', 
          padding: '20px', 
          backgroundColor: 'var(--bg-tertiary)', 
          color: 'var(--text-primary)', 
          borderRadius: '4px',
          border: '1px solid var(--border-color)'
        }}>
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

      {currentView === 'employees' && (
        <ChunkErrorBoundary>
          <Suspense fallback={<LoadingSpinner />}>
            <EmployeeManagement />
          </Suspense>
        </ChunkErrorBoundary>
      )}
      {currentView === 'sections' && (
        <ChunkErrorBoundary>
          <Suspense fallback={<LoadingSpinner />}>
            <SectionManagement />
          </Suspense>
        </ChunkErrorBoundary>
      )}
      {currentView === 'users' && (
        <ChunkErrorBoundary>
          <Suspense fallback={<LoadingSpinner />}>
            <UserManagement />
          </Suspense>
        </ChunkErrorBoundary>
      )}
      {currentView === 'professions' && (
        <ChunkErrorBoundary>
          <Suspense fallback={<LoadingSpinner />}>
            <ProfessionManagement />
          </Suspense>
        </ChunkErrorBoundary>
      )}
      {currentView === 'analytics' && (
        <ChunkErrorBoundary>
          <Suspense fallback={<LoadingSpinner />}>
            <AnalyticsDashboard />
          </Suspense>
        </ChunkErrorBoundary>
      )}
      {currentView === 'notifications' && (
        <ChunkErrorBoundary>
          <Suspense fallback={<LoadingSpinner />}>
            <UserNotifications />
          </Suspense>
        </ChunkErrorBoundary>
      )}
      {currentView === 'approvals' && (
        <ChunkErrorBoundary>
          <Suspense fallback={<LoadingSpinner />}>
            <ApprovalPanel />
          </Suspense>
        </ChunkErrorBoundary>
      )}
      {currentView === 'news' && (
        <ChunkErrorBoundary>
          <Suspense fallback={<LoadingSpinner />}>
            <NewsManagement />
          </Suspense>
        </ChunkErrorBoundary>
      )}
      {currentView === 'backups' && (
        <ChunkErrorBoundary>
          <Suspense fallback={<LoadingSpinner />}>
            <BackupManagement />
          </Suspense>
        </ChunkErrorBoundary>
      )}

      {/* Автоматическое модальное окно для новых уведомлений */}
      {showAutoModal && unreadNotifications.length > 0 && (
        <ChunkErrorBoundary>
          <Suspense fallback={null}>
            <AutoNotificationModal
              notifications={unreadNotifications}
              onMarkAsRead={handleMarkAsRead}
              onMarkAllAsRead={handleMarkAllAsRead}
              onClose={handleCloseModal}
            />
          </Suspense>
        </ChunkErrorBoundary>
      )}
    </div>
  )
}

export default Dashboard