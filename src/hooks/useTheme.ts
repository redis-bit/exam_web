import { useState, useEffect } from 'react'

export type Theme = 'light' | 'dark'

export const useTheme = () => {
  // По умолчанию темная тема
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme') as Theme
    return savedTheme || 'dark'
  })

  useEffect(() => {
    localStorage.setItem('theme', theme)
    
    // Применяем тему к документу
    document.documentElement.setAttribute('data-theme', theme)
    
    // Добавляем CSS переменные для темы
    const root = document.documentElement
    if (theme === 'dark') {
      root.style.setProperty('--bg-primary', '#1a1a1a')
      root.style.setProperty('--bg-secondary', '#2d2d2d')
      root.style.setProperty('--bg-tertiary', '#3a3a3a')
      root.style.setProperty('--text-primary', '#ffffff')
      root.style.setProperty('--text-secondary', '#b0b0b0')
      root.style.setProperty('--text-muted', '#888888')
      root.style.setProperty('--border-color', '#404040')
      root.style.setProperty('--shadow', '0 2px 4px rgba(0,0,0,0.3)')
      root.style.setProperty('--input-bg', '#2d2d2d')
      root.style.setProperty('--input-border', '#404040')
    } else {
      root.style.setProperty('--bg-primary', '#ffffff')
      root.style.setProperty('--bg-secondary', '#f8f9fa')
      root.style.setProperty('--bg-tertiary', '#e9ecef')
      root.style.setProperty('--text-primary', '#212529')
      root.style.setProperty('--text-secondary', '#495057')
      root.style.setProperty('--text-muted', '#6c757d')
      root.style.setProperty('--border-color', '#dee2e6')
      root.style.setProperty('--shadow', '0 2px 4px rgba(0,0,0,0.1)')
      root.style.setProperty('--input-bg', '#ffffff')
      root.style.setProperty('--input-border', '#ced4da')
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  return { theme, toggleTheme }
}