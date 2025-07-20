import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../hooks/useTheme'

// Функция для форматирования минут с правильным склонением
const formatMinutes = (minutes: number): string => {
  if (minutes % 10 === 1 && minutes % 100 !== 11) {
    return `${minutes} минуту`
  } else if ([2, 3, 4].includes(minutes % 10) && ![12, 13, 14].includes(minutes % 100)) {
    return `${minutes} минуты`
  } else {
    return `${minutes} минут`
  }
}

const AuthComponent: React.FC = () => {
  const { theme, toggleTheme } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockUntil, setLockUntil] = useState<number | null>(null)

  // Загружаем сохраненный email и состояние блокировки при монтировании
  useEffect(() => {
    const savedEmail = localStorage.getItem('lastEmail')
    if (savedEmail) {
      setEmail(savedEmail)
    }

    const savedLock = localStorage.getItem('loginLockUntil')
    if (savedLock) {
      const lockTime = parseInt(savedLock)
      if (lockTime > Date.now()) {
        setLockUntil(lockTime)
      } else {
        localStorage.removeItem('loginLockUntil')
      }
    }
  }, [])

  // Таймер для отслеживания времени блокировки
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (lockUntil && lockUntil > Date.now()) {
      interval = setInterval(() => {
        const remaining = lockUntil - Date.now()
        if (remaining <= 0) {
          setLockUntil(null)
          localStorage.removeItem('loginLockUntil')
          setError(null)
          clearInterval(interval)
        } else {
          const minutes = Math.ceil(remaining / 60000)
          setError(`Покури пока. Доступ заблокирован на ${formatMinutes(minutes)}`)
        }
      }, 1000)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [lockUntil])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Проверяем блокировку
    if (lockUntil && lockUntil > Date.now()) {
      const minutes = Math.ceil((lockUntil - Date.now()) / 60000)
      setError(`Покури пока. Доступ заблокирован на ${formatMinutes(minutes)}`)
      return
    }
    
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        const newAttempts = failedAttempts + 1
        setFailedAttempts(newAttempts)
        
        if (newAttempts >= 3) {
          const lockTime = Date.now() + 5 * 60 * 1000 // 5 минут
          setLockUntil(lockTime)
          localStorage.setItem('loginLockUntil', lockTime.toString())
          setError(`Покури пока. Доступ заблокирован на ${formatMinutes(5)}`)
        } else {
          setError('Неверный email или пароль')
        }
      } else {
        // Сброс счетчика при успешном входе
        setFailedAttempts(0)
        // Сохраняем email для следующего входа
        localStorage.setItem('lastEmail', email)
      }
    } catch (err) {
      setError('Произошла ошибка при входе')
    } finally {
      setLoading(false)
    }
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  return (
    <div className="auth-container" data-theme={theme}>
      <div className="auth-card">
        <div className="theme-toggle-container">
          <button 
            type="button" 
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Переключить тему"
          >
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
        </div>
        <h1 className="auth-title">Вход в систему</h1>
        
        <form onSubmit={handleLogin} className="auth-form">
          <div className="input-group">
            <input
              id="email"
              type="email"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Электронная почта"
              autoComplete="email"
            />
          </div>

          <div className="input-group">
            <div className="password-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="auth-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Пароль"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={togglePasswordVisibility}
                aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="auth-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Вход...
              </>
            ) : (
              'Войти'
            )}
          </button>

          {error && (
            <div className="auth-error">
              ⚠️ {error}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

export default AuthComponent