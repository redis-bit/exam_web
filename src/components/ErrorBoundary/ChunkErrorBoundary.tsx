import React, { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

class ChunkErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    // Проверяем, является ли это ошибкой загрузки чанка
    if (error.name === 'ChunkLoadError' || error.message.includes('Loading chunk')) {
      return { hasError: true, error }
    }
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ChunkErrorBoundary caught an error:', error, errorInfo)
    
    // Если это ошибка загрузки чанка, перезагружаем страницу
    if (error.name === 'ChunkLoadError' || error.message.includes('Loading chunk')) {
      console.log('Chunk loading failed, reloading page...')
      // Небольшая задержка перед перезагрузкой
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          color: 'var(--text-primary)'
        }}>
          <h3>Ошибка загрузки компонента</h3>
          <p>Не удалось загрузить компонент. Страница будет перезагружена автоматически.</p>
          <button 
            onClick={this.handleRetry}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            Попробовать снова
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ChunkErrorBoundary