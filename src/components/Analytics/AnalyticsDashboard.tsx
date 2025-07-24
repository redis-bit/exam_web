import React, { useState } from 'react'
import StatisticsOverview from '../Statistics/StatisticsOverview'
import NotificationCenter from '../Notifications/NotificationCenter'
import InteractiveTable from './InteractiveTableFinal'
import { useAuth } from '../../hooks/useAuth'
import './AnalyticsDashboard.css'

type DashboardView = 'overview' | 'statistics' | 'notifications' | 'tables'

const AnalyticsDashboard: React.FC = () => {
  const { user } = useAuth()
  const [currentView, setCurrentView] = useState<DashboardView>('overview')

  const renderContent = () => {
    switch (currentView) {
      case 'statistics':
        return <StatisticsOverview />
      case 'notifications':
        return <NotificationCenter />
      case 'tables':
        return <InteractiveTable sectionId={user?.role === 'section_chief' && user.section_id ? user.section_id : undefined} />
      case 'overview':
      default:
        return (
          <div className="dashboard-overview">
            <div className="overview-header">
              <div className="header-content">
                <div className="header-icon">📊</div>
                <div className="header-text">
                  <h1>Аналитический дашборд</h1>
                  <p>Комплексный анализ состояния экзаменов и уведомлений в системе</p>
                </div>
              </div>
              <div className="header-stats">
                <div className="stat-item">
                  <div className="stat-number">24</div>
                  <div className="stat-label">Активных участков</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">156</div>
                  <div className="stat-label">Сотрудников</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">8</div>
                  <div className="stat-label">Просроченных</div>
                </div>
              </div>
            </div>
            
            <div className="overview-grid">
              <div className="modern-card statistics-card" onClick={() => setCurrentView('statistics')}>
                <div className="card-background"></div>
                <div className="card-header">
                  <div className="card-icon-modern">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 13h2v8H3v-8zm4-6h2v14H7V7zm4-6h2v20h-2V1zm4 8h2v12h-2V9zm4-4h2v16h-2V5z"/>
                    </svg>
                  </div>
                  <div className="card-badge">Аналитика</div>
                </div>
                <div className="card-content-modern">
                  <h3>Статистика и метрики</h3>
                  <p>Детальная аналитика по участкам, работникам и экзаменам с интерактивными графиками</p>
                  <div className="card-features">
                    <span>📈 Графики</span>
                    <span>📊 Диаграммы</span>
                    <span>🎯 KPI</span>
                  </div>
                </div>
                <div className="card-action-modern">
                  <span>Открыть статистику</span>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
                  </svg>
                </div>
              </div>
              
              <div className="modern-card notifications-card" onClick={() => setCurrentView('notifications')}>
                <div className="card-background"></div>
                <div className="card-header">
                  <div className="card-icon-modern">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                    </svg>
                  </div>
                  <div className="card-badge">Уведомления</div>
                </div>
                <div className="card-content-modern">
                  <h3>Центр уведомлений</h3>
                  <p>Мониторинг просроченных и предстоящих экзаменов с системой автоматических оповещений</p>
                  <div className="card-features">
                    <span>🔔 Алерты</span>
                    <span>⏰ Напоминания</span>
                    <span>📧 Email</span>
                  </div>
                </div>
                <div className="card-action-modern">
                  <span>Открыть уведомления</span>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
                  </svg>
                </div>
              </div>
              
              <div className="modern-card tables-card" onClick={() => setCurrentView('tables')}>
                <div className="card-background"></div>
                <div className="card-header">
                  <div className="card-icon-modern">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 3v18h18V3H3zm16 16H5V5h14v14zM7 7h2v2H7V7zm4 0h2v2h-2V7zm4 0h2v2h-2V7zM7 11h2v2H7v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2zM7 15h2v2H7v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2z"/>
                    </svg>
                  </div>
                  <div className="card-badge">Данные</div>
                </div>
                <div className="card-content-modern">
                  <h3>Интерактивные таблицы</h3>
                  <p>Управление данными работников и экзаменов с возможностью фильтрации и редактирования</p>
                  <div className="card-features">
                    <span>📋 Таблицы</span>
                    <span>🔍 Поиск</span>
                    <span>✏️ Редактирование</span>
                  </div>
                </div>
                <div className="card-action-modern">
                  <span>Открыть таблицы</span>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Быстрый обзор */}
            <div className="quick-sections">
              <div className="quick-section">
                <div className="section-header">
                  <h3>📊 Быстрая статистика</h3>
                  <button className="expand-btn" onClick={() => setCurrentView('statistics')}>
                    Развернуть
                  </button>
                </div>
                <div className="section-content">
                  <StatisticsOverview />
                </div>
              </div>
              
              <div className="quick-section">
                <div className="section-header">
                  <h3>🔔 Последние уведомления</h3>
                  <button className="expand-btn" onClick={() => setCurrentView('notifications')}>
                    Все уведомления
                  </button>
                </div>
                <div className="section-content">
                  <NotificationCenter />
                </div>
              </div>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="analytics-dashboard">
      <div className="dashboard-nav">
        <div className="nav-container">
          <div className="nav-brand">
            <div className="brand-icon">⚡</div>
            <span>Analytics Pro</span>
          </div>
          <div className="nav-tabs">
            <button 
              className={`nav-tab ${currentView === 'overview' ? 'active' : ''}`}
              onClick={() => setCurrentView('overview')}
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
              </svg>
              <span>Обзор</span>
            </button>
            <button 
              className={`nav-tab ${currentView === 'statistics' ? 'active' : ''}`}
              onClick={() => setCurrentView('statistics')}
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 13h2v8H3v-8zm4-6h2v14H7V7zm4-6h2v20h-2V1zm4 8h2v12h-2V9zm4-4h2v16h-2V5z"/>
              </svg>
              <span>Статистика</span>
            </button>
            <button 
              className={`nav-tab ${currentView === 'notifications' ? 'active' : ''}`}
              onClick={() => setCurrentView('notifications')}
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
              </svg>
              <span>Уведомления</span>
            </button>
            <button 
              className={`nav-tab ${currentView === 'tables' ? 'active' : ''}`}
              onClick={() => setCurrentView('tables')}
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 3v18h18V3H3zm16 16H5V5h14v14zM7 7h2v2H7V7zm4 0h2v2h-2V7zm4 0h2v2h-2V7zM7 11h2v2H7v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2zM7 15h2v2H7v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2z"/>
              </svg>
              <span>Таблицы</span>
            </button>
          </div>
        </div>
      </div>
      
      <div className="dashboard-content">
        {renderContent()}
      </div>
    </div>
  )
}

export default AnalyticsDashboard