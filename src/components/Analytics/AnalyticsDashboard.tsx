import React, { useState } from 'react'
import StatisticsOverview from '../Statistics/StatisticsOverview'
import NotificationCenter from '../Notifications/NotificationCenter'
import './AnalyticsDashboard.css'

type DashboardView = 'overview' | 'statistics' | 'notifications'

const AnalyticsDashboard: React.FC = () => {
  const [currentView, setCurrentView] = useState<DashboardView>('overview')

  const renderContent = () => {
    switch (currentView) {
      case 'statistics':
        return <StatisticsOverview />
      case 'notifications':
        return <NotificationCenter />
      case 'overview':
      default:
        return (
          <div className="dashboard-overview">
            <div className="overview-header">
              <h2>📊 Аналитический дашборд</h2>
              <p>Общий обзор состояния экзаменов и уведомлений</p>
            </div>
            
            <div className="overview-grid">
              <div className="overview-card" onClick={() => setCurrentView('statistics')}>
                <div className="card-icon">📈</div>
                <div className="card-content">
                  <h3>Статистика</h3>
                  <p>Аналитика по участкам, работникам и экзаменам</p>
                  <div className="card-action">Перейти к статистике →</div>
                </div>
              </div>
              
              <div className="overview-card" onClick={() => setCurrentView('notifications')}>
                <div className="card-icon">🔔</div>
                <div className="card-content">
                  <h3>Уведомления</h3>
                  <p>Просроченные и предстоящие экзамены</p>
                  <div className="card-action">Перейти к уведомлениям →</div>
                </div>
              </div>
            </div>
            
            {/* Быстрый обзор */}
            <div className="quick-overview">
              <h3>Быстрый обзор</h3>
              <div className="quick-stats">
                <StatisticsOverview />
              </div>
            </div>
            
            <div className="quick-notifications">
              <h3>Последние уведомления</h3>
              <div className="notifications-preview">
                <NotificationCenter />
              </div>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="analytics-dashboard">
      <div className="dashboard-nav">
        <button 
          className={currentView === 'overview' ? 'active' : ''}
          onClick={() => setCurrentView('overview')}
        >
          📊 Обзор
        </button>
        <button 
          className={currentView === 'statistics' ? 'active' : ''}
          onClick={() => setCurrentView('statistics')}
        >
          📈 Статистика
        </button>
        <button 
          className={currentView === 'notifications' ? 'active' : ''}
          onClick={() => setCurrentView('notifications')}
        >
          🔔 Уведомления
        </button>
      </div>
      
      <div className="dashboard-content">
        {renderContent()}
      </div>
    </div>
  )
}

export default AnalyticsDashboard