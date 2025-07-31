import React from 'react'
import { useAuth } from './hooks/useAuth'
import AuthComponent from './components/Auth/AuthComponent'
import Dashboard from './components/Dashboard/Dashboard'
import './App.css'

// Импортируем хук напрямую, но используем условно
import { useActivityTracker } from './hooks/useActivityTracker'

// Условный хук для трекера активности
const useConditionalActivityTracker = () => {
  const { session } = useAuth()
  
  // Вызываем хук всегда, но внутри хука делаем проверку на session
  useActivityTracker()
}

function App() {
  const { session, loading } = useAuth()
  
  // Инициализируем трекер активности только для авторизованных пользователей
  useConditionalActivityTracker()

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="App">
      {!session ? (
        <AuthComponent />
      ) : (
        <Dashboard session={session} />
      )}
    </div>
  )
}

export default App