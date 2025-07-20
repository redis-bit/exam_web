import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';

const AuthComponent: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  // Вся логика теперь в хуке useAuth
  const { loading, authError, isLocked, signIn, getLastEmail } = useAuth();

  const [email, setEmail] = useState(getLastEmail());
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn(email, password);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

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
            disabled={loading || isLocked}
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

          {authError && (
            <div className="auth-error">
              ⚠️ {authError}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default AuthComponent;