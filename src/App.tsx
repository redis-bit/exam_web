import React from 'react'
import { useActivityTracker } from './hooks/useActivityTracker'
import { useAuth } from './hooks/useAuth'
import AuthComponent from './components/Auth/AuthComponent'
import Dashboard from './components/Dashboard/Dashboard'
import './App.css'

function App() {
  const { session, loading } = useAuth()
  
  // Инициализируем трекер активности
  useActivityTracker()

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